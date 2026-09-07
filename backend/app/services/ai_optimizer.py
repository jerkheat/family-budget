import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Transaction
from app.schemas.schemas import AIInsight

CAT_NAMES = {
    "groceries": "Продукты", "utilities": "Коммуналка", "transport": "Транспорт",
    "entertainment": "Развлечения", "clothing": "Одежда", "health": "Здоровье", "other": "Прочее",
}


class AIOptimizer:
    def __init__(self, cache):
        self.cache = cache

    async def analyze(self, db: AsyncSession, group_id: int) -> list[AIInsight]:
        cache_key = f"ai:{group_id}"
        try:
            cached = await self.cache.get(cache_key)
            if cached:
                return [AIInsight(**x) for x in json.loads(cached)]
        except Exception:
            pass

        df = await self._load(db, group_id)
        if len(df) < 3:
            return [AIInsight(kind="info", title="Мало данных",
                message="Добавьте ещё несколько трат — и я покажу умную аналитику 💡")]

        insights = []
        insights.extend(self._patterns(df))
        insights.extend(self._savings(df))
        insights.extend(self._forecast(df))

        try:
            await self.cache.setex(cache_key, 3600, json.dumps([i.model_dump() for i in insights]))
        except Exception:
            pass
        return insights

    async def _load(self, db, group_id) -> pd.DataFrame:
        result = await db.execute(select(Transaction).where(Transaction.group_id == group_id))
        txs = result.scalars().all()
        if not txs:
            return pd.DataFrame()
        return pd.DataFrame([{
            "amount": t.amount, "category": t.category.value, "date": t.occurred_at,
        } for t in txs])

    def _patterns(self, df):
        insights = []
        df = df.sort_values("date")
        for category, group in df.groupby("category"):
            if len(group) < 3:
                continue
            amounts = group["amount"].tolist()
            for i in range(2, len(amounts)):
                w = amounts[i-2:i+1]
                mean = np.mean(w)
                if mean > 0 and max(w) - min(w) < mean * 0.2:
                    insights.append(AIInsight(
                        kind="pattern",
                        title=f"Повторяющиеся траты: {CAT_NAMES.get(category, category)}",
                        message=f"Заметили регулярные траты ~{mean:.0f} ₽ в категории «{CAT_NAMES.get(category, category)}». Возможно, это подписка или регулярная покупка.",
                        metadata={"category": category, "avg_amount": round(float(mean), 2)},
                    ))
                    break
        return insights

    def _savings(self, df):
        insights = []
        for category, group in df.groupby("category"):
            if len(group) < 5:
                continue
            total = group["amount"].sum()
            if category == "groceries" and len(group) > 7:
                savings = total * 0.15
                insights.append(AIInsight(
                    kind="saving_tip", title="💰 Совет: закупайтесь оптом",
                    message=f"Вы делаете {len(group)} походов за продуктами на сумму {total:.0f} ₽. Если закупать оптом раз в неделю, сэкономите ~{savings:.0f} ₽ (15%).",
                    severity="success",
                    metadata={"potential_saving": round(float(savings), 2)},
                ))
            if category == "entertainment" and total > df["amount"].sum() * 0.3:
                insights.append(AIInsight(
                    kind="saving_tip", title="🎬 Развлечения занимают много бюджета",
                    message=f"На развлечения потрачено {total:.0f} ₽ — это {total/df['amount'].sum()*100:.0f}% всех трат.",
                    severity="warning",
                ))
        return insights

    def _forecast(self, df):
        insights = []
        df = df.sort_values("date").copy()
        df["days"] = (df["date"] - df["date"].min()).dt.days
        if df["days"].max() < 2:
            return insights
        X = df[["days"]].values
        y = df["amount"].cumsum().values
        model = LinearRegression().fit(X, y)
        daily_rate = float(model.coef_[0])
        if daily_rate <= 0:
            return insights
        last_day = df["days"].max()
        forecast_30 = float(model.predict([[last_day + 30]])[0])
        current = float(y[-1])
        insights.append(AIInsight(
            kind="forecast", title="📈 Прогноз расходов",
            message=f"Средний темп трат: {daily_rate:.0f} ₽/день. За следующие 30 дней потратите ~{forecast_30 - current:.0f} ₽.",
            severity="info" if daily_rate < 1500 else "warning",
            metadata={"daily_rate": round(daily_rate, 2)},
        ))
        return insights


def generate_debt_reminder(debtor: str, creditor: str, amount: float, currency: str) -> str:
    cur = {"RUB": "₽", "USD": "$", "EUR": "€"}.get(currency, currency)
    variants = [
        f"Привет, {debtor}! 👋 Напоминаю: ты должен(на) {creditor} {amount:.0f} {cur}. Будем рады, если закроешь долг в ближайшее время 🙏",
        f"{debtor}, добрый день! Не забудь, пожалуйста, перевести {amount:.0f} {cur} {creditor} — это за общие траты 💚",
        f"Мягкое напоминание для {debtor}: осталось вернуть {amount:.0f} {cur} {creditor}. Спасибо! 🌱",
    ]
    return variants[int(amount) % len(variants)]
