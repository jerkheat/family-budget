import { useNavigate } from "react-router-dom";
import { Wallet, Users, Sparkles, MessagesSquare, ArrowRight, CheckCircle2, Coins, Bot, Mic, BarChart3 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  { icon: Users, title: "Группы по коду", text: "Создай группу и отправь код близким. Никаких посторонних — только свои." },
  { icon: Mic, title: "Траты голосом", text: "Скажи «продукты на пятьсот» — приложение само распознает и запишет трату." },
  { icon: Coins, title: "Долги автоматически", text: "Балансы считаются сами, возвраты отмечаются одним нажатием." },
  { icon: Bot, title: "AI-ассистент", text: "Нейросеть анализирует траты, прогнозирует и подсказывает, как экономить." },
  { icon: MessagesSquare, title: "Общий чат", text: "Переписка, фото и голосовые для всей группы — прямо в приложении." },
  { icon: BarChart3, title: "Аналитика", text: "Категории, участники, динамика и топ трат — на красивых графиках." },
];

const EXAMPLES = [
  { emoji: "🏠", title: "Соседи по квартире", text: "Аренда, коммуналка и продукты делятся автоматически — без «скиньтесь мне на карту» и записок на холодильнике." },
  { emoji: "👨‍👩‍👧", title: "Семья", text: "Общий кошелёк: видно, куда уходят деньги, а AI подскажет, где получается экономить до 15%." },
  { emoji: "✈️", title: "Поездка с друзьями", text: "Отель, такси и кафе — в один кошелёк. В конце приложение посчитает, кто кому должен, одной кнопкой." },
];

const STEPS = [
  { n: "1", title: "Создай аккаунт", text: "Регистрация за 10 секунд — email и пароль." },
  { n: "2", title: "Собери группу", text: "Создай группу и поделись кодом приглашения в Telegram." },
  { n: "3", title: "Живи как обычно", text: "Добавляй траты голосом — долги, аналитику и советы AI приложение сделает само." },
];

export function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const go = () => navigate(token ? "/panel" : "/login");
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-100 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sber-green flex items-center justify-center">
              <span className="text-white font-bold text-lg">₽</span>
            </div>
            <span className="font-bold text-sber-text">FamilyBudget</span>
          </div>
          <button onClick={go}
            className="px-4 py-2 text-sber-green font-medium hover:bg-sber-light rounded-xl transition-colors">
            {token ? "Перейти в приложение" : "Войти"}
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-3 py-1 bg-sber-light text-sber-green rounded-xl text-sm font-medium mb-6">
            💚 Кейс Сбера · AI для общего бюджета
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-sber-text leading-tight mb-6">
            Общий кошелёк, который <span className="text-sber-green">думает за вас</span>
          </h1>
          <p className="text-lg text-sber-muted mb-8">
            Семейный бюджет с автоматическим расчётом долгов и AI-ассистентом,
            который подсказывает, как экономить. Для семьи, друзей и соседей.
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={go}
              className="px-8 py-4 bg-sber-green hover:bg-sber-dark text-white rounded-2xl font-semibold text-lg flex items-center gap-2 transition-colors shadow-soft">
              {token ? "Перейти в приложение" : "Приступить"} <ArrowRight size={20} />
            </button>
            <button onClick={() => scrollTo("features")}
              className="px-8 py-4 bg-sber-gray hover:bg-gray-200 text-sber-text rounded-2xl font-semibold text-lg transition-colors">
              Узнать больше
            </button>
          </div>
          <div className="flex flex-wrap gap-6 mt-10 text-sm text-sber-muted">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-sber-green" /> Настройка за 30 секунд</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-sber-green" /> Без карт и комиссий</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-sber-green" /> Приглашения по коду</span>
          </div>
        </div>
        <img src="/landing.png" alt="FamilyBudget — общий бюджет семьи"
          className="w-full max-w-lg mx-auto rounded-3xl" />
      </section>

      <section id="features" className="bg-sber-gray py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-sber-text text-center mb-4">Всё для общего бюджета</h2>
          <p className="text-sber-muted text-center mb-12 max-w-2xl mx-auto">
            Одна вкладка — и вы видите, кто сколько потратил, кто кому должен и где можно сэкономить
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white rounded-3xl p-6 shadow-card hover:shadow-soft transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-sber-light flex items-center justify-center mb-4">
                  <Icon size={22} className="text-sber-green" />
                </div>
                <h3 className="font-bold text-sber-text mb-2">{title}</h3>
                <p className="text-sm text-sber-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-sber-text text-center mb-12">Кому подойдёт</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EXAMPLES.map(({ emoji, title, text }) => (
            <div key={title} className="rounded-3xl border border-gray-100 p-6 hover:border-sber-green transition-colors">
              <div className="text-4xl mb-4">{emoji}</div>
              <h3 className="font-bold text-sber-text mb-2">{title}</h3>
              <p className="text-sm text-sber-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sber-gray py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-sber-text text-center mb-12">Как это работает</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ n, title, text }) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-sber-green text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {n}
                </div>
                <h3 className="font-bold text-sber-text mb-2">{title}</h3>
                <p className="text-sm text-sber-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-sber-green to-sber-dark rounded-3xl p-12 text-center text-white shadow-soft">
          <h2 className="text-3xl font-bold mb-4">Готовы перестать считать в голове?</h2>
          <p className="opacity-90 mb-8 max-w-xl mx-auto">
            Создайте группу, добавьте первую трату — и посмотрите, как AI наводит порядок в общем бюджете
          </p>
          <button onClick={go}
            className="px-10 py-4 bg-white text-sber-green rounded-2xl font-semibold text-lg hover:scale-105 transition-transform">
            {token ? "Перейти в приложение" : "Приступить бесплатно"}
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-sber-muted">
        FamilyBudget · Кейс Сбера · 2026 💚
      </footer>
    </div>
  );
}

