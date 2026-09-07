from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.models import Currency, Category


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    username: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    currency: Currency


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    currency: Optional[Currency] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    currency: Currency = Currency.RUB


class GroupOut(BaseModel):
    avatar_url: Optional[str] = None
    id: int
    name: str
    description: Optional[str] = None
    invite_code: str
    currency: Currency
    members_count: int


class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    category: Category
    description: Optional[str] = None
    split_user_ids: list[int] = []
    occurred_at: Optional[datetime] = None


class TransactionOut(BaseModel):
    id: int
    group_id: int
    payer: UserOut
    amount: float
    category: Category
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    occurred_at: datetime
    splits: list[dict]


class BalanceItem(BaseModel):
    user_id: int
    username: str
    balance: float


class DebtEdge(BaseModel):
    from_user: UserOut
    to_user: UserOut
    amount: float


class AIInsight(BaseModel):
    kind: str
    title: str
    message: str
    severity: str = "info"
    metadata: dict = {}


class DebtReminder(BaseModel):
    debtor: UserOut
    creditor: UserOut
    amount: float
    message: str


