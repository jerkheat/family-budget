import sqlite3, glob
f = glob.glob("*.db")[0]
c = sqlite3.connect(f)
cols = [r[1] for r in c.execute("PRAGMA table_info(users)")]
if "full_name" not in cols:
    c.execute("ALTER TABLE users ADD COLUMN full_name VARCHAR")
if "bio" not in cols:
    c.execute("ALTER TABLE users ADD COLUMN bio TEXT")
c.commit()
print("migration ok:", f)
