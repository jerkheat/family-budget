from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import User, Group, Goal
from app.api.deps import get_current_user

router = APIRouter(prefix="/groups/{group_id}/goals", tags=["goals"])


class GoalCreate(BaseModel):
    title: str
    target_amount: float = Field(gt=0)


class GoalAdd(BaseModel):
    amount: float = Field(gt=0)


class GoalOut(BaseModel):
    id: int
    title: str
    target_amount: float
    saved_amount: float
    created_at: datetime


async def _check(db, group_id, current_user):
    result = await db.execute(select(Group).options(selectinload(Group.members)).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group or current_user.id not in [m.id for m in group.members]:
        raise HTTPException(403, "Нет доступа к группе")
    return group


@router.get("/", response_model=list[GoalOut])
async def list_goals(group_id: int, db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    result = await db.execute(select(Goal).where(Goal.group_id == group_id).order_by(Goal.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=GoalOut, status_code=201)
async def create_goal(group_id: int, payload: GoalCreate, db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    g = Goal(group_id=group_id, title=payload.title, target_amount=payload.target_amount)
    db.add(g)
    await db.flush()
    return g


@router.post("/{goal_id}/add", response_model=GoalOut)
async def add_to_goal(group_id: int, goal_id: int, payload: GoalAdd,
                      db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    g = await db.get(Goal, goal_id)
    if not g or g.group_id != group_id:
        raise HTTPException(404, "Цель не найдена")
    g.saved_amount += payload.amount
    await db.flush()
    return g


@router.delete("/{goal_id}")
async def delete_goal(group_id: int, goal_id: int, db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    await _check(db, group_id, current_user)
    g = await db.get(Goal, goal_id)
    if not g or g.group_id != group_id:
        raise HTTPException(404, "Цель не найдена")
    await db.delete(g)
    return {"ok": True}
