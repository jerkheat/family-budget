import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin ? { email, password } : { email, password, username };
      const res = await api.post(endpoint, body);
      const userRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      });
      login(res.data.access_token, userRes.data);
      navigate("/panel");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sber-light to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-soft p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sber-green flex items-center justify-center">
            <span className="text-white font-bold text-2xl">₽</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sber-text">FamilyBudget</h1>
            <p className="text-sm text-sber-muted">Общий кошелёк семьи</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-sber-gray rounded-2xl p-1">
          <button onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-xl font-medium ${isLogin ? "bg-white text-sber-green shadow-card" : "text-sber-muted"}`}>
            Вход
          </button>
          <button onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-xl font-medium ${!isLogin ? "bg-white text-sber-green shadow-card" : "text-sber-muted"}`}>
            Регистрация
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm text-sber-muted mb-1 block">Имя</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none"
                placeholder="Иван" required />
            </div>
          )}
          <div>
            <label className="text-sm text-sber-muted mb-1 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none"
              placeholder="ivan@example.com" required />
          </div>
          <div>
            <label className="text-sm text-sber-muted mb-1 block">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none"
              placeholder="••••••" required />
          </div>
          <button type="submit"
            className="w-full bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium transition-colors">
            {isLogin ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-sber-muted">
          💚 Кейс Сбера — AI для управления общим бюджетом
        </div>
      </div>
    </div>
  );
}

