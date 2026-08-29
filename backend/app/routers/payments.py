import json
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import require_student
from app.models import JobKind, JobState, PaymentLedger, PrintJob, User
from app.services.crypto import generate_otp, hash_otp, hmac_sha256, seal_otp, verify_hmac
from app.services.heap_queue import queue_engine, recompute_positions
from app.services.machine import IllegalTransition, job_payload, transit
from app.services.pricing import lane_for_pages
from app.services.ratelimit import client_ip, limiter
from app.services.realtime import hub

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()


class SimulateIn(BaseModel):
    order_id: str


def _queued_jobs(db: Session) -> list[PrintJob]:
    return db.query(PrintJob).filter(PrintJob.state.in_([JobState.QUEUED, JobState.PRINTING])).all()


async def place_in_queue(db: Session, job: PrintJob) -> None:
    if job.state != JobState.SLOT_RESERVED:
        raise HTTPException(400, "Job is not awaiting payment capture")
    otp = generate_otp()
    job.otp_hash = hash_otp(otp)
    job.otp_hint = seal_otp(otp)
    job.otp_attempts = 0
    if job.kind == JobKind.PRINT:
        job.lane = lane_for_pages(job.page_count, job.copies)
    transit(db, job, JobState.QUEUED, "HMAC-SHA256 payment verified")
    queue_engine.push(job)
    jobs = _queued_jobs(db)
    queue_engine.rebuild(jobs)
    recompute_positions(jobs)
    db.commit()
    db.refresh(job)
    await hub.push_student(job.student_id, {"type": "job", "job": job_payload(job, include_otp=True)})
    await hub.push_vendors({"type": "queue", "job": job_payload(job, for_vendor=True)})


@router.post("/create-order")
def create_order(job_id: int, user: User = Depends(require_student), db: Session = Depends(get_db)):
    job = db.get(PrintJob, job_id)
    if not job or job.student_id != user.id:
        raise HTTPException(404, "Job not found")
    if job.state not in (JobState.UNPAID, JobState.SLOT_RESERVED):
        raise HTTPException(400, "Job is not payable")
    if not job.slot_start:
        raise HTTPException(400, "Select a pickup slot first")
    order_id = job.payment_order_id or f"order_{secrets.token_hex(8)}"
    job.payment_order_id = order_id
    existing = db.query(PaymentLedger).filter(PaymentLedger.order_id == order_id).first()
    if not existing:
        db.add(PaymentLedger(job_id=job.id, order_id=order_id, amount=job.amount, status="created"))
    if job.state == JobState.UNPAID:
        try:
            transit(db, job, JobState.SLOT_RESERVED, "slot held pending HMAC payment")
        except IllegalTransition as exc:
            raise HTTPException(400, str(exc)) from exc
    db.commit()
    return {
        "order_id": order_id,
        "amount": job.amount,
        "currency": "INR",
        "key_id": settings.razorpay_key_id or "kwick_demo_key",
        "gateway": "razorpay" if settings.razorpay_key_id else "kwickpay_hmac",
    }


@router.post("/webhook")
async def webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_kwick_signature: str | None = Header(default=None),
    x_razorpay_signature: str | None = Header(default=None),
):
    limiter.check(f"webhook:{client_ip(request)}", 60, 60)
    body = await request.body()
    if len(body) > 64_000:
        raise HTTPException(413, "Webhook payload too large")
    signature = x_kwick_signature or x_razorpay_signature or ""
    secret = settings.razorpay_key_secret or settings.payment_webhook_secret
    if not verify_hmac(secret, body, signature):
        raise HTTPException(401, "HMAC-SHA256 verification failed")
    try:
        payload = json.loads(body.decode())
    except json.JSONDecodeError as exc:
        raise HTTPException(400, "Invalid JSON") from exc
    order_id = payload.get("order_id") or payload.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id")
    if not order_id:
        raise HTTPException(400, "order_id missing")
    job = db.query(PrintJob).filter(PrintJob.payment_order_id == order_id).first()
    if not job:
        raise HTTPException(404, "Unknown order")
    ledger = db.query(PaymentLedger).filter(PaymentLedger.order_id == order_id).first()
    if ledger:
        ledger.status = "captured"
        ledger.signature = signature
    if job.state == JobState.QUEUED:
        return {"ok": True, "duplicate": True}
    await place_in_queue(db, job)
    return {"ok": True, "state": JobState.QUEUED.value}


@router.post("/simulate")
async def simulate(body: SimulateIn, request: Request, user: User = Depends(require_student), db: Session = Depends(get_db)):
    if not settings.demo_mode:
        raise HTTPException(403, "Demo capture is disabled. Use a signed payment webhook.")
    limiter.check(f"pay:{user.id}:{client_ip(request)}", 20, 60)
    job = db.query(PrintJob).filter(PrintJob.payment_order_id == body.order_id, PrintJob.student_id == user.id).first()
    if not job:
        raise HTTPException(404, "Order not found")
    payload = json.dumps({"order_id": body.order_id, "status": "captured", "amount": job.amount}, separators=(",", ":")).encode()
    secret = settings.razorpay_key_secret or settings.payment_webhook_secret
    sig = hmac_sha256(secret, payload)
    if not verify_hmac(secret, payload, sig):
        raise HTTPException(401, "HMAC-SHA256 verification failed")
    ledger = db.query(PaymentLedger).filter(PaymentLedger.order_id == body.order_id).first()
    if ledger:
        ledger.status = "captured"
        ledger.signature = sig
    await place_in_queue(db, job)
    job = db.get(PrintJob, job.id)
    return {"ok": True, "job": job_payload(job, include_otp=True)}
