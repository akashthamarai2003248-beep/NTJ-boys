# Freebuff run doc — Netaji Boys Mandram (NBM)

## Reproduce the uncommitted artifacts

A fresh checkout needs these before the dev server works:

1. **Env file**: copy `.env.local` from the main checkout (`C:\manage\ntj`) into the
   worktree root. It sets `NEXT_PUBLIC_DATA_MODE` (e.g. `local` or `supabase`) and any
   Supabase keys. Never commit secret values — copy, don't symlink.
2. **Dependencies**: `npm install` (project uses npm; see `package-lock.json`).
3. **Local demo data** (only if `NEXT_PUBLIC_DATA_MODE=local`): the app seeds
   `.data/db.json` on first run automatically. To reset demo data, delete
   `.data/db.json` and restart the server.
4. **Supabase mode** (only if `NEXT_PUBLIC_DATA_MODE=supabase`): the SQL in
   `supabase/` must be applied to the Supabase project (run `supabase/_apply_all.sql`
   in the SQL editor), including migrations and seed users.

## Run the server

```powershell
# Dev server (hot reload) — start detached so it survives the session:
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','-p','3000' -RedirectStandardOutput 'C:\manage\ntj\.freebuff\preview-dcc9eba9-de7c-4a63-bdb1-95bff07b1e52.log' -RedirectStandardError 'C:\manage\ntj\.freebuff\preview-dcc9eba9-de7c-4a63-bdb1-95bff07b1e52.log.err' -WindowStyle Hidden -PassThru).Id"

# Confirm it survived and wait until it answers:
powershell -NoProfile -Command "Get-Process -Id <pid>"
# then poll: curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# Production mode instead: npm run build && npm start
```

Default port is 3000 (Next.js). **Important**: the Freebuff sandbox shell sets
`PORT=0`, which makes Next.js bind a RANDOM port — always pass `-- -p 3000`
explicitly (as above) so the URL is stable. If 3000 is taken, pass `-- -p <free
port>` instead. The first compile is fast (~2s page compile on Turbopack, Next
16.3.4); the app is a mobile-first Next.js app (App Router) in this repo.

## Live preview status (from this thread)

- Server: `npm run dev -- -p 3000`, detached via the PowerShell recipe above,
  pid **15944**, logging to `.freebuff/preview-dcc9eba9-de7c-4a63-bdb1-95bff07b1e52.log(.err)`.
- URL: http://localhost:3000 (307 → `/login` when signed out; the preview
  webview reuses an existing session, otherwise sign in with a demo user).
- The launcher command may outlive its 30s tool timeout — that's the
  `Start-Process` wrapper, not the server; verify via the log + port 3000.