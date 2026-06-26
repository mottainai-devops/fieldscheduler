/**
 * Greedy nearest-neighbor clustering for grouping customers by target count.
 *
 * Replaces the previous K-means implementation which produced 0 clusters when
 * the customer set was small (< k) and was non-deterministic due to random
 * centroid initialisation.
 *
 * Algorithm:
 *   1. Pick the unassigned customer with the lowest latitude as the seed for
 *      the first cluster (deterministic, geographically consistent).
 *   2. Greedily pull the nearest unassigned customer until the cluster reaches
 *      `customersPerCluster`.
 *   3. Repeat from step 1 for the remaining unassigned customers.
 *
 * Complexity: O(n²) — acceptable for n ≤ 10,000.
 */

interface Customer {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
}

interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  customers: Customer[];
  radius: number; // in kilometres
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function centroidOf(cs: Customer[]): { lat: number; lng: number } {
  const sum = cs.reduce(
    (acc, c) => ({ lat: acc.lat + parseFloat(c.latitude!), lng: acc.lng + parseFloat(c.longitude!) }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / cs.length, lng: sum.lng / cs.length };
}

function radiusOf(cs: Customer[], centroid: { lat: number; lng: number }): number {
  return cs.reduce((max, c) => {
    const d = haversine(centroid.lat, centroid.lng, parseFloat(c.latitude!), parseFloat(c.longitude!));
    return d > max ? d : max;
  }, 0);
}

/**
 * Cluster customers using greedy nearest-neighbor based on target customer count.
 * @param customers   Array of customers with coordinates
 * @param customersPerCluster  Target number of customers per cluster (default 10)
 */
export function clusterCustomersByCount(
  customers: Customer[],
  customersPerCluster: number = 10
): Cluster[] {
  // Filter customers with valid coordinates
  const valid = customers.filter(
    (c) => c.latitude !== null && c.longitude !== null &&
           !isNaN(parseFloat(c.latitude!)) && !isNaN(parseFloat(c.longitude!))
  );

  if (valid.length === 0) return [];

  // Guard: if fewer customers than the target, return a single cluster
  if (valid.length <= customersPerCluster) {
    const centroid = centroidOf(valid);
    return [{ id: 1, centroid, customers: valid, radius: radiusOf(valid, centroid) }];
  }

  const unassigned = new Set(valid.map((_, i) => i));
  const clusters: Cluster[] = [];

  while (unassigned.size > 0) {
    // Seed: pick the unassigned customer with the smallest latitude (southernmost)
    let seedIdx = -1;
    let seedLat = Infinity;
    for (const i of unassigned) {
      const lat = parseFloat(valid[i].latitude!);
      if (lat < seedLat) { seedLat = lat; seedIdx = i; }
    }

    const clusterMembers: Customer[] = [valid[seedIdx]];
    unassigned.delete(seedIdx);

    // Greedily add nearest unassigned customers
    while (clusterMembers.length < customersPerCluster && unassigned.size > 0) {
      // Centroid of current cluster members
      const cur = centroidOf(clusterMembers);

      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (const i of unassigned) {
        const d = haversine(cur.lat, cur.lng, parseFloat(valid[i].latitude!), parseFloat(valid[i].longitude!));
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }

      clusterMembers.push(valid[nearestIdx]);
      unassigned.delete(nearestIdx);
    }

    const centroid = centroidOf(clusterMembers);
    clusters.push({
      id: clusters.length + 1,
      centroid,
      customers: clusterMembers,
      radius: radiusOf(clusterMembers, centroid),
    });
  }

  return clusters;
}
