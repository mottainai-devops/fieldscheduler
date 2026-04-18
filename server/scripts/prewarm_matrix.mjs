// server/scripts/prewarm_matrix.mjs
// Matrix prewarm script: iterate active territories and time buckets, request OD pairs, cache results.

import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from 'redis';

dotenv.config({ path: './server/_core/.env.local' });

// Configuration from environment
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const CACHE_TTL_MATRIX = parseInt(process.env.CACHE_TTL_MATRIX || '86400', 10);

const redis = createClient({ url: REDIS_URL });

/**
 * Get top OD pairs for a territory
 */
async function getTopODPairs(territory, limit) {
  // TODO: Query database for top customer pairs in territory
  console.log(`[Prewarm] Fetching top ${limit} OD pairs for territory: ${territory}`);
  return [];
}

/**
 * Generate cache key for matrix result
 */
function cacheMatrixKey(profile, bucket, from, to) {
  const key = `matrix:${profile}:${bucket}:${from.lat},${from.lng}:${to.lat},${to.lng}`;
  return crypto.createHash('sha1').update(key).digest('hex');
}

/**
 * Get value from cache
 */
async function getCache(key) {
  try {
    return await redis.get(key);
  } catch (e) {
    console.error('[Prewarm] Cache get error:', e.message);
    return null;
  }
}

/**
 * Set value in cache
 */
async function setCache(key, value, ttlSeconds) {
  try {
    await redis.setEx(key, ttlSeconds, value);
  } catch (e) {
    console.error('[Prewarm] Cache set error:', e.message);
  }
}

/**
 * Fetch distance matrix from ArcGIS
 */
async function fetchArcGISMatrix(from, to, bucket) {
  // TODO: Call ArcGIS distance matrix API
  console.log(`[Prewarm] Fetching matrix for ${bucket}: ${from.lat},${from.lng} -> ${to.lat},${to.lng}`);
  return { distance: 0, time: 0 };
}

/**
 * Get active territories
 */
async function getActiveTerritories() {
  // TODO: Query database for active territories
  console.log('[Prewarm] Fetching active territories from database');
  return ['IKEJA_GRA', 'IKOYI', 'VI', 'LEKKI'];
}

/**
 * Prewarm cache for a specific time bucket
 */
async function prewarmForBucket(bucket) {
  console.log(`[Prewarm] Starting bucket: ${bucket}`);
  const territories = await getActiveTerritories();
  
  for (const t of territories) {
    const pairs = await getTopODPairs(t, 1000);
    console.log(`[Prewarm] Territory ${t}: ${pairs.length} OD pairs`);
    
    for (const p of pairs) {
      const key = cacheMatrixKey('car', bucket, p.from, p.to);
      const exists = await getCache(key);
      
      if (!exists) {
        const data = await fetchArcGISMatrix(p.from, p.to, bucket);
        await setCache(key, JSON.stringify(data), CACHE_TTL_MATRIX);
      }
    }
  }
  
  console.log(`[Prewarm] Completed bucket: ${bucket}`);
}

/**
 * Main prewarm orchestrator
 */
async function main() {
  try {
    console.log('[Prewarm] Connecting to Redis:', REDIS_URL);
    await redis.connect();
    console.log('[Prewarm] Connected to Redis');
    
    const buckets = ['AM', 'MID', 'PM'];
    for (const b of buckets) {
      await prewarmForBucket(b);
    }
    
    console.log('[Prewarm] Matrix prewarm complete');
    console.log('[Prewarm] Next scheduled run: 22:30 daily');
  } catch (e) {
    console.error('[Prewarm] Error:', e.message);
    process.exit(1);
  } finally {
    try {
      await redis.disconnect();
    } catch (e) {
      console.error('[Prewarm] Redis disconnect error:', e.message);
    }
  }
}

main();

