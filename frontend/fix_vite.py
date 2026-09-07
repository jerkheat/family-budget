p = "vite.config.ts"
s = open(p, encoding="utf-8").read()
if "proxy" not in s:
    block = """  server: {
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/static": "http://127.0.0.1:8000",
      "/uploads": "http://127.0.0.1:8000",
    },
  },
"""
    if "plugins:" in s:
        s = s.replace("plugins: [react()],", "plugins: [react()],\n" + block, 1)
    else:
        s = s.replace("defineConfig({", "defineConfig({\n" + block, 1)
    open(p, "w", encoding="utf-8").write(s)
print("vite proxy ok")
