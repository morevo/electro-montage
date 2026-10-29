# CLAUDE.md — ElectroMontage Project Documentation

This file provides guidance for working with the ElectroMontage project (React SPA + NestJS API).

---

## 📁 Project Structure

```
electro-montage/
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind
│   ├── src/                  # React components, pages, hooks, context
│   ├── public/               # Static assets
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile            # Multi-stage: build → nginx
│   ├── nginx.conf            # SPA fallback + API proxy
│   └── .env.example
│
├── backend/                  # NestJS 10 + Prisma + PostgreSQL
│   ├── src/                  # Modules: auth, categories, photos, upload, public
│   ├── prisma/
│   │   └── schema.prisma     # User, Category, Photo, RefreshToken
│   ├── package.json
│   ├── Dockerfile            # Multi-stage: deps → build → runner
│   ├── docker-compose.yml    # Local dev (postgres + backend)
│   ├── docker-compose.prod.yml # Production VPS
│   ├── .env.example
│   └── .env.production.example
│
├── .github/workflows/
│   └── deploy.yml            # Auto-deploy to reg.ru on push to main
│
├── docker-compose.yml        # Local full stack (frontend + backend + postgres)
├── package.json              # Root workspace (npm workspaces)
└── CLAUDE.md
```

---

## 🚀 Local Development

### Quick Start (All Services)
```bash
# From root - starts frontend:5173, backend:3001, postgres:5432
docker-compose up -d
```

### Frontend Only
```bash
cd frontend
npm install          # First time only
npm run dev          # http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

### Backend Only
```bash
cd backend
npm install          # First time only
npm run start:dev    # http://localhost:3001 (hot reload)
npm run build        # Compile to dist/
npm run start:prod   # Production mode (needs dist/)
npm run prisma:studio # DB GUI
npm run prisma:migrate # Run migrations
npm run prisma:seed   # Seed admin user
```

### Useful Commands
```bash
# Frontend
npm run lint         # (if configured)
npm run format       # (if configured)

# Backend
npm run lint         # ESLint with fix
npm run test         # Jest
npm run test:watch   # Jest watch mode
npm run test:cov     # Coverage report
npm run prisma:generate # Regenerate Prisma Client
```

---

## 🐳 Docker Commands

### Root (Full Stack)
```bash
docker-compose up -d           # Start all
docker-compose down            # Stop all
docker-compose logs -f         # Logs
docker-compose build           # Rebuild images
```

### Frontend
```bash
cd frontend
npm run docker:up      # Build + start nginx
npm run docker:down    # Stop
npm run docker:logs    # Logs
npm run docker:build   # Rebuild
npm run docker:prune   # Clean volumes
```

### Backend
```bash
cd backend
npm run docker:up      # Start postgres + backend
npm run docker:down    # Stop
npm run docker:logs    # Logs
npm run docker:build   # Rebuild
npm run docker:prune   # Clean volumes
```

---

## 🔐 Auto-Deploy to reg.ru (GitHub Actions)

### Workflow: `.github/workflows/deploy.yml`
Triggers on push to `main`/`master`:
1. **Frontend** → Build → FTP/FTPS deploy to shared hosting
2. **Backend** → Build Docker image → SSH to VPS → docker-compose up
3. **Notification** → Logs status

### Required GitHub Secrets (Settings → Secrets → Actions)

| Secret | Description | Example |
|--------|-------------|---------|
| `REG_RU_HOST` | FTP host shared hosting | `ftp.electromontage.ru` |
| `REG_RU_USER` | FTP login | `u1234567` |
| `REG_RU_PASSWORD` | FTP password | `••••••••` |
| `REG_RU_FRONTEND_PATH` | Web root path | `/public_html` or `/www` |
| `REG_RU_SSH_HOST` | VPS IP/host | `123.45.67.89` |
| `REG_RU_SSH_USER` | SSH user | `root` or `deploy` |
| `REG_RU_SSH_KEY` | **Private SSH key** (no passphrase) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `REG_RU_SSH_PORT` | SSH port (optional) | `22` |
| `REG_RU_BACKEND_PATH` | VPS path for backend | `/opt/electromontage` |
| `REG_RU_DOMAIN` | Your domain | `electromontage.ru` |

> **SSH Key**: Generate `ssh-keygen -t ed25519 -f deploy_key` → public to VPS `~/.ssh/authorized_keys`, private → GitHub secret.

---

## 🏭 Production Deployment (VPS reg.ru)

### One-time VPS Setup
```bash
# 1. Install Docker + Compose
curl -fsSL https://get.docker.com | sh
apt-get install docker-compose-plugin

