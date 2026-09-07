from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Transaction, TransactionSplit, Group, User
from app.schemas.schemas import TransactionOut, UserOut, Category
from app.api.deps import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/groups/{group_id}/transactions", tags=["transactions"])


class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    category: Category
    description: Optional[str] = None
    split_user_ids: list[int] = []
    payer_id: Optional[int] = None
    occurred_at: Optional[datetime] = None


@router.post("/", response_model=TransactionOut, status_code=201)
async def create_transaction(group_id: int, payload: TransactionCreate,
                             db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Группа не найдена")
    member_ids = [m.id for m in group.members]
    if current_user.id not in member_ids:
        raise HTTPException(403, "Нет доступа к группе")

    payer_id = payload.payer_id or current_user.id
    if payer_id not in member_ids:
        raise HTTPException(400, "Плательщик не в группе")

    split_ids = payload.split_user_ids or member_ids
    unknown = set(split_ids) - set(member_ids)
    if unknown:
        raise HTTPException(400, f"Пользователи {unknown} не в группе")
    share = round(payload.amount / len(split_ids), 2)

    tx = Transaction(group_id=group_id, payer_id=payer_id, amount=payload.amount,
                     category=payload.category, description=payload.description,
                     occurred_at=payload.occurred_at or datetime.utcnow())
    db.add(tx)
    await db.flush()
    for uid in split_ids:
        db.add(TransactionSplit(transaction_id=tx.id, user_id=uid, share=share))
    await db.flush()

    result = await db.execute(
        select(Transaction).where(Transaction.id == tx.id)
        .options(selectinload(Transaction.payer), selectinload(Transaction.splits))
    )
    tx = result.scalar_one()
    return _to_out(tx)


@router.get("/", response_model=list[TransactionOut])
async def list_transactions(group_id: int, db: AsyncSession = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Transaction).where(Transaction.group_id == group_id)
        .options(selectinload(Transaction.payer), selectinload(Transaction.splits))
        .order_by(Transaction.occurred_at.desc())
    )
    return [_to_out(t) for t in result.scalars().all()]


def _to_out(tx: Transaction) -> dict:
    return {
        "id": tx.id, "group_id": tx.group_id, "payer": UserOut.model_validate(tx.payer),
        "amount": tx.amount, "category": tx.category, "description": tx.description,
        "receipt_url": tx.receipt_url, "occurred_at": tx.occurred_at,
        "splits": [{"user_id": s.user_id, "share": s.share} for s in tx.splits],
    }


class TransactionPatch(BaseModel):
    amount: Optional[float] = None
    category: Optional[Category] = None
    description: Optional[str] = None
    split_user_ids: Optional[list[int]] = None


@router.patch("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(group_id: int, transaction_id: int, payload: TransactionPatch,
                             db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Group).where(Group.id == group_id).options(selectinload(Group.members)))
    group = result.scalar_one_or_none()
    if not group or current_user.id not in [m.id for m in group.members]:
        raise HTTPException(403, "Нет доступа к группе")
    tx = await db.get(Transaction, transaction_id)
    if not tx or tx.group_id != group_id:
        raise HTTPException(404, "Трата не найдена")
    if payload.amount is not None and payload.amount > 0:
        tx.amount = payload.amount
    if payload.category is not None:
        tx.category = payload.category
    if payload.description is not None:
        tx.description = payload.description
    if payload.split_user_ids:
        old = await db.execute(select(TransactionSplit).where(TransactionSplit.transaction_id == tx.id))
        for s in old.scalars().all():
            await db.delete(s)
        await db.flush()
        share = round(tx.amount / len(payload.split_user_ids), 2)
        for uid in payload.split_user_ids:
            db.add(TransactionSplit(transaction_id=tx.id, user_id=uid, share=share))
    else:
        old = (await db.execute(select(TransactionSplit).where(TransactionSplit.transaction_id == tx.id))).scalars().all()
        if old:
            share = round(tx.amount / len(old), 2)
            for s in old:
                s.share = share
    await db.flush()
    result = await db.execute(select(Transaction).where(Transaction.id == tx.id)
        .options(selectinload(Transaction.payer), selectinload(Transaction.splits)))
    return _to_out(result.scalar_one())


@router.delete("/{transaction_id}")
async def delete_transaction(group_id: int, transaction_id: int,
                             db: AsyncSession = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Group).where(Group.id == group_id).options(selectinload(Group.members)))
    group = result.scalar_one_or_none()
    if not group or current_user.id not in [m.id for m in group.members]:
        raise HTTPException(403, "Нет доступа к группе")
    tx = await db.get(Transaction, transaction_id)
    if not tx or tx.group_id != group_id:
        raise HTTPException(404, "Трата не найдена")
    old = await db.execute(select(TransactionSplit).where(TransactionSplit.transaction_id == tx.id))
    for s in old.scalars().all():
        await db.delete(s)
    await db.delete(tx)
    return {"ok": True}
