import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { pickGroup } from "../services/groupPick";
import { api } from "../services/api";

const CHECK_INTERVAL = 15 * 60 * 1000; // каждые 15 минут

export function BudgetToast() {
  const [info, setInfo] = useState<{ level: "warn" | "danger"; text: string } | null>(null);
  const [visible, setVisible] = useState(false);

  const check = async () => {
    try {
      const g = await api.get("/api/groups/");
      if (!g.data.length) return;
      const a = await api.get(`/api/groups/${pickGroup(g.data).id}/accounting`);
      const { base, remaining } = a.data;
      if (!base) return;
      if (remaining < 0) {
        setInfo({
          level: "danger",
          text: `Бюджет превышен на ${Math.abs(remaining).toLocaleString("ru-RU")} ₽. Пора притормозить траты 🛑`,
        });
        setVisible(true);
      } else if (remaining < base * 0.2) {
        setInfo({
          level: "warn",
          text: `Денег становится мало: осталось ${remaining.toLocaleString("ru-RU")} ₽ на этот месяц (${Math.round((remaining / base) * 100)}% бюджета) ⚠️`,
        });
        setVisible(true);
      }
    } catch {}
  };

  useEffect(() => {
    check();
    const t = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(t);
  }, []);

  if (!visible || !info) return null;

  return (
    <div className="fixed top-20 left-1/2 z-50 w-[min(560px,92vw)] toast-in" style={{ transform: "translateX(-50%)" }}>
      <div className={`text-white rounded-2xl shadow-soft p-4 flex items-start gap-3 ${
        info.level === "danger"
          ? "bg-gradient-to-r from-red-500 to-red-600"
          : "bg-gradient-to-r from-amber-400 to-amber-500"
      }`}>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm mb-0.5">
            {info.level === "danger" ? "Бюджет превышен!" : "Бюджет на исходе"}
          </div>
          <div className="text-sm opacity-95">{info.text}</div>
        </div>
        <button onClick={() => setVisible(false)} className="p-1 hover:bg-white/20 rounded-lg flex-shrink-0">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
