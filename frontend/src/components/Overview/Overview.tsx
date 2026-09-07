import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Legend,
} from "chart.js";
import { Wallet, TrendingDown, PiggyBank, Receipt, Users, ArrowRight, Sparkles, RefreshCw, Coins } from "lucide-react";
import { api } from "../../services/api";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const CAT: Record<string, string> = {
  groceries: "Продукты", utilities: "Коммуналка", transport: "Транспорт",
  entertainment: "Развлечения", clothing: "Одежда", health: "Здоровье", other: "Прочее",
};
const CAT_COLORS: Record<string, string> = {
  groceries: "#21A038", utilities: "#9966FF", transport: "#4BC0C0",
  entertainment: "#FFCE56", clothing: "#FF6384", health: "#36A2EB", other: "#999999",
};

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

export function Overview() {
  const [groupName, setGroupName] = useState("");
  const [txs, setTxs] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [acc, setAcc] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [addFor, setAddFor] = useState<number | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasGroup, setHasGroup] = useState(true);
  const [tip, setTip] = useState("");
  const [gid, setGid] = useState<number | null>(null);
  const navigate = useNavigate();

  const [tipLoading, setTipLoading] = useState(false);

  const loadTip = async (id: number) => {
    setTipLoading(true);
    try {
      const r = await api.get(`/api/ai/groups/${id}/tip`);
      setTip(r.data.tip);
    } catch {
      setTip("Не получилось сгенерировать совет — нажми «Другой совет» 🔄");
    } finally {
      setTipLoading(false);
    }
  };

  const loadGoals = async (id: number) => {
    try {
      const r = await api.get(`/api/groups/${id}/goals/`);
      setGoals(r.data);
    } catch {}
  };

  const addToGoal = async (id: number) => {
    if (!addAmount) return;
    try {
      let groupId = gid;
      if (!groupId) {
        const g = await api.get("/api/groups/");
        if (!g.data.length) return;
        groupId = g.data[0].id;
        setGid(groupId);
      }
      await api.post(`/api/groups/${groupId}/goals/${id}/add`, { amount: parseFloat(addAmount) });
      setAddFor(null);
      setAddAmount("");
      loadGoals(groupId);
    } catch (e: any) {
      alert("Ошибка пополнения: " + (e?.response?.status || e));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const g = await api.get("/api/groups/");
        if (!g.data.length) { setHasGroup(false); return; }
        setGroupName(g.data[0].name);
        setGid(g.data[0].id);
        loadTip(g.data[0].id);
        const gid = g.data[0].id;
        setGid(gid);
        loadTip(gid);
        const [t, b, d, a, i, gl] = await Promise.all([
          api.get(`/api/groups/${gid}/transactions/`).catch(() => ({ data: [] })),
          api.get(`/api/groups/${gid}/balances`).catch(() => ({ data: [] })),
          api.get(`/api/groups/${gid}/debts`).catch(() => ({ data: [] })),
          api.get(`/api/groups/${gid}/accounting`).catch(() => ({ data: null })),
          api.get(`/api/ai/groups/${gid}/insights`).catch(() => ({ data: [] })),
          api.get(`/api/groups/${gid}/goals/`).catch(() => ({ data: [] })),
        ]);
        setTxs(t.data); setBalances(b.data); setDebts(d.data); setAcc(a.data); setInsights(i.data); setGoals(gl.data);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="p-8 text-center text-sber-muted">Собираем панель...</div>;

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-sber-text mb-8">Быстрая панель</h1>
        <div className="bg-white rounded-3xl p-12 shadow-card text-center text-sber-muted">
          Создайте группу — и здесь появится вся её жизнь на одном экране ⚡
        </div>
      </div>
    );
  }

  // ---------- Расчёты ----------
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const byCat: Record<string, number> = {};
  const byDate: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  [...txs].sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at)).forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    const d = new Date(t.occurred_at);
    byDate[d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })] =
      (byDate[d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })] || 0) + t.amount;
    byMonth[d.toLocaleDateString("ru-RU", { month: "long" })] =
      (byMonth[d.toLocaleDateString("ru-RU", { month: "long" })] || 0) + t.amount;
  });
  const debtsTotal = debts.reduce((s, d) => s + d.amount, 0);
  const remaining = acc?.remaining ?? 0;
  const base = acc?.base ?? 0;

  const catDoughnut = {
    labels: Object.keys(byCat).map(c => CAT[c] || c),
    datasets: [{ data: Object.values(byCat),
      backgroundColor: Object.keys(byCat).map(c => CAT_COLORS[c] || "#ccc"), borderWidth: 0 }],
  };
  const lineData = {
    labels: Object.keys(byDate),
    datasets: [{ label: "₽", data: Object.values(byDate), borderColor: "#21A038",
      backgroundColor: "rgba(33,160,56,0.1)", fill: true, tension: 0.4 }],
  };
  const barData = {
    labels: Object.keys(byMonth),
    datasets: [{ label: "₽", data: Object.values(byMonth), backgroundColor: "#21A038", borderRadius: 10 }],
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold text-sber-text">Быстрая панель</h1>
        <span className="px-3 py-1 bg-sber-light text-sber-green rounded-xl text-sm font-medium">
          {groupName}
        </span>
      </div>

      {/* Главные цифры */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card icon={<Wallet className="text-sber-green" />} label="Доходы за месяц"
          value={`+${(acc?.income_total || 0).toLocaleString("ru-RU")} ₽`} />
        <Card icon={<TrendingDown className="text-red-500" />} label="Траты за месяц"
          value={`−${(acc?.spent || 0).toLocaleString("ru-RU")} ₽`} />
        <Card icon={<Coins className={remaining >= 0 ? "text-sber-green" : "text-red-500"} />}
          label="Осталось" value={`${remaining.toLocaleString("ru-RU")} ₽`}
          accent={remaining < base * 0.2 ? "text-amber-500" : undefined} />
        <Card icon={<Receipt className="text-blue-500" />} label="Всего трат"
          value={`${total.toLocaleString("ru-RU")} ₽`} />
        <Card icon={<Users className="text-amber-500" />} label="Висит долгов"
          value={debtsTotal ? `${debtsTotal.toLocaleString("ru-RU")} ₽` : "0 ₽ 💚"} />
      </div>

      {/* Цели-копилки */}
      {goals.length > 0 && (
        <div className="space-y-4 mb-6">
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
            return (
              <div key={g.id} className="relative overflow-hidden bg-white rounded-3xl p-6 shadow-card">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-sber-light opacity-60" />
                <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-center gap-3 lg:w-80 flex-shrink-0">
                    <img src={goalArt(g.title)} alt="" className="w-12 h-12 rounded-2xl object-cover shadow-soft flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-sber-text truncate">{g.title}</div>
                      <div className="text-xs text-sber-muted">
                        {g.saved_amount.toLocaleString("ru-RU")} ₽ из {g.target_amount.toLocaleString("ru-RU")} ₽
                        {pct < 100 && ` • осталось ${(g.target_amount - g.saved_amount).toLocaleString("ru-RU")} ₽`}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-sber-gray rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-sber-green to-sber-dark transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-sber-text lg:w-16 lg:text-right">{pct}%</div>
                  <div className="lg:w-56 flex-shrink-0">
                    {addFor === g.id ? (
                      <div className="flex gap-2">
                        <input type="number" min="0.01" step="0.01" value={addAmount}
                          onChange={e => setAddAmount(e.target.value)} placeholder="Сумма, ₽" autoFocus
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none text-sm" />
                        <button onClick={() => addToGoal(g.id)}
                          className="px-4 bg-sber-green hover:bg-sber-dark text-white rounded-xl text-sm font-medium">
                          ОК
                        </button>
                        <button onClick={() => setAddFor(null)}
                          className="px-3 bg-sber-gray hover:bg-gray-200 text-sber-muted rounded-xl text-sm">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddFor(g.id); setAddAmount(""); }}
                        className="w-full px-4 py-2 bg-sber-light hover:bg-sber-green hover:text-white text-sber-green rounded-xl text-sm font-medium transition-colors">
                        + Пополнить
                      </button>
                    )}
                  </div>
                </div>
                {pct >= 100 && (
                  <div className="relative text-xs text-sber-green font-semibold mt-2">Цель достигнута! 🎉</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">По категориям</h3>
            <Go onClick={() => navigate("/analytics")} />
          </div>
          <div className="h-56 flex items-center justify-center">
            <Doughnut data={catDoughnut} options={{ cutout: "65%", plugins: { legend: { position: "bottom" } } }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Динамика по дням</h3>
            <Go onClick={() => navigate("/analytics")} />
          </div>
          <div className="h-56">
            <Line data={lineData} options={{ plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, grid: { color: "#f0f0f0" } } } }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">По месяцам</h3>
            <Go onClick={() => navigate("/analytics")} />
          </div>
          <div className="h-56">
            <Bar data={barData} options={{ plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, grid: { color: "#f0f0f0" } } } }} />
          </div>
        </div>
      </div>

      {/* Ленты операций */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Последние траты</h3>
            <Go onClick={() => navigate("/transactions")} />
          </div>
          <div className="space-y-2">
            {txs.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-sber-gray rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-sber-light flex items-center justify-center text-sber-green font-bold text-sm">
                  {(CAT[t.category] || "₽")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sber-text truncate">
                    {t.description || CAT[t.category]}
                  </div>
                  <div className="text-xs text-sber-muted">
                    {t.payer?.username} • {new Date(t.occurred_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div className="text-sm font-bold text-red-500">−{t.amount.toLocaleString("ru-RU")} ₽</div>
              </div>
            ))}
            {txs.length === 0 && <div className="p-6 text-center text-sber-muted">Трат пока нет</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Последние доходы</h3>
            <Go onClick={() => navigate("/accounting")} />
          </div>
          <div className="space-y-2">
            {(acc?.incomes || []).slice(0, 5).map((i: any) => (
              <div key={i.id} className="flex items-center gap-3 p-3 bg-sber-gray rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-sber-light flex items-center justify-center text-sber-green font-bold text-sm">
                  {i.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-sber-text truncate">{i.description}</div>
                  <div className="text-xs text-sber-muted">
                    {i.username} • {new Date(i.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div className="text-sm font-bold text-sber-green">+{i.amount.toLocaleString("ru-RU")} ₽</div>
              </div>
            ))}
            {(!acc?.incomes || acc.incomes.length === 0) &&
              <div className="p-6 text-center text-sber-muted">Доходов пока нет</div>}
          </div>
        </div>
      </div>

      {/* Долги + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Кто кому должен</h3>
            <Go onClick={() => navigate("/debts")} />
          </div>
          {debts.length === 0 ? (
            <div className="p-6 text-center text-sber-muted">Все балансы сведены 💚</div>
          ) : (
            <div className="space-y-2">
              {debts.map((d, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-sber-gray rounded-2xl">
                  <span className="text-sm font-medium text-sber-text">{d.from_user.username}</span>
                  <ArrowRight size={14} className="text-sber-muted" />
                  <span className="text-sm font-medium text-sber-text flex-1">{d.to_user.username}</span>
                  <span className="text-sm font-bold text-red-500">{d.amount.toLocaleString("ru-RU")} ₽</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles size={18} className="text-sber-green" /> AI-советы
            </h3>
            <Go onClick={() => navigate("/ai")} />
          </div>
          <div className={`p-4 bg-gradient-to-r from-sber-green to-sber-dark rounded-2xl text-white mb-3 min-h-[76px] ${tipLoading ? "animate-pulse" : ""}`}>
            <div className="text-sm leading-relaxed">
              {tipLoading ? "🧠 Нейросеть анализирует ваш бюджет..." : tip || "Думаю над вашим бюджетом..."}
            </div>
          </div>
          <button onClick={() => {
            if (tipLoading) return;
            if (gid) { loadTip(gid); return; }
            api.get("/api/groups/").then(g => {
              if (g.data.length) { setGid(g.data[0].id); loadTip(g.data[0].id); }
            });
          }}
            disabled={tipLoading}
            className="w-full py-2 bg-sber-light text-sber-green rounded-xl text-sm font-medium hover:bg-sber-green hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <RefreshCw size={14} className={tipLoading ? "animate-spin" : ""} /> Другой совет
          </button>
        </div>
      </div>
    </div>
  );
}

function Go({ onClick }: any) {
  return (
    <button onClick={onClick}
      className="text-xs font-medium text-sber-green hover:bg-sber-light px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1">
      Открыть <ArrowRight size={12} />
    </button>
  );
}

function Card({ icon, label, value, accent }: any) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-card">
      <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center mb-3">{icon}</div>
      <div className="text-sber-muted text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent || "text-sber-text"}`}>{value}</div>
    </div>
  );
}
