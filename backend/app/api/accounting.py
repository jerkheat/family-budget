from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import User, Group, Income, BudgetLimit, Transaction
from app.api.deps import get_current_user

router = APIRouter(prefix="/groups/{group_id}", tags=["accounting"])


class IncomeCreate(BaseModel):
    amount: float = Field(gt=0)
    description: Optional[str] = None


class BudgetSet(BaseModel):
    limit_amount: float = Field(gt=0)


async def _check(db, group_id, current_user) -> Group:
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group or current_user.id not in [m.id for m in group.members]:
        raise HTTPException(403, "Нет доступа к группе")
    return group


@router.get("/accounting")
async def get_accounting(group_id: int, db: AsyncSession = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(Income).where(Income.group_id == group_id, Income.created_at >= month_start)
        .options(selectinload(Income.user)).order_by(Income.created_at.desc())
    )
    incomes = result.scalars().all()
    income_total = sum(i.amount for i in incomes)

    result = await db.execute(
        select(Transaction).where(Transaction.group_id == group_id,
                                  Transaction.occurred_at >= month_start)
    )
    spent = sum(t.amount for t in result.scalars().all())

    result = await db.execute(select(BudgetLimit).where(BudgetLimit.group_id == group_id))
    bl = result.scalar_one_or_none()

    base = bl.limit_amount if bl else income_total
    return {
        "incomes": [{"id": i.id, "amount": i.amount, "description": i.description,
                     "username": i.user.username, "created_at": i.created_at} for i in incomes],
        "limit": bl.limit_amount if bl else None,
        "income_total": income_total,
        "spent": spent,
        "base": base,
        "remaining": base - spent,
    }


@router.post("/incomes", status_code=201)
async def add_income(group_id: int, payload: IncomeCreate,
                     db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    inc = Income(group_id=group_id, user_id=current_user.id,
                 amount=payload.amount, description=payload.description)
    db.add(inc)
    await db.flush()
    return {"ok": True, "id": inc.id}


@router.post("/budget")
async def set_budget(group_id: int, payload: BudgetSet,
                     db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.group_id == group_id))
    bl = result.scalar_one_or_none()
    if bl:
        bl.limit_amount = payload.limit_amount
    else:
        db.add(BudgetLimit(group_id=group_id, limit_amount=payload.limit_amount))
    await db.flush()
    return {"ok": True}
