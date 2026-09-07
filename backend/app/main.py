from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import models as _models  # noqa: F401
from app.api import auth, groups, transactions, balances, ai_analytics, chat, accounting, goals
import os
from sqlalchemy import text
from fastapi.staticfiles import StaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for ddl in [
            "ALTER TABLE messages ADD COLUMN pinned BOOLEAN DEFAULT 0",
            "ALTER TABLE messages ADD COLUMN highlighted BOOLEAN DEFAULT 0",
            "ALTER TABLE messages ADD COLUMN reply_to_id INTEGER",
            "ALTER TABLE messages ADD COLUMN image_url VARCHAR",
            "ALTER TABLE messages ADD COLUMN audio_url VARCHAR",
        ]:
            try:
                await conn.execute(text(ddl))
            except Exception:
                pass
    yield


app = FastAPI(title="FamilyBudget API", version="1.0.0", docs_url="/docs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(balances.router, prefix="/api")
app.include_router(ai_analytics.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(chat.files_router, prefix="/api")
app.include_router(accounting.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
os.makedirs("static", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME}






