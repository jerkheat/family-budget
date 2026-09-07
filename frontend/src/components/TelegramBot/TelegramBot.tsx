import { Send } from "lucide-react";

const BOT_URL = "https://t.me/Kopiiiilka_bot";

const FEATURES = [
  { emoji: "🛒", text: "Добавляйте траты прямо из чата Telegram — без сайта" },
  { emoji: "🧮", text: "Бот автоматически считает, кто кому должен" },
  { emoji: "🔔", text: "Вежливые напоминания о долгах — прямо в мессенджер" },
  { emoji: "👥", text: "Общие группы для семьи, друзей и соседей" },
];

export function TelegramBot() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-sber-green to-sber-dark p-8 text-center">
          <img src="/kopilka.png" alt="Копилка"
            className="w-40 h-40 rounded-full mx-auto mb-4 border-4 border-white/30 object-cover" />
          <h1 className="text-3xl font-bold text-white mb-2">Копилка</h1>
          <div className="inline-block px-3 py-1 bg-white/20 text-white rounded-xl text-sm">
            Telegram-бот · от тех же разработчиков 💚
          </div>
        </div>

        <div className="p-8">
          <p className="text-sber-muted mb-6">
            Если вам неудобно пользоваться сайтом — вы всегда можете воспользоваться
            нашим ботом в Telegram. Он тоже ведёт учёт общих трат и долгов,
            считает балансы и присылает напоминания — прямо в привычном мессенджере.
          </p>

          <div className="space-y-3 mb-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-sber-gray rounded-2xl">
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-sm text-sber-text">{f.text}</span>
              </div>
            ))}
          </div>

          <a href={BOT_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 bg-sber-green hover:bg-sber-dark text-white rounded-2xl font-semibold text-lg transition-colors">
            <Send size={20} /> Открыть бота в Telegram
          </a>

          <div className="text-center text-xs text-sber-muted mt-4">
            @Kopiiiilka_bot · Учёт · Прозрачность · Справедливость
          </div>
        </div>
      </div>
    </div>
  );
}