# 2. Clone repo
git clone https://github.com/YOUR/REPO.git /opt/electromontage
cd /opt/electromontage

# 3. Configure backend env
cp backend/.env.production.example backend/.env
nano backend/.env  # Fill all secrets!

# 4. First launch
docker compose -f backend/docker-compose.prod.yml up -d
```

### Backend Production Compose (`backend/docker-compose.prod.yml`)
- PostgreSQL 15 + persistent volume
- Backend (NestJS) on port 3001
- Volumes for DB + uploads
- Healthchecks + restart policies
- Optional: nginx for SSL/termination

### Frontend Production
- Build: `npm run build` → `dist/`
- Deploy via FTP to `/public_html` (or `/www`)
- Nginx config: SPA fallback + `/api/*` proxy to backend:3001
- SSL via Let's Encrypt (certbot) or reg.ru panel

### Environment Variables (Production)
Copy `backend/.env.production.example` → `.env` and fill:
```bash
POSTGRES_PASSWORD=secure_password
JWT_ACCESS_SECRET=32+_char_base64
JWT_REFRESH_SECRET=32+_char_base64
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.ru
```

---

## ✅ Local Testing Checklist

### Before Commit
```bash
# Frontend
cd frontend && npm run build    # No TS errors

# Backend
cd backend && npm run build     # No TS errors
cd backend && npm run test      # All tests pass
cd backend && npm run lint      # No lint errors
```

### Full Stack Local Test
```bash
# 1. Start everything
docker-compose up -d

# 2. Verify
curl http://localhost:5173       # Frontend HTML
curl http://localhost:3001/api/health  # Backend health (if endpoint exists)
curl http://localhost:3001/api/categories  # Public API

# 3. Open browser
# http://localhost:5173 - full site
# http://localhost:5173/admin/login - admin panel

# 4. Admin login
# Email: admin@electromontage.ru
# Pass:  ElectroAdmin2024!
```

### Admin Panel Test
1. Login → Categories page → Add category → Drag reorder
2. Photos page → Upload → Drag reorder → Delete
3. Verify frontend Portfolio loads from API

---

## 🛠️ Troubleshooting

### Port Conflicts
```bash
# Frontend 5173 busy
lsof -i :5173
# Backend 3001 busy
lsof -i :3001
# Postgres 5432 busy
lsof -i :5432
```

### Database Issues
```bash
cd backend
npm run prisma:migrate:prod  # Apply pending migrations
npm run prisma:generate      # Regenerate client
npm run prisma:studio        # Visual DB access
```

### Docker Issues
```bash
docker-compose down -v       # Clean volumes
docker system prune -af      # Clean everything
docker-compose build --no-cache  # Fresh build
```

### Git / Deploy Issues
```bash
# Check workflow status
gh run list --workflow=deploy.yml
gh run view --log <run-id>
```

---

## 📝 Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite config, aliases, proxy |
| `frontend/tailwind.config.js` | Tailwind theme, dark mode |
| `frontend/nginx.conf` | SPA fallback, API proxy, caching |
| `backend/prisma/schema.prisma` | DB models, enums, relations |
| `backend/src/main.ts` | App bootstrap, global pipes, CORS |
| `backend/docker-compose.prod.yml` | Production VPS stack |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `docker-compose.yml` | Local full stack |

---

## 🔑 Default Admin Credentials
```
Email:    admin@electromontage.ru
Password: ElectroAdmin2024!
```
(Change after first login!)

---

## 📦 Deployment Summary

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Local Dev   | `npm run dev` (5173) | `npm run start:dev` (3001) | `docker-compose up postgres` |
| Docker Local| `docker-compose up` (nginx:80) | `docker-compose up backend` (3001) | `docker-compose up postgres` |
| Production  | FTP → `/public_html` | VPS Docker (3001) + nginx:80/443 | VPS Docker Postgres |

---

> **Note**: This project uses npm workspaces. Root `package.json` orchestrates `frontend` and `backend` workspaces. Run `npm install` from root once to set up all workspaces.

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
