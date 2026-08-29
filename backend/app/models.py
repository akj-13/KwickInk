import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    VENDOR = "vendor"


class JobKind(str, enum.Enum):
    PRINT = "print"
    SCAN = "scan"


class JobState(str, enum.Enum):
    UNPAID = "UNPAID"
    SLOT_RESERVED = "SLOT_RESERVED"
    QUEUED = "QUEUED"
    PRINTING = "PRINTING"
    OTP_VERIFIED = "OTP_VERIFIED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Lane(str, enum.Enum):
    EXPRESS = "EXPRESS"
    STANDARD = "STANDARD"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STUDENT)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    jobs: Mapped[list["PrintJob"]] = relationship(back_populates="student")


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[JobKind] = mapped_column(Enum(JobKind), default=JobKind.PRINT)
    state: Mapped[JobState] = mapped_column(Enum(JobState), default=JobState.UNPAID, index=True)
    lane: Mapped[Lane | None] = mapped_column(Enum(Lane), nullable=True)
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stored_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    color: Mapped[bool] = mapped_column(Boolean, default=False)
    duplex: Mapped[bool] = mapped_column(Boolean, default=False)
    copies: Mapped[int] = mapped_column(Integer, default=1)
    slot_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    amount: Mapped[float] = mapped_column(Float, default=0)
    offpeak: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    otp_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    otp_hint: Mapped[str | None] = mapped_column(String(512), nullable=True)
    otp_attempts: Mapped[int] = mapped_column(Integer, default=0)
    queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eta_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    purged: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student: Mapped[User] = relationship(back_populates="jobs")
    events: Mapped[list["JobEvent"]] = relationship(back_populates="job", cascade="all, delete-orphan")


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("print_jobs.id"))
    from_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_state: Mapped[str] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job: Mapped[PrintJob] = relationship(back_populates="events")


class PaymentLedger(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("print_jobs.id"))
    order_id: Mapped[str] = mapped_column(String(64), unique=True)
    amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="created")
    signature: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
