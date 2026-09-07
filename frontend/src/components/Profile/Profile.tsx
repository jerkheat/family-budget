import { useEffect, useRef, useState } from "react";
import { Camera, Edit3, Save, X, Users, Receipt, PiggyBank, Wallet } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "";

export function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [msg, setMsg] = useState("");
  const [stats, setStats] = useState({ groups: 0, txs: 0, paid: 0, received: 0 });
  const avatarRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/api/auth/me");
        updateUser(me.data);
        setUsername(me.data.username || "");
        setFullName(me.data.full_name || "");
        setBio(me.data.bio || "");
      } catch {}
      try {
        const g = await api.get("/api/groups/");
        let txs = 0, spent = 0, income = 0;
        for (const grp of g.data) {
          try {
            const a = await api.get(`/api/groups/${grp.id}/accounting`);
            spent += a.data.spent || 0;
            income += a.data.income_total || 0;
          } catch {}
          try {
            const t = await api.get(`/api/groups/${grp.id}/transactions/`);
            txs += t.data.length;
          } catch {
            try {
              const t2 = await api.get(`/api/groups/${grp.id}/transactions`);
              txs += t2.data.length;
            } catch {}
          }
        }
        setStats({ groups: g.data.length, txs, paid: spent, received: income });
      } catch {}
    })();
  }, []);

  const save = async () => {
    try {
      const r = await api.patch("/api/auth/me", { username, full_name: fullName, bio });
      updateUser(r.data);
      setEditing(false);
      setMsg("Профиль обновлён");
      setTimeout(() => setMsg(""), 2500);
    } catch { setMsg("Ошибка сохранения"); }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setZoom(1); setOx(0); setOy(0); };
    reader.readAsDataURL(f);
  };

  const saveCrop = async () => {
    if (!cropSrc) return;
    const img = new Image();
    img.onload = async () => {
      const S = 256;
      const canvas = document.createElement("canvas");
      canvas.width = S; canvas.height = S;
      const ctx = canvas.getContext("2d")!;
      const cover = Math.max(S / img.width, S / img.height) * zoom;
      const w = img.width * cover, h = img.height * cover;
      const dx = (S - w) / 2 + (ox / 100) * S;
      const dy = (S - h) / 2 + (oy / 100) * S;
      ctx.drawImage(img, dx, dy, w, h);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
      if (!blob) return;
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.png", { type: "image/png" }));
      try {
        const r = await api.post("/api/auth/me/avatar", fd);
        updateUser(r.data);
        setMsg("Аватар обновлён");
        setTimeout(() => setMsg(""), 2500);
      } catch { setMsg("Ошибка загрузки"); }
      setCropSrc(null);
    };
    img.src = cropSrc;
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sber-text">Личный кабинет</h1>
        <p className="text-sber-muted mt-1">Ваши данные, аватар и статистика</p>
      </div>

      {msg && <div className="bg-sber-light text-sber-green p-3 rounded-xl text-sm mb-5">{msg}</div>}

      {/* Аватар + основная информация */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Аватар */}
          <div className="relative flex-shrink-0 group">
            <div className="w-32 h-32 rounded-full bg-sber-light overflow-hidden ring-4 ring-white shadow-soft">
              {user.avatar_url ? (
                <img src={API_BASE + user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-sber-green">
                  {(user.username || user.email)[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" onChange={onFilePicked} className="hidden" />
            <button onClick={() => avatarRef.current?.click()}
              className="mt-3 w-full py-2.5 rounded-xl bg-sber-light hover:bg-sber-green hover:text-white text-sber-green text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
              <Camera size={13} /> Сменить фото
            </button>
          </div>

          {/* Информация */}
          <div className="flex-1 w-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-sber-text">
                  {fullName || username || user.email.split("@")[0]}
                </h2>
                <div className="text-sm text-sber-muted">{user.email}</div>
                {bio && !editing && <div className="text-sm text-sber-text mt-2 italic">«{bio}»</div>}
              </div>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-sber-light hover:bg-sber-green hover:text-white text-sber-green rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
                  <Edit3 size={14} /> Редактировать
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-sber-muted mb-1 block">Имя и фамилия</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Например, Иван Петров"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
                </div>

                <div>
                  <label className="text-xs text-sber-muted mb-1 block">О себе</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                    placeholder="Пара слов о вас..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none resize-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={save}
                    className="px-5 py-2.5 bg-sber-green hover:bg-sber-dark text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
                    <Save size={14} /> Сохранить
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-sber-text rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
                    <X size={14} /> Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Валюта" value={user.currency || "RUB"} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модалка кропа аватара */}
      {cropSrc && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-soft">
            <h3 className="font-bold text-sber-text mb-4">Настройка аватара</h3>
            <div className="w-56 h-56 mx-auto rounded-full overflow-hidden bg-sber-gray border border-gray-100">
              <img src={cropSrc} alt=""
                className="w-full h-full object-cover"
                style={{ transform: `translate(${ox}%, ${oy}%) scale(${zoom})` }} />
            </div>
            <div className="space-y-3 mt-5">
              <div>
                <div className="text-xs text-sber-muted mb-1">Приближение</div>
                <input type="range" min={1} max={3} step={0.05} value={zoom}
                  onChange={e => setZoom(+e.target.value)} className="w-full accent-[#21A038]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-sber-muted mb-1">Позиция ↔</div>
                  <input type="range" min={-50} max={50} value={ox}
                    onChange={e => setOx(+e.target.value)} className="w-full accent-[#21A038]" />
                </div>
                <div>
                  <div className="text-xs text-sber-muted mb-1">Позиция ↕</div>
                  <input type="range" min={-50} max={50} value={oy}
                    onChange={e => setOy(+e.target.value)} className="w-full accent-[#21A038]" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveCrop}
                className="flex-1 py-2.5 bg-sber-green hover:bg-sber-dark text-white rounded-xl text-sm font-medium transition-colors">
                Сохранить
              </button>
              <button onClick={() => setCropSrc(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-sber-text transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={<Users />} label="Групп" value={stats.groups} color="text-sber-green" bg="bg-sber-light" />
        <Stat icon={<Receipt />} label="Транзакций" value={stats.txs} color="text-blue-500" bg="bg-blue-50" />
        <Stat icon={<PiggyBank />} label="Потрачено" value={`${stats.paid.toLocaleString("ru-RU")} ₽`} color="text-red-500" bg="bg-red-50" />
        <Stat icon={<Wallet />} label="Внесено" value={`${stats.received.toLocaleString("ru-RU")} ₽`} color="text-amber-500" bg="bg-amber-50" />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sber-muted">{label}</span>
      <span className="font-medium text-sber-text">{value}</span>
    </div>
  );
}

function Stat({ icon, label, value, color, bg }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3 ${color}`}>{icon}</div>
      <div className="text-xs text-sber-muted mb-1">{label}</div>
      <div className="text-xl font-bold text-sber-text">{value}</div>
    </div>
  );
}






