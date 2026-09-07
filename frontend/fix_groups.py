import re, os
patched = 0
for root, _, files in os.walk("src"):
    for f in files:
        if not f.endswith((".ts", ".tsx")): continue
        if f in ("groupPick.ts", "useActiveGroup.ts", "GroupSwitcher.tsx"): continue
        p = os.path.join(root, f)
        s = open(p, encoding="utf-8").read()
        if ".data[0]" not in s: continue
        s2 = re.sub(r'\b([a-z])\.data\[0\]', r'pickGroup(\1.data)', s)
        if s2 == s: continue
        depth = "../services/groupPick" if "/hooks/" in p.replace("\\", "/") else "../../services/groupPick"
        imp = f'import {{ pickGroup }} from "{depth}";'
        if "groupPick" not in s2:
            s2 = s2.replace('import { api } from', imp + '\nimport { api } from', 1)
        open(p, "w", encoding="utf-8").write(s2)
        patched += 1
        print("patched:", p)
print("total:", patched)
