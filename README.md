# AI Content Studio

**AI Content Studio** is a production-ready content automation platform. You enter a topic — the system runs an entire AI pipeline and produces a finished video with research, script, voiceover, scenes, thumbnails, SEO, social posts, and more.

Think of it as hiring a full content creation team where every AI worker does one job, and an orchestrator coordinates them all.

---

## Table of Contents

1. [What You See in the Dashboard](#what-you-see-in-the-dashboard)
2. [User Flow (Step by Step)](#user-flow-step-by-step)
3. [System Flow (Behind the Scenes)](#system-flow-behind-the-scenes)
4. [The 12 AI Workers Pipeline](#the-12-ai-workers-pipeline)
5. [Architecture Overview](#architecture-overview)
6. [How to Run Locally](#how-to-run-locally)
7. [Project Structure](#project-structure)
8. [Database & Data Model](#database--data-model)
9. [API & Real-Time Updates](#api--real-time-updates)
10. [Configuration](#configuration)
11. [Scripts Reference](#scripts-reference)

---

## What You See in the Dashboard

When you log in at **http://localhost:3000**, you land on the **Dashboard**. Here is what each section means:

| Section | What it shows |
|---------|---------------|
| **Today's AI Cost** | Total USD spent on AI API calls today (OpenAI, ElevenLabs, etc.) |
| **Active AI Jobs** | How many AI workers are currently running or queued |
| **Render Queue** | Videos waiting to be rendered by Remotion |
| **Upload Queue** | Files waiting to upload to Cloudflare R2 storage |
| **Recent Projects** | Your latest content projects and their status |
| **Recent Activity** | Audit log — logins, project creation, approvals, etc. |

### Sidebar Navigation

| Page | Purpose |
|------|---------|
| **Dashboard** | Overview of costs, queues, and activity |
| **Projects** | Create and manage content projects (the main workflow) |
| **Campaigns** | Group multiple projects under one campaign |
| **Prompts** | Edit AI prompts stored in the database (never hardcoded) |
| **Queues** | Monitor and manage background job queues |
| **Settings** | API keys, team members, password change |

---

## User Flow (Step by Step)

This is the journey you take as a user from login to finished video.

```
┌─────────────────────────────────────────────────────────────────┐
│  1. LOGIN                                                       │
│     Email + password → JWT token stored in browser              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CREATE PROJECT                                              │
│     Go to Projects → New Project                                │
│     Enter: Topic (required)                                     │
│     Optional: Language, Video Style, Platform, Duration         │
│     Click Create                                                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. AUTOMATIC AI PIPELINE (you wait)                            │
│     12 AI workers run one after another automatically           │
│     Watch progress on the Project Detail page                   │
│     Each step: Research → Script → Voice → Scenes → etc.        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AWAITING APPROVAL                                           │
│     Status changes to "Awaiting Approval"                       │
│     Review all generated content (script, scenes, SEO, etc.)    │
│     Click Approve when satisfied                                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. VIDEO RENDERING                                             │
│     Variation engine picks random template, fonts, animations   │
│     Remotion renders the video scene by scene                   │
│     FFmpeg optimizes the final MP4                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. COMPLETED                                                   │
│     Watch/download the finished video                           │
│     Optional: Publish to YouTube, TikTok, etc.                  │
└─────────────────────────────────────────────────────────────────┘
```

### Example

1. Login with `admin@aicontentstudio.local` / `Admin123!`
2. Click **+ New project**
3. Topic: `History of Titanic`
4. Wait ~5–15 minutes (depending on API speed)
5. Click **Approve**
6. Wait for render (~5–10 minutes)
7. Download your video

---

## System Flow (Behind the Scenes)

This is what happens technically when you create a project.

### High-Level Architecture

```
┌──────────────┐     HTTP/WS      ┌──────────────┐
│   Next.js    │ ◄──────────────► │   NestJS     │
│   (port 3000)│                  │   API        │
│   Dashboard  │                  │  (port 4000) │
└──────────────┘                  └──────┬───────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
             ┌───────────┐       ┌───────────┐       ┌───────────┐
             │ PostgreSQL│       │   Redis   │       │ Cloudflare│
             │ (data)    │       │ (queues)  │       │ R2 (media)│
             └───────────┘       └─────┬─────┘       └───────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             ┌───────────┐     ┌───────────┐     ┌───────────┐
             │  Worker   │     │  Worker   │     │ Renderer  │
             │ (AI jobs) │     │(orchestr.)│     │ (Remotion)│
             └─────┬─────┘     └───────────┘     └───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  External AI APIs      │
        │  OpenAI, Claude,       │
        │  ElevenLabs, Pexels    │
        └──────────────────────┘
```

### Detailed Request Flow

```
USER clicks "Create Project"
        │
        ▼
┌───────────────────┐
│  POST /api/v1/    │  NestJS validates input, creates Project in PostgreSQL
│  projects         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Orchestrator     │  Creates WorkflowExecution record
│  Service          │  Sets status: RUNNING
└─────────┬─────────┘  Enqueues first job: ai-research
          │
          ▼
┌───────────────────┐
│  BullMQ Queue     │  Job sits in Redis queue: ai-research
│  (Redis)          │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Worker Process   │  Picks up job from queue
│  (apps/worker)    │  Loads prompt from database
│                   │  Calls OpenAI/Claude via providers package
│                   │  Saves ResearchArtifact to PostgreSQL
│                   │  Records cost in CostLedger
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Orchestrator     │  Worker done → enqueue next: fact-checker
│  Complete         │  Repeats for all 12 workers sequentially
└─────────┬─────────┘
          │
          ▼ (after worker 12: quality-check)
┌───────────────────┐
│  Status:          │  Project → AWAITING_APPROVAL
│  AWAITING_        │  User notified via WebSocket
│  APPROVAL         │
└─────────┬─────────┘
          │
          ▼ USER clicks Approve
┌───────────────────┐
│  Variation Engine │  Randomly picks: template, fonts, animations,
│                   │  transitions, colors, music, layout
│                   │  Saves unique RenderConfig (no two videos alike)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Render Queue     │  Job enqueued: render-video
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Renderer Process │  Builds timeline from scenes + voice + assets
│  (apps/renderer)  │  Remotion renders MP4 scene by scene
│                   │  FFmpeg compresses final output
│                   │  Saves to Cloudflare R2
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Status:          │  Project → COMPLETED
│  COMPLETED        │  Video available in dashboard
└───────────────────┘
```

### Key Rules

- **Workers never call each other** — only the Orchestrator advances the pipeline
- **No prompts in code** — all prompts live in the `prompts` database table
- **No media in database** — only file paths; actual files go to R2
- **Nothing is overwritten** — every script, research, voice gets a new version number
- **Every API call is logged** — cost, duration, provider tracked per worker

---

## The 12 AI Workers Pipeline

Each worker runs **one at a time**, in this exact order:

| # | Worker | What it does | AI Provider |
|---|--------|--------------|-------------|
| 1 | **Research** | Deep research on the topic with citations | OpenAI → Claude backup |
| 2 | **Fact Checker** | Verifies facts, flags errors, scores accuracy | OpenAI → Claude backup |
| 3 | **Script** | Writes engaging narration script | OpenAI → Claude backup |
| 4 | **Translation** | Translates script to target language | OpenAI → Claude backup |
| 5 | **Voice** | Generates voiceover audio from script | ElevenLabs → OpenAI TTS backup |
| 6 | **Scene Planner** | Breaks script into timed visual scenes | OpenAI → Claude backup |
| 7 | **Asset Finder** | Finds stock images/videos for each scene | Pexels → Pixabay backup |
| 8 | **Thumbnail** | Generates YouTube thumbnail image | OpenAI Images |
| 9 | **SEO** | Title, description, tags, chapters | OpenAI → Claude backup |
| 10 | **Podcast** | Show notes and podcast metadata | OpenAI → Claude backup |
| 11 | **Social Media** | Posts for YouTube, Instagram, TikTok, X, etc. | OpenAI → Claude backup |
| 12 | **Quality Check** | Final review before rendering | OpenAI → Claude backup |

After all 12 complete → **Awaiting Approval** → **Render** → **Done**

---

## Architecture Overview

### Monorepo Structure

```
ai-content-studio/
├── apps/
│   ├── web/           Next.js 15 dashboard (port 3000)
│   ├── api/           NestJS REST + WebSocket API (port 4000)
│   ├── worker/        BullMQ AI job processors
│   └── renderer/      Remotion video render worker
│
├── packages/
│   ├── shared/        Enums, types, job payloads, constants
│   ├── database/      Prisma schema + PostgreSQL client
│   ├── providers/     Swappable external API adapters
│   ├── ai-workers/    12 worker implementations
│   └── rendering/     Timeline builder for Remotion
│
├── infrastructure/
│   └── docker/        Docker Compose, Dockerfiles, CI
│
└── docs/
    └── architecture/  Database, backend architecture docs
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Zustand, React Query |
| Backend API | NestJS, TypeScript, JWT, WebSockets |
| Database | PostgreSQL 16, Prisma ORM |
| Queues | Redis 7, BullMQ |
| AI | OpenAI, Claude, ElevenLabs, Pexels, Pixabay |
| Rendering | Remotion, FFmpeg |
| Storage | Cloudflare R2 |
| Auth | JWT + Refresh tokens, RBAC (Owner/Admin/Editor/Viewer) |

---

## How to Run Locally

### Prerequisites

- **Node.js 20+**
- **Docker Desktop** (for PostgreSQL + Redis)
- **FFmpeg** (for final video optimization)
- **OpenAI API key** (required for AI workers)

### First-Time Setup (once only)

```powershell
cd "D:\Ai Studio"

# 1. Install dependencies
npm install

# 2. Create environment file
npm run setup

# 3. Edit .env — add your keys:
#    OPENAI_API_KEY=sk-...
#    ENCRYPTION_KEY=any-long-random-string-32chars

# 4. Start database (Docker must be running)
npm run docker:infra

# 5. Setup database
npm run db:migrate
npm run db:seed
```

### Every Time You Work

You need **2 things running**: the website and the backend.

#### Terminal 1 — Website (if not already running)

```powershell
npm run web:dev
```

Opens at **http://localhost:3000**

> If port 3000 is already in use, the website is already running — skip this step.

#### Terminal 2 — Backend (API + AI workers + renderer)

```powershell
npm run backend:dev
```

Wait until you see:
```
API running on http://localhost:4000/api/v1
Registered 12 AI worker processors
Render worker listening on render-video queue
```

**Keep both terminals open.**

#### Verify everything works

| URL | Expected |
|-----|----------|
| http://localhost:3000 | Login page / Dashboard |
| http://localhost:4000/api/v1/health/live | `{"data":{"status":"ok"}}` |
| http://localhost:4000/docs | Swagger API documentation |

### Default Login

| Field | Value |
|-------|-------|
| Email | `admin@aicontentstudio.local` |
| Password | `Admin123!` |

### Common Issues

| Problem | Solution |
|---------|----------|
| `docker is not recognized` | Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| `DATABASE_URL not found` | Run `npm run setup` |
| `EADDRINUSE port 3000` | Website already running — use `npm run backend:dev` only |
| `Failed to fetch` on dashboard | API not running — run `npm run backend:dev` |
| `Login failed` | API not running on port 4000 |
| AI jobs stuck | Worker not running — check `npm run backend:dev` terminal |

---

## Project Structure

### Apps

| App | Port | Role |
|-----|------|------|
| `apps/web` | 3000 | User dashboard — login, projects, prompts, queues |
| `apps/api` | 4000 | REST API + WebSocket — auth, CRUD, orchestration |
| `apps/worker` | — | Processes AI jobs from BullMQ queues |
| `apps/renderer` | — | Renders videos with Remotion + FFmpeg |

### Packages

| Package | Role |
|---------|------|
| `packages/shared` | Shared enums, types, constants used everywhere |
| `packages/database` | Prisma schema (35 models), migrations, seed data |
| `packages/providers` | OpenAI, Claude, ElevenLabs, Pexels, Pixabay adapters |
| `packages/ai-workers` | 12 worker implementations (research, script, voice, etc.) |
| `packages/rendering` | Timeline builder — converts scenes to Remotion format |

---

## Database & Data Model

Everything belongs to a **Project**. Data hierarchy:

```
Organization
  └── Workspace
        └── Campaign
              └── Project  ← you create this with a topic
                    ├── Research (versioned)
                    ├── Script (versioned)
                    ├── Translation (versioned)
                    ├── Voice (versioned)
                    ├── Scene Plan → Scenes
                    ├── Assets (images/videos)
                    ├── Thumbnail (versioned)
                    ├── SEO Metadata (versioned)
                    ├── Podcast (versioned)
                    ├── Social Posts (per platform)
                    ├── Video → RenderConfig (unique style)
                    └── Publishing → Analytics
```

**35 database models** including users, prompts, templates, audit logs, cost ledger, and queue tracking.

Prompts are stored in the database with versioning — you can edit, activate, and rollback prompts from the **Prompts** page without redeploying code.

---

## API & Real-Time Updates

### REST API

Base URL: `http://localhost:4000/api/v1`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Login |
| `/auth/register` | POST | Register new account |
| `/projects` | GET/POST | List/create projects |
| `/projects/:id` | GET | Project detail + pipeline status |
| `/projects/:id/approve` | POST | Approve for rendering |
| `/projects/:id/artifacts/:type` | GET | Get research, script, voice, etc. |
| `/dashboard/summary` | GET | Dashboard metrics |
| `/prompts` | GET/POST | Prompt library |
| `/queues` | GET | Queue status |
| `/health/live` | GET | Health check |

Full docs: **http://localhost:4000/docs**

### WebSocket (Real-Time)

Connect to: `ws://localhost:4000/realtime`

| Event | When fired |
|-------|-----------|
| `worker:status` | AI worker starts/completes/fails |
| `workflow:step` | Pipeline advances to next step |
| `render:progress` | Video rendering progress (0–100%) |
| `queue:update` | Queue depth changes |
| `cost:update` | Today's AI cost changes |
| `notification` | User notifications |

The dashboard updates live without refreshing.

---

## Configuration

All configuration is in `.env` at the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret |
| `ENCRYPTION_KEY` | Yes | AES key for API key encryption |
| `OPENAI_API_KEY` | Yes | OpenAI API key (most workers) |
| `ANTHROPIC_API_KEY` | No | Claude backup provider |
| `ELEVENLABS_API_KEY` | No | Voice generation |
| `PEXELS_API_KEY` | No | Stock images/videos |
| `PIXABAY_API_KEY` | No | Backup stock assets |
| `R2_*` | No | Cloudflare R2 storage (for media files) |

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run setup` | Sync `.env` files |
| `npm run docker:infra` | Start PostgreSQL + Redis |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed prompts, templates, admin user |
| `npm run web:dev` | Start website only (port 3000) |
| `npm run backend:dev` | Start API + worker + renderer (port 4000) |
| `npm run dev` | Start everything (only if port 3000 is free) |
| `npm run api:dev` | Start API only |
| `npm run worker:dev` | Start AI worker only |
| `npm run renderer:dev` | Start renderer only |
| `npm run docker:prod` | Full production Docker stack |
| `npm run build` | Build all packages |
| `npm run deploy:vercel` | Deploy API + web to Vercel |
| `npm run deploy:vercel:api` | Deploy API to Vercel only |
| `npm run deploy:vercel:web` | Deploy web to Vercel only |
| `npm run deploy:migrate:prod` | Run Prisma migrations (production) |

---

## Production Deployment

### Vercel (frontend + API) — recommended for dashboard & login

**One command** (after creating free [Neon](https://neon.tech) Postgres + [Upstash](https://upstash.com) Redis):

```powershell
vercel login          # once
npm run deploy:vercel
```

The script deploys **two Vercel projects** (API + web), pushes env vars from your `.env`, and wires CORS automatically.

After deploy, run migrations against Neon:

```powershell
$env:DATABASE_URL="postgresql://..."   # your Neon URL
npm run db:migrate:deploy
npm run db:seed
```

| Command | Description |
|---------|-------------|
| `npm run deploy:vercel` | Deploy API + web to Vercel |
| `npm run deploy:vercel:api` | API only |
| `npm run deploy:vercel:web` | Web only (needs API URL in Vercel env) |

Env templates: `scripts/vercel-env-api.example`, `scripts/vercel-env-web.example`

**Note:** Video generation (worker + renderer) needs [Render](https://render.com) or [Railway](https://railway.app) — Vercel cannot run FFmpeg/Remotion jobs.

### Docker (full stack locally or on a VPS)

```powershell
npm run docker:prod
```

Starts all services in Docker: web, api, worker, renderer, postgres, redis.

---

## License

Proprietary — All rights reserved.
