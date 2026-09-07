import asyncio
import re
import json
import base64
import httpx
from app.core.config import settings

SYSTEM_PROMPT = (
    "Ты — AI-ассистент FamilyBudget: умный, дружелюбный, с лёгким юмором. "
    "Ты видишь данные общего бюджета группы (контекст ниже) и отвечаешь на ЛЮБЫЕ вопросы пользователя. "
    "Финансовые вопросы считай строго по данным: долги, остаток бюджета, категории, цели — давай конкретные цифры и расчёты. "
    "Бытовые и шуточные вопросы (про бургеры, кофе, кино, приставку) решай с юмором и привязкой к бюджету: "
    "например, посчитай, сколько бургеров в месяц помещается в свободный остаток, и предложи план. "
    "Если данных не хватает — честно скажи и подскажи, что добавить в приложение. "
    "Отвечай на русском, кратко (до 150 слов), уместно используй 1-2 эмодзи."
)

VOICE_PROMPT = (
    "Извлеки из фразы пользователя трату. Верни СТРОГО JSON без пояснений: "
    '{"amount": число в рублях или null, "category": одно из '
    'groceries|utilities|transport|entertainment|clothing|health|other, '
    '"description": короткое описание строкой}. '
    "Числа словами переводи в цифры: пятьсот = 500, тысяча двести = 1200."
)

RECEIPT_PROMPT = (
    "Ты — система распознавания чеков. Извлеки из фото чека: "
    '"total" — итоговая сумма покупки (число), "store" — название магазина (строка), '
    '"category" — одна из категорий: groceries|utilities|transport|entertainment|clothing|health|other. '
    "Верни СТРОГО JSON без пояснений."
)


def _has(key: str) -> bool:
    return bool(getattr(settings, key, None))


def _groq_key():
    k = getattr(settings, "GROQ_API_KEY", None)
    if k:
        return k
    try:
        for line in open(".env", encoding="utf-8").read().splitlines():
            if line.startswith("GROQ_API_KEY="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None


def _openrouter_key():
    k = getattr(settings, "OPENROUTER_API_KEY", None)
    if k:
        return k
    try:
        for line in open(".env", encoding="utf-8").read().splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None


OPENROUTER_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-7b-instruct:free",
]


async def _openrouter_text(system: str, user: str, timeout: int = 30) -> str:
    last = None
    for m in OPENROUTER_MODELS:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {_openrouter_key()}",
                             "X-Title": "FamilyBudget"},
                    json={"model": m, "temperature": 0.7,
                          "messages": [{"role": "system", "content": system},
                                       {"role": "user", "content": user}]},
                )
                r.raise_for_status()
                print(f"[LLM openrouter] ок, модель {m}")
                return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            last = e
            print(f"[LLM openrouter {m}] {e}")
    raise last


def _deepseek_key():
    k = getattr(settings, "DEEPSEEK_API_KEY", None)
    if k:
        return k
    try:
        for line in open(".env", encoding="utf-8").read().splitlines():
            if line.startswith("DEEPSEEK_API_KEY="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None


async def _deepseek_text(system: str, user: str, timeout: int = 30) -> str:
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {_deepseek_key()}"},
            json={"model": "deepseek-chat", "temperature": 0.7,
                  "messages": [{"role": "system", "content": system},
                               {"role": "user", "content": user}]},
        )
        r.raise_for_status()
        print("[LLM deepseek] ок, модель deepseek-chat")
        return r.json()["choices"][0]["message"]["content"]


# ---------- Провайдеры ----------
GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it", "meta-llama/llama-4-scout-17b-16e-instruct"]


async def _groq_text(system: str, user: str, timeout: int = 30,
                     model: str = None) -> str:
    models = [model] if model else GROQ_MODELS
    last = None
    for m in models:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {_groq_key()}"},
                    json={"model": m, "temperature": 0.7,
                          "messages": [{"role": "system", "content": system},
                                       {"role": "user", "content": user}]},
                )
                r.raise_for_status()
                print(f"[LLM groq] ок, модель {m}")
                return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            last = e
            print(f"[LLM groq {m}] {e}")
    raise last


