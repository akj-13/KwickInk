from datetime import datetime

from sqlalchemy.orm import Session

from app.models import JobEvent, JobKind, JobState, PrintJob
from app.services.crypto import unseal_otp
from app.services.pricing import quote_print, quote_scan

LEGAL = {
    JobState.UNPAID: {JobState.SLOT_RESERVED, JobState.CANCELLED},
    JobState.SLOT_RESERVED: {JobState.QUEUED, JobState.CANCELLED, JobState.UNPAID},
    JobState.QUEUED: {JobState.PRINTING, JobState.CANCELLED},
    JobState.PRINTING: {JobState.OTP_VERIFIED, JobState.QUEUED},
    JobState.OTP_VERIFIED: {JobState.COMPLETED},
    JobState.COMPLETED: set(),
    JobState.CANCELLED: set(),
}


class IllegalTransition(ValueError):
    pass


def transit(db: Session, job: PrintJob, to: JobState, note: str | None = None) -> PrintJob:
    if to not in LEGAL[job.state]:
        raise IllegalTransition(f"{job.state.value} cannot move to {to.value}")
    event = JobEvent(job_id=job.id, from_state=job.state.value, to_state=to.value, note=note)
    job.state = to
    job.updated_at = datetime.utcnow()
    db.add(event)
    return job


def _original_amount(job: PrintJob) -> float:
    """Full price before the off-peak discount, so the UI can show a struck-through original."""
    if not job.offpeak:
        return job.amount
    if job.kind == JobKind.SCAN:
        return quote_scan(job.page_count, False)
    return quote_print(job.page_count, job.copies, job.color, job.duplex, False)


def job_payload(job: PrintJob, include_otp: bool = False, for_vendor: bool = False) -> dict:
    data = {
        "id": job.id,
        "public_id": job.public_id,
        "kind": job.kind.value,
        "state": job.state.value,
        "lane": job.lane.value if job.lane else None,
        "filename": job.filename,
        "page_count": job.page_count,
        "color": job.color,
        "duplex": job.duplex,
        "copies": job.copies,
        "slot_start": job.slot_start.isoformat() if job.slot_start else None,
        "amount": job.amount,
        "original_amount": _original_amount(job),
        "offpeak": job.offpeak,
        "queue_position": job.queue_position,
        "eta_minutes": job.eta_minutes,
        "purged": job.purged,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "has_spool": bool(job.stored_path) and not job.purged,
    }
    if for_vendor:
        data["student_name"] = job.student.name if job.student else None
    else:
        data["student_id"] = job.student_id
    if include_otp and not for_vendor:
        data["otp"] = unseal_otp(job.otp_hint)
    return data
