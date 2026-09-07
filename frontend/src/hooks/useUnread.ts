import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { pickGroup } from "../services/groupPick";
import { api } from "../services/api";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "fb_last_seen_msg";

export function useUnread() {
  const [count, setCount] = useState(0);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Зашёл на чат — запомнить последнее сообщение
    if (location.pathname === "/chat") {
      api.get("/api/groups/").then(r => {
        if (!r.data.length) return;
        api.get(`/api/groups/${pickGroup(r.data).id}/messages/`).then(m => {
          if (m.data.length) {
            localStorage.setItem(STORAGE_KEY, String(m.data[m.data.length - 1].id));
          }
          setCount(0);
        });
      }).catch(() => {});
    }
  }, [location.pathname]);

  useEffect(() => {
    const tick = async () => {
      try {
        const g = await api.get("/api/groups/");
        if (!g.data.length) return;
        const m = await api.get(`/api/groups/${pickGroup(g.data).id}/messages/`);
        const list = m.data;
        const lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);

        if (location.pathname === "/chat") {
          if (list.length) {
            localStorage.setItem(STORAGE_KEY, String(list[list.length - 1].id));
          }
          setCount(0);
          return;
        }

        const unread = list.filter(
          (msg: any) => msg.id > lastSeen && msg.user.id !== user?.id
        ).length;
        setCount(unread);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [location.pathname, user?.id]);

  return count;
}
