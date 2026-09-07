"""AI-ассистент: нейросеть + rule-based фолбэк."""
from datetime import datetime
import pandas as pd
from sklearn.linear_model import LinearRegression
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.models import Transaction, User
from app.services.budget_calculator import calculate_balances, minimize_debts
from app.services.llm import llm_answer, llm_quick

CAT_NAMES = {
    "groceries": "Продукты", "utilities": "Коммуналка", "transport": "Транспорт",
    "entertainment": "Развлечения", "clothing": "Одежда", "health": "Здоровье", "other": "Прочее",
}


class AIAssistant:
    async def answer(self, db, group_id: int, message: str, user_name: str = "друг") -> str:
        msg = message.lower()
        txs = await self._load(db, group_id)

        if any(w in msg for w in ["привет", "здравств", "хай", "добрый"]) and not txs:
            return (f"Привет, {user_name}! 👋 Пока нет трат — добавьте пару в разделе "
                    "«Траты», и я начну анализировать ваш бюджет!")

        # ---------- Сначала пробуем нейросеть ----------
        context = await self._full_context(db, group_id, txs)
        llm_reply = await llm_answer(context, message)
        if llm_reply:
            return llm_reply

        # ---------- Фолбэк без нейросети ----------
        if not txs:
            return ("Пока нет трат 🌱 Добавьте пару в разделе «Траты» — "
                    "и я смогу их проанализировать!")

        total = sum(t.amount for t in txs)

        if any(w in msg for w in ["долг", "кто кому", "должен"]):
            return await self._debts(db, group_id)
        if any(w in msg for w in ["сэконом", "совет", "эконом", "сократ"]):
            return self._savings(txs, total)
        if any(w in msg for w in ["прогноз", "предска", "когда законч", "хватит", "месяц"]):
            return self._forecast(txs)
        if any(w in msg for w in ["самая большая", "крупн", "топ", "максим"]):
            t = max(txs, key=lambda x: x.amount)
            return (f"Самая крупная трата — {t.amount:,.0f} ₽: «{t.description or CAT_NAMES[t.category]}» "
                    f"({t.payer.username}, {t.occurred_at:%d.%m.%Y}).")
        if any(w in msg for w in ["категор", "куда", "на что"]):
            return self._categories(txs, total)
        if any(w in msg for w in ["кто оплат", "кто платил", "кто сколько"]):
            return self._payers(txs)
        if any(w in msg for w in ["сколько", "всего", "сумма", "потрат"]):
            return (f"Всего вы потратили {total:,.0f} ₽ за {len(txs)} транзакций. "
                    f"Средний чек — {total / len(txs):,.0f} ₽.")
        return ("Я пока учусь 🤔 Попробуйте спросить:\n"
                "• «Сколько всего потратили?»\n• «Кто кому должен?»\n"
                "• «Дай совет по экономии»\n• «Прогноз на месяц»")

    async def _load(self, db, group_id):
        result = await db.execute(
            select(Transaction).where(Transaction.group_id == group_id)
            .options(selectinload(Transaction.payer), selectinload(Transaction.splits))
        )
        return result.scalars().all()

    async def _build_context(self, db, group_id, txs) -> str:
        """Собираем все данные группы в текст для нейросети."""
        if not txs:
            return "Трат в группе пока нет."
        total = sum(t.amount for t in txs)
        by_cat, by_payer = {}, {}
        for t in txs:
            by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
            by_payer[t.payer.username] = by_payer.get(t.payer.username, 0) + t.amount

        balances = await calculate_balances(db, group_id)
        edges = minimize_debts(balances)
        user_ids = list({uid for e in edges for uid in (e[0], e[1])})
        users = {}
        if user_ids:
            r = await db.execute(select(User).where(User.id.in_(user_ids)))
            users = {u.id: u.username for u in r.scalars().all()}
        debts = "; ".join(f"{users[f]} должен {users[t]} {a:.0f} руб" for f, t, a in edges) or "долгов нет"

        top = sorted(txs, key=lambda x: -x.amount)[:3]
        top_lines = "; ".join(f"«{t.description or CAT_NAMES[t.category]}» — {t.amount:.0f} руб" for t in top)
        cats = "; ".join(f"{CAT_NAMES.get(c, c)}: {v:.0f} руб" for c, v in sorted(by_cat.items(), key=lambda x: -x[1]))
        payers = "; ".join(f"{n}: {v:.0f} руб" for n, v in sorted(by_payer.items(), key=lambda x: -x[1]))

        return (
            f"Всего потрачено: {total:.0f} руб, транзакций: {len(txs)}.\n"
            f"По категориям: {cats}.\n"
            f"Кто оплачивал: {payers}.\n"
            f"Долги: {debts}.\n"
            f"Топ трат: {top_lines}."
        )

    async def _debts(self, db, group_id) -> str:
        balances = await calculate_balances(db, group_id)
        edges = minimize_debts(balances)
        if not edges:
            return "Отличные новости: никто никому не должен! Все балансы сведены 💚"
        user_ids = list({uid for e in edges for uid in (e[0], e[1])})
        result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = {u.id: u for u in result.scalars().all()}
        lines = [f"• {users[f].username} → {users[t].username}: {a:,.0f} ₽" for f, t, a in edges]
        return "Вот текущие долги:\n" + "\n".join(lines)

    def _savings(self, txs, total) -> str:
        tips = []
        by_cat = {}
        for t in txs:
            by_cat[t.category] = by_cat.get(t.category, []) + [t.amount]
        groc = by_cat.get("groceries", [])
        if len(groc) > 3:
            s = sum(groc) * 0.15
            tips.append(f"• За продукты вы сходили {len(groc)} раз на {sum(groc):,.0f} ₽. "
                        f"Закупайтесь оптом раз в неделю — сэкономите ~{s:,.0f} ₽ (15%).")
        ent = sum(by_cat.get("entertainment", []))
        if ent > total * 0.25:
            tips.append(f"• Развлечения занимают {ent / total * 100:.0f}% бюджета "
                        f"({ent:,.0f} ₽) — стоит пересмотреть.")
        if not tips:
            return ("Расходы выглядят сбалансированно! 👍 Продолжайте вести учёт — "
                    "я подскажу, если найду способ сэкономить.")
        return "Мои советы:\n" + "\n".join(tips)

    def _forecast(self, txs) -> str:
        df = pd.DataFrame([{"date": t.occurred_at, "amount": t.amount} for t in txs]).sort_values("date")
        df["days"] = (df["date"] - df["date"].min()).dt.days
        if df["days"].max() < 2:
            return "Данных пока мало для прогноза — добавляйте траты в разные дни 📈"
        model = LinearRegression().fit(df[["days"]].values, df["amount"].cumsum().values)
        rate = float(model.coef_[0])
        if rate <= 0:
            return "Траты не растут — отлично! 🎉"
        current = float(df["amount"].cumsum().values[-1])
        return (f"Ваш темп — ~{rate:,.0f} ₽/день. За ближайшие 30 дней вы потратите "
                f"примерно {rate * 30:,.0f} ₽ (текущий итог: {current:,.0f} ₽).")

    def _categories(self, txs, total) -> str:
        by = {}
        for t in txs:
            by[t.category] = by.get(t.category, 0) + t.amount
        lines = [f"• {CAT_NAMES.get(c, c)}: {v:,.0f} ₽ ({v / total * 100:.0f}%)"
                 for c, v in sorted(by.items(), key=lambda x: -x[1])]
        return "Расходы по категориям:\n" + "\n".join(lines)

    def _payers(self, txs) -> str:
        by = {}
        for t in txs:
            by[t.payer.username] = by.get(t.payer.username, 0) + t.amount
        lines = [f"• {name}: {v:,.0f} ₽" for name, v in sorted(by.items(), key=lambda x: -x[1])]
        return "Кто сколько оплатил:\n" + "\n".join(lines)

    async def random_tip(self, db, group_id: int) -> str:
        """Случайный подходящий совет на основе данных группы."""
        import random
        from app.models.models import BudgetLimit

        txs = await self._load(db, group_id)
        candidates = []
        if txs:
            total = sum(t.amount for t in txs)
            by_cat = {}
            for t in txs:
                by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
            top_cat, top_sum = max(by_cat.items(), key=lambda x: x[1])
            candidates.append(f"Больше всего уходит на «{CAT_NAMES.get(top_cat, top_cat)}» — {top_sum / total * 100:.0f}% бюджета. Попробуйте поставить лимит на эту категорию.")
            groc = by_cat.get("groceries", 0)
            if groc:
                candidates.append(f"На продукты вы потратили {groc:,.0f} ₽. Одна крупная закупка в неделю вместо мелких сэкономит ~{groc * 0.15:,.0f} ₽.")
            ent = by_cat.get("entertainment", 0)
            if ent > total * 0.15:
                candidates.append(f"Развлечения занимают {ent / total * 100:.0f}% бюджета. Это здорово, но поищите более бюджетные варианты досуга.")
            largest = max(txs, key=lambda t: t.amount)
            candidates.append(f"Крупнейшая трата — «{largest.description or CAT_NAMES[largest.category]}» на {largest.amount:,.0f} ₽. Убедитесь, что она разделена между всеми участниками.")
            candidates.append(f"Средний чек — {total / len(txs):,.0f} ₽ при {len(txs)} транзакциях. Именно мелкие регулярные траты съедают бюджет незаметно.")

        result = await db.execute(select(BudgetLimit).where(BudgetLimit.group_id == group_id))
        bl = result.scalar_one_or_none()
        if bl:
            now = datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            r2 = await db.execute(select(Transaction).where(Transaction.group_id == group_id, Transaction.occurred_at >= month_start))
            spent = sum(t.amount for t in r2.scalars().all())
            left = bl.limit_amount - spent
            if left < 0:
                candidates.append(f"Бюджет превышен на {abs(left):,.0f} ₽. Составьте план на неделю без необязательных трат.")
            elif left < bl.limit_amount * 0.2:
                candidates.append(f"До конца месяца осталось {left:,.0f} ₽. Отложите необязательные покупки.")
            else:
                candidates.append(f"В этом месяце свободно ещё {left:,.0f} ₽ — можно безболезненно отложить {left * 0.1:,.0f} ₽ в копилку.")

        angle = random.choice(["экономия", "паттерны трат", "прогноз на месяц", "справедливое распределение", "финансовые привычки"])
        context = await self._full_context(db, group_id, txs)
        llm = None  # бережём квоту для чата: llm_quick(context, f"Дай один короткий (1-2 предложения), дружелюбный и конкретный совет по этому бюджету. Ракурс: {angle}.")
        if llm:
            return llm
        if not candidates:
            return "Добавьте первые траты — и я подскажу, куда уходят деньги и как сэкономить."
        return random.choice(candidates)

    async def monthly_report(self, db, group_id: int) -> str:
        """Текстовый отчёт за месяц: нейросеть или умный шаблон."""
        txs = await self._load(db, group_id)
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_txs = [t for t in txs if t.occurred_at >= month_start]
        use = month_txs or txs
        if not use:
            return "За этот период трат ещё нет — добавьте первые, и я составлю отчёт."
        total = sum(t.amount for t in use)
        by_cat, by_payer = {}, {}
        for t in use:
            by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
            by_payer[t.payer.username] = by_payer.get(t.payer.username, 0) + t.amount
        top = sorted(by_cat.items(), key=lambda x: -x[1])
        largest = max(use, key=lambda t: t.amount)
        context = (
            f"Трат за период: {len(use)}, на сумму {total:.0f} руб.\n"
            "По категориям: " + "; ".join(f"{CAT_NAMES.get(c, c)}: {v:.0f} руб" for c, v in top) + "\n"
            "Кто платил: " + "; ".join(f"{n}: {v:.0f} руб" for n, v in sorted(by_payer.items(), key=lambda x: -x[1])) + "\n"
            f"Крупнейшая трата: {largest.description or CAT_NAMES[largest.category]} — {largest.amount:.0f} руб."
        )
        llm = await llm_quick(context, "Составь дружелюбный месячный отчёт о семейном бюджете: итоги, главные категории, 2-3 вывода и совета. До 150 слов.", 15)
        if llm:
            return llm
        lines = [f"📊 Отчёт: {len(use)} трат на {total:,.0f} ₽.", "По категориям:"]
        lines += [f"• {CAT_NAMES.get(c, c)}: {v:,.0f} ₽ ({v / total * 100:.0f}%)" for c, v in top]
        lines.append(f"Крупнейшая трата: «{largest.description or CAT_NAMES[largest.category]}» — {largest.amount:,.0f} ₽.")
        lines.append(f"Активнее всех платил: {max(by_payer.items(), key=lambda x: x[1])[0]}.")
        lines.append("Совет: следите за крупнейшей категорией — там прячется экономия 💚")
        return "\n".join(lines)





    async def _full_context(self, db, group_id: int, txs) -> str:
        """Расширенный контекст: базовый + бюджет, доходы, цели."""
        from app.models.models import BudgetLimit, Income, Goal
        base = await self._build_context(db, group_id, txs)
        extra = []
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        r = await db.execute(select(BudgetLimit).where(BudgetLimit.group_id == group_id))
        bl = r.scalar_one_or_none()
        if bl:
            r2 = await db.execute(select(Transaction).where(
                Transaction.group_id == group_id, Transaction.occurred_at >= month_start))
            spent = sum(t.amount for t in r2.scalars().all())
            extra.append(f"Бюджет на месяц: {bl.limit_amount:.0f} руб, потрачено: {spent:.0f} руб, осталось: {bl.limit_amount - spent:.0f} руб.")
        r = await db.execute(select(Income).where(Income.group_id == group_id, Income.created_at >= month_start))
        inc = sum(i.amount for i in r.scalars().all())
        if inc:
            extra.append(f"Доходы группы за месяц: {inc:.0f} руб.")
        r = await db.execute(select(Goal).where(Goal.group_id == group_id))
        goals = r.scalars().all()
        if goals:
            extra.append("Цели-копилки: " + "; ".join(
                f"{g.title} — накоплено {g.saved_amount:.0f} из {g.target_amount:.0f} руб" for g in goals) + ".")
        return base + "\n" + "\n".join(extra)



