import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine, migrate_sqlite
from app.middleware import SecurityHeadersMiddleware
from app.models import JobState, PrintJob
from app.routers import auth, jobs, payments, scans, vendor, ws
from app.seed import seed
from app.services.heap_queue import queue_engine

settings = get_settings()
log = logging.getLogger("kwickink")
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="KwickInk", version="1.0.0", docs_url="/api/docs" if settings.demo_mode else None)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.hosts + ["testserver"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Kwick-Signature", "X-Razorpay-Signature"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(scans.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(vendor.router, prefix="/api")
app.include_router(ws.router)


@app.on_event("startup")
def boot() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_sqlite()
    seed()
    if settings.is_insecure_default_secret:
        log.warning("SECRET_KEY is a default value. Generate a new one before a public demo.")
    db = SessionLocal()
    try:
        queued = db.query(PrintJob).filter(PrintJob.state == JobState.QUEUED).all()
        queue_engine.rebuild(queued)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"ok": True, "service": "kwickink", "demo_mode": settings.demo_mode}
