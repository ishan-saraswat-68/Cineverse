import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisClient.on("connect", () => {
  console.log(" Connected to Redis successfully");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

// Lua Script 1: Atomic Multi-Seat Lock
// Checks if all keys are either unowned or already owned by this user (ARGV[1]).
// If any key is owned by another user, it returns 0. Otherwise locks/refreshes all with TTL.
const ACQUIRE_LOCKS_SCRIPT = `
for i, key in ipairs(KEYS) do
    local owner = redis.call("GET", key)
    if owner and owner ~= ARGV[1] then
        return 0
    end
end
for i, key in ipairs(KEYS) do
    redis.call("SET", key, ARGV[1], "PX", ARGV[2])
end
return 1
`;

// Lua Script 2: Safe Multi-Seat Unlock
// Only deletes the key if the current owner matches ARGV[1]
const RELEASE_LOCKS_SCRIPT = `
local count = 0
for i, key in ipairs(KEYS) do
    if redis.call("GET", key) == ARGV[1] then
        redis.call("DEL", key)
        count = count + 1
    end
end
return count
`;

const DEFAULT_TTL_MS = (parseInt(process.env.SEAT_LOCK_TTL_SECONDS, 10) || 300) * 1000;

/**
 * Atomically acquire locks for an array of seats
 * @param {string} showId 
 * @param {string[]} seats 
 * @param {string} userId 
 * @param {number} ttlMs (default: from process.env.SEAT_LOCK_TTL_SECONDS or 300,000 ms)
 * @returns {Promise<boolean>} true if locked, false if conflict
 */
export const acquireSeatLocks = async (showId, seats, userId, ttlMs = DEFAULT_TTL_MS) => {
  const keys = seats.map((seat) => `lock:show:${showId}:seat:${seat}`);
  const result = await redisClient.eval(
    ACQUIRE_LOCKS_SCRIPT,
    keys.length,
    ...keys,
    userId,
    ttlMs
  );
  return result === 1;
};

/**
 * Safely release locks for an array of seats
 */
export const releaseSeatLocks = async (showId, seats, userId) => {
  const keys = seats.map((seat) => `lock:show:${showId}:seat:${seat}`);
  const result = await redisClient.eval(
    RELEASE_LOCKS_SCRIPT,
    keys.length,
    ...keys,
    userId
  );
  return result;
};

/**
 * Get all active temporary locks for a show (for initial load)
 */
export const getShowLocks = async (showId) => {
  const pattern = `lock:show:${showId}:seat:*`;
  const keys = await redisClient.keys(pattern);
  if (!keys || keys.length === 0) return {};

  const pipeline = redisClient.pipeline();
  keys.forEach((key) => {
    pipeline.get(key);
    pipeline.pttl(key);
  });
  const results = await pipeline.exec();

  const locks = {};
  for (let i = 0; i < keys.length; i++) {
    const seatId = keys[i].split(":seat:")[1];
    const userId = results[i * 2][1];
    const ttlMs = results[i * 2 + 1][1];
    if (userId && ttlMs > 0) {
      locks[seatId] = { userId, ttlMs };
    }
  }
  return locks;
};

export default redisClient;
