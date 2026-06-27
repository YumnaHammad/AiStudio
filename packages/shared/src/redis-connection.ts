/** BullMQ / ioredis connection options parsed from REDIS_URL (supports Upstash TLS). */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: Record<string, never>;
  maxRetriesPerRequest: null;
}

export function parseRedisConnection(
  url = process.env.REDIS_URL ?? 'redis://localhost:6379',
): RedisConnectionOptions {
  const parsed = new URL(url);
  const options: RedisConnectionOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    maxRetriesPerRequest: null,
  };

  if (parsed.password) {
    options.password = decodeURIComponent(parsed.password);
  }
  if (parsed.username) {
    options.username = decodeURIComponent(parsed.username);
  }
  if (parsed.protocol === 'rediss:') {
    options.tls = {};
  }

  return options;
}
