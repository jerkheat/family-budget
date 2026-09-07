import re
p = "app/main.py"
s = open(p, encoding="utf-8").read()

new_block = '''app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
'''

s2, n = re.subn(r'app\.add_middleware\(\s*CORSMiddleware[\s\S]*?\n\)', new_block, s, count=1)
if n == 0:
    # если блока вообще нет — добавляю после импортов
    s2 = s.replace("from fastapi import FastAPI", "from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware", 1)
    s2 = s2.replace("app = FastAPI(", new_block + "\napp = FastAPI(", 1)

open(p, "w", encoding="utf-8").write(s2)
print("CORS fixed:", 'allow_origins=["*"]' in s2)
