from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Transaction, DebtSettlement


async def calculate_balances(db: AsyncSession, group_id: int) -> dict[int, float]:
    """Сальдо = заплаченное - доли + учтённые возвраты долгов."""
    stmt = (
        select(Transaction)
        .where(Transaction.group_id == group_id)
        .options(selectinload(Transaction.splits))
    )
    result = await db.execute(stmt)
    txs = result.scalars().all()

    balances: dict[int, float] = defaultdict(float)
    for tx in txs:
        balances[tx.payer_id] += tx.amount
        for split in tx.splits:
            balances[split.user_id] -= split.share

    # Учитываем отмеченные возвраты
    result = await db.execute(select(DebtSettlement).where(DebtSettlement.group_id == group_id))
    for s in result.scalars():
        balances[s.from_user_id] += s.amount
        balances[s.to_user_id] -= s.amount

    return dict(balances)


def minimize_debts(balances: dict[int, float]) -> list[tuple[int, int, float]]:
    creditors = sorted([(u, b) for u, b in balances.items() if b > 0.01], key=lambda x: -x[1])
    debtors = sorted([(u, -b) for u, b in balances.items() if b < -0.01], key=lambda x: -x[1])

    settlements = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt = debtors[i]
        creditor_id, credit = creditors[j]
        transfer = min(debt, credit)
        if transfer > 0.01:
            settlements.append((debtor_id, creditor_id, round(transfer, 2)))
        debtors[i] = (debtor_id, debt - transfer)
        creditors[j] = (creditor_id, credit - transfer)
        if debtors[i][1] < 0.01:
            i += 1
        if creditors[j][1] < 0.01:
            j += 1
    return settlements
