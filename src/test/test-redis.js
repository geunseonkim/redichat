// test-redis.js
import Redis from "ioredis";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  // 5초 안에 연결되지 않으면 실패 처리
  connectTimeout: 5000,
};

console.log("Connecting to Redis with config:", {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password ? "******" : null,
});

const redis = new Redis(redisConfig);

redis.on("connect", () => {
  console.log("\x1b[32m✅ Successfully connected to Redis!\x1b[0m");
  redis.ping((err, result) => {
    if (err) {
      console.error("Error sending PING:", err);
    } else {
      console.log("Redis PING response:", result);
    }
    redis.quit();
  });
});

redis.on("error", (err) => {
  console.error("\x1b[31m❌ Failed to connect to Redis:\x1b[0m", err.message);
  process.exit(1);
});
