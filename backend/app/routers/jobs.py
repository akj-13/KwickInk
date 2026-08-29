import secrets
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import require_student
from app.models import JobKind, JobState, PrintJob, User
from app.services.crypto import sanitize_filename, upload_root
from app.services.machine import job_payload, transit
from app.services.pdf_guard import PdfValidationError, validate_and_page_count
from app.services.pricing import is_offpeak, lane_for_pages, quote_print
from app.services.ratelimit import client_ip, limiter
from app.services.slots import generate_slots

router = APIRouter(prefix="/jobs", tags=["jobs"])
settings = get_settings()


class SettingsIn(BaseModel):
    color: bool | None = None
    duplex: bool | None = None
    copies: int | None = Field(default=None, ge=1, le=50)


class SlotIn(BaseModel):
    slot_start: datetime


def _reprice(job: PrintJob) -> None:
    if not job.slot_start:
        job.offpeak = False
        job.amount = quote_print(job.page_count, job.copies, job.color, job.duplex, False)
        return
    job.offpeak = is_offpeak(job.slot_start)
    job.amount = quote_print(job.page_count, job.copies, job.color, job.duplex, job.offpeak)
    job.lane = lane_for_pages(job.page_count, job.copies)


@router.post("/upload")
async def upload(
    request: Request,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    color: bool = Form(False),
    duplex: bool = Form(False),
    copies: int = Form(1),
):
    limiter.check(f"upload:{user.id}:{client_ip(request)}", 15, 60)
    filename = sanitize_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF uploads are accepted")
    dest_dir = upload_root()
    public_id = secrets.token_hex(8)
    dest = dest_dir / f"{public_id}.pdf"
    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_upload_bytes:
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "PDF exceeds 15 MB limit")
            out.write(chunk)
    try:
        pages = validate_and_page_count(str(dest))
    except PdfValidationError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, str(exc)) from exc

    job = PrintJob(
        public_id=public_id,
        student_id=user.id,
        kind=JobKind.PRINT,
        state=JobState.UNPAID,
        filename=filename,
        stored_path=str(dest),
        page_count=pages,
        color=color,
        duplex=duplex,
        copies=max(1, min(50, copies)),
    )
    _reprice(job)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_payload(job)


@router.patch("/{job_id}/settings")
def update_settings(job_id: int, body: SettingsIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job or job.student_id != user.id:
        raise HTTPException(404, "Job not found")
    if job.state not in (JobState.UNPAID, JobState.SLOT_RESERVED):
        raise HTTPException(400, "Settings locked after payment")
    if body.color is not None:
        job.color = body.color
    if body.duplex is not None:
        job.duplex = body.duplex
    if body.copies is not None:
        job.copies = body.copies
    _reprice(job)
    db.commit()
    db.refresh(job)
    return job_payload(job)


@router.get("/slots")
def list_slots(day: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_student)):
    when = datetime.fromisoformat(day) if day else datetime.utcnow()
    reserved = [
        j.slot_start
        for j in db.query(PrintJob).filter(PrintJob.slot_start.is_not(None)).all()
        if j.slot_start and j.slot_start.date() == when.date() and j.state != JobState.CANCELLED
    ]
    return generate_slots(when, reserved)


@router.post("/{job_id}/slot")
def reserve_slot(job_id: int, body: SlotIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job or job.student_id != user.id:
        raise HTTPException(404, "Job not found")
    if job.state not in (JobState.UNPAID, JobState.SLOT_RESERVED):
        raise HTTPException(400, "Cannot change slot after queueing")
    job.slot_start = body.slot_start
    _reprice(job)
    db.commit()
    db.refresh(job)
    return job_payload(job)


@router.get("/mine")
def mine(user: User = Depends(require_student), db: Session = Depends(get_db)):
    jobs = db.query(PrintJob).filter(PrintJob.student_id == user.id).order_by(PrintJob.created_at.desc()).all()
    return [
        job_payload(j, include_otp=j.state in (JobState.QUEUED, JobState.PRINTING, JobState.OTP_VERIFIED))
        for j in jobs
    ]


@router.get("/{job_id}")
def get_job(job_id: int, user: User = Depends(require_student), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job or job.student_id != user.id:
        raise HTTPException(404, "Job not found")
    include = job.state in (JobState.QUEUED, JobState.PRINTING, JobState.OTP_VERIFIED)
    return job_payload(job, include_otp=include)


@router.post("/{job_id}/cancel")
def cancel(job_id: int, user: User = Depends(require_student), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job or job.student_id != user.id:
        raise HTTPException(404, "Job not found")
    if job.state not in (JobState.UNPAID, JobState.SLOT_RESERVED):
        raise HTTPException(400, "Paid jobs cannot be cancelled from student app")
    transit(db, job, JobState.CANCELLED, "student cancelled")
    db.commit()
    return job_payload(job)
