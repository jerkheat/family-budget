import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean, Table
from sqlalchemy.orm import relationship
from app.core.database import Base


class Role(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"
    OBSERVER = "observer"


class Currency(str, enum.Enum):
    RUB = "RUB"
    USD = "USD"
    EUR = "EUR"


class Category(str, enum.Enum):
    GROCERIES = "groceries"
    UTILITIES = "utilities"
    TRANSPORT = "transport"
    ENTERTAINMENT = "entertainment"
    CLOTHING = "clothing"
    HEALTH = "health"
    OTHER = "other"


memberships = Table(
    "memberships", Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
    Column("group_id", Integer, ForeignKey("groups.id", ondelete="CASCADE")),
    Column("role", Enum(Role), default=Role.MEMBER),
    Column("joined_at", DateTime, default=datetime.utcnow),
)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    telegram_id = Column(Integer, unique=True, nullable=True, index=True)
    username = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    currency = Column(Enum(Currency), default=Currency.RUB)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    groups = relationship("Group", secondary=memberships, back_populates="members")
    transactions = relationship("Transaction", back_populates="payer")


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    currency = Column(Enum(Currency), default=Currency.RUB)
    created_at = Column(DateTime, default=datetime.utcnow)
    members = relationship("User", secondary=memberships, back_populates="groups")
    transactions = relationship("Transaction", back_populates="group", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(Enum(Category), nullable=False)
    description = Column(String, nullable=True)
    receipt_url = Column(String, nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    group = relationship("Group", back_populates="transactions")
    payer = relationship("User", back_populates="transactions")
    splits = relationship("TransactionSplit", back_populates="transaction", cascade="all, delete-orphan")


class TransactionSplit(Base):
    __tablename__ = "transaction_splits"
    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    share = Column(Float, nullable=False)
    transaction = relationship("Transaction", back_populates="splits")
    user = relationship("User")


class DebtSettlement(Base):
    __tablename__ = "debt_settlements"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    settled_at = Column(DateTime, default=datetime.utcnow)
    group = relationship("Group")
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])



class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(String, nullable=False, default="")
    pinned = Column(Boolean, default=False)
    highlighted = Column(Boolean, default=False)
    reply_to_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    image_url = Column(String, nullable=True)
    audio_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")



class Income(Base):
    __tablename__ = "incomes"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")


class BudgetLimit(Base):
    __tablename__ = "budget_limits"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), unique=True)
    limit_amount = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    saved_amount = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


