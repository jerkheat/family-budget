import { useEffect, useRef, useState } from "react";
import {
  Wallet, Target, TrendingDown, Coins, PiggyBank, Trash2, Check, Plus, CalendarDays, Settings, RefreshCw, BarChart3, LayoutGrid,
} from "lucide-react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

const svg = (s: string) => "data:image/svg+xml," + encodeURIComponent(s);

const ART = {
  travel: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='#E3F4FD'/><circle cx='72' cy='20' r='9' fill='#FFE9A8'/><path d='M0 60 Q24 52 48 60 T96 60 V96 H0 Z' fill='#8FDBCB'/><path d='M0 70 Q24 62 48 70 T96 70 V96 H0 Z' fill='#4BC0C0'/><path d='M20 26 l14 5 -14 5 3 -5 z' fill='#21A038'/></svg>"),
  car: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='#EAF4FF'/><circle cx='76' cy='18' r='8' fill='#FFE9A8'/><rect x='0' y='64' width='96' height='32' fill='#C3D2E0'/><rect x='16' y='44' width='56' height='20' rx='9' fill='#21A038'/><rect x='28' y='34' width='28' height='16' rx='7' fill='#2FB44A'/><rect x='32' y='38' width='9' height='8' rx='2' fill='#DFF3FF'/><rect x='45' y='38' width='9' height='8' rx='2' fill='#DFF3FF'/><circle cx='30' cy='66' r='7' fill='#22303F'/><circle cx='30' cy='66' r='3' fill='#8FDBCB'/><circle cx='58' cy='66' r='7' fill='#22303F'/><circle cx='58' cy='66' r='3' fill='#8FDBCB'/></svg>"),
  home: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='#F5EDDF'/><rect x='0' y='70' width='96' height='26' fill='#E3CFAC'/><rect x='18' y='32' width='12' height='32' rx='5' fill='#B4794A'/><rect x='18' y='52' width='44' height='14' rx='6' fill='#C98A5B'/><rect x='22' y='66' width='6' height='8' fill='#8A5A33'/><rect x='52' y='66' width='6' height='8' fill='#8A5A33'/><rect x='70' y='48' width='10' height='12' rx='2' fill='#21A038'/><rect x='72' y='60' width='6' height='10' fill='#B4794A'/><circle cx='75' cy='24' r='8' fill='#FFE9A8'/></svg>"),
  gadget: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='#E8F0FE'/><circle cx='78' cy='20' r='7' fill='#FFE9A8'/><rect x='20' y='28' width='56' height='36' rx='5' fill='#22303F'/><rect x='25' y='33' width='46' height='26' rx='3' fill='#8FDBCB'/><path d='M30 52 l10 -10 8 6 12 -12' stroke='#21A038' stroke-width='3' fill='none'/><rect x='14' y='64' width='68' height='7' rx='3.5' fill='#33475C'/></svg>"),
  pig: svg("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='#E9F7EC'/><circle cx='48' cy='30' r='9' fill='#FFCE56'/><rect x='46' y='25' width='4' height='10' rx='2' fill='#E0A800'/><ellipse cx='46' cy='60' rx='26' ry='19' fill='#F49CB1'/><path d='M28 46 l4 -10 8 6 z' fill='#F49CB1'/><circle cx='60' cy='54' r='3' fill='#7A2E40'/><ellipse cx='68' cy='62' rx='6' ry='5' fill='#EE7E9C'/><rect x='32' y='74' width='7' height='8' rx='3' fill='#EE7E9C'/><rect x='52' y='74' width='7' height='8' rx='3' fill='#EE7E9C'/></svg>"),
};

const goalArt = (title: string) => {
  const t = (title || "").toLowerCase();
  if (/(машин|авто|car|bmw|лада|тойот|мерседес)/.test(t)) return ART.car;
  if (/(стул|мебел|диван|дом|квартир|ремонт|кухн|стол)/.test(t)) return ART.home;
  if (/(ноутбук|телефон|iphone|гаджет|приставк|компьютер|pc|ps5|xbox|macbook)/.test(t)) return ART.gadget;
  if (/(турци|отпуск|море|сочи|путешеств|япони|египет|поездк|самолет|мальдив)/.test(t)) return ART.travel;
  return ART.pig;
};

