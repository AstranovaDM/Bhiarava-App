# @bhairava/admin-web

Production admin (desktop-first). Behavioral SoT remains `MAIN app` until cutover proven.

## Run

```bash
# terminal A
npm run start:dev -w @bhairava/api

# terminal B
npm run dev -w @bhairava/admin-web
```

Open http://localhost:5173 — uses Vite proxy to API `:4000`.
Demo login: `admin@bhairava.demo` / `Demo@12345`
