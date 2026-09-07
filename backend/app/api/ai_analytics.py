from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.database import get_db
from app.models.models import User
from app.services.ai_optimizer import AIOptimizer, generate_debt_reminder
from app.services.ai_assistant import AIAssistant
from app.services.budget_calculator import calculate_balances, minimize_debts
from app.schemas.schemas import AIInsight, DebtReminder, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    message: str


class ChatReply(BaseModel):
    reply: str


class _NoCache:
    async def get(self, k): return None
    async def setex(self, k, t, v): pass


async def _get_cache():
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
        await r.ping()
        return r
    except Exception:
        return _NoCache()


@router.get("/groups/{group_id}/insights", response_model=list[AIInsight])
async def get_insights(group_id: int, db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    optimizer = AIOptimizer(await _get_cache())
    return await optimizer.analyze(db, group_id)


@router.get("/groups/{group_id}/reminders", response_model=list[DebtReminder])
async def get_debt_reminders(group_id: int, db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    balances = await calculate_balances(db, group_id)
    debts = minimize_debts(balances)
    user_ids = list({uid for e in debts for uid in (e[0], e[1])})
    result = await db.execute(select(User).where(User.id.in_(user_ids or [0])))
    users = {u.id: u for u in result.scalars().all()}
    return [DebtReminder(
        debtor=UserOut.model_validate(users[f]), creditor=UserOut.model_validate(users[t]),
        amount=a,
        message=generate_debt_reminder(users[f].username or "Друг", users[t].username or "Друг", a, "RUB"),
    ) for f, t, a in debts]


@router.post("/groups/{group_id}/chat", response_model=ChatReply)
async def chat(group_id: int, payload: ChatMessage,
               db: AsyncSession = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    assistant = AIAssistant()
    reply = await assistant.answer(db, group_id, payload.message, current_user.username or "друг")
    return ChatReply(reply=reply)


class VoiceParse(BaseModel):
    text: str


@router.post("/parse-voice")
async def parse_voice(payload: VoiceParse, current_user: User = Depends(get_current_user)):
    from app.services.llm import llm_parse_voice, parse_voice_fallback
    parsed = await llm_parse_voice(payload.text) or {}
    fb = parse_voice_fallback(payload.text)
    parsed.setdefault("amount", fb["amount"])
    parsed.setdefault("category", fb["category"])
    parsed.setdefault("description", fb["description"])
    return parsed


from fastapi import UploadFile, File


@router.post("/parse-receipt")
async def parse_receipt(file: UploadFile = File(...),
                        current_user: User = Depends(get_current_user)):
    from app.services.llm import llm_parse_receipt
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "Фото больше 8 МБ")
    mime = file.content_type or "image/jpeg"
    parsed = await llm_parse_receipt(data, mime)
    if not parsed or not parsed.get("total"):
        raise HTTPException(502, "Не удалось распознать чек — попробуйте более чёткое фото")
    return parsed


@router.get("/groups/{group_id}/tip")
async def get_tip(group_id: int, db: AsyncSession = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    assistant = AIAssistant()
    tip = await assistant.random_tip(db, group_id)
    return {"tip": tip}


@router.get("/groups/{group_id}/report")
async def get_report(group_id: int, db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    assistant = AIAssistant()
    return {"report": await assistant.monthly_report(db, group_id)}
