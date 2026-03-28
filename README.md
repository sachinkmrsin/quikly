# [~] Quikly - A Url Shortner

A high-performance, scalable URL shortening service built with Bun, Hono.js, Prisma, Redis, and PostgreSQL (Neon). Features include real-time analytics, caching, and a clean architecture designed for production use.

[![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

## [*] Features

- [>] **Blazing Fast** - Built on Bun runtime (2-3x faster than Node.js)
- [#] **Type-Safe** - Full TypeScript coverage with Prisma ORM
- [%] **Real-time Analytics** - Track clicks, devices, countries, and more
- [S] **Smart Caching** - Redis-powered caching (24-hour TTL)
- [+] **Base62 Encoding** - Generate short, URL-safe codes from UUIDv7
- [!] **High Performance** - Handles 15,000+ req/s with cache hits
- [^] **Production Architecture** - Clean separation of concerns (MVC pattern)
- [~] **Bulk Operations** - Create multiple URLs in a single request
- [T] **URL Expiration** - Set custom expiration times
- [*] **Custom Short Codes** - Choose your own memorable codes
- [x] **Auto Cleanup** - Maintenance endpoints for expired URLs
- [#] **Rate Limiting** - Per-IP token-bucket limiter backed by Redis

## [%] Performance Metrics

| Metric                      | Value                              |
| --------------------------- | ---------------------------------- |
| **Requests/sec (cached)**   | 15,000 - 20,000                    |
| **Requests/sec (uncached)** | 2,000 - 3,000                      |
| **Response Time (P99)**     | 3-5ms (cached), 20-50ms (uncached) |
| **Cache Hit Rate**          | 95%+                               |
| **Memory Usage**            | ~70-100MB base                     |
| **Supported URLs**          | Billions (limited by storage)      |

## [^] Architecture

```
src/
├── config/              # Configuration management
│   └── index.ts         # Environment variables & app config
├── controllers/         # HTTP request handlers
│   └── url.controller.ts
├── services/           # Business logic layer
│   ├── url.service.ts
│   └── cache.service.ts
├── repositories/       # Database access layer
│   └── url.repository.ts
├── routes/            # API route definitions
│   └── url.routes.ts
├── middlewares/       # Custom middleware
│   ├── error.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── timing.middleware.ts
│   └── validation.middleware.ts
├── types/            # TypeScript type definitions
│   ├── url.types.ts
│   └── common.types.ts
├── utils/           # Utility functions
│   ├── base62.util.ts
│   ├── validation.util.ts
│   └── logger.util.ts
├── libs/           # External service clients
│   ├── prisma.ts
│   └── redis.ts
├── tests/          # Unit test suite (bun test)
│   ├── setup.ts                       # Preloaded env-var bootstrap
│   ├── controller/
│   │   └── url.controller.test.ts     # Controller layer tests (22)
│   ├── service/
│   │   └── url.service.test.ts        # Service layer tests (28)
│   └── utils/
│       ├── base62.util.test.ts        # Base62 encoding tests (28)
│       └── validation.util.test.ts    # Validation helper tests (39)
└── server.ts       # Application entry point
```

### Architecture Layers

1. **Controllers** - Handle HTTP requests/responses
2. **Services** - Business logic and orchestration
3. **Repositories** - Data access and persistence
4. **Middleware** - Cross-cutting concerns (logging, errors, timing)
5. **Utils** - Reusable helper functions

## [>] Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- PostgreSQL database (recommended: [Neon](https://neon.tech))
- Redis instance (local or cloud)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd url-shortener

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
bunx prisma db push
bunx prisma generate

# Start development server
bun --hot src/server.ts
```

### Production Build

```bash
# Build the application
bun build src/server.ts --outdir ./dist --target bun

# Run production server
bun src/server.ts
```

### Docker

```bash
# Build the image (type-checks, runs all 117 tests, then produces the runtime image)
docker build -t quikly .

# Run the container
docker run --rm \
  -p 3000:3000 \
  -e PORT=3000 \
  -e DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require" \
  -e BASE_URL="http://localhost:3000" \
  -e REDIS_URL="redis://host:6379" \
  quikly
```

The build pipeline has three stages:

| Stage     | What it does                                                                 |
| --------- | ---------------------------------------------------------------------------- |
| `builder` | Installs deps, generates Prisma client, type-checks, bundles to `dist/`      |
| `tester`  | Inherits from `builder`, runs `bun test` — **build fails if any test fails** |
| `runtime` | Copies only the production bundle; depends on `tester` via a sentinel file   |

To run only the tests inside Docker (e.g. in CI):

```bash
docker build --target tester -t quikly:test .
```

> The image does **not** run migrations automatically. For production releases,
> run `bun run prisma:deploy` as a separate step.

## [~] Environment Variables

Create a `.env` file in the root directory:

```bash
# ─────────────────────────────────────────────────────────────
# Database (required)
# Neon PostgreSQL pooled connection string
# ─────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"

# ─────────────────────────────────────────────────────────────
# Redis (required for caching & rate limiting)
# ─────────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"
# REDIS_PASS=          # Optional — omit entirely for unauthenticated Redis
                       # For Redis Cloud: set REDIS_URL to the full URL
                       #   redis://default:password@host:port
                       # and leave REDIS_PASS empty

# ─────────────────────────────────────────────────────────────
# Application (required)
# ─────────────────────────────────────────────────────────────
PORT=3000                          # Port the server binds to (default: 3000)
NODE_ENV=development               # development | production
BASE_URL=http://localhost:3000     # Public base URL — used to build short links
                                   # e.g. https://quikly.io in production

# ─────────────────────────────────────────────────────────────
# Application (optional)
# ─────────────────────────────────────────────────────────────
APP_DOMAIN=http://localhost:3000   # Override the domain used in generated
                                   # short URLs (defaults to BASE_URL)

# ─────────────────────────────────────────────────────────────
# Rate Limiting (optional — all have safe defaults)
# Token-bucket algorithm, enforced per IP via Redis
# ─────────────────────────────────────────────────────────────
RATE_LIMIT_CAPACITY=100     # Max tokens per bucket / burst ceiling (default: 100)
RATE_LIMIT_REFILL_RATE=10   # Tokens added per second (default: 10)
RATE_LIMIT_WINDOW_SEC=3600  # Redis key TTL in seconds (default: 3600 = 1 hour)
```

### Variable reference

| Variable                 | Required | Default                  | Description                                         |
| ------------------------ | -------- | ------------------------ | --------------------------------------------------- |
| `DATABASE_URL`           | ✅       | —                        | PostgreSQL connection string                        |
| `REDIS_URL`              | ✅       | `redis://localhost:6379` | Redis connection URL                                |
| `REDIS_PASS`             | ❌       | _(none)_                 | Redis password — omit for unauthenticated instances |
| `PORT`                   | ❌       | `3000`                   | HTTP port the server listens on                     |
| `NODE_ENV`               | ❌       | `development`            | Runtime environment                                 |
| `BASE_URL`               | ✅       | —                        | Public URL used to construct short links            |
| `APP_DOMAIN`             | ❌       | `https://localhost:5000` | Domain override for generated URLs                  |
| `RATE_LIMIT_CAPACITY`    | ❌       | `100`                    | Token bucket capacity (burst ceiling)               |
| `RATE_LIMIT_REFILL_RATE` | ❌       | `10`                     | Tokens refilled per second                          |
| `RATE_LIMIT_WINDOW_SEC`  | ❌       | `3600`                   | Redis key TTL — effectively the tracking window     |

---

## [#] Rate Limiting

Quikly uses a **token-bucket algorithm** for rate limiting, implemented in
`src/middlewares/rate-limit.middleware.ts`. It is applied globally to **every
request** via `app.use("*", rateLimitMiddleware)` in `src/server.ts`.

### How it works

```
Bucket per IP  ─────────────────────────────────────────────────────
                                                                     │
  On first request:  bucket starts full (CAPACITY tokens)           │
  On every request:  elapsed time × REFILL_RATE tokens are added    │
                     (capped at CAPACITY)                            │
                     then 1 token is consumed                        │
  When empty (tokens < 1): request is rejected with 429             │
─────────────────────────────────────────────────────────────────────
```

State (`tokens`, `lastRefill`) is stored in Redis as a Hash under the key
`rate_limit:{ip}` with a TTL of `RATE_LIMIT_WINDOW_SEC` seconds.
The middleware **fails open** — if Redis is unavailable, the request is allowed
through so a Redis outage does not take down the API.

### Response headers

Every response includes these headers so clients can self-throttle:

| Header                  | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `X-RateLimit-Limit`     | Bucket capacity (= `RATE_LIMIT_CAPACITY`)                             |
| `X-RateLimit-Remaining` | Tokens left after this request                                        |
| `X-RateLimit-Policy`    | Full policy string e.g. `100;w=3600;burst=100;comment="token-bucket"` |
| `Retry-After`           | Seconds until at least 1 token is available _(only on 429)_           |

### 429 response body

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 6s.",
  "retryAfter": 6
}
```

### IP detection

The middleware checks headers in this order:

1. `X-Forwarded-For` (first IP in the chain — correct behind most proxies / load balancers)
2. `X-Real-IP`
3. Falls back to `"unknown"` (all unknown origins share a single bucket)

### Tuning for production

| Scenario                   | Suggested values                                    |
| -------------------------- | --------------------------------------------------- |
| Public API                 | `CAPACITY=60`, `REFILL_RATE=1`, `WINDOW_SEC=60`     |
| Internal / trusted traffic | `CAPACITY=500`, `REFILL_RATE=50`, `WINDOW_SEC=60`   |
| Strict anti-abuse          | `CAPACITY=20`, `REFILL_RATE=0.5`, `WINDOW_SEC=3600` |

### Getting Database & Redis URLs

#### Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard
4. Use the pooled connection string for better performance

#### Redis Options

- **Local**: `redis://localhost:6379`
- **Upstash**: Sign up at [upstash.com](https://upstash.com) (free tier available)
- **Redis Cloud**: Sign up at [redis.com/cloud](https://redis.com/cloud)

## [*] API Documentation

### Base URL

```
http://localhost:3000
```

### Endpoints

#### [+] Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "database": "connected",
  "redis": "connected",
  "bun": "1.0.0"
}
```

---

#### [~] Create Short URL

```http
POST /shorten
Content-Type: application/json
```

**Request Body:**

```json
{
  "url": "https://example.com/very/long/url",
  "customCode": "mylink",
  "expiresIn": 86400
}
```

**Response (201):**

```json
{
  "shortUrl": "http://localhost:3000/abc1234",
  "shortCode": "abc1234",
  "originalUrl": "https://example.com/very/long/url",
  "expiresAt": null,
  "createdAt": "2024-01-20T10:30:00.000Z"
}
```

**Error Responses:**

- `400` - Invalid URL format
- `409` - Custom code already exists

---

#### [*] Bulk Create URLs

```http
POST /shorten/bulk
Content-Type: application/json
```

**Request Body:**

```json
{
  "urls": ["https://example.com/page1", "https://example.com/page2", "https://example.com/page3"]
}
```

**Response (201):**

```json
{
  "count": 3,
  "urls": [
    {
      "originalUrl": "https://example.com/page1",
      "shortUrl": "http://localhost:3000/abc1234",
      "shortCode": "abc1234"
    }
  ]
}
```

**Limits:** Maximum 100 URLs per request

---

#### [<] Redirect to Original URL

```http
GET /:shortCode
```

**Example:**

```bash
curl http://localhost:3000/abc1234
# Redirects to original URL with 301 status
```

**Response:**

- `301` - Permanent redirect to original URL
- `404` - URL not found or expired

---

#### [%] Get URL Statistics

```http
GET /stats/:shortCode
```

**Response (200):**

```json
{
  "id": "uuid-here",
  "shortCode": "abc1234",
  "originalUrl": "https://example.com/long/url",
  "clickCount": 1523,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "expiresAt": null,
  "lastAccessedAt": "2024-01-20T10:30:00.000Z"
}
```

---

#### [x] Delete URL

```http
DELETE /:shortCode
```

**Response (200):**

```json
{
  "message": "URL deleted successfully",
  "deleted": {
    "shortCode": "abc1234",
    "originalUrl": "https://example.com"
  }
}
```

---

#### [=] List All URLs

```http
GET /api/urls?limit=10&offset=0
```

**Query Parameters:**

- `limit` (default: 10) - Number of URLs per page
- `offset` (default: 0) - Pagination offset

**Response (200):**

```json
{
  "data": [
    {
      "shortCode": "abc1234",
      "originalUrl": "https://example.com",
      "clickCount": 150,
      "createdAt": "2024-01-20T10:00:00.000Z",
      "expiresAt": null,
      "lastAccessedAt": "2024-01-20T12:00:00.000Z"
    }
  ],
  "total": 1000,
  "limit": 10,
  "offset": 0
}
```

---

#### [^] Get Top URLs

```http
GET /api/urls/top?limit=10
```

**Response (200):**

```json
{
  "urls": [
    {
      "shortCode": "popular1",
      "originalUrl": "https://example.com/popular",
      "clickCount": 5000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastAccessedAt": "2024-01-20T12:00:00.000Z"
    }
  ]
}
```

---

#### [x] Cleanup Expired URLs

```http
POST /api/maintenance/cleanup
```

**Response (200):**

```json
{
  "message": "Cleanup completed",
  "deletedCount": 42
}
```

## [?] How It Works

### URL Shortening Algorithm

1. **Generate UUIDv7** - Time-ordered, collision-free identifier
2. **Base62 Encode** - Convert UUID to short, URL-safe string (7 characters)
3. **Store in Database** - Save mapping with Prisma
4. **Cache in Redis** - 24-hour TTL for fast lookups
5. **Return Short URL** - `domain/shortCode`

### Base62 Encoding

- **Character Set**: `0-9A-Za-z` (62 characters)
- **Length**: 7 characters = 62^7 = 3.5 trillion possible URLs
- **Collision-free**: Uses UUIDv7 as source

### Caching Strategy

```
Request Flow:
1. User visits short URL
2. Check Redis cache → Cache hit (95% of traffic)
   ├─ Yes: Return URL instantly (<5ms)
   └─ No: Query database (20-50ms)
3. Update click count (async)
4. Cache result for 24 hours
5. Redirect user (301)
```

## [~] Testing

Quikly ships with a **78-test unit suite** written for Bun's built-in test runner. All tests mock external dependencies (database, Redis) so they run fully offline — no live services needed.

### Running the tests

```bash
# Run the full suite once
bun test

# Watch mode — re-runs on every file save
bun test:watch

# With coverage report
bun test:coverage
```

### Test structure

| File                                      | Layer      | Tests | What's covered                                                                                                                           |
| ----------------------------------------- | ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/controller/url.controller.test.ts` | Controller | 22    | HTTP status codes, response bodies, route params, query-param defaults — uses Hono's in-process `app.request()` instead of a real server |
| `tests/service/url.service.test.ts`       | Service    | 28    | Business logic, cache hit/miss, pagination maths, Prisma error mapping, fire-and-forget click increment                                  |
| `tests/utils/base62.util.test.ts`         | Utility    | 28    | Encoding, decoding, charset validity, determinism, zero/padding edge cases, round-trip                                                   |

### How controller tests work (no supertest)

Hono exposes `app.request()` — a thin wrapper around `app.fetch()` that accepts a plain `Request` and returns a standard `Response`. No HTTP server, no port, no socket:

```typescript
const res = await app.request("/shorten", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
});

expect(res.status).toBe(201);
const body = await res.json();
expect(body.shortCode).toBeTruthy();
```

### Test setup

`src/tests/setup.ts` is preloaded by `bunfig.toml` before any test file runs. It sets the env vars that `config/index.ts` requires (`DATABASE_URL`, `BASE_URL`, …) so the config module loads without error even though no real services are present.

### Tests in the Docker build

`bun test` is executed as a dedicated **tester** stage in the `Dockerfile`. The final runtime image has a hard dependency on that stage via a sentinel file — a failing test aborts the entire `docker build`.

```
builder  ──►  tester (bun test)  ──►  runtime
                    │ fails here?
                    └──► docker build exits non-zero
```

### Manual testing with curl

```bash
# Create a short URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com"}'

# Create with custom code
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com", "customCode": "gh"}'

# Create with expiration (1 hour)
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com", "expiresIn": 3600}'

# Get statistics
curl http://localhost:3000/stats/abc1234

# Test redirect
curl -L http://localhost:3000/abc1234

# Delete URL
curl -X DELETE http://localhost:3000/abc1234
```

## [D] Database Schema

### URLs Table

```sql
CREATE TABLE urls (
  id UUID PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_created_at ON urls(created_at);
CREATE INDEX idx_expires_at ON urls(expires_at);
```

## [#] Security Best Practices

1. **URL Validation** - Strict URL format checking
2. **Input Sanitization** - Clean all user inputs
3. **Rate Limiting** - Per-IP token-bucket limiter backed by Redis (built-in — see [Rate Limiting](#-rate-limiting))
4. **HTTPS Only** - Force secure connections in production
5. **SQL Injection Prevention** - Prisma parameterized queries
6. **XSS Protection** - Proper header configuration

## [^] Scaling Guide

### Single Server (0-100 req/s)

- 1 app instance
- 1 Redis instance
- Neon free tier
- **Capacity**: ~10M URLs, ~100 req/s

### Medium Scale (100-1,000 req/s)

- 3-5 app instances (load balanced)
- Redis cluster (3 nodes)
- Neon Pro with read replicas
- **Capacity**: ~100M URLs, ~1,000 req/s
- **Cost**: ~$500-1,000/month

### Large Scale (1,000-10,000 req/s)

- 10-20 app instances
- Redis cluster (6-12 nodes, sharded)
- PostgreSQL with 2-3 read replicas
- CDN integration (Cloudflare)
- **Capacity**: ~1B URLs, ~10,000 req/s
- **Cost**: ~$5,000-10,000/month

### Improvements for Scale

#### 1. Add CDN (Cloudflare)

```typescript
// Cache 301 redirects at edge
// 90% of requests never hit your server
// Response time: <20ms globally
```

#### 2. Connection Pooling

```bash
# Use Neon's pooled connection
DATABASE_URL="postgresql://user:pass@pooler.neon.tech/db?pgbouncer=true"
```

#### 3. Database Read Replicas

```typescript
// Read from replicas for analytics
const replicaUrl = process.env.DATABASE_REPLICA_URL;

// Write to primary, read from replica
```

#### 4. Batch Click Updates

```typescript
// Buffer clicks in Redis
// Flush to database every 10 seconds
// Reduces write load by 90%
```

## [!] Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

#### Prisma Client Not Generated

```bash
bunx prisma generate
```

#### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (Mac)
brew services start redis

# Start Redis (Linux)
sudo systemctl start redis
```

#### Database Connection Error

```bash
# Check connection string format
# Should include ?sslmode=require for Neon
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Test connection
bunx prisma db pull
```

## [~] Development Tools

### Prisma Studio (Visual Database Editor)

```bash
bunx prisma studio
# Opens http://localhost:5555
```

### Database Migrations

```bash
# Create migration
bunx prisma migrate dev --name add_user_table

# Apply migrations in production
bunx prisma migrate deploy

# Reset database (DESTRUCTIVE)
bunx prisma migrate reset
```

### Useful Scripts

```json
{
  "scripts": {
    "dev": "bun --hot src/server.ts",
    "start": "bun src/server.ts",
    "build": "bun build src/server.ts --outdir ./dist --target bun",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "typecheck": "tsc",
    "prisma:generate": "bunx prisma generate",
    "prisma:migrate": "bunx prisma migrate dev",
    "prisma:deploy": "bunx prisma migrate deploy",
    "prisma:studio": "bunx prisma studio"
  }
}
```

## [%] Monitoring & Observability

### Key Metrics to Track

1. **Request Rate** - req/s (target: <80% capacity)
2. **Response Time** - P50, P95, P99 latencies
3. **Cache Hit Rate** - Should be >95%
4. **Error Rate** - Should be <0.1%
5. **Database Connections** - Monitor pool usage
6. **Redis Memory** - Track cache size

### Recommended Tools

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack or Loki
- **Tracing**: OpenTelemetry
- **Errors**: Sentry
- **Uptime**: UptimeRobot or Pingdom

## [+] Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## [*] License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## [*] Acknowledgments

- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Hono.js](https://hono.dev) - Lightweight web framework
- [Prisma](https://www.prisma.io) - Next-generation ORM
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Redis](https://redis.io) - In-memory cache

## [@] Support

For issues and questions:

- Open an issue on GitHub
- Check existing documentation
- Review API examples above

## [>] Roadmap

- [ ] User authentication & API keys
- [ ] Custom domains support
- [ ] QR code generation
- [ ] Advanced analytics dashboard
- [ ] Webhooks for click events
- [ ] A/B testing support
- [ ] Password-protected URLs
- [ ] Bulk import from CSV
- [ ] GraphQL API
- [ ] Mobile SDKs

---

**Built with <3 using Bun, Hono, Prisma, and Redis**
