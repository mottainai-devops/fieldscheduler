// cache.ts (TypeScript pseudo)
import IORedis from 'ioredis';
const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

type Getter<T> = () => Promise<T>;

export async function getOrSet<T>(key: string, ttlSeconds: number, getter: Getter<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await getter();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
  return value;
}

export async function setStaleWhileRevalidate<T>(key: string, ttlSeconds: number, value: T) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export function keyMatrix(profile: string, bucket: string, from: {lat:number,lng:number}, to: {lat:number,lng:number}) {
  return `matrix:${profile}:${bucket}:${from.lat},${from.lng}->${to.lat},${to.lng}`;
}

export function keyGeocode(addrHash: string) {
  return `geocode:${addrHash}`;
}

export function keyRouteSeq(hash: string) {
  return `route_seq:${hash}`;
}