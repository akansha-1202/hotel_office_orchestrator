import Redis from 'ioredis';
import { HotelOffer } from '../types';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
      console.error('[redis] connection error', err.message);
    });
  }
  return redis;
}

function cityKey(city: string): string {
  return `hotels:${city.trim().toLowerCase()}`;
}

// Save the final deduped list as a sorted set (score = price).
// This lets us filter by price range inside Redis with ZRANGEBYSCORE.
export async function saveHotels(
  city: string,
  hotels: HotelOffer[]
): Promise<void> {
  const client = getRedis();
  const key = cityKey(city);

  // Wipe old data for this city, then add fresh offers
  await client.del(key);

  if (hotels.length === 0) {
    console.log(`[redis] saved 0 hotels for city=${city}`);
    return;
  }

  // ZADD key score member — member is the full hotel JSON
  const args: (string | number)[] = [];
  for (const hotel of hotels) {
    args.push(hotel.price);
    args.push(JSON.stringify(hotel));
  }

  await client.zadd(key, ...args);
  console.log(`[redis] saved ${hotels.length} hotels for city=${city}`);
}

// Read hotels from Redis, optionally filtered by min/max price.
export async function getHotelsByPrice(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<HotelOffer[]> {
  const client = getRedis();
  const key = cityKey(city);
  const min = minPrice !== undefined ? String(minPrice) : '-inf';
  const max = maxPrice !== undefined ? String(maxPrice) : '+inf';

  const members = await client.zrangebyscore(key, min, max);
  const hotels: HotelOffer[] = [];

  for (const member of members) {
    try {
      hotels.push(JSON.parse(member) as HotelOffer);
    } catch {
      console.error('[redis] failed to parse hotel member', member);
    }
  }

  return hotels;
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedis();
    const result = await client.ping();
    return result === 'PONG';
  } catch (err) {
    console.error('[redis] ping failed', err);
    return false;
  }
}
