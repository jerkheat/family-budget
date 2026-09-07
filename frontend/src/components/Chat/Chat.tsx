import { useEffect, useRef, useState } from "react";
import {
  Send, MessagesSquare, Pin, PinOff, Highlighter, Reply, Mic, Square,
  Image as ImageIcon, X, Search, Users, MoreVertical, Bell, FolderOpen, Plus,
  LogOut, Sparkles, Play, Pause, Check, CheckCheck,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "";

const CHAT_PATTERN =
  "url(\"data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>` +
    `<g fill='none' stroke='%2321A038' stroke-width='0.6' opacity='0.08'>` +
    `<circle cx='20' cy='20' r='6'/><path d='M14 20h12M20 14v12'/>` +
    `<rect x='70' y='15' width='14' height='10' rx='2'/><circle cx='80' cy='20' r='1.5'/>` +
    `<path d='M20 80v-10l6 4 6-4v10'/><path d='M16 78h16'/>` +
    `<path d='M70 70h20M70 76h14M70 82h18'/>` +
    `<path d='M100 50l4-8 4 8M100 50l-4 8-4-8'/>` +
    `</g></svg>`
  ) +
  "\")";

export function Chat() {
  const { user } = useAuth();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("Общий чат");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const groupAvatarRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [hasGroup, setHasGroup] = useState(true);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [recording, setRecording] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [rightOpen, setRightOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1280);
  const [notify, setNotify] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [leftOpen, setLeftOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const load = (gid: number) => {
    api.get(`/api/groups/${gid}/messages/`).then(r => setMessages(r.data)).catch(() => {});
    api.get(`/api/groups/${gid}/members`).then(r => setMembers(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get("/api/groups/").then(r => {
      if (r.data.length) {
        setGroupId(r.data[0].id);
        setGroupName(r.data[0].name || "Общий чат");
        setGroupAvatar(r.data[0].avatar_url || null);
        load(r.data[0].id);
      } else setHasGroup(false);
    }).catch(() => setHasGroup(false));
  }, []);

  useEffect(() => {
    if (!groupId) return;
    const t = setInterval(() => load(groupId), 4000);
    return () => clearInterval(t);
  }, [groupId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const patch = async (id: number, payload: any) => {
    if (!groupId) return;
    await api.patch(`/api/groups/${groupId}/messages/${id}`, payload).catch(() => {});
    load(groupId);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !groupId) return;
    setText("");
    await api.post(`/api/groups/${groupId}/messages/`, { text: t, reply_to_id: replyTo?.id ?? null }).catch(() => {});
    setReplyTo(null);
    load(groupId);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !groupId) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      const up = await api.post("/api/files/", fd);
      await api.post(`/api/groups/${groupId}/messages/`, { image_url: up.data.url, reply_to_id: replyTo?.id ?? null });
      setReplyTo(null);
      load(groupId);
    } catch {}
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!groupId) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("file", new File([blob], "voice.webm", { type: "audio/webm" }));
        try {
          const up = await api.post("/api/files/", fd);
          await api.post(`/api/groups/${groupId}/messages/`, { audio_url: up.data.url });
          load(groupId);
        } catch {}
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      alert("Нет доступа к микрофону");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const clearHistory = async () => {
    if (!groupId) return;
    if (!window.confirm("Удалить всю историю чата? Это действие необратимо.")) return;
    for (const m of messages) {
      await api.delete(`/api/groups/${groupId}/messages/${m.id}`).catch(() => {});
    }
    load(groupId);
  };

  const uploadGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !groupId) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      const up = await api.post("/api/files/", fd);
      await api.patch(`/api/groups/${groupId}/avatar`, { avatar_url: up.data.url });
      setGroupAvatar(up.data.url);
    } catch {}
  };

  const pinnedMsg = messages.filter(m => m.pinned).slice(-1)[0];
  const media = messages.filter(m => m.image_url || m.audio_url);
  const filtered = search
    ? messages.filter(m => (m.text || "").toLowerCase().includes(search.toLowerCase()))
    : messages;
  const lastMsgByUser = (uid: number) => [...messages].reverse().find(m => m.user.id === uid);

  if (!hasGroup) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-sber-text mb-8">Чат</h1>
        <div className="bg-white rounded-3xl p-12 shadow-card text-center text-sber-muted">
          Создайте группу, чтобы общаться с её участниками
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-3rem)] flex flex-col">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => groupAvatarRef.current?.click()} title="Сменить аватар группы"
            className="group relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sber-green to-sber-dark flex items-center justify-center text-white shadow-soft overflow-hidden transition-all hover:shadow-lg hover:scale-[1.03]">
            {groupAvatar ? (
              <img src={API_BASE + groupAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <MessagesSquare size={22} />
            )}

            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-white/95 text-sber-green flex items-center justify-center shadow-soft">
                <Plus size={17} strokeWidth={2.2} />
              </div>
            </div>
          </button>
          <input type="file" accept="image/*" ref={groupAvatarRef} onChange={uploadGroupAvatar} className="hidden" />
          <div>
            <h1 className="text-2xl font-bold text-sber-text">Чат группы</h1>
            <p className="text-sm text-sber-muted">Сообщения, фото и голосовые для всех участников</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLeftOpen(o => !o)} title="Список чатов"
            className="bg-white border border-gray-100 rounded-xl p-2.5 text-sber-muted hover:text-sber-green hover:border-sber-green transition-colors shadow-card">
            <MessagesSquare size={16} />
          </button>
          <button onClick={() => setRightOpen(o => !o)} title="Информация"
            className="bg-white border border-gray-100 rounded-xl p-2.5 text-sber-muted hover:text-sber-green hover:border-sber-green transition-colors shadow-card">
            <Users size={16} />
          </button>

        </div>
      </div>

      {/* Три колонки */}
      <div className="flex-1 grid gap-4 min-h-0 chat-grid" style={{ gridTemplateColumns: `${leftOpen ? "min(280px, 80vw) " : ""}1fr${rightOpen ? " min(288px, 80vw)" : ""}` }}>
        {/* ЛЕВАЯ ПАНЕЛЬ */}
        <div className={`${leftOpen ? "flex" : "hidden"} flex-col gap-4 min-w-0`}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden flex flex-col">
            <div className="p-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sber-muted" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} ref={searchRef}
                  placeholder="Поиск по сообщениям"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-sber-green/30" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Общий чат — активный */}
              <div className="px-2 pb-1">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-sber-light cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sber-green to-sber-dark flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                    {groupAvatar ? <img src={API_BASE + groupAvatar} alt="" className="w-full h-full object-cover" /> : <MessagesSquare size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-sber-text truncate">{groupName}</div>
                      <div className="text-[10px] text-sber-muted">сейчас</div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="text-xs text-sber-muted truncate">
                        {messages.length > 0
                          ? `${messages[messages.length - 1].user.username}: ${(messages[messages.length - 1].text || "вложение").slice(0, 22)}`
                          : "Пока пусто"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Участники
              </div>

              {members.map(m => {
                const last = lastMsgByUser(m.id);
                return (
                  <div key={m.id} className="px-2 pb-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-semibold text-slate-600 overflow-hidden">
                          {m.avatar_url ? <img src={API_BASE + m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.username[0]?.toUpperCase()}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-sber-green rounded-full ring-2 ring-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-sber-text truncate">{m.username}</div>
                          <div className="text-[10px] text-sber-muted">
                            {last ? new Date(last.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                        </div>
                        <div className="text-xs text-sber-muted truncate">
                          {last ? (last.audio_url ? "Голосовое сообщение" : last.image_url ? "Отправил(а) фото" : (last.text || "").slice(0, 24)) : "Нет сообщений"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ЦЕНТР — переписка */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card flex flex-col overflow-hidden min-w-0">
          {/* Заголовок чата */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => groupAvatarRef.current?.click()} title="Сменить аватар группы"
                className="group relative w-10 h-10 rounded-xl bg-gradient-to-br from-sber-green to-sber-dark flex items-center justify-center text-white overflow-hidden transition-all hover:shadow-soft hover:scale-[1.03]">
                {groupAvatar ? (
                  <img src={API_BASE + groupAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <MessagesSquare size={18} />
                )}

                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/95 text-sber-green flex items-center justify-center shadow-soft">
                    <Plus size={15} strokeWidth={2.2} />
                  </div>
                </div>
              </button>
              <div>
                <div className="font-semibold text-sber-text">{groupName}</div>
                <div className="text-xs text-sber-muted">{members.length} участников • все в сети</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-slate-400 hover:text-sber-green hover:bg-slate-50 transition-colors">
                <Search size={16} />
              </button>
              <button onClick={() => setRightOpen(o => !o)}
                className="p-2 rounded-lg text-slate-400 hover:text-sber-green hover:bg-slate-50 transition-colors">
                <Users size={16} />
              </button>
            </div>
          </div>

          {/* Закреп */}
          {pinnedMsg && (
            <div className="px-4 py-2.5 bg-sber-light/60 border-b border-sber-green/20 flex items-center gap-2 text-sm">
              <Pin size={13} className="text-sber-green flex-shrink-0" />
              <span className="flex-1 truncate text-sber-text">
                <b className="font-semibold">{pinnedMsg.user.username}:</b> {pinnedMsg.text || "вложение"}
              </span>
              <button onClick={() => patch(pinnedMsg.id, { pinned: false })}
                className="p-1 hover:bg-white rounded-lg flex-shrink-0 transition-colors">
                <X size={13} className="text-sber-muted" />
              </button>
            </div>
          )}

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3"
            style={{ backgroundImage: CHAT_PATTERN, backgroundRepeat: "repeat", backgroundColor: "#FAFBFB" }}>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-sber-light flex items-center justify-center mb-4">
                  <MessagesSquare size={24} className="text-sber-green" />
                </div>
                <div className="text-sber-muted text-sm">
                  {search ? "Сообщений по запросу не найдено" : "Сообщений пока нет — напиши первым!"}
                </div>
              </div>
            )}
            {filtered.map(m => {
              const mine = m.user.id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => setHoveredMsg(m.id)} onMouseLeave={() => setHoveredMsg(null)}>
                  <div className="max-w-[75%] relative group">
                    {!mine && (
                      <div className="text-xs font-semibold text-sber-green mb-1 ml-1">{m.user.username}</div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      mine
                        ? "bg-gradient-to-br from-sber-green to-sber-dark text-white shadow-soft"
                        : "bg-white text-sber-text shadow-card border border-gray-100"
                    } ${m.highlighted ? "ring-2 ring-amber-400" : ""}`}>
                      {m.reply_to && (
                        <div className={`text-xs mb-2 pl-2.5 py-1 border-l-2 rounded-sm ${
                          mine ? "border-white/40 text-white/90 bg-white/10" : "border-sber-green text-sber-muted bg-sber-light/50"
                        }`}>
                          <b>{m.reply_to.username}:</b> {m.reply_to.text || "вложение"}
                        </div>
                      )}
                      {m.text && <div className="text-sm whitespace-pre-line leading-relaxed">{m.text}</div>}
                      {m.image_url && (
                        <img src={API_BASE + m.image_url} alt="фото"
                          className="rounded-xl max-h-64 mt-1 shadow-soft" />
                      )}
                      {m.audio_url && <VoicePlayer url={API_BASE + m.audio_url} mine={mine} />}
                      <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                        mine ? "text-white/70 justify-end" : "text-slate-400"
                      }`}>
                        {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        {mine && <CheckCheck size={12} />}
                      </div>
                    </div>

                    {/* Hover-действия */}
                    {hoveredMsg === m.id && (
                      <div className={`absolute -top-3 ${mine ? "-left-36" : "-right-36"} bg-white border border-gray-100 rounded-xl shadow-soft px-1 py-1 flex items-center gap-0.5 z-10`}>
                        <ActionBtn title={m.pinned ? "Открепить" : "Закрепить"} onClick={() => patch(m.id, { pinned: !m.pinned })}>
                          {m.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </ActionBtn>
                        <ActionBtn title={m.highlighted ? "Убрать выделение" : "Выделить"} onClick={() => patch(m.id, { highlighted: !m.highlighted })}>
                          <Highlighter size={13} />
                        </ActionBtn>
                        <ActionBtn title="Ответить" onClick={() => setReplyTo(m)}>
                          <Reply size={13} />
                        </ActionBtn>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Ответ */}
          {replyTo && (
            <div className="px-4 py-2.5 bg-sber-light/60 flex items-center gap-2 text-sm border-t border-sber-green/20">
              <Reply size={14} className="text-sber-green flex-shrink-0" />
              <span className="flex-1 truncate text-sber-text">
                Ответ: <b>{replyTo.user.username}</b> — {replyTo.text || "вложение"}
              </span>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-white rounded-lg transition-colors">
                <X size={14} className="text-sber-muted" />
              </button>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={send} className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-sber-green/30 focus-within:bg-white transition-all">
              <input type="file" accept="image/*" ref={fileRef} onChange={onFile} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} title="Отправить фото"
                className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-sber-green transition-colors">
                <ImageIcon size={18} />
              </button>
              {recording ? (
                <button type="button" onClick={stopRecording} title="Остановить запись"
                  className="p-2.5 bg-red-500 text-white rounded-xl animate-pulse flex items-center gap-2">
                  <Square size={14} />
                  <span className="text-xs font-medium">Запись...</span>
                </button>
              ) : (
                <button type="button" onClick={startRecording} title="Голосовое сообщение"
                  className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-sber-green transition-colors">
                  <Mic size={18} />
                </button>
              )}
              <input type="text" value={text} onChange={e => setText(e.target.value)}
                placeholder="Напиши сообщение..."
                className="flex-1 bg-transparent px-2 py-2.5 text-sm focus:outline-none text-sber-text" />
              <button type="submit" disabled={!text.trim()}
                className="w-10 h-10 bg-sber-green hover:bg-sber-dark disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-colors">
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* ПРАВАЯ ПАНЕЛЬ */}
        {rightOpen && (
          <div className="hidden lg:flex flex-col gap-4 min-w-0">
            {/* О чате */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sber-green to-sber-dark flex items-center justify-center text-white overflow-hidden">
                  {groupAvatar ? <img src={API_BASE + groupAvatar} alt="" className="w-full h-full object-cover" /> : <MessagesSquare size={20} />}
                </div>
                <div>
                  <div className="font-bold text-sber-text">{groupName}</div>
                  <div className="text-xs text-sber-muted">{members.length} участника</div>
                </div>
              </div>
              <div className="space-y-1 pt-3">
                <InfoRow icon={<Bell size={15} />} label="Уведомления" value={notify ? "Включены" : "Выключены"}
                  clickable onClick={() => setNotify(n => { localStorage.setItem("fb_notify", String(!n)); return !n; })} />
                <InfoRow icon={<FolderOpen size={15} />} label="Файлы и медиа" value={`${media.length} файлов`}
                  clickable onClick={() => setFilesOpen(true)} />
                <InfoRow icon={<Search size={15} />} label="Поиск по чату" value="" clickable
                  onClick={() => { setLeftOpen(true); setTimeout(() => searchRef.current?.focus(), 60); }} />
              </div>
              <button onClick={clearHistory}
                className="w-full mt-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium">
                Очистить историю
              </button>
            </div>

            {/* Участники */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sber-text text-sm">Участники</div>
                <div className="text-xs text-sber-muted">{members.length}</div>
              </div>
              <div className="space-y-1">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-semibold text-sm text-slate-600 overflow-hidden">
                        {m.avatar_url ? <img src={API_BASE + m.avatar_url} alt="" className="w-full h-full object-cover" /> : m.username[0]?.toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-sber-green rounded-full ring-2 ring-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-sber-text truncate">{m.username}</div>
                      <div className="text-[11px] text-sber-muted">В сети</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модалка файлов */}
      {filesOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setFilesOpen(false)}>
          <div className="bg-white rounded-3xl shadow-soft p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sber-text flex items-center gap-2">
                <FolderOpen size={18} className="text-sber-green" /> Файлы и медиа
              </h3>
              <button onClick={() => setFilesOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={16} className="text-sber-muted" />
              </button>
            </div>
            {media.length === 0 ? (
              <div className="text-center text-sber-muted py-10">Файлов пока нет</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {media.map(m => m.image_url ? (
                  <a key={m.id} href={API_BASE + m.image_url} target="_blank" rel="noreferrer"
                    className="block hover:opacity-90 transition-opacity">
                    <img src={API_BASE + m.image_url} alt="файл"
                      className="rounded-xl w-full h-28 object-cover shadow-soft" />
                    <div className="text-[10px] text-sber-muted mt-1">
                      {m.user.username} • {new Date(m.created_at).toLocaleDateString("ru-RU")}
                    </div>
                  </a>
                ) : (
                  <div key={m.id} className="rounded-xl bg-sber-light p-3 flex flex-col items-center justify-center gap-2 h-32">
                    <Mic size={18} className="text-sber-green" />
                    <div className="text-[10px] text-sber-muted">{m.user.username}</div>
                    <audio controls src={API_BASE + m.audio_url} className="w-full" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Кастомный голосовой плеер ---------- */
function VoicePlayer({ url, mine }: { url: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Генерация декоративной волны
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 6 + Math.abs(Math.sin(i * 0.7)) * 14 + Math.abs(Math.cos(i * 0.3)) * 6;
    return h;
  });

  return (
    <div className="flex items-center gap-3 mt-1 py-1 min-w-[220px]">
      <audio ref={audioRef} src={url} preload="metadata"
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e => setProgress((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => { setPlaying(false); setProgress(0); }} />
      <button onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          mine ? "bg-white/20 hover:bg-white/30 text-white" : "bg-sber-green text-white hover:bg-sber-dark"
        }`}>
        {playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-6">
        {bars.map((h, i) => {
          const played = progress / (duration || 1) > i / bars.length;
          return (
            <div key={i}
              className={`w-[3px] rounded-full transition-colors ${
                played
                  ? mine ? "bg-white" : "bg-sber-green"
                  : mine ? "bg-white/40" : "bg-slate-300"
              }`}
              style={{ height: `${h}px` }} />
          );
        })}
      </div>
      <div className={`text-[11px] font-medium flex-shrink-0 ${mine ? "text-white/80" : "text-sber-muted"}`}>
        {fmt(progress > 0 ? progress : duration)}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title }: any) {
  return (
    <button type="button" title={title} onClick={onClick}
      className="p-1.5 text-slate-400 hover:text-sber-green hover:bg-sber-light rounded-lg transition-colors">
      {children}
    </button>
  );
}

function InfoRow({ icon, label, value, clickable, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center justify-between p-2.5 rounded-xl ${clickable ? "hover:bg-slate-50 cursor-pointer" : ""} transition-colors`}>
      <div className="flex items-center gap-2.5 text-sm text-sber-text">
        <span className="text-sber-green">{icon}</span>
        {label}
      </div>
      {value && <span className="text-xs text-sber-muted">{value}</span>}
    </div>
  );
}
