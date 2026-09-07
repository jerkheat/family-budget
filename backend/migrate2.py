import sqlite3, glob
f = glob.glob("*.db")[0]
c = sqlite3.connect(f)
cols = [r[1] for r in c.execute("PRAGMA table_info(groups)")]
if "avatar_url" not in cols:
    c.execute("ALTER TABLE groups ADD COLUMN avatar_url VARCHAR")
    c.commit()
print("migration ok")
