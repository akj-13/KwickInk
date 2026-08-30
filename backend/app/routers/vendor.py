import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.deps import require_vendor
from app.models import JobState, PrintJob, User
from app.services.crypto import otp_match, purge_file
from app.services.heap_queue import queue_engine, recompute_positions
from app.services.machine import IllegalTransition, job_payload, transit
from app.services.realtime import hub

router = APIRouter(prefix="/vendor", tags=["vendor"])
settings = get_settings()
OTP_RE = re.compile(r"^\d{4}$")


class OtpIn(BaseModel):
    otp: str = Field(min_length=4, max_length=4)


def _active(db: Session) -> list[PrintJob]:
    return db.query(PrintJob).filter(PrintJob.state.in_([JobState.QUEUED, JobState.PRINTING])).all()


@router.get("/board")
def board(user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    jobs = (
        db.query(PrintJob)
        .options(joinedload(PrintJob.student))
        .filter(PrintJob.state.in_([JobState.QUEUED, JobState.PRINTING, JobState.OTP_VERIFIED, JobState.COMPLETED]))
        .order_by(PrintJob.updated_at.desc())
        .limit(200)
        .all()
    )
    columns = {"express": [], "standard": [], "printing": [], "ready": [], "completed": []}
    for job in jobs:
        payload = job_payload(job, for_vendor=True)
        if job.state == JobState.QUEUED and job.lane and job.lane.value == "EXPRESS":
            columns["express"].append(payload)
        elif job.state == JobState.QUEUED:
            columns["standard"].append(payload)
        elif job.state == JobState.PRINTING:
            columns["printing"].append(payload)
        elif job.state == JobState.OTP_VERIFIED:
            columns["ready"].append(payload)
        elif job.state == JobState.COMPLETED:
            columns["completed"].append(payload)
    return columns


@router.get("/jobs/{job_id}/pdf")
def job_pdf(job_id: int, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.stored_path or job.purged:
        raise HTTPException(404, "Print job file is no longer available")
    path = Path(job.stored_path).resolve()
    if not path.is_file():
        raise HTTPException(404, "Print file missing")
    return FileResponse(path=path, filename=job.filename or path.name, media_type="application/pdf")


@router.post("/jobs/{job_id}/start")
async def start_job(job_id: int, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    try:
        transit(db, job, JobState.PRINTING, "vendor dispatched")
    except IllegalTransition as exc:
        raise HTTPException(400, str(exc)) from exc
    queue_engine.remove(job.id)
    jobs = _active(db)
    queue_engine.rebuild(jobs)
    recompute_positions(jobs)
    db.commit()
    db.refresh(job)
    await hub.push_student(job.student_id, {"type": "job", "job": job_payload(job, include_otp=True)})
    await hub.push_vendors({"type": "queue", "job": job_payload(job, for_vendor=True)})
    return job_payload(job, for_vendor=True)


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: int, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state not in (JobState.QUEUED, JobState.PRINTING):
        raise HTTPException(400, "Only queued or active print jobs can be cancelled by the vendor")
    try:
        transit(db, job, JobState.CANCELLED, "vendor removed request")
    except IllegalTransition as exc:
        raise HTTPException(400, str(exc)) from exc
    if job.stored_path and not job.purged:
        purge_file(job.stored_path)
        job.stored_path = None
        job.purged = True
    job.otp_hint = None
    job.otp_hash = None
    queue_engine.remove(job.id)
    db.commit()
    db.refresh(job)
    await hub.push_student(job.student_id, {"type": "job", "job": job_payload(job)})
    await hub.push_vendors({"type": "queue", "job": job_payload(job, for_vendor=True)})
    return job_payload(job, for_vendor=True)


@router.post("/jobs/{job_id}/remove")
async def remove_job(job_id: int, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    return await cancel_job(job_id, user=user, db=db)


@router.post("/jobs/{job_id}/remove-request")
async def remove_job_request(job_id: int, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    return await cancel_job(job_id, user=user, db=db)


@router.post("/jobs/{job_id}/done")
async def mark_done(job_id: int, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state != JobState.PRINTING:
        raise HTTPException(400, "Only PRINTING jobs can be marked done")
    try:
        transit(db, job, JobState.OTP_VERIFIED, "print complete; awaiting pickup OTP")
    except IllegalTransition as exc:
        raise HTTPException(400, str(exc)) from exc
    db.commit()
    db.refresh(job)
    await hub.push_student(job.student_id, {"type": "job", "job": job_payload(job, include_otp=True)})
    await hub.push_vendors({"type": "queue", "job": job_payload(job, for_vendor=True)})
    return job_payload(job, for_vendor=True)


@router.post("/jobs/{job_id}/otp")
async def verify_otp(job_id: int, body: OtpIn, user: User = Depends(require_vendor), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.state != JobState.OTP_VERIFIED:
        raise HTTPException(400, "OTP is accepted only while in OTP/Ready")
    if (job.otp_attempts or 0) >= settings.otp_max_attempts:
        raise HTTPException(423, "OTP locked. Re-issue pickup from the student app after staff reset.")
    if not OTP_RE.match(body.otp) or not otp_match(body.otp, job.otp_hash):
        job.otp_attempts = (job.otp_attempts or 0) + 1
        db.commit()
        raise HTTPException(401, "OTP rejected")
    transit(db, job, JobState.COMPLETED, "collected; spool purged")
    purge_file(job.stored_path)
    job.stored_path = None
    job.purged = True
    job.otp_hint = None
    job.otp_hash = None
    db.commit()
    db.refresh(job)
    await hub.push_student(job.student_id, {"type": "job", "job": job_payload(job)})
    await hub.push_vendors({"type": "queue", "job": job_payload(job, for_vendor=True)})
    return job_payload(job, for_vendor=True)
