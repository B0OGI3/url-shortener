import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connected = false;

async function getRedis(): Promise<RedisClient | null> {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', () => { connected = false; });
    client.on('ready', () => { connected = true; });
    try {
      await client.connect();
      connected = true;
    } catch {
      connected = false;
    }
  }
  return connected ? client : null;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const redis = await getRedis();
    return redis ? redis.get(key) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttl = Number(process.env.CACHE_TTL ?? 3600),
): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) await redis.set(key, value, { EX: ttl });
  } catch {
    // silent degradation — DB is source of truth
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) await redis.del(key);
  } catch {
    // silent degradation
  }
}
