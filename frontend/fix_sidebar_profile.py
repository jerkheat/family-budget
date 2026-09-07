from pathlib import Path
import re

p = Path("src/components/Layout/Sidebar.tsx")
s = p.read_text(encoding="utf-8")

# 1. Добавляем иконку User в импорт lucide-react, если её нет
m = re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react";', s)
if m and "User" not in m.group(1):
    icons = m.group(1).rstrip()
    if not icons.strip().endswith(","):
        icons += ","
    icons += " User"
    s = s[:m.start(1)] + icons + s[m.end(1):]

# 2. Убираем старый большой блок ЛИЧНОЕ снизу, если он был вставлен
s = re.sub(
    r'\n\s*\{/\*\s*ЛИЧНОЕ[\s\S]*?</NavLink>\s*</div>\s*',
    '\n',
    s
)

# 3. Убираем старую секцию ЛИЧНОЕ, если она уже где-то есть
s = re.sub(
    r'\n\s*\{\s*title:\s*["\']ЛИЧНОЕ["\']\s*,\s*items:\s*\[\s*\{[^}]*label:\s*["\']Профиль["\'][^}]*\}\s*\]\s*\},?',
    '\n',
    s
)

profile = '    { title: "ЛИЧНОЕ", items: [{ to: "/profile", icon: User, label: "Профиль" }] },'

# 4. Вставляем ЛИЧНОЕ сразу после секции ДОПОЛНИТЕЛЬНО, где находится Копилка
pat = r'(\{\s*title:\s*["\'][^"\']*ДОПОЛНИТЕЛЬНО[^"\']*["\']\s*,\s*items:\s*\[[\s\S]*?label:\s*["\']Копилка["\'][\s\S]*?\]\s*\},)'

if re.search(pat, s, flags=re.I):
    s = re.sub(pat, r'\1\n' + profile, s, count=1, flags=re.I)
else:
    # запасной вариант, если секция записана в одну строку нестандартно
    s = s.replace(
        'label: "Копилка" }] },',
        'label: "Копилка" }] },\n' + profile
    )

p.write_text(s, encoding="utf-8")

print("Готово:", "ЛИЧНОЕ" in s and "Профиль" in s)
