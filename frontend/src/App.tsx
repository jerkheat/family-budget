import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "./components/Layout/Sidebar";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { AIInsights } from "./components/AI/AIInsights";
import { Transactions } from "./components/Transactions/Transactions";
import { Groups } from "./components/Groups/Groups";
import { Analytics } from "./components/Analytics/Analytics";
import { Debts } from "./components/Debts/Debts";
import { Chat } from "./components/Chat/Chat";
import { Login } from "./components/Login";
import { Landing } from "./components/Landing";
import { DebtReminderToast } from "./components/DebtReminderToast";
import { AIChatWidget } from "./components/AIChatWidget";


import { Accounting } from "./components/Accounting/Accounting";
import { Profile } from "./components/Profile/Profile";
import { Overview } from "./components/Overview/Overview";
import { BudgetToast } from "./components/BudgetToast";
import { BudgetBar } from "./components/BudgetBar";
import { useAuth } from "./hooks/useAuth";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function App() {
  const { token } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Лендинг виден ВСЕМ: и гостям, и вошедшим
  if (location.pathname === "/") {
    return <Landing />;
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-sber-gray">
      <DebtReminderToast />
      <BudgetToast />
      <AIChatWidget />
      
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-auto">
        <style>{`@media (max-width: 640px){ main .p-8 { padding: 1rem; } }`}</style>
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-slate-50 text-sber-text">
            <Menu size={20} />
          </button>
          <div className="font-bold text-sber-text">FamilyBudget</div>
        </div>
        <BudgetBar />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/panel" element={<Overview />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/ai" element={<AIInsights />} />
          
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/panel" />} />
        </Routes>
      </main>
    </div>
  );
}











