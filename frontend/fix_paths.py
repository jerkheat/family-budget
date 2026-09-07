import os, re
for root, _, files in os.walk("src"):
    for f in files:
        if not f.endswith((".ts", ".tsx")): continue
        p = os.path.join(root, f)
        s = open(p, encoding="utf-8").read()
        if "groupPick" not in s: continue
        rel = os.path.relpath(p, "src").replace("\\", "/")
        depth = rel.count("/")
        correct = "../" * depth + "services/groupPick"
        s2 = re.sub(r'from "[^"]*groupPick"', f'from "{correct}"', s)
        if s2 != s:
            open(p, "w", encoding="utf-8").write(s2)
            print("fixed:", p)
print("done")
