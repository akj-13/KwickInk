import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import decode_token
from app.models import User, UserRole
from app.services.realtime import hub

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, db: Session = Depends(get_db)):
    await ws.accept()
    try:
        first = await asyncio.wait_for(ws.receive_json(), timeout=8)
        token = first.get("token") if isinstance(first, dict) else None
        data = decode_token(token)
        user = db.get(User, int(data["sub"]))
        if not user:
            await ws.close(code=4401)
            return
    except Exception:
        await ws.close(code=4401)
        return

    if user.role == UserRole.VENDOR:
        await hub.connect_vendor(ws)
    else:
        await hub.connect_student(user.id, ws)
    try:
        await ws.send_json({"type": "hello", "role": user.role.value})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(ws, user.id if user.role == UserRole.STUDENT else None)
