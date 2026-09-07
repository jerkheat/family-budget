import { useEffect, useRef, useState } from "react";
import { Plus, Users, Copy, Check, LogIn, Send, LogOut, MoreVertical } from "lucide-react";
import { api } from "../../services/api";

export function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [membersMap, setMembersMap] = useState<Record<number, any[]>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFor, setAvatarFor] = useState<number | null>(null);

  const load = () => api.get("/api/groups/").then(r => setGroups(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    groups.forEach(g => {
      if (!membersMap[g.id]) {
        api.get(`/api/groups/${g.id}/members`)
          .then(r => setMembersMap(m => ({ ...m, [g.id]: r.data })))
          .catch(() => {});
      }
    });
  }, [groups]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/api/groups/", { name, description, currency: "RUB" });
      setName(""); setDescription(""); setShowCreate(false);
      setSuccess("Группа создана! Отправьте код друзьям.");
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка создания");
    }
  };

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/api/groups/join", { invite_code: inviteCode });
      setInviteCode(""); setShowJoin(false);
      setSuccess("Вы вступили в группу!");
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Неверный код");
    }
  };

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareTelegram = (g: any) => {
    const url = encodeURIComponent(window.location.origin);
    const text = encodeURIComponent(
      `Привет! Присоединяйся к нашей группе «${g.name}» в FamilyBudget. Код приглашения: ${g.invite_code}`
    );
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const leaveGroup = async (g: any) => {
    if (!window.confirm(`Выйти из группы «${g.name}»?`)) return;
    setError(""); setSuccess("");
    try {
      await api.post(`/api/groups/${g.id}/leave`);
      setSuccess("Вы вышли из группы");
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Ошибка");
    }
  };

  const uploadGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !avatarFor) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      const up = await api.post("/api/files/", fd);
      await api.patch(`/api/groups/${avatarFor}/avatar`, { avatar_url: up.data.url });
      load();
    } catch {}
  };

  const initials = (n: string) =>
    n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "Г";

  const openCreate = () => { setShowCreate(true); setShowJoin(false); setError(""); };
  const openJoin = () => { setShowJoin(true); setShowCreate(false); setError(""); };

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <input type="file" accept="image/*" ref={avatarInputRef} onChange={uploadGroupAvatar} className="hidden" />

      {/* Шапка */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sber-text">Мои группы</h1>
          <p className="text-sber-muted mt-1">Семейные и дружеские бюджеты</p>
        </div>
        {groups.length === 0 && <div className="flex gap-3">
          <button onClick={openJoin}
            className="px-5 py-2.5 bg-white border border-gray-200 hover:border-sber-green hover:text-sber-green text-sber-text rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-card">
            <LogIn size={16} /> Вступить
          </button>
          <button onClick={openCreate}
            className="px-5 py-2.5 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shadow-card">
            <Plus size={16} /> Создать группу
          </button>
        </div>}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-5">{error}</div>}
      {success && <div className="bg-sber-light text-sber-green p-3 rounded-xl text-sm mb-5">{success}</div>}

      {showCreate && (
        <form onSubmit={createGroup} className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-sber-green" /> Новая группа
          </h3>
          <div className="space-y-3">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Название (например, «Квартира с друзьями»)" required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
            <button type="submit"
              className="bg-sber-green hover:bg-sber-dark text-white px-6 py-3 rounded-xl font-medium transition-colors">
              Создать группу
            </button>
          </div>
        </form>
      )}

      {showJoin && (
        <form onSubmit={joinGroup} className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <h3 className="font-semibold flex items-center gap-2">
            <LogIn size={18} className="text-sber-green" /> Присоединиться к группе
          </h3>
          <p className="text-sm text-sber-muted mt-1 mb-4">
            Попросите у друга код приглашения — он отображается на карточке его группы
          </p>
          <div className="flex gap-3">
            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
              placeholder="Код приглашения" required
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none font-mono" />
            <button type="submit"
              className="bg-sber-green hover:bg-sber-dark text-white px-6 py-3 rounded-xl font-medium transition-colors">
              Вступить
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <EmptyState title="Пока нет групп" onCreate={openCreate} onJoin={openJoin} />
      ) : (
        <>
          <div className="space-y-5">
            {groups.map(g => {
              const members = membersMap[g.id] || [];
              return (
                <div key={g.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 hover:shadow-soft transition-shadow">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative flex-shrink-0">
                        <button type="button"
                          onClick={() => { setAvatarFor(g.id); setTimeout(() => avatarInputRef.current?.click(), 0); }}
                          title="Сменить аватар группы"
                          className="group relative w-16 h-16 rounded-full bg-sber-light flex items-center justify-center text-xl font-bold text-sber-green overflow-hidden transition-all hover:shadow-soft">
                          {g.avatar_url ? (
                            <img src={g.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            initials(g.name)
                          )}
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-white/95 text-sber-green flex items-center justify-center">
                              <Plus size={16} strokeWidth={2.2} />
                            </div>
                          </div>
                        </button>
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-sber-green rounded-full ring-2 ring-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xl text-sber-text truncate">{g.name}</h3>
                        <div className="text-sm text-sber-muted flex items-center gap-1.5 mt-0.5">
                          <Users size={14} /> Участников: {g.members_count}
                        </div>
                        {g.description && <p className="text-sm text-sber-muted mt-1 truncate">{g.description}</p>}
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setMenuFor(menuFor === g.id ? null : g.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-sber-text hover:bg-slate-50 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                      {menuFor === g.id && (
                        <div className="absolute right-0 top-10 w-56 bg-white border border-gray-100 rounded-2xl shadow-soft p-1.5 z-30">
                          <button onClick={() => { copyCode(g.id, g.invite_code); setMenuFor(null); }}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm text-sber-text hover:bg-sber-light flex items-center gap-2 transition-colors">
                            <Copy size={14} className="text-sber-green" /> Скопировать код
                          </button>
                          <button onClick={() => { shareTelegram(g); setMenuFor(null); }}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm text-sber-text hover:bg-sber-light flex items-center gap-2 transition-colors">
                            <Send size={14} className="text-sber-green" /> Отправить в Telegram
                          </button>
                          <button onClick={() => { leaveGroup(g); setMenuFor(null); }}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors">
                            <LogOut size={14} /> Выйти из группы
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-4 mb-5">
                    <div className="min-w-0">
                      <div className="text-xs text-sber-muted mb-1">Код приглашения</div>
                      <div className="font-mono font-bold text-sber-text text-lg tracking-wide truncate">{g.invite_code}</div>
                    </div>
                    <button onClick={() => copyCode(g.id, g.invite_code)}
                      className="flex items-center gap-2 text-sm font-medium text-sber-green hover:bg-sber-light px-4 py-2.5 rounded-xl transition-colors flex-shrink-0">
                      {copied === g.id ? <Check size={16} /> : <Copy size={16} />}
                      {copied === g.id ? "Скопировано!" : "Копировать"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex -space-x-2.5">
                      {members.slice(0, 4).map(m => (
                        <div key={m.id} className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 ring-2 ring-white flex items-center justify-center text-sm font-semibold text-slate-600 overflow-hidden">
                            {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.username?.[0]?.toUpperCase()}
                          </div>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-sber-green rounded-full ring-2 ring-white" />
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-white border border-dashed border-sber-green/60 ring-2 ring-white flex items-center justify-center text-sber-green">
                        <Plus size={15} />
                      </div>
                    </div>
                    {members.length > 4 && (
                      <span className="text-sm text-sber-muted">и ещё {members.length - 4} участник(а)</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button onClick={() => shareTelegram(g)}
                      className="py-3 rounded-xl bg-sber-light hover:bg-sber-green hover:text-white text-sber-green font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                      <Send size={16} /> Открыть в Telegram
                    </button>
                    <button onClick={() => leaveGroup(g)}
                      className="py-3 rounded-xl bg-red-50 hover:bg-red-500 hover:text-white text-red-500 font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                      <LogOut size={16} /> Выйти из группы
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <EmptyState title="У вас пока нет других групп" onCreate={openCreate} onJoin={openJoin} />
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ title, onCreate, onJoin }: any) {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:border-sber-green/40 transition-colors">
      <div className="w-16 h-16 rounded-full bg-sber-light flex items-center justify-center mx-auto mb-4">
        <Users size={26} className="text-sber-green" />
      </div>
      <h3 className="font-bold text-sber-text mb-2">{title}</h3>
      <p className="text-sm text-sber-muted max-w-md mx-auto mb-6">
        Создайте новую группу или вступите в существующую, чтобы начать совместное ведение бюджета.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={onCreate}
          className="px-6 py-3 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
          <Plus size={16} /> Создать группу
        </button>
        <button onClick={onJoin}
          className="px-6 py-3 bg-white border border-gray-200 hover:border-sber-green hover:text-sber-green text-sber-text rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
          <LogIn size={16} /> Вступить в группу
        </button>
      </div>
    </div>
  );
}

