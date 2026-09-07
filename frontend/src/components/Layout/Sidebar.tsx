import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Users, Receipt, Coins, BarChart3, Sparkles, Calculator, Cat,
  MessagesSquare, LogOut, ChevronDown, User, X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useUnread } from "../../hooks/useUnread";
import { ToastHub } from "../Notifications/ToastHub";

const sections = [
  { title: "Основное", items: [
    { to: "/panel", icon: LayoutGrid, label: "Главная" },
    { to: "/groups", icon: Users, label: "Группы" },
    { to: "/transactions", icon: Receipt, label: "Расходы" },
    { to: "/debts", icon: Coins, label: "Долги" },
    { to: "/chat", icon: MessagesSquare, label: "Чат" },
  ]},
  { title: "Аналитика", items: [
    { to: "/analytics", icon: BarChart3, label: "Аналитика" },
    { to: "/ai", icon: Sparkles, label: "AI-инсайты" },
  ]},
  { title: "Сервисы", items: [
    { to: "/accounting", icon: Calculator, label: "Учёт" },
  ]},

  { title: "Личное", items: [
    { to: "/profile", icon: User, label: "Профиль" },
  ]},
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const unread = useUnread();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map(s => [s.title, true]))
  );
  const toggle = (t: string) => setOpen(o => ({ ...o, [t]: !o[t] }));

  const content = (
    <>
      {/* Логотип */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sber-green flex items-center justify-center shadow-soft">
            <span className="text-white font-bold text-lg">₽</span>
          </div>
          <div>
            <div className="font-bold text-sber-text leading-tight">FamilyBudget</div>
            <div className="text-xs text-sber-muted">Общий кошелёк</div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title} className="mt-4 first:mt-1">
            <button onClick={() => toggle(section.title)}
              className="w-full flex items-center justify-between px-3 mb-1.5 group">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-sber-green transition-colors">
                {section.title}
              </span>
              <ChevronDown size={12}
                className={`text-gray-400 group-hover:text-sber-green transition-transform duration-200 ${open[section.title] ? "" : "-rotate-90"}`} />
            </button>
            {open[section.title] && (
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-sber-light text-sber-green font-semibold"
                          : "text-slate-500 hover:bg-sber-light/60 hover:text-sber-text"
                      }`
                    }>
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{label}</span>
                    {label === "Чат" && unread > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Пользователь */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-9 h-9 rounded-full bg-sber-light flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sber-green font-semibold text-sm">
                {user?.username?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sber-text truncate">{user?.username}</div>
            <div className="text-xs text-sber-muted truncate">{user?.email}</div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} title="Выйти"
            className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="w-64 bg-white border-r border-gray-100 h-screen flex-col hidden lg:flex">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col shadow-soft">
            <button onClick={onClose} className="self-end p-3 text-slate-400 hover:text-sber-text">
              <X size={18} />
            </button>
            {content}
          </aside>
        </div>
      )}

      <ToastHub />
    </>
  );
}



