import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Group, User
from app.schemas.schemas import GroupCreate, GroupOut, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


class JoinRequest(BaseModel):
    invite_code: str


@router.post("/", response_model=GroupOut, status_code=201)
async def create_group(payload: GroupCreate, db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    existing = await db.execute(select(Group).where(Group.members.any(id=current_user.id)))
    if existing.scalars().first():
        raise HTTPException(400, "Вы уже состоите в группе. Сначала выйдите из текущей.")
    group = Group(name=payload.name, description=payload.description,
                  currency=payload.currency, invite_code=secrets.token_urlsafe(8))
    group.members.append(current_user)
    db.add(group)
    await db.flush()
    return GroupOut(id=group.id, name=group.name, description=group.description,
                    invite_code=group.invite_code, currency=group.currency, members_count=1,
                    avatar_url=group.avatar_url)


@router.post("/join", response_model=GroupOut)
async def join_group(payload: JoinRequest, db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    existing = await db.execute(select(Group).where(Group.members.any(id=current_user.id)))
    if existing.scalars().first():
        raise HTTPException(400, "Вы уже состоите в группе. Сначала выйдите из текущей.")
    result = await db.execute(
        select(Group).options(selectinload(Group.members))
        .where(Group.invite_code == payload.invite_code.strip())
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Группа с таким кодом не найдена")
    if any(m.id == current_user.id for m in group.members):
        raise HTTPException(400, "Вы уже участник этой группы")
    group.members.append(current_user)
    await db.flush()
    return GroupOut(id=group.id, name=group.name, description=group.description,
                    invite_code=group.invite_code, currency=group.currency,
                    members_count=len(group.members), avatar_url=group.avatar_url)


@router.get("/{group_id}/members", response_model=list[UserOut])
async def list_members(group_id: int, db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Группа не найдена")
    return [UserOut.model_validate(m) for m in group.members]


@router.post("/{group_id}/leave")
async def leave_group(group_id: int, db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(404, "Группа не найдена")
    if not any(m.id == current_user.id for m in group.members):
        raise HTTPException(400, "Вы не участник этой группы")
    group.members.remove(current_user)
    await db.flush()
    if len(group.members) == 0:
        await db.delete(group)
    return {"ok": True}


@router.get("/", response_model=list[GroupOut])
async def list_groups(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).options(selectinload(Group.members))
        .where(Group.members.any(id=current_user.id))
    )
    groups = result.scalars().all()
    return [GroupOut(id=g.id, name=g.name, description=g.description, invite_code=g.invite_code,
                     currency=g.currency, members_count=len(g.members),
                     avatar_url=g.avatar_url) for g in groups]



@router.patch("/{group_id}/avatar")
async def set_group_avatar(group_id: int, payload: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.models import Group
    grp = await db.get(Group, group_id)
    if not grp:
        raise HTTPException(404, "Группа не найдена")
    grp.avatar_url = payload.get("avatar_url")
    await db.commit()
    return {"ok": True}

