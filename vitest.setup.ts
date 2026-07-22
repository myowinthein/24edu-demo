// Global env vars required by lib/redis.ts, lib/vector.ts, and lib/pubsub.ts
// These run before any test file's imports are resolved.
process.env.KV_REST_API_URL = 'https://test.upstash.io'
process.env.KV_REST_API_TOKEN = 'test-token'
process.env.UPSTASH_VECTOR_REST_URL = 'https://test-vector.upstash.io'
process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-vector-token'
process.env.REDIS_URL = 'rediss://default:test@test.upstash.io:6379'
process.env.ADMIN_USERNAME = 'admin'
// SHA-256 of 'password'
process.env.ADMIN_PASSWORD_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
process.env.GEMINI_API_KEY = 'test-gemini-key'
