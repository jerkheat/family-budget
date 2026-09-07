import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import User, Group, Message
from app.schemas.schemas import UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/groups/{group_id}/messages", tags=["chat"])
files_router = APIRouter(prefix="/files", tags=["files"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATIC_DIR = os.path.join(BASE_DIR, "static")


class MessageCreate(BaseModel):
    text: str = ""
    reply_to_id: Optional[int] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class MessagePatch(BaseModel):
    pinned: Optional[bool] = None
    highlighted: Optional[bool] = None


class ReplyInfo(BaseModel):
    id: int
    text: str
    username: str


class MessageOut(BaseModel):
    id: int
    user: UserOut
    text: str
    created_at: datetime
    pinned: bool = False
    highlighted: bool = False
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    reply_to: Optional[ReplyInfo] = None


async def _check_group(db, group_id, current_user) -> Group:
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group or current_user.id not in [m.id for m in group.members]:
        raise HTTPException(403, "Нет доступа к группе")
    return group


def _to_out(m: Message, by_id: dict = None) -> dict:
    reply = None
    if m.reply_to_id and by_id and m.reply_to_id in by_id:
        r = by_id[m.reply_to_id]
        reply = {"id": r.id, "text": r.text, "username": r.user.username}
    return {
        "id": m.id, "user": UserOut.model_validate(m.user), "text": m.text,
        "created_at": m.created_at, "pinned": bool(m.pinned),
        "highlighted": bool(m.highlighted), "image_url": m.image_url,
        "audio_url": m.audio_url, "reply_to": reply,
    }


@router.get("/", response_model=list[MessageOut])
async def list_messages(group_id: int, db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    await _check_group(db, group_id, current_user)
    result = await db.execute(
        select(Message).where(Message.group_id == group_id)
        .options(selectinload(Message.user))
        .order_by(Message.created_at.asc())
    )
    msgs = result.scalars().all()
    by_id = {x.id: x for x in msgs}
    return [_to_out(x, by_id) for x in msgs]


@router.post("/", response_model=MessageOut, status_code=201)
async def send_message(group_id: int, payload: MessageCreate,
                       db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    await _check_group(db, group_id, current_user)
    if not payload.text.strip() and not payload.image_url and not payload.audio_url:
        raise HTTPException(422, "Пустое сообщение")
    m = Message(group_id=group_id, user_id=current_user.id, text=payload.text,
                reply_to_id=payload.reply_to_id, image_url=payload.image_url,
                audio_url=payload.audio_url)
    db.add(m)
    await db.flush()
    result = await db.execute(
        select(Message).where(Message.id == m.id).options(selectinload(Message.user))
    )
    m = result.scalar_one()
    by = {}
    if m.reply_to_id:
        r = await db.execute(
            select(Message).where(Message.id == m.reply_to_id).options(selectinload(Message.user))
        )
        rm = r.scalar_one_or_none()
        if rm:
            by = {rm.id: rm}
    return _to_out(m, by)


@router.patch("/{message_id}", response_model=MessageOut)
async def patch_message(group_id: int, message_id: int, payload: MessagePatch,
                        db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    await _check_group(db, group_id, current_user)
    m = await db.get(Message, message_id)
    if not m or m.group_id != group_id:
        raise HTTPException(404, "Сообщение не найдено")
    if payload.pinned is not None:
        m.pinned = payload.pinned
    if payload.highlighted is not None:
        m.highlighted = payload.highlighted
    await db.flush()
    result = await db.execute(
        select(Message).where(Message.id == m.id).options(selectinload(Message.user))
    )
    return _to_out(result.scalar_one())


@files_router.post("/", status_code=201)
async def upload_file(file: UploadFile = File(...),
                      current_user: User = Depends(get_current_user)):
    os.makedirs(STATIC_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "file")[1] or ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Файл больше 5 МБ")
    with open(os.path.join(STATIC_DIR, name), "wb") as f:
        f.write(data)
    return {"url": f"/static/{name}"}
