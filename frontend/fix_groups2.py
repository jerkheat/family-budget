import os, re
for root, _, files in os.walk("src"):
    for f in files:
        if not f.endswith((".ts", ".tsx")): continue
        p = os.path.join(root, f)
        s = open(p, encoding="utf-8").read()
        s2 = re.sub(r'\b([A-Za-z_$][\w$]*)\.data\[0\]', r'pickGroup(\1.data)', s)
        if s2 == s: continue
        rel = os.path.relpath(p, "src").replace("\\", "/")
        depth = rel.count("/")
        imp = 'import { pickGroup } from "' + "../" * depth + 'services/groupPick";'
        if "groupPick" not in s:
            s2 = s2.replace('import { api } from', imp + '\nimport { api } from', 1)
        open(p, "w", encoding="utf-8").write(s2)
        print("patched:", p)
print("done")
