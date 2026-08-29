from typing import Any

from fastapi import WebSocket


class Hub:
    def __init__(self) -> None:
        self.students: dict[int, list[WebSocket]] = {}
        self.vendors: list[WebSocket] = []

    async def connect_student(self, user_id: int, ws: WebSocket) -> None:
        self.students.setdefault(user_id, []).append(ws)

    async def connect_vendor(self, ws: WebSocket) -> None:
        self.vendors.append(ws)

    def disconnect(self, ws: WebSocket, user_id: int | None = None) -> None:
        if user_id is not None:
            conns = self.students.get(user_id, [])
            if ws in conns:
                conns.remove(ws)
        if ws in self.vendors:
            self.vendors.remove(ws)

    async def push_student(self, user_id: int, payload: dict[str, Any]) -> None:
        dead = []
        for ws in self.students.get(user_id, []):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    async def push_vendors(self, payload: dict[str, Any]) -> None:
        dead = []
        for ws in list(self.vendors):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


hub = Hub()
