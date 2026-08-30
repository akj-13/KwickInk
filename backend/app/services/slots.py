from datetime import datetime, timedelta

from app.config import get_settings
from app.models import PrintJob
from app.services.pricing import parse_hhmm


def generate_slots(day: datetime, reserved: list[datetime]) -> list[dict]:
    settings = get_settings()
    open_t = parse_hhmm(settings.shop_open)
    close_t = parse_hhmm(settings.shop_close)
    start = datetime.combine(day.date(), open_t)
    end = datetime.combine(day.date(), close_t)
    counts: dict[str, int] = {}
    for r in reserved:
        key = r.replace(second=0, microsecond=0).isoformat()
        counts[key] = counts.get(key, 0) + 1

    slots = []
    cur = start
    cap = 8
    now = datetime.utcnow()
    while cur < end:
        key = cur.replace(second=0, microsecond=0).isoformat()
        used = counts.get(key, 0)
        slots.append(
            {
                "start": cur.isoformat(),
                "label": cur.strftime("%I:%M %p"),
                "capacity": cap,
                "used": used,
                "available": used < cap and cur > now - timedelta(minutes=1),
                "offpeak": cur.time().hour < 10 or cur.time().hour >= 16 or cur.weekday() >= 5,
            }
        )
        cur += timedelta(minutes=settings.slot_minutes)
    return slots


def slot_load(jobs: list[PrintJob]) -> list[datetime]:
    return [j.slot_start for j in jobs if j.slot_start and j.state != "CANCELLED"]
