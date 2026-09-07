import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { pickGroup } from "../services/groupPick";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const REMINDER_INTERVAL = 15 * 60 * 1000; // каждые 15 минут

export function DebtReminderToast() {
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const check = async () => {
    try {
      const g = await api.get("/api/groups/");
      if (!g.data.length) return;
      const r = await api.get(`/api/ai/groups/${pickGroup(g.data).id}/reminders`);
      const mine = r.data.find((x: any) => x.debtor.id === user?.id);
      if (mine) {
        setMessage(mine.message);
        setVisible(true);
      }
    } catch {}
  };

  useEffect(() => {
    check();
    const t = setInterval(check, REMINDER_INTERVAL);
    return () => clearInterval(t);
  }, []);

  if (!visible || !message) return null;

  return (
    <div className="fixed top-4 left-1/2 z-50 w-[min(560px,92vw)] toast-in" style={{ transform: "translateX(-50%)" }}>
      <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl shadow-soft p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
          <Bell size={20} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm mb-0.5">🔔 Напоминание о долге</div>
          <div className="text-sm opacity-95">{message}</div>
        </div>
        <button onClick={() => setVisible(false)}
          className="p-1 hover:bg-white/20 rounded-lg flex-shrink-0 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
