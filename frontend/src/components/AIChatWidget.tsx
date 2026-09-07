import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { pickGroup } from "../services/groupPick";
import { api } from "../services/api";

const CHIPS = [
  "Сколько всего потратили?",
  "Кто кому должен?",
  "Дай совет по экономии",
  "Прогноз на месяц",
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/api/groups/").then(r => {
      if (r.data.length) setGroupId(pickGroup(r.data).id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, open]);

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

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full bg-gradient-to-br from-sber-green to-sber-dark text-white shadow-soft hover:scale-110 transition-transform flex items-center justify-center"
        title="AI-ассистент"
      >
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>

      {/* Окно чата */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[70] w-[min(380px,92vw)] h-[520px] bg-white rounded-3xl shadow-soft flex flex-col overflow-hidden">
          {/* Шапка */}
          <div className="bg-gradient-to-r from-sber-green to-sber-dark text-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">🤖</div>
            <div>
              <div className="font-semibold">AI-ассистент</div>
              <div className="text-xs opacity-80">онлайн • отвечает по вашим данным</div>
            </div>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-sber-gray">
            {messages.length === 0 && (
              <div className="p-3 bg-white rounded-2xl text-sm text-sber-text shadow-card">
                Привет! 👋 Спросите меня о тратах, долгах или экономии.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-2xl text-sm whitespace-pre-line max-w-[85%] ${
                m.role === "user"
                  ? "bg-sber-green text-white ml-auto"
                  : "bg-white text-sber-text shadow-card"
              }`}>
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="p-3 bg-white rounded-2xl text-sm text-sber-muted shadow-card animate-pulse max-w-[85%]">
                Думаю... 🤔
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Подсказки */}
          <div className="px-3 pt-2 flex flex-wrap gap-1.5 bg-white">
            {CHIPS.map(c => (
              <button key={c} onClick={() => send(c)}
                className="px-2.5 py-1 bg-sber-light text-sber-green rounded-lg text-xs font-medium hover:bg-sber-green hover:text-white transition-colors">
                {c}
              </button>
            ))}
          </div>

          {/* Ввод */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 flex gap-2 bg-white border-t border-gray-100">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ваш вопрос..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none text-sm" />
            <button type="submit"
              className="px-4 py-2.5 bg-sber-green hover:bg-sber-dark text-white rounded-xl transition-colors">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

