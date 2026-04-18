// backend/scripts/prewarm_matrix.js
// Pseudocode: iterate active territories and time buckets, request OD pairs, cache results.
require('dotenv').config({ path: './backend/config/.env' });
const crypto = require('crypto');

/**
 * getTopODPairs(territory, limit) -> [{from:{lat,lng}, to:{lat,lng}}]
 * cacheMatrixKey(profile, bucket, from, to) -> string
 * setCache(key, value, ttlSeconds) -> Promise<void>
 * fetchArcGISMatrix(from, to, bucket) -> Promise<any>
 * getActiveTerritories() -> ['IKEJA_GRA', 'IKOYI', ...]
 */

async function prewarmForBucket(bucket) {
  const territories = await getActiveTerritories();
  for (const t of territories) {
    const pairs = await getTopODPairs(t, 1000);
    for (const p of pairs) {
      const key = cacheMatrixKey('car', bucket, p.from, p.to);
      const exists = await getCache(key);
      if (!exists) {
        const data = await fetchArcGISMatrix(p.from, p.to, bucket);
        await setCache(key, JSON.stringify(data), parseInt(process.env.CACHE_TTL_MATRIX_SECONDS||'86400',10));
      }
    }
  }
}

async function main() {
  const buckets = ['AM', 'MID', 'PM'];
  for (const b of buckets) await prewarmForBucket(b);
  console.log('Matrix prewarm complete');
}

main().catch(e => { console.error(e); process.exit(1); });