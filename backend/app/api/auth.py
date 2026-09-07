import hashlib
import hmac
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import UserRegister, UserLogin, UserOut, UserUpdate, Token
from fastapi import UploadFile, File
import os
import uuid
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.SECRET_KEY, algorithm="HS256")


@router.post("/register", response_model=Token, status_code=201)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    exists = await db.execute(select(User).where(User.email == payload.email))
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Email уже зарегистрирован")
    user = User(email=payload.email, hashed_password=pwd_context.hash(payload.password), username=payload.username)
    db.add(user)
    await db.flush()
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not pwd_context.verify(payload.password, user.hashed_password):
        raise HTTPException(401, "Неверные учётные данные")
    return Token(access_token=create_access_token(user.id))


@router.post("/telegram", response_model=Token)
async def telegram_login(data: dict, db: AsyncSession = Depends(get_db)):
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(500, "Telegram auth не настроен")
    check_hash = data.pop("hash")
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret = hashlib.sha256(settings.TELEGRAM_BOT_TOKEN.encode()).digest()
    if hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest() != check_hash:
        raise HTTPException(400, "Невалидная подпись Telegram")
    tg_id = int(data["id"])
    result = await db.execute(select(User).where(User.telegram_id == tg_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(telegram_id=tg_id, email=f"tg_{tg_id}@telegram.local",
                    username=data.get("username") or data.get("first_name", "User"),
                    avatar_url=data.get("photo_url"), is_verified=True)
        db.add(user)
        await db.flush()
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, k, v)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    os.makedirs("uploads/avatars", exist_ok=True)
    ext = (file.filename or "avatar.jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(400, "Недопустимый формат. Используйте JPG/PNG/WebP/GIF")
    fname = f"avatars/{uuid.uuid4().hex}.{ext}"
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Файл больше 5 МБ")
    with open(f"uploads/{fname}", "wb") as f:
        f.write(content)
    current_user.avatar_url = f"/uploads/{fname}"
    await db.commit()
    await db.refresh(current_user)
    return current_user
