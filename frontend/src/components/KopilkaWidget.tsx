import { useState } from "react";
import { X, Send } from "lucide-react";

const BOT_URL = "https://t.me/Kopiiiilka_bot";

export function KopilkaWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Кнопка-котик справа, НАД кнопкой AI-ассистента */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-soft hover:scale-110 transition-transform bg-sber-green"
        title="Telegram-бот «Копилка»">
        <img src="/kopilka.png" alt="Копилка" className="w-full h-full object-cover" />
      </button>

      {open && (
        <div className="fixed bottom-40 right-6 z-50 w-[min(320px,92vw)] bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="relative">
            <img src="/kopilka.png" alt="Копилка" className="w-full h-44 object-cover" />
            <button onClick={() => setOpen(false)}
              className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors">
              <X size={16} className="text-sber-text" />
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sber-text text-lg">Копилка</span>
              <span className="text-[10px] px-2 py-0.5 bg-sber-light text-sber-green rounded-lg font-medium">
                Telegram-бот
              </span>
            </div>
            <p className="text-xs text-sber-muted mb-3">от тех же разработчиков 💚</p>
            <p className="text-sm text-sber-text mb-4">
              Если неудобно через сайт — вы всегда можете воспользоваться нашим ботом
              в Telegram: он тоже ведёт учёт общих трат и долгов.
            </p>
            <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium transition-colors">
              <Send size={16} /> Открыть в Telegram
            </a>
            <div className="text-center text-[10px] text-sber-muted mt-3">
              Учёт · Прозрачность · Справедливость
            </div>
          </div>
        </div>
      )}
    </>
  );
}
