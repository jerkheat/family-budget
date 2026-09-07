import { create } from "zustand";

type User = {
  id: number; email: string; username: string; currency: string;
  avatar_url?: string | null; full_name?: string | null; bio?: string | null;
};

export const useAuth = create<{
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
}>((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token"),
  login: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
  updateUser: (u) => set((s) => {
    if (!s.user) return {};
    const merged = { ...s.user, ...u };
    localStorage.setItem("user", JSON.stringify(merged));
    return { user: merged };
  }),
}));
