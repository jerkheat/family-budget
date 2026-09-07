import { useEffect, useState } from "react";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Legend,
} from "chart.js";
import { Trophy, Receipt, TrendingUp, Wallet, FileText, Copy } from "lucide-react";
import { pickGroup } from "../../services/groupPick";
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

export function Analytics() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGroup, setHasGroup] = useState(true);
  const [gid, setGid] = useState<number | null>(null);
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const g = await api.get("/api/groups/");
        if (!g.data.length) { setHasGroup(false); return; }
        setGid(pickGroup(g.data).id);
        const t = await api.get(`/api/groups/${pickGroup(g.data).id}/transactions/`);
        setTxs(t.data);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const loadReport = async () => {
    if (!gid || reportLoading) return;
    setReportLoading(true);
    try {
      const r = await api.get(`/api/ai/groups/${gid}/report`);
      setReport(r.data.report);
    } catch {
      setReport("Не удалось составить отчёт — попробуйте ещё раз.");
    } finally { setReportLoading(false); }
  };

  if (loading) return <div className="p-8 text-center text-sber-muted">Загружаем аналитику...</div>;

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-sber-text mb-8">Аналитика</h1>
        <div className="bg-white rounded-3xl p-12 shadow-card text-center text-sber-muted">
          Создайте группу и добавьте траты — здесь появятся графики 📊
        </div>
      </div>
    );
  }

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const avg = txs.length ? total / txs.length : 0;
  const largest = txs.length ? Math.max(...txs.map(t => t.amount)) : 0;

  const byCat: Record<string, number> = {};
  const byDate: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  [...txs].sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at)).forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    const d = new Date(t.occurred_at);
    const dk = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    byDate[dk] = (byDate[dk] || 0) + t.amount;
    const mk = d.toLocaleDateString("ru-RU", { month: "long" });
    byMonth[mk] = (byMonth[mk] || 0) + t.amount;
  });
  const top3 = [...txs].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sber-text mb-2">Аналитика</h1>
          <p className="text-sber-muted">Подробный разбор ваших общих трат</p>
        </div>
        <button onClick={loadReport} disabled={reportLoading}
          className="px-5 py-3 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium text-sm flex items-center gap-2 disabled:opacity-60 transition-colors">
          <FileText size={16} /> {reportLoading ? "AI пишет отчёт..." : "AI-отчёт за месяц"}
        </button>
      </div>

      {report && (
        <div className="bg-white rounded-3xl p-6 shadow-card mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText size={18} className="text-sber-green" /> Отчёт AI за месяц
            </h3>
            <button onClick={() => navigator.clipboard.writeText(report)}
              className="text-xs text-sber-green flex items-center gap-1 hover:underline">
              <Copy size={12} /> Копировать
            </button>
          </div>
          <div className="text-sm text-sber-text whitespace-pre-line leading-relaxed">{report}</div>
        </div>
      )}

      {/* Цифры */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center mb-3">
            <Wallet className="text-sber-green" size={20} />
          </div>
          <div className="text-sber-muted text-sm">Всего потрачено</div>
          <div className="text-2xl font-bold text-sber-text mt-1">{total.toLocaleString("ru-RU")} ₽</div>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center mb-3">
            <Receipt className="text-blue-500" size={20} />
          </div>
          <div className="text-sber-muted text-sm">Транзакций</div>
          <div className="text-2xl font-bold text-sber-text mt-1">{txs.length}</div>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center mb-3">
            <TrendingUp className="text-amber-500" size={20} />
          </div>
          <div className="text-sber-muted text-sm">Средний чек</div>
          <div className="text-2xl font-bold text-sber-text mt-1">{avg.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽</div>
        </div>
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
            <Trophy className="text-red-500" size={20} />
          </div>
          <div className="text-sber-muted text-sm">Крупнейшая трата</div>
          <div className="text-2xl font-bold text-red-500 mt-1">{largest.toLocaleString("ru-RU")} ₽</div>
        </div>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <h3 className="font-semibold mb-4">По категориям</h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={catDoughnut} options={{ cutout: "65%", plugins: { legend: { position: "bottom" } } }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <h3 className="font-semibold mb-4">Динамика по дням</h3>
          <div className="h-64">
            <Line data={lineData} options={{ plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, grid: { color: "#f0f0f0" } } } }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <h3 className="font-semibold mb-4">По месяцам</h3>
          <div className="h-64">
            <Bar data={barData} options={{ plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, grid: { color: "#f0f0f0" } } } }} />
          </div>
        </div>
      </div>

      {/* Топ трат */}
      <div className="bg-white rounded-3xl p-6 shadow-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Trophy size={20} className="text-amber-500" /> Топ-3 крупнейших трат
        </h3>
        {top3.length === 0 ? (
          <div className="p-8 text-center text-sber-muted">Трат пока нет</div>
        ) : (
          <div className="space-y-3">
            {top3.map((t, i) => (
              <div key={t.id} className="flex items-center gap-4 p-4 bg-sber-gray rounded-2xl">
                <div className="text-2xl">{medals[i]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sber-text truncate">{t.description || CAT[t.category]}</div>
                  <div className="text-xs text-sber-muted">
                    {CAT[t.category]} • {t.payer?.username} • {new Date(t.occurred_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div className="font-bold text-sber-text">{t.amount.toLocaleString("ru-RU")} ₽</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




