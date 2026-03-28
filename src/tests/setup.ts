/**
 * Test environment setup – executed before any test file via bunfig.toml preload.
 * Sets required env vars so config/index.ts does not throw during test runs.
 */
process.env.DATABASE_URL = "postgresql://test:test@localhost/testdb";
process.env.BASE_URL = "http://localhost:3000";
process.env.APP_DOMAIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.REDIS_URL = "redis://localhost:6379";
