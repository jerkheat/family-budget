import { useEffect, useRef, useState } from "react";
import { Mic, Square, ScanLine, Pencil, Trash2 } from "lucide-react";
import { pickGroup } from "../../services/groupPick";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

const CAT: Record<string, string> = {
  groceries: "Продукты", utilities: "Коммуналка", transport: "Транспорт",
  entertainment: "Развлечения", clothing: "Одежда", health: "Здоровье", other: "Прочее",
};

export function Transactions() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("groceries");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [listening, setListening] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("groceries");
  const [editDesc, setEditDesc] = useState("");
  const recRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const processedRef = useRef(false);
  const timerRef = useRef<any>(null);
  const receiptRef = useRef<HTMLInputElement>(null);

  const load = (gid: number) => {
    api.get(`/api/groups/${gid}/transactions/`).then(r => setTxs(r.data)).catch(() => {});
    api.get(`/api/groups/${gid}/members`).then(r => setMembers(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get("/api/groups/").then(r => {
      setGroups(r.data);
      if (r.data.length) { setGroupId(pickGroup(r.data).id); load(pickGroup(r.data).id); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && members.length && selected.length === 0) setSelected([user.id]);
  }, [members, user]);

  const toggle = (id: number) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  // ---------- Числа словами ----------
  const parseRussianNumber = (text: string): number | null => {
    const t = text.toLowerCase();
    const digitMatch = t.match(/\d+([.,]\d+)?/);
    if (digitMatch) return parseFloat(digitMatch[0].replace(",", "."));
    const units: Record<string, number> = { один: 1, одна: 1, две: 2, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9 };
    const teens: Record<string, number> = { десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19 };
    const tens: Record<string, number> = { двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90 };
    const hundreds: Record<string, number> = { сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500, шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900 };
    const words = t.replace(/[.,!?;:]/g, " ").split(/\s+/).filter(Boolean);
    let total = 0, current = 0, found = false;
    for (const w of words) {
      if (hundreds[w] !== undefined) { current += hundreds[w]; found = true; }
      else if (tens[w] !== undefined) { current += tens[w]; found = true; }
      else if (teens[w] !== undefined) { current += teens[w]; found = true; }
      else if (units[w] !== undefined) { current += units[w]; found = true; }
      else if (["тысяча", "тысячи", "тысяч"].includes(w)) { total += (current || 1) * 1000; current = 0; found = true; }
    }
    const result = total + current;
    return found && result > 0 ? result : null;
  };

  const clientParse = (text: string) => {
    const t = text.toLowerCase();
    const KW: [string, string[]][] = [
      ["groceries", ["продукт", "магазин", "еда", "молоко", "хлеб", "пятерочк", "магнит"]],
      ["transport", ["такси", "бензин", "метро", "автобус"]],
      ["utilities", ["коммунал", "свет", "вода", "квартир", "жкх"]],
      ["entertainment", ["кино", "ресторан", "кафе", "развлеч"]],
      ["clothing", ["одежд", "куртк", "ботинк"]],
      ["health", ["аптек", "лекарств", "врач"]],
    ];
    let cat = "other";
    for (const [c, words] of KW) if (words.some(w => t.includes(w))) { cat = c; break; }
    return { amount: parseRussianNumber(text), category: cat, description: text };
  };

  const applyParse = (d: any, originalText: string) => {
    const fb = clientParse(originalText);
    const finalAmount = d?.amount || fb.amount;
    const finalCategory = d?.category || fb.category;
    if (finalAmount) setAmount(String(finalAmount));
    if (finalCategory) setCategory(finalCategory);
    setDescription(d?.description || originalText);
    setMsg(finalAmount
      ? `✅ Распознано: «${originalText}». Поля заполнены — проверь и нажми «Добавить»`
      : `⚠️ Распознано: «${originalText}». Сумму введи вручную`);
  };

  const fillFromText = async (text: string) => {
    const clean = text.trim();
    if (!clean) { setMsg("❌ Не расслышал фразу. Попробуй ещё раз"); return; }
    setMsg(`🎤 Распознано: «${clean}». Заполняю...`);
    try {
      const r = await api.post("/api/ai/parse-voice", { text: clean });
      applyParse(r.data, clean);
    } catch { applyParse(clientParse(clean), clean); }
  };

  const stopVoice = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
    setMsg("⏳ Запись остановлена, обрабатываю фразу...");
  };

  const startVoice = async () => {
    if (listening) { stopVoice(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setShowBrowserModal(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setMsg("❌ Микрофон недоступен: Параметры Windows → Конфиденциальность → Микрофон → разреши доступ");
      return;
    }
    transcriptRef.current = "";
    processedRef.current = false;
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      transcriptRef.current = text.trim();
      if (transcriptRef.current) setMsg(`🎤 Слышу: «${transcriptRef.current}»`);
    };
    rec.onend = () => {
      setListening(false);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (processedRef.current) return;
      processedRef.current = true;
      const text = transcriptRef.current.trim();
      if (text) fillFromText(text);
      else setMsg("❌ Не расслышал фразу. Скажи чуть громче и попробуй ещё раз");
    };
    rec.onerror = (ev: any) => {
      setListening(false);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setMsg(ev?.error === "not-allowed" ? "❌ Разреши доступ к микрофону" : "❌ Ошибка микрофона");
    };
    setListening(true);
    setMsg("🎤 Слушаю... скажи: «продукты на пятьсот рублей»");
    rec.start();
    timerRef.current = setTimeout(() => { try { rec.stop(); } catch {} }, 10000);
  };

  const scanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setScanning(true);
    setMsg("📷 AI распознаёт чек...");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await api.post("/api/ai/parse-receipt", fd);
      const d = r.data;
      if (d.total) setAmount(String(d.total));
      if (d.category) setCategory(d.category);
      setDescription(d.store ? `Чек: ${d.store}` : "Чек");
      setMsg("✅ Чек распознан! Проверь поля и нажми «Добавить»");
    } catch { setMsg("❌ Не удалось распознать чек — попробуй более чёткое фото"); }
    finally { setScanning(false); }
  };

  // ---------- Редактирование / удаление ----------
  const startEdit = (t: any) => {
    setEditId(t.id);
    setEditAmount(String(t.amount));
    setEditCategory(t.category);
    setEditDesc(t.description || "");
  };

  const saveEdit = async () => {
    if (!groupId || !editId) return;
    try {
      await api.patch(`/api/groups/${groupId}/transactions/${editId}`, {
        amount: parseFloat(editAmount), category: editCategory, description: editDesc,
      });
      setEditId(null);
      setMsg("✅ Трата обновлена!");
      load(groupId);
    } catch { setMsg("❌ Ошибка сохранения"); }
  };

  const delTx = async (id: number) => {
    if (!groupId) return;
    if (!window.confirm("Удалить трату? Долги пересчитаются.")) return;
    try {
      await api.delete(`/api/groups/${groupId}/transactions/${id}`);
      setMsg("🗑 Трата удалена");
      load(groupId);
    } catch { setMsg("❌ Ошибка удаления"); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !amount) return;
    if (selected.length === 0) { setMsg("❌ Отметь хотя бы одного участника"); return; }
    try {
      await api.post(`/api/groups/${groupId}/transactions/`, {
        amount: parseFloat(amount), category, description, split_user_ids: selected,
      });
      setAmount(""); setDescription("");
      setMsg(selected.length === 1 ? "✅ Трата добавлена — только твоя" : `✅ Трата разделена на ${selected.length}!`);
      load(groupId);
    } catch { setMsg("❌ Ошибка при добавлении"); }
  };

  const splitNames = (t: any) =>
    t.splits.map((s: any) => members.find(m => m.id === s.user_id)?.username || "?").join(", ");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-sber-text mb-8">Траты</h1>

      {showBrowserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowBrowserModal(false)}>
          <div className="bg-white rounded-3xl shadow-soft p-8 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-sber-light flex items-center justify-center mx-auto mb-4">
              <Mic size={28} className="text-sber-green" />
            </div>
            <h3 className="text-xl font-bold text-sber-text mb-2">Голосовой ввод</h3>
            {((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? (
              <p className="text-sber-muted mb-6">
                Голосовой ввод работает в браузерах <b className="text-sber-text">Chrome</b> и <b className="text-sber-text">Edge</b>. Твой браузер поддерживает его — включи микрофон и скажи трату 🎙
              </p>
            ) : (
              <p className="text-sber-muted mb-6">
                Микрофон работает только в браузерах <b className="text-sber-text">Chrome</b> или <b className="text-sber-text">Edge</b>. Открой приложение в одном из них, чтобы добавлять траты голосом 🎙
              </p>
            )}
            {((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? (
              <div className="space-y-2">
                <button onClick={() => { setShowBrowserModal(false); startVoice(); }}
                  className="w-full bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium">
                  Включить микрофон
                </button>
                <button onClick={() => setShowBrowserModal(false)}
                  className="w-full bg-sber-gray text-sber-muted py-3 rounded-xl font-medium">
                  Отмена
                </button>
              </div>
            ) : (
              <button onClick={() => setShowBrowserModal(false)}
                className="w-full bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium">
                Понятно
              </button>
            )}
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 shadow-card text-center text-sber-muted">
          У вас пока нет групп. Создай группу в разделе «Группы», чтобы добавлять траты.
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="bg-white rounded-3xl p-6 shadow-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Добавить трату</h3>
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" ref={receiptRef} onChange={scanReceipt} className="hidden" />
                <button type="button" onClick={() => receiptRef.current?.click()} disabled={scanning}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                    scanning ? "bg-amber-400 text-white animate-pulse" : "bg-sber-light text-sber-green hover:bg-sber-green hover:text-white"
                  }`}>
                  <ScanLine size={16} /> {scanning ? "Сканирую..." : "Скан чека"}
                </button>
                <button type="button" onClick={() => setShowBrowserModal(true)}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                    listening ? "bg-red-500 text-white animate-pulse" : "bg-sber-light text-sber-green hover:bg-sber-green hover:text-white"
                  }`}>
                  {listening ? <Square size={16} /> : <Mic size={16} />}
                  {listening ? "Стоп и заполнить" : "Сказать в микрофон"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="Сумма, ₽"
                className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" required />
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none">
                {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание"
                className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
              <button type="submit"
                className="bg-sber-green hover:bg-sber-dark text-white py-3 rounded-xl font-medium transition-colors">
                Добавить
              </button>
            </div>

            <div className="mt-5">
              <div className="text-sm text-sber-muted mb-2">С кем делить трату:</div>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <button type="button" key={m.id} onClick={() => toggle(m.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      selected.includes(m.id)
                        ? "bg-sber-green text-white border-sber-green"
                        : "bg-white text-sber-muted border-gray-200 hover:border-sber-green"
                    }`}>
                    {m.username}
                  </button>
                ))}
              </div>
              <div className="text-xs text-sber-muted mt-2">
                {selected.length <= 1
                  ? "🙈 Отмечен только ты — трата личная и ни с кем не делится"
                  : `👥 Трата будет разделена поровну на ${selected.length}`}
              </div>
            </div>

            {msg && <div className="mt-3 text-sm text-sber-green">{msg}</div>}
          </form>

          <div className="bg-white rounded-3xl shadow-card overflow-hidden">
            {txs.map((t) => (
              <div key={t.id} className="p-4 border-b border-gray-50 last:border-0">
                {editId === t.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="number" step="0.01" min="0.01" value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none">
                      {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:border-sber-green focus:outline-none" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit}
                        className="flex-1 bg-sber-green hover:bg-sber-dark text-white rounded-xl font-medium">
                        Сохранить
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="px-4 bg-sber-gray hover:bg-gray-200 text-sber-muted rounded-xl">
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-sber-light flex items-center justify-center text-sber-green font-bold">
                      {(CAT[t.category] || "₽")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sber-text truncate">{t.description || CAT[t.category]}</div>
                      <div className="text-xs text-sber-muted">
                        {CAT[t.category]} • оплатил {t.payer?.username} • {new Date(t.occurred_at).toLocaleDateString("ru-RU")}
                      </div>
                      <div className="text-xs text-sber-muted mt-0.5">
                        {t.splits.length === 1 ? "🙈 Личная трата" : `👥 Разделено: ${splitNames(t)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(t)} title="Редактировать"
                        className="p-2 text-slate-400 hover:text-sber-green hover:bg-sber-light rounded-lg transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => delTx(t.id)} title="Удалить"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="font-bold text-sber-text">{t.amount.toLocaleString("ru-RU")} ₽</div>
                  </div>
                )}
              </div>
            ))}
            {txs.length === 0 && (
              <div className="p-10 text-center text-sber-muted">Трат пока нет — добавьте первую выше!</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