export function Accounting() {
  const [data, setData] = useState<any>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [hasGroup, setHasGroup] = useState(true);
  const [incAmount, setIncAmount] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [limit, setLimit] = useState("");
  const [msg, setMsg] = useState("");
  const [goals, setGoals] = useState<any[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [addFor, setAddFor] = useState<number | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const incomeRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const load = (gid: number) => {
    api.get(`/api/groups/${gid}/accounting`).then(r => setData(r.data)).catch(() => {});
    api.get(`/api/groups/${gid}/goals/`).then(r => setGoals(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get("/api/groups/").then(r => {
      if (r.data.length) { setGroupId(r.data[0].id); load(r.data[0].id); }
      else setHasGroup(false);
    }).catch(() => setHasGroup(false));
  }, []);

  const addIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !incAmount) return;
    try {
      await api.post(`/api/groups/${groupId}/incomes`, {
        amount: parseFloat(incAmount), description: incDesc || "Пополнение бюджета",
      });
      setIncAmount(""); setIncDesc("");
      setMsg("✅ Доход внесён!");
      load(groupId);
    } catch { setMsg("❌ Ошибка"); }
  };

  const setBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !limit) return;
    try {
      await api.post(`/api/groups/${groupId}/budget`, { limit_amount: parseFloat(limit) });
      setLimit("");
      setMsg("✅ Бюджет на месяц установлен!");
      load(groupId);
    } catch { setMsg("❌ Ошибка"); }
  };

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !goalTitle || !goalTarget) return;
    try {
      await api.post(`/api/groups/${groupId}/goals/`, { title: goalTitle, target_amount: parseFloat(goalTarget) });
      setGoalTitle(""); setGoalTarget("");
      setMsg("✅ Цель создана! Откладывайте по чуть-чуть 💚");
      load(groupId);
    } catch (e: any) { setMsg("❌ Ошибка: " + (e?.response?.data?.detail || e?.message || "неизвестная")); }
  };

  const addToGoal = async (id: number) => {
    if (!groupId || !addAmount) return;
    try {
      await api.post(`/api/groups/${groupId}/goals/${id}/add`, { amount: parseFloat(addAmount) });
      setAddFor(null); setAddAmount("");
      setMsg("✅ Копилка пополнена!");
      load(groupId);
    } catch { setMsg("❌ Ошибка"); }
  };

  const deleteGoal = async (id: number) => {
    if (!groupId || !window.confirm("Удалить цель?")) return;
    await api.delete(`/api/groups/${groupId}/goals/${id}`).catch(() => {});
    load(groupId);
  };

  const rawMonth = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const monthLabel = rawMonth[0].toUpperCase() + rawMonth.slice(1);

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-sber-text mb-8">Бухгалтерия</h1>
        <div className="bg-white rounded-3xl p-12 shadow-card text-center text-sber-muted">
          Создайте группу, чтобы вести семейный учёт 📒
        </div>
      </div>
    );
  }

  const base = data?.base || 0;
  const spent = data?.spent || 0;
  const remaining = data?.remaining || 0;
  const income = data?.income_total || 0;
  const pct = base > 0 ? Math.min(100, Math.round((spent / base) * 100)) : 0;
  const incomePct = base > 0 ? Math.round((income / base) * 100) : 0;
  const leftPct = base > 0 ? Math.max(0, 100 - pct) : 0;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-sber-green";
  const status = pct >= 100 ? "Бюджет превышен 🛑" : pct >= 80 ? "Деньги заканчиваются ⚠️" : "Всё под контролем 💚";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Шапка */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sber-text mb-1">Бухгалтерия</h1>
          <p className="text-sber-muted">Общий бюджет семьи на этот месяц</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium text-sber-text shadow-card">
            <CalendarDays size={16} className="text-sber-green" />
            {monthLabel}
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="p-2.5 bg-white border border-gray-100 rounded-xl shadow-card hover:bg-sber-gray">
              <Settings size={16} className="text-sber-muted" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-card border border-gray-100 py-2 z-10">
                <button onClick={() => { setMenuOpen(false); navigate("/analytics"); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-sber-gray flex items-center gap-2">
                  <BarChart3 size={14} /> Аналитика
                </button>
                <button onClick={() => { setMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-sber-gray flex items-center gap-2">
                  <LayoutGrid size={14} /> Дашборд
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div className="mb-6 px-5 py-3 bg-sber-light text-sber-green rounded-2xl text-sm font-medium">{msg}</div>
      )}

      {/* Главные цифры */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat icon={<Wallet size={18} className="text-sber-green" />} bg="bg-sber-light"
          label="Доходы за месяц" value={`+${income.toLocaleString("ru-RU")} ₽`} valueColor="text-sber-green"
          sub={`${incomePct}% от бюджета`} />
        <Stat icon={<Target size={18} className="text-blue-500" />} bg="bg-blue-50"
          label="Бюджет на месяц" value={`${base.toLocaleString("ru-RU")} ₽`} valueColor="text-sber-text"
          sub="План на месяц" />
        <Stat icon={<TrendingDown size={18} className="text-red-500" />} bg="bg-red-50"
          label="Потрачено за месяц" value={`−${spent.toLocaleString("ru-RU")} ₽`} valueColor="text-red-500"
          sub={`${pct}% от бюджета`} />
        <Stat icon={<Coins size={18} className="text-sber-green" />} bg="bg-sber-light"
          label="Осталось в этом месяце" value={`${remaining.toLocaleString("ru-RU")} ₽`}
          valueColor={remaining >= 0 ? "text-sber-green" : "text-red-500"} sub={`${leftPct}% от бюджета`} />
      </div>

      {/* Прогресс-бар */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-sber-muted">Потрачено {pct}% бюджета</span>
          <span className="text-sm font-medium text-sber-green">{status}</span>
        </div>
        <div className="h-3 bg-sber-gray rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>

      {/* Формы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <form onSubmit={addIncome} className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 flex flex-col">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-sber-green" /> Внести доход
          </h3>
          <div className="space-y-3 flex-1 flex flex-col">
            <input ref={incomeRef} type="number" step="0.01" min="0.01" value={incAmount}
              onChange={e => setIncAmount(e.target.value)} placeholder="Сумма, ₽" required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <input type="text" value={incDesc} onChange={e => setIncDesc(e.target.value)}
              placeholder="Комментарий (зарплата, подработка...)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <button type="submit"
              className="w-full bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium mt-auto">
              Внести в общий бюджет
            </button>
          </div>
        </form>

        <form onSubmit={setBudget} className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 flex flex-col">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target size={18} className="text-blue-500" /> Бюджет на месяц
          </h3>
          <div className="space-y-3 flex-1 flex flex-col">
            <input type="number" step="0.01" min="0.01" value={limit}
              onChange={e => setLimit(e.target.value)} placeholder="Лимит трат на месяц, ₽" required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <p className="text-xs text-sber-muted leading-relaxed">
              Если лимит не задан, «осталось» считается из внесённых доходов. Когда останется меньше 20% — придёт уведомление 🔔
            </p>
            <button type="submit"
              className="w-full bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium mt-auto">
              Установить лимит
            </button>
          </div>
        </form>
      </div>

      {/* Цели-копилки */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <PiggyBank size={20} className="text-sber-green" /> Цели-копилки
        </h3>
        <form onSubmit={createGoal} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <input type="text" value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
            placeholder="Например: Отпуск в Сочи" required
            className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
          <input type="number" step="0.01" min="0.01" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
            placeholder="Целевая сумма, ₽" required
            className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
          <button type="submit" className="bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium">
            Создать цель
          </button>
        </form>

        {goals.length === 0 ? (
          <div className="p-8 text-center text-sber-muted">Целей пока нет — создайте первую копилку!</div>
        ) : (
          <div className="space-y-4">
            {goals.map(g => {
              const gpct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
              return (
                <div key={g.id} className="flex items-center gap-5 bg-sber-gray rounded-2xl p-4">
                  <img src={goalArt(g.title)} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sber-text">{g.title}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-sber-text">{gpct}%</span>
                        <button onClick={() => deleteGoal(g.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-sber-muted mb-2">
                      {g.saved_amount.toLocaleString("ru-RU")} ₽ из {g.target_amount.toLocaleString("ru-RU")} ₽
                    </div>
                    <div className="h-2.5 bg-white rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-sber-green to-sber-dark rounded-full transition-all"
                        style={{ width: `${gpct}%` }} />
                    </div>
                    {addFor === g.id ? (
                      <div className="flex gap-2">
                        <input type="number" step="0.01" min="0.01" value={addAmount}
                          onChange={e => setAddAmount(e.target.value)} placeholder="Сумма, ₽" autoFocus
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none text-sm bg-white" />
                        <button onClick={() => addToGoal(g.id)}
                          className="px-4 bg-sber-green hover:bg-sber-dark text-white rounded-xl">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setAddFor(null)}
                          className="px-3 bg-white text-sber-muted rounded-xl text-sm">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddFor(g.id); setAddAmount(""); }}
                        className="w-full py-2 bg-white hover:bg-sber-light text-sber-green rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                        <Plus size={14} /> Пополнить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Доходы за месяц */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Wallet size={18} className="text-sber-green" /> Доходы за этот месяц
        </h3>
        {(!data?.incomes || data.incomes.length === 0) ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sber-light flex items-center justify-center mb-3">
              <Wallet size={22} className="text-sber-green" />
            </div>
            <div className="text-sber-muted text-sm mb-4">Доходов пока нет — внесите первый!</div>
            <button onClick={() => incomeRef.current?.focus()}
              className="px-5 py-2.5 bg-sber-green hover:bg-sber-dark text-white rounded-xl text-sm font-medium">
              Внести доход
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.incomes.map((i: any) => (
              <div key={i.id} className="flex items-center gap-4 p-4 bg-sber-gray rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-sber-light flex items-center justify-center">
                  <span className="text-sber-green font-semibold">{i.username[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sber-text">{i.username}</div>
                  <div className="text-xs text-sber-muted">
                    {i.description} • {new Date(i.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div className="font-bold text-sber-green">+{i.amount.toLocaleString("ru-RU")} ₽</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, bg, label, value, valueColor, sub }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-xs text-sber-muted mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-sber-muted mt-1">{sub}</div>
    </div>
  );
}
