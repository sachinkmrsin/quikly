# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.11-slim AS base
WORKDIR /app


# ── Builder ───────────────────────────────────────────────────────────────────
FROM base AS builder

# Manifests first — keeps the install layer cached on source-only changes.
COPY package.json bun.lock ./

# --ignore-scripts: prisma generate hasn't run yet, postinstall would fail.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN bun run prisma:generate
RUN bun run typecheck
RUN bun run build

RUN test -f dist/server.js || \
    { echo "ERROR: dist/server.js not found — check build script --outdir"; exit 1; }


# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runtime

ENV NODE_ENV=production

# Bundled app + generated Prisma client (needed for runtime path lookups).
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD bun -e 'const port = process.env.PORT || 3000; fetch(`http://127.0.0.1:${port}/health`).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1));'

USER bun

# Run migrations as a separate release step: bun run prisma:deploy
CMD ["bun", "dist/server.js"]