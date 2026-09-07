import { useEffect, useRef, useState } from "react";
import { Sparkles, TrendingUp, PiggyBank, Bell, Send, Bot } from "lucide-react";
import { pickGroup } from "../../services/groupPick";
import { api } from "../../services/api";

const icons: Record<string, any> = { pattern: Sparkles, forecast: TrendingUp, saving_tip: PiggyBank };
const severityStyles: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  success: "bg-sber-light text-sber-green border-sber-green/20",
};
const CHIPS = [
  "Сколько всего потратили?",
  "Кто кому должен?",
  "Дай совет по экономии",
  "Прогноз на месяц",
  "Какая самая большая трата?",
];

export function AIInsights() {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const g = await api.get("/api/groups/");
        if (g.data.length) {
          const gid = pickGroup(g.data).id;
          setGroupId(gid);
          const [i, r] = await Promise.all([
            api.get(`/api/ai/groups/${gid}/insights`),
            api.get(`/api/ai/groups/${gid}/reminders`),
          ]);
          setInsights(i.data);
          setReminders(r.data);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || !groupId || thinking) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setThinking(true);
    try {
      const r = await api.post(`/api/ai/groups/${groupId}/chat`, { message: q });
      setMessages(m => [...m, { role: "ai", text: r.data.reply }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Упс, что-то пошло не так. Попробуйте ещё раз!" }]);
    } finally { setThinking(false); }
  };

  if (loading) return <div className="p-8 text-center text-sber-muted">Загружаем AI...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sber-green to-sber-dark flex items-center justify-center text-white text-xl">🤖</div>
        <div>
          <h1 className="text-3xl font-bold text-sber-text">AI-ассистент</h1>
          <p className="text-sber-muted">Задавайте вопросы о вашем бюджете</p>
        </div>
      </div>

      {/* Чат */}
      <div className="bg-white rounded-3xl shadow-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={20} className="text-sber-green" />
          <h3 className="font-semibold">Чат с ассистентом</h3>
        </div>

        <div className="h-96 overflow-y-auto space-y-3 pr-2 mb-4">
          {messages.length === 0 && (
            <div className="p-4 bg-sber-gray rounded-2xl text-sm text-sber-text max-w-md">
              Привет! 👋 Я ваш AI-ассистент. Спросите меня о тратах, долгах или экономии —
              я посчитаю и подскажу.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`p-4 rounded-2xl text-sm whitespace-pre-line max-w-md ${
              m.role === "user"
                ? "bg-sber-green text-white ml-auto"
                : "bg-sber-gray text-sber-text"
            }`}>
              {m.text}
            </div>
          ))}
          {thinking && (
            <div className="p-4 bg-sber-gray rounded-2xl text-sm text-sber-muted max-w-md animate-pulse">
              Думаю... 🤔
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {CHIPS.map(c => (
            <button key={c} onClick={() => send(c)}
              className="px-3 py-1.5 bg-sber-light text-sber-green rounded-xl text-xs font-medium hover:bg-sber-green hover:text-white transition-colors">
              {c}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Например: сколько потратили на продукты?"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
          <button type="submit"
            className="px-5 py-3 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium flex items-center gap-2">
            <Send size={18} /> Отправить
          </button>
        </form>
      </div>

      {/* Инсайты */}
      {insights.length > 0 && (
        <div className="space-y-3 mb-8">
          <h3 className="font-semibold text-lg mb-2">Автоматические инсайты</h3>
          {insights.map((ins, idx) => {
            const Icon = icons[ins.kind] || Sparkles;
            return (
              <div key={idx} className={`rounded-3xl p-5 border ${severityStyles[ins.severity] || severityStyles.info}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{ins.title}</div>
                    <div className="text-sm mt-1 opacity-90">{ins.message}</div>
                    {ins.metadata?.potential_saving && (
                      <div className="mt-2 inline-block bg-white/60 px-3 py-1 rounded-lg text-xs font-medium">
                        💰 Потенциальная экономия: {ins.metadata.potential_saving} ₽
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Напоминания */}
      {reminders.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-sber-green" />
            <h3 className="font-semibold">Напоминания о долгах</h3>
          </div>
          <div className="space-y-3">
            {reminders.map((r, i) => (
              <div key={i} className="p-4 bg-sber-gray rounded-2xl">
                <div className="text-sm font-medium text-sber-text mb-2">
                  {r.debtor.username} → {r.creditor.username}: <span className="text-sber-green font-bold">{r.amount} ₽</span>
                </div>
                <div className="text-sm text-sber-muted italic">«{r.message}»</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
