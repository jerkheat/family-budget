import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessagesSquare, AlertTriangle, X } from "lucide-react";
import { pickGroup } from "../../services/groupPick";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

type Toast = { id: number; title: string; body: string; kind: "msg" | "warn" };

export function ToastHub() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const seenMsgId = useRef<number | null>(null);
  const warnedBudget = useRef(false);

  const playSound = (kind: "msg" | "warn") => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const notes = kind === "msg" ? [880, 1174.66] : [523.25, 392];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        g.connect(ctx.destination);
        const t0 = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        o.start(t0);
        o.stop(t0 + 0.4);
      });
    } catch {}
  };

  const push = (t: Omit<Toast, "id">) => {
    playSound(t.kind);
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6000);
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const tick = async () => {
      if (localStorage.getItem("fb_notify") === "false") return;
      try {
        const g = await api.get("/api/groups/");
        if (!g.data.length) return;
        const gid = pickGroup(g.data).id;

        // --- Новые сообщения ---
        const m = await api.get(`/api/groups/${gid}/messages/`);
        const list = m.data;
        if (list.length) {
          const last = list[list.length - 1];
          if (seenMsgId.current === null) {
            seenMsgId.current = last.id;
          } else if (last.id > seenMsgId.current) {
            const isNewOther = last.user.id !== user?.id;
            seenMsgId.current = last.id;
            if (isNewOther && location.pathname !== "/chat") {
              const body = last.text || (last.image_url ? "📷 Фото" : "🎤 Голосовое сообщение");
              push({ kind: "msg", title: `${last.user.username} в чате`, body });
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`FamilyBudget · ${last.user.username}`, { body });
              }
            }
          }
        }

        // --- Бюджет заканчивается ---
        const a = await api.get(`/api/groups/${gid}/accounting`);
        const d = a.data;
        if (d && d.base > 0 && !warnedBudget.current) {
          const left = d.base - d.spent;
          if (left / d.base < 0.2) {
            warnedBudget.current = true;
            push({
              kind: "warn",
              title: "Бюджет заканчивается",
              body: `Осталось меньше 20% — ${left.toLocaleString("ru-RU")} ₽`,
            });
          }
        }
      } catch {}
    };
    tick();
    const t = setInterval(tick, 8000);
    return () => clearInterval(t);
  }, [location.pathname, user?.id]);

  return (
    <>
      <style>{`@keyframes fbSlideIn { from { transform: translateX(120%); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
      <div className="fixed top-4 right-4 z-[100] w-80 space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            onClick={() => t.kind === "msg" && navigate("/chat")}
            className="pointer-events-auto bg-white rounded-2xl shadow-soft border border-gray-100 p-4 flex gap-3 cursor-pointer hover:border-sber-green/40 transition-colors"
            style={{ animation: "fbSlideIn .35s ease" }}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              t.kind === "msg" ? "bg-sber-light" : "bg-amber-50"
            }`}>
              {t.kind === "msg"
                ? <MessagesSquare size={18} className="text-sber-green" />
                : <AlertTriangle size={18} className="text-amber-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-sber-text">{t.title}</div>
              <div className="text-xs text-sber-muted mt-0.5 line-clamp-2">{t.body}</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setToasts(prev => prev.filter(x => x.id !== t.id)); }}
              className="p-1 h-6 text-slate-400 hover:text-sber-text transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

