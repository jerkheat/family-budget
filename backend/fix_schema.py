import re
p = "app/schemas/schemas.py"
s = open(p, encoding="utf-8").read()
m = re.search(r"class GroupOut\(BaseModel\):[\s\S]*?(?=\nclass )", s)
if m and "avatar_url" not in m.group(0):
    s = s.replace("class GroupOut(BaseModel):", "class GroupOut(BaseModel):\n    avatar_url: Optional[str] = None", 1)
    open(p, "w", encoding="utf-8").write(s)
    print("schema fixed")
else:
    print("schema already ok")
