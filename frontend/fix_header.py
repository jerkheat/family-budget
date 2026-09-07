import re
p = "src/components/Chat/Chat.tsx"
s = open(p, encoding="utf-8").read()

static_icon = '''<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sber-green to-sber-dark flex items-center justify-center text-white shadow-soft">
            <MessagesSquare size={22} />
          </div>'''

s2, n = re.subn(
    r'<button type="button" onClick=\{\(\) => groupAvatarRef\.current\?\.click\(\)\} title="Сменить аватар группы"\s+className="group relative w-12 h-12[\s\S]*?</button>',
    static_icon,
    s,
    count=1,
)

open(p, "w", encoding="utf-8").write(s2)
print("fixed:", n == 1)
