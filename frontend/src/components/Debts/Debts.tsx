import { useEffect, useState } from "react";
import { Coins, CheckCircle2, History, ArrowRight, Plus } from "lucide-react";
import { pickGroup } from "../../services/groupPick";
import { api } from "../../services/api";

export function Debts() {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [hasGroup, setHasGroup] = useState(true);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [debtorId, setDebtorId] = useState("");
  const [creditorId, setCreditorId] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");

  const load = async (gid: number) => {
    try {
      const [b, d, h, m] = await Promise.all([
        api.get(`/api/groups/${gid}/balances`).catch(() => ({ data: [] })),
        api.get(`/api/groups/${gid}/debts`).catch(() => ({ data: [] })),
        api.get(`/api/groups/${gid}/settlements`).catch(() => ({ data: [] })),
        api.get(`/api/groups/${gid}/members`).catch(() => ({ data: [] })),
      ]);
      setBalances(b.data); setDebts(d.data); setHistory(h.data); setMembers(m.data);
    } catch {}
  };

  useEffect(() => {
    api.get("/api/groups/").then(r => {
      if (r.data.length) { setGroupId(pickGroup(r.data).id); load(pickGroup(r.data).id); }
      else setHasGroup(false);
    }).catch(() => setHasGroup(false));
  }, []);

  const addManualDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    if (!debtorId || !creditorId || debtorId === creditorId) {
      setMsg("❌ Выберите двух разных участников");
      return;
    }
    try {
      const debtor = members.find(m => m.id === Number(debtorId));
      await api.post(`/api/groups/${groupId}/transactions/`, {
        amount: parseFloat(amount),
        category: "other",
        description: comment || `Долг: ${debtor?.username} занял(а)`,
        split_user_ids: [Number(debtorId)],
        payer_id: Number(creditorId),
      });
      setMsg("✅ Долг добавлен!");
      setShowForm(false); setAmount(""); setComment("");
      load(groupId);
    } catch { setMsg("❌ Ошибка при добавлении долга"); }
  };

  const settle = async (edge: any) => {
    if (!groupId) return;
    if (!window.confirm(`Подтвердить: ${edge.from_user.username} вернул(а) ${edge.amount.toLocaleString("ru-RU")} ₽ — ${edge.to_user.username}?`)) return;
    try {
      await api.post(`/api/groups/${groupId}/settlements`, {
        from_user_id: edge.from_user.id, to_user_id: edge.to_user.id, amount: edge.amount,
      });
      setMsg("✅ Долг отмечен как возвращённый!");
      load(groupId);
    } catch { setMsg("❌ Ошибка при отметке возврата"); }
  };

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-sber-text mb-8">Долги</h1>
        <div className="bg-white rounded-3xl p-12 shadow-card text-center text-sber-muted">
          Создайте группу и добавьте траты — здесь появится расчёт долгов 💳
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-sber-text">Долги</h1>
        <button onClick={() => { setShowForm(!showForm); setMsg(""); }}
          className="px-4 py-2.5 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium flex items-center gap-2">
          <Plus size={18} /> Добавить долг
        </button>
      </div>
      <p className="text-sber-muted mb-8">Долги считаются автоматически из трат + можно добавить вручную</p>

      {msg && <div className="bg-sber-light text-sber-green p-3 rounded-xl text-sm mb-6">{msg}</div>}

      {showForm && (
        <form onSubmit={addManualDebt} className="bg-white rounded-3xl p-6 shadow-card mb-8">
          <h3 className="font-semibold mb-4">Кто и у кого занял?</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={debtorId} onChange={e => setDebtorId(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" required>
              <option value="">Кто занял…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
            <select value={creditorId} onChange={e => setCreditorId(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" required>
              <option value="">У кого…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Сумма, ₽" required
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <input type="text" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Комментарий"
              className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <button type="submit" className="bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium">
              Добавить
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {balances.map(b => (
          <div key={b.user_id} className="bg-white rounded-3xl p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sber-light flex items-center justify-center">
                <span className="text-sber-green font-semibold">{b.username[0]?.toUpperCase()}</span>
              </div>
              <div className="font-medium text-sber-text">{b.username}</div>
            </div>
            <div className={`text-2xl font-bold ${b.balance > 0 ? "text-sber-green" : b.balance < 0 ? "text-red-500" : "text-sber-muted"}`}>
              {b.balance > 0 ? "+" : ""}{b.balance.toLocaleString("ru-RU")} ₽
            </div>
            <div className="text-xs text-sber-muted mt-1">
              {b.balance > 0 ? "ему должны 💚" : b.balance < 0 ? "он должен ⏳" : "баланс сведён ✅"}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Coins size={20} className="text-sber-green" />
          <h3 className="font-semibold">Кто кому должен</h3>
        </div>
        {debts.length === 0 ? (
          <div className="p-8 text-center text-sber-muted">Никто никому не должен — все балансы сведены! 💚</div>
        ) : (
          <div className="space-y-3">
            {debts.map((d, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-sber-gray rounded-2xl">
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sber-text">{d.from_user.username}</span>
                  <ArrowRight size={16} className="text-sber-muted flex-shrink-0" />
                  <span className="font-medium text-sber-text">{d.to_user.username}</span>
                </div>
                <div className="font-bold text-red-500">{d.amount.toLocaleString("ru-RU")} ₽</div>
                <button onClick={() => settle(d)}
                  className="px-4 py-2 bg-sber-green hover:bg-sber-dark text-white rounded-xl text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} /> Возвращено
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} className="text-sber-green" />
          <h3 className="font-semibold">История возвратов</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-sber-muted">Возвратов пока не было</div>
        ) : (
          <div className="space-y-3">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-4 p-4 bg-sber-gray rounded-2xl">
                <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-sber-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sber-text">
                    {h.from_user.username} вернул(а) {h.to_user.username}
                  </div>
                  <div className="text-xs text-sber-muted">{new Date(h.settled_at).toLocaleString("ru-RU")}</div>
                </div>
                <div className="font-bold text-sber-green">{h.amount.toLocaleString("ru-RU")} ₽</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
