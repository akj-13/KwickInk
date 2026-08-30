from datetime import datetime, time

from app.config import get_settings
from app.models import Lane

OFFPEAK_WINDOWS = [(time(9, 30), time(12, 30)), (time(13, 30), time(15, 30))]


def parse_hhmm(value: str) -> time:
    h, m = value.split(":")
    return time(int(h), int(m))


def is_offpeak(slot_start: datetime) -> bool:
    t = slot_start.time()
    return any(start <= t < end for start, end in OFFPEAK_WINDOWS)


def lane_for_pages(pages: int, copies: int) -> Lane:
    billed = max(1, pages * max(1, copies))
    return Lane.EXPRESS if billed < 5 else Lane.STANDARD


def quote_print(pages: int, copies: int, color: bool, duplex: bool, offpeak: bool) -> float:
    settings = get_settings()
    rate = settings.color_rate if color else settings.bw_rate
    sheets = pages * max(1, copies)
    if duplex:
        sheets = (pages + 1) // 2 * max(1, copies)
    amount = sheets * rate
    if offpeak:
        amount *= 1 - settings.offpeak_discount
    return round(amount, 2)


def quote_scan(pages: int, offpeak: bool) -> float:
    settings = get_settings()
    amount = max(1, pages) * settings.scan_rate
    if offpeak:
        amount *= 1 - settings.offpeak_discount
    return round(amount, 2)
