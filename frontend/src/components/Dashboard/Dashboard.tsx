import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Users as UsersIcon } from "lucide-react";
import { Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { pickGroup } from "../../services/groupPick";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const CAT: Record<string, string> = {
  groceries: "Продукты", utilities: "Коммуналка", transport: "Транспорт",
  entertainment: "Развлечения", clothing: "Одежда", health: "Здоровье", other: "Прочее",
};
const CAT_COLORS: Record<string, string> = {
  groceries: "#21A038", utilities: "#9966FF", transport: "#4BC0C0",
  entertainment: "#FFCE56", clothing: "#FF6384", health: "#36A2EB", other: "#999999",
};

export function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [groupsCount, setGroupsCount] = useState(0);
  const [aiTip, setAiTip] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const g = await api.get("/api/groups/");
        setGroupsCount(g.data.length);
        if (g.data.length > 0) {
          const gid = pickGroup(g.data).id;
          const [t, b] = await Promise.all([
            api.get(`/api/groups/${gid}/transactions/`),
            api.get(`/api/groups/${gid}/balances`),
          ]);
          setTransactions(t.data);
          setBalances(b.data);
          const ai = await api.get(`/api/ai/groups/${gid}/insights`).catch(() => null);
          const tip = ai?.data?.find((i: any) => i.kind === "saving_tip");
          if (tip) setAiTip(tip.message);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const cur = ({ RUB: "₽", USD: "$", EUR: "€" } as any)[user?.currency || "RUB"];
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const myShare = transactions.reduce(
    (s, t) => s + t.splits.filter((sp: any) => sp.user_id === user?.id).reduce((a: number, sp: any) => a + sp.share, 0),
    0
  );
  const myBalance = balances.find((b) => b.user_id === user?.id)?.balance || 0;

  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  transactions.forEach((t) => {
    const d = new Date(t.occurred_at);
    byDay[(d.getDay() + 6) % 7] += t.amount;
  });

  const byCat: Record<string, number> = {};
  transactions.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });

  const lineData = {
    labels: days,
    datasets: [{
      label: "Траты", data: byDay, borderColor: "#21A038",
      backgroundColor: "rgba(33,160,56,0.1)", fill: true, tension: 0.4,
    }],
  };
  const doughnutData = {
    labels: Object.keys(byCat).map((c) => CAT[c] || c),
    datasets: [{
      data: Object.values(byCat),
      backgroundColor: Object.keys(byCat).map((c) => CAT_COLORS[c] || "#ccc"),
      borderWidth: 0,
    }],
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sber-text">Привет, {user?.username || "друг"} 👋</h1>
        <p className="text-sber-muted mt-1">Вот что происходит с вашим бюджетом сегодня</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={<Wallet className="text-sber-green" />} label="Общие траты"
          value={`${total.toLocaleString("ru-RU")} ${cur}`} />
        <MetricCard icon={<TrendingUp className="text-sber-green" />} label="Ваша доля"
          value={`${myShare.toLocaleString("ru-RU")} ${cur}`} />
        <MetricCard icon={<TrendingDown className={myBalance >= 0 ? "text-sber-green" : "text-red-500"} />}
          label={myBalance >= 0 ? "Вам должны" : "Вы должны"}
          value={`${Math.abs(myBalance).toLocaleString("ru-RU")} ${cur}`} />
        <MetricCard icon={<UsersIcon className="text-blue-500" />} label="Активных групп" value={String(groupsCount)} />
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 shadow-card text-center text-sber-muted">
          Пока нет трат. Перейдите в раздел «Траты» и добавьте первую! 🌱
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-card">
            <h3 className="font-semibold mb-4">Динамика трат по дням недели</h3>
            <Line data={lineData} options={{
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, grid: { color: "#f0f0f0" } } },
            }} />
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-card">
            <h3 className="font-semibold mb-4">По категориям</h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={doughnutData} options={{ cutout: "65%" }} />
            </div>
          </div>
        </div>
      )}

      {aiTip && (
        <div className="mt-6 bg-gradient-to-r from-sber-green to-sber-dark rounded-3xl p-6 text-white shadow-soft">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">💡</div>
            <div>
              <div className="text-sm opacity-80">AI-совет дня</div>
              <div className="font-semibold text-lg mt-1">{aiTip}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-card">
      <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center mb-3">{icon}</div>
      <div className="text-sber-muted text-sm">{label}</div>
      <div className="text-2xl font-bold text-sber-text mt-1">{value}</div>
    </div>
  );
}
