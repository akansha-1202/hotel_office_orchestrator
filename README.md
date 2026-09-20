# Hotel Offer Orchestrator

Node.js (TypeScript) service that aggregates hotel offers from two mock suppliers, picks the cheapest offer per hotel name, and optionally filters by price range.

**Stack:** Express · Temporal.io · Redis · Docker Compose

---

## Overview

| Requirement | How it is handled |
|-------------|-------------------|
| Call Supplier A & B | Mock endpoints on the same service |
| Compare by price | Cheapest offer kept when names overlap |
| Deduplicate by name | Merge step inside the Temporal workflow |
| Orchestration | Temporal workflow + worker |
| Price filter | Results stored in Redis; filter via `ZRANGEBYSCORE` |
| Containerize | `Dockerfile` + `docker-compose.yml` |
| Health check | `GET /health` (suppliers + Redis) |

### Request flow

1. Client calls `GET /api/hotels?city=delhi`
2. API starts a Temporal workflow
3. Workflow fetches Supplier A and Supplier B **in parallel**
4. Hotels are merged by name; cheaper price wins
5. Final list is saved in Redis (sorted set, score = price)
6. If `minPrice` / `maxPrice` are present, Redis applies the range filter
7. Deduplicated list is returned to the client

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and **running**
- Ports free: `3000` (API), `6379` (Redis), `7233` (Temporal)

No need to install Node.js if you only run via Docker Compose.

---

## Quick start (recommended for reviewers)

This starts the full stack in the background: Postgres (for Temporal), Temporal, Redis, API, and Worker.

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd hotel_office_orchestrator

# 2. Build and start everything
docker compose up --build -d
```

First boot can take **1–2 minutes** while Temporal sets up its database schema.

### Check that services are up

```bash
docker compose ps
```

You should see `postgresql`, `temporal`, `redis`, `api`, and `worker` in a running/healthy state.

### Smoke test

```bash
# Health (suppliers + Redis)
curl http://localhost:3000/health

# Best offers for Delhi
curl "http://localhost:3000/api/hotels?city=delhi"

# Price filter (filtering happens inside Redis)
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"

# City with no hotels
curl "http://localhost:3000/api/hotels?city=nowhere"
```

### Stop

```bash
docker compose down
```

To also remove Temporal’s Postgres volume:

```bash
docker compose down -v
```

---

## What Docker Compose runs

| Service | Role | Port |
|---------|------|------|
| `api` | Express HTTP API | `3000` |
| `worker` | Temporal worker (runs workflows/activities) | — |
| `redis` | Offer storage + price-range filter | `6379` |
| `temporal` | Workflow engine | `7233` |
| `postgresql` | Persistence for Temporal only (not used for hotel data) | internal |

App image is built from the root `Dockerfile`.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hotels?city=` | Deduplicated best offers |
| `GET` | `/api/hotels?city=&minPrice=&maxPrice=` | Same + Redis price filter |
| `GET` | `/supplierA/hotels?city=` | Mock Supplier A |
| `GET` | `/supplierB/hotels?city=` | Mock Supplier B |
| `GET` | `/health` | Supplier A/B + Redis status |

### Response format

```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  }
]
```

### Expected Delhi results (order may vary)

| Hotel | Price | Supplier | Notes |
|-------|-------|----------|--------|
| Holtin | 5340 | Supplier B | Cheaper than A’s 6000 |
| Radison | 5900 | Supplier A | Cheaper than B’s 6200 |
| Lemon Tree | 4800 | Supplier B | Only in B |
| Taj Palace | 8500 | Supplier A | Only in A |

With `minPrice=5000&maxPrice=6000`, expect Holtin and Radison only.

### Health response example

```json
{
  "status": "ok",
  "suppliers": { "A": "up", "B": "up" },
  "redis": "up"
}
```

---

## Postman

1. Open Postman → Import
2. Select [`postman/Hotel-Offer-Orchestrator.postman_collection.json`](postman/Hotel-Offer-Orchestrator.postman_collection.json)
3. Collection variable `baseUrl` defaults to `http://localhost:3000`

Included requests cover a valid city (Delhi), price filter, empty city, suppliers, and health.

---

## Local development (optional)

Use this if you want hot-reload while coding. Docker still runs Redis + Temporal.

```bash
# Infra only
docker compose up postgresql temporal redis -d

# Wait until Temporal is ready (often 30–60s on first start)
docker compose ps

npm install

# Terminal 1 — API
npm run dev

# Terminal 2 — Worker (required for workflows)
npm run worker
```

Defaults when running on the host:

| Variable | Default |
|----------|---------|
| `PORT` | `3000` |
| `REDIS_URL` | `redis://localhost:6379` |
| `TEMPORAL_ADDRESS` | `localhost:7233` |
| `API_BASE_URL` | `http://localhost:3000` |
| `TEMPORAL_TASK_QUEUE` | `hotel-offers` |

---

## Project structure

```
├── Dockerfile
├── docker-compose.yml
├── package.json
├── postman/
│   └── Hotel-Offer-Orchestrator.postman_collection.json
└── src/
    ├── index.ts                 # Express app
    ├── types.ts
    ├── data/suppliers.ts        # Hardcoded mock hotel data
    ├── routes/
    │   ├── hotels.ts            # GET /api/hotels
    │   ├── suppliers.ts         # GET /supplierA|B/hotels
    │   └── health.ts            # GET /health
    ├── redis/client.ts          # Save offers + ZRANGEBYSCORE filter
    └── temporal/
        ├── workflows.ts         # Parallel fetch + merge
        ├── activities.ts        # HTTP + Redis side effects
        ├── worker.ts            # Worker process
        └── client.ts            # Start workflow from API
```

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `Failed to connect before the deadline` / connection refused on `7233` | Temporal not ready. Run `docker compose ps` and `docker compose logs temporal --tail 50` |
| API works but request hangs | Worker not running. With Compose, confirm `worker` is Up |
| Redis errors | `docker compose exec redis redis-cli ping` should return `PONG` |
| Port already in use | Stop other apps on `3000` / `6379` / `7233`, or `docker compose down` then up again |

Useful commands:

```bash
docker compose logs api --tail 50
docker compose logs worker --tail 50
docker compose logs temporal --tail 50
docker compose restart api worker
```

---

## Submission checklist

- [x] Source code (TypeScript / Express)
- [x] Temporal workflow for parallel compare + dedupe
- [x] Redis storage + in-Redis price filter
- [x] Mock Supplier A / B endpoints
- [x] `Dockerfile`
- [x] `docker-compose.yml` (API, worker, Redis, Temporal, Postgres)
- [x] `README.md` with setup steps
- [x] Postman collection (`.json`)
- [x] `/health` reports supplier + Redis status
