from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from datetime import datetime

from app.config import get_settings
from app.models import JobKind, JobState, Lane, PrintJob


@dataclass(order=True)
class HeapItem:
    pages: int
    created_ts: float
    job_id: int = field(compare=False)


class DualLaneQueue:
    """Min-heap dual-lane engine: Express (<5 pages) vs Standard."""

    def __init__(self) -> None:
        self.express: list[HeapItem] = []
        self.standard: list[HeapItem] = []
        self._ids: set[int] = set()

    def clear(self) -> None:
        self.express.clear()
        self.standard.clear()
        self._ids.clear()

    def rebuild(self, jobs: list[PrintJob]) -> None:
        self.clear()
        for job in jobs:
            if job.state == JobState.QUEUED:
                self.push(job)

    def push(self, job: PrintJob) -> None:
        if job.id in self._ids:
            return
        billed = max(1, job.page_count * max(1, job.copies))
        item = HeapItem(pages=billed, created_ts=job.created_at.timestamp(), job_id=job.id)
        if job.lane == Lane.EXPRESS:
            heapq.heappush(self.express, item)
        else:
            heapq.heappush(self.standard, item)
        self._ids.add(job.id)

    def pop_next(self, prefer: Lane | None = None) -> int | None:
        if prefer == Lane.STANDARD:
            lanes = (self.standard, self.express)
        else:
            lanes = (self.express, self.standard)
        for lane in lanes:
            while lane:
                item = heapq.heappop(lane)
                if item.job_id in self._ids:
                    self._ids.discard(item.job_id)
                    return item.job_id
        return None

    def remove(self, job_id: int) -> None:
        self._ids.discard(job_id)

    def snapshot(self) -> dict:
        express_ids = [i.job_id for i in sorted(self.express) if i.job_id in self._ids]
        standard_ids = [i.job_id for i in sorted(self.standard) if i.job_id in self._ids]
        return {"express": express_ids, "standard": standard_ids}


queue_engine = DualLaneQueue()


def pending_pages(jobs: list[PrintJob], lane: Lane | None = None) -> int:
    total = 0
    for job in jobs:
        if job.state not in (JobState.QUEUED, JobState.PRINTING):
            continue
        if job.kind != JobKind.PRINT:
            continue
        if lane and job.lane != lane:
            continue
        total += job.page_count * max(1, job.copies)
    return total


def eta_minutes(pending: int) -> int:
    settings = get_settings()
    minutes = pending / max(1, settings.printer_ppm) + settings.eta_buffer_minutes
    return max(1, int(round(minutes)))


def recompute_positions(jobs: list[PrintJob]) -> None:
    snap = queue_engine.snapshot()
    order = snap["express"] + snap["standard"]
    by_id = {j.id: j for j in jobs}
    pending = sum(
        j.page_count * max(1, j.copies)
        for j in jobs
        if j.state == JobState.PRINTING and j.kind == JobKind.PRINT
    )
    for idx, jid in enumerate(order, start=1):
        job = by_id.get(jid)
        if not job:
            continue
        job.queue_position = idx
        pending += job.page_count * max(1, job.copies)
        job.eta_minutes = eta_minutes(pending)
    for job in jobs:
        if job.state == JobState.PRINTING:
            job.queue_position = 0
            job.eta_minutes = eta_minutes(job.page_count * max(1, job.copies))
