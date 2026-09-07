from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import User, Group, DebtSettlement
from app.services.budget_calculator import calculate_balances, minimize_debts
from app.schemas.schemas import BalanceItem, DebtEdge, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/groups/{group_id}", tags=["balances"])


class SettlementCreate(BaseModel):
    from_user_id: int
    to_user_id: int
    amount: float = Field(gt=0)


class SettlementOut(BaseModel):
    id: int
    from_user: UserOut
    to_user: UserOut
    amount: float
    settled_at: datetime


@router.get("/balances", response_model=list[BalanceItem])
async def get_balances(group_id: int, db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    balances = await calculate_balances(db, group_id)
    result = await db.execute(select(User).where(User.id.in_(list(balances.keys()) or [0])))
    users = {u.id: u for u in result.scalars().all()}
    return [BalanceItem(user_id=uid, username=users[uid].username or "User", balance=round(b, 2))
            for uid, b in balances.items()]


@router.get("/debts", response_model=list[DebtEdge])
async def get_debts(group_id: int, db: AsyncSession = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    balances = await calculate_balances(db, group_id)
    edges = minimize_debts(balances)
    user_ids = list({uid for e in edges for uid in (e[0], e[1])})
    result = await db.execute(select(User).where(User.id.in_(user_ids or [0])))
    users = {u.id: u for u in result.scalars().all()}
    return [DebtEdge(from_user=UserOut.model_validate(users[f]), to_user=UserOut.model_validate(users[t]),
                     amount=a) for f, t, a in edges]


@router.post("/settlements", response_model=SettlementOut, status_code=201)
async def create_settlement(group_id: int, payload: SettlementCreate,
                            db: AsyncSession = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Группа не найдена")
    member_ids = {m.id for m in group.members}
    if payload.from_user_id not in member_ids or payload.to_user_id not in member_ids:
        raise HTTPException(400, "Оба пользователя должны быть в группе")

    s = DebtSettlement(group_id=group_id, from_user_id=payload.from_user_id,
                       to_user_id=payload.to_user_id, amount=payload.amount)
    db.add(s)
    await db.flush()

    result = await db.execute(
        select(DebtSettlement)
        .where(DebtSettlement.id == s.id)
        .options(selectinload(DebtSettlement.from_user), selectinload(DebtSettlement.to_user))
    )
    s = result.scalar_one()
    return SettlementOut(id=s.id, from_user=UserOut.model_validate(s.from_user),
                         to_user=UserOut.model_validate(s.to_user),
                         amount=s.amount, settled_at=s.settled_at)


@router.get("/settlements", response_model=list[SettlementOut])
async def list_settlements(group_id: int, db: AsyncSession = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(DebtSettlement)
        .where(DebtSettlement.group_id == group_id)
        .options(selectinload(DebtSettlement.from_user), selectinload(DebtSettlement.to_user))
        .order_by(DebtSettlement.settled_at.desc())
    )
    return [SettlementOut(id=s.id, from_user=UserOut.model_validate(s.from_user),
                          to_user=UserOut.model_validate(s.to_user),
                          amount=s.amount, settled_at=s.settled_at)
            for s in result.scalars().all()]
