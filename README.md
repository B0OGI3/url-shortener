# URL Shortener

A production-grade URL shortener with full click analytics. Built as a portfolio project to demonstrate a modern Node.js backend, type-safe raw SQL, Redis caching, and a React analytics dashboard.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js · Fastify · TypeScript (ESM) |
| Database | PostgreSQL 16 |
| Query builder | Kysely (type-safe raw SQL — no ORM) |
| Cache | Redis 7 (cache-aside, graceful degradation) |
| Frontend | React 18 · TypeScript · Tailwind CSS · Recharts |
| Infra | Docker Compose · GitHub Actions CI |
| Geo | ip-api.com (free, no key required) |

## Features

- Shorten any URL with an optional custom alias and expiry date
- Redirects served from Redis cache — falls back to Postgres on miss
- Click analytics: geo (country + city), device, browser, OS, referrer
- Unique visitor estimation via hashed IPs
- Analytics dashboard: clicks over time, by hour, by day of week, top countries/cities, device/browser/OS breakdown, top referrers
- IPs are SHA-256 hashed before storage — raw IPs never persisted

## Running locally

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/shorten` | Create a short link (`url`, `alias?`, `expiresAt?`) |
| `GET` | `/:code` | Redirect + async click logging |
| `GET` | `/api/links` | List all active links |
| `GET` | `/api/analytics/:code` | Full click analytics for a link |
| `DELETE` | `/api/links/:code` | Deactivate a link |
| `GET` | `/health` | Health check |

## Environment variables

Copy `backend/.env.example` to `backend/.env` and adjust as needed.

```
PORT=3001
NODE_ENV=development
BASE_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/urlshortener
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
CODE_LENGTH=7
```

Copy `frontend/.env.example` to `frontend/.env`:

```
VITE_API_URL=http://localhost:3001
```

## Design decisions

**Kysely over Prisma** — demonstrates comfort with raw SQL while keeping full TypeScript type safety at the query level.

**Redis as cache-aside** — every redirect checks Redis first. On a miss it hits Postgres and re-warms the cache. Redis failures degrade silently; Postgres is always the source of truth.

**Fire-and-forget click logging** — the redirect response is sent immediately. Geo lookup and DB writes happen asynchronously so latency is never affected by analytics overhead.

**302 redirects** — using temporary redirects ensures every click hits the server, keeping analytics accurate. A 301 would be cached by browsers and bypass click counting after the first visit.

**IP hashing** — client IPs are SHA-256 hashed before storage. Unique visitor counts are derived from `COUNT(DISTINCT ip_hash)` without ever storing a raw IP.
