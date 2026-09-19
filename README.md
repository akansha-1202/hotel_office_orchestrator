# Hotel Offer Orchestrator

Aggregate overlapping hotel offers from two mock suppliers, pick the cheapest offer per hotel name, and optionally filter by price range using Redis. Temporal orchestrates the supplier calls and merge logic.

## What this project does

1. Client calls `GET /api/hotels?city=delhi`
2. Express starts a **Temporal** workflow
3. Workflow calls **Supplier A** and **Supplier B** in parallel
4. Hotels are deduplicated by name; the cheaper price wins
5. Final list is saved in **Redis** (sorted set, score = price)
6. If `minPrice` / `maxPrice` are passed, Redis filters with `ZRANGEBYSCORE`

## Tech stack

| Tool | Role |
|------|------|
| Node.js + TypeScript | App language |
| Express | HTTP API |
| Temporal | Orchestrate parallel supplier calls + merge |
| Redis | Store results + price-range filter |
| Docker Compose | Run API, Worker, Redis, Temporal together |

## Quick start (Docker — recommended)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run

```bash
cd hotel_office_orchestrator
docker compose up --build
```

Wait until Temporal, Redis, API, and Worker are up (first start can take ~1–2 minutes).

### Try it

```bash
# Best offers for Delhi
curl "http://localhost:3000/api/hotels?city=delhi"

# Price filter (applied inside Redis)
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"

# Empty city
curl "http://localhost:3000/api/hotels?city=nowhere"

# Health
curl "http://localhost:3000/health"
```

### Expected Delhi result (order may vary)

| Hotel | Price | Supplier |
|-------|-------|----------|
| Holtin | 5340 | Supplier B |
| Radison | 5900 | Supplier A |
| Lemon Tree | 4800 | Supplier B |
| Taj Palace | 8500 | Supplier A |

Holtin and Radison exist in both suppliers; the cheaper one is kept.

### Stop

```bash
docker compose down
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hotels?city=` | Best offers for a city |
| GET | `/api/hotels?city=&minPrice=&maxPrice=` | Same + Redis price filter |
| GET | `/supplierA/hotels?city=` | Mock Supplier A |
| GET | `/supplierB/hotels?city=` | Mock Supplier B |
| GET | `/health` | Supplier A/B + Redis health |

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

## Postman

Import [`postman/Hotel-Offer-Orchestrator.postman_collection.json`](postman/Hotel-Offer-Orchestrator.postman_collection.json) into Postman.

Collection variable `baseUrl` defaults to `http://localhost:3000`.

## Local development (without Docker for the app)

You still need Redis and Temporal running (easiest via Docker):

```bash
docker compose up postgresql temporal redis -d
```

Then in two terminals:

```bash
npm install

# Terminal 1 — API
npm run dev

# Terminal 2 — Temporal worker
npm run worker
```

Environment defaults:

| Variable | Default |
|----------|---------|
| `PORT` | `3000` |
| `REDIS_URL` | `redis://localhost:6379` |
| `TEMPORAL_ADDRESS` | `localhost:7233` |
| `API_BASE_URL` | `http://localhost:3000` |
| `TEMPORAL_TASK_QUEUE` | `hotel-offers` |

## Project structure

```
src/
  index.ts              Express app
  types.ts              Hotel types
  data/suppliers.ts     Hardcoded mock hotel data
  routes/               API + supplier + health routes
  redis/client.ts       Save + ZRANGEBYSCORE filter
  temporal/
    workflows.ts        Parallel fetch + merge
    activities.ts       HTTP + Redis side effects
    worker.ts           Temporal worker process
    client.ts           Start workflow from Express
```

## How to explain this in an interview

1. Express receives the request and starts a Temporal workflow.
2. Temporal runs two activities in parallel to fetch Supplier A and B.
3. The workflow merges by hotel name and keeps the lower price.
4. The result is stored in Redis as a sorted set (score = price).
5. `minPrice` / `maxPrice` use Redis `ZRANGEBYSCORE` for filtering.
6. Docker Compose runs API, Worker, Redis, and Temporal together.
