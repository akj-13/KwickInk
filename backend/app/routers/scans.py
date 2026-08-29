import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_student
from app.models import JobKind, JobState, PrintJob, User
from app.services.machine import job_payload
from app.services.pricing import is_offpeak, quote_scan

router = APIRouter(prefix="/scans", tags=["scans"])


class ScanIn(BaseModel):
    pages: int = Field(ge=1, le=200)
    slot_start: datetime
    notes: str | None = Field(default=None, max_length=200)


@router.post("")
def book_scan(body: ScanIn, user: User = Depends(require_student), db: Session = Depends(get_db)):
    off = is_offpeak(body.slot_start)
    job = PrintJob(
        public_id=secrets.token_hex(8),
        student_id=user.id,
        kind=JobKind.SCAN,
        state=JobState.UNPAID,
        filename="scan-booking",
        page_count=body.pages,
        copies=1,
        slot_start=body.slot_start,
        offpeak=off,
        amount=quote_scan(body.pages, off),
        notes=body.notes,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_payload(job)
