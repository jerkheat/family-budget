import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target } from "lucide-react";
import { pickGroup } from "../services/groupPick";
import { api } from "../services/api";

export function BudgetBar() {
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const g = await api.get("/api/groups/");
        if (g.data.length) {
          const a = await api.get(`/api/groups/${pickGroup(g.data).id}/accounting`);
          setData(a.data);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 60000); // обновляется каждую минуту
    return () => clearInterval(t);
  }, []);

  if (!data || !data.base) return null;

  const { base, spent, remaining } = data;
  const pct = Math.min(100, Math.round((spent / base) * 100));
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-sber-green";
  const textColor = pct >= 100 ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-sber-green";

  return (
    <button onClick={() => navigate("/accounting")}
      title="Открыть бухгалтерию"
      className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-2.5 flex items-center gap-4 hover:bg-white transition-colors text-left">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Target size={16} className="text-sber-green" />
        <span className="text-sm font-medium text-sber-text hidden md:block">Бюджет месяца</span>
      </div>

      <div className="flex-1 h-2.5 bg-sber-gray rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <div className="text-xs text-sber-muted flex-shrink-0 hidden sm:block">
        {spent.toLocaleString("ru-RU")} ₽ ({pct}%)
      </div>

      <div className={`text-sm font-bold flex-shrink-0 ${textColor}`}>
        {remaining >= 0
          ? `Осталось ${remaining.toLocaleString("ru-RU")} ₽`
          : `Превышение ${Math.abs(remaining).toLocaleString("ru-RU")} ₽`}
      </div>
    </button>
  );
}