async def _openai_text(system: str, user: str, timeout: int = 30) -> str:
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            json={"model": "gpt-4o-mini", "temperature": 0.7,
                  "messages": [{"role": "system", "content": system},
                               {"role": "user", "content": user}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


GEMINI_MODELS = [
    "gemini-3.6-pro",
    "gemini-3-pro",
    "gemini-3-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-3.6-flash",
    "gemini-2.0-flash",
]


async def _gemini_text(system: str, user: str, timeout: int = 30, model: str = None) -> str:
    models = [model] if model else GEMINI_MODELS
    last = None
    for m in models:
        for attempt in (1, 2):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    r = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={settings.GEMINI_API_KEY}",
                        json={
                            "system_instruction": {"parts": [{"text": system}]},
                            "contents": [{"parts": [{"text": user}]}],
                        },
                    )
                    r.raise_for_status()
                    print(f"[LLM gemini] ок, модель {m}")
                    return r.json()["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                last = e
                code = getattr(getattr(e, "response", None), "status_code", 0)
                if code == 429 and attempt == 1:
                    print(f"[LLM gemini {m}] 429 — жду 20 сек и повторяю")
                    await asyncio.sleep(20)
                    continue
                print(f"[LLM gemini {m}] {e}")
                break
    raise last


async def llm_chat(system: str, user: str, timeout: int = 30):
    """Пробуем провайдеров по очереди: DeepSeek -> OpenRouter -> Groq -> OpenAI -> Gemini."""
    if _deepseek_key():
        try:
            return await asyncio.wait_for(_deepseek_text(system, user, timeout), timeout=timeout + 2)
        except Exception as e:
            print(f"[LLM deepseek] {e}")
    if _openrouter_key():
        try:
            return await asyncio.wait_for(_openrouter_text(system, user, timeout), timeout=timeout + 2)
        except Exception as e:
            print(f"[LLM openrouter] {e}")
    if _groq_key():
        try:
            return await asyncio.wait_for(_groq_text(system, user, timeout), timeout=timeout + 2)
        except Exception as e:
            print(f"[LLM groq] {e}")
    if settings.OPENAI_API_KEY:
        try:
            return await asyncio.wait_for(_openai_text(system, user, timeout), timeout=timeout + 2)
        except Exception as e:
            print(f"[LLM openai] {e}")
    if settings.GEMINI_API_KEY:
        try:
            return await asyncio.wait_for(_gemini_text(system, user, timeout), timeout=timeout + 2)
        except Exception as e:
            print(f"[LLM gemini] {e}")
    return None


# ---------- Публичные функции ----------
async def llm_answer(context: str, question: str):
    return await llm_chat(SYSTEM_PROMPT, f"{context}\n\nВопрос пользователя: {question}", 10)


async def llm_quick(context: str, question: str, timeout: int = 8):
    return await llm_chat(SYSTEM_PROMPT, f"{context}\n\n{question}", timeout)


def _extract_json(raw: str):
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(raw[start:end + 1])
    except Exception:
        return None


async def llm_parse_voice(text: str):
    raw = await llm_chat(VOICE_PROMPT, text, 30)
    return _extract_json(raw) if raw else None


async def _groq_receipt(b64: str, mime: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {_groq_key()}"},
            json={"model": "llama-3.2-90b-vision-preview", "temperature": 0.2,
                  "messages": [{"role": "user", "content": [
                      {"type": "text", "text": RECEIPT_PROMPT},
                      {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                  ]}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def _openai_receipt(b64: str, mime: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            json={"model": "gpt-4o-mini", "temperature": 0.2,
                  "messages": [{"role": "user", "content": [
                      {"type": "text", "text": RECEIPT_PROMPT},
                      {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                  ]}]},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def _gemini_receipt(b64: str, mime: str) -> str:
    last = None
    for m in GEMINI_MODELS:
      try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={settings.GEMINI_API_KEY}",
            json={
                "system_instruction": {"parts": [{"text": RECEIPT_PROMPT}]},
                "contents": [{"parts": [
                    {"inline_data": {"mime_type": mime, "data": b64}},
                    {"text": "Распознай этот чек"},
                ]}],
            },
            )
            r.raise_for_status()
            print(f"[LLM gemini receipt] ок, модель {m}")
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
      except Exception as e:
            last = e
            print(f"[LLM gemini receipt {m}] {e}")
    raise last


async def llm_parse_receipt(image_bytes: bytes, mime: str = "image/jpeg"):
    b64 = base64.b64encode(image_bytes).decode()
    if _groq_key():
        try:
            return _extract_json(await _groq_receipt(b64, mime))
        except Exception as e:
            print(f"[LLM groq receipt] {e}")
    if settings.OPENAI_API_KEY:
        try:
            return _extract_json(await _openai_receipt(b64, mime))
        except Exception as e:
            print(f"[LLM openai receipt] {e}")
    if settings.GEMINI_API_KEY:
        try:
            return _extract_json(await _gemini_receipt(b64, mime))
        except Exception as e:
            print(f"[LLM gemini receipt] {e}")
    return None


CAT_KEYWORDS = {
    "groceries": ["продукт", "магазин", "еда", "молоко", "хлеб", "пятерочк", "магнит", "перекрест"],
    "transport": ["такси", "бензин", "метро", "автобус", "транспорт", "каршер"],
    "utilities": ["коммунал", "свет", "вода", "квартир", "жкх", "интернет"],
    "entertainment": ["кино", "ресторан", "кафе", "развлеч", "концерт", "игр"],
    "clothing": ["одежд", "куртк", "ботинк", "штаны", "рубашк"],
    "health": ["аптек", "лекарств", "врач", "здоров"],
}


def parse_voice_fallback(text: str):
    t = text.lower()
    nums = re.findall(r"\d+", t)
    amount = float(nums[0]) if nums else None
    category = "other"
    for cat, words in CAT_KEYWORDS.items():
        if any(w in t for w in words):
            category = cat
            break
    return {"amount": amount, "category": category, "description": text}








