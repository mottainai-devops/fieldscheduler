import { eq } from "drizzle-orm";
import { routes, routeCustomers } from "../../drizzle/schema";
import type { Database } from "drizzle-orm/mysql2";
import { optimizeRouteWithMottainai } from "./mottainaiRouteOptimization";

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Simple greedy nearest-neighbor TSP solver (fallback)
 */
function solveNearestNeighbor(
  workerLat: number,
  workerLng: number,
  customers: Array<{
    id: number;
    customerId: number;
    latitude: string | null;
    longitude: string | null;
    sequenceNumber: number;
  }>
): Array<{ customerId: number; sequence: number }> {
  if (customers.length === 0) return [];

  const unvisited = customers.map((c) => ({
    ...c,
    lat: parseFloat(c.latitude || "0"),
    lng: parseFloat(c.longitude || "0"),
  }));

  const result: Array<{ customerId: number; sequence: number }> = [];
  let currentLat = workerLat;
  let currentLng = workerLng;
  let sequence = 1;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = haversineDistance(
        currentLat,
        currentLng,
        unvisited[i].lat,
        unvisited[i].lng
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIdx = i;
      }
    }

    const nearest = unvisited[nearestIdx];
    result.push({
      customerId: nearest.customerId,
      sequence,
    });

    currentLat = nearest.lat;
    currentLng = nearest.lng;
    sequence++;
    unvisited.splice(nearestIdx, 1);
  }

  return result;
}

export async function reoptimizeRouteFromCurrentLocation(
  input: {
    routeId: number;
    workerCurrentLat: number;
    workerCurrentLng: number;
  },
  db: Database
) {
  try {
    // 1. Fetch the route
    const routeData = await db
      .select()
      .from(routes)
      .where(eq(routes.id, input.routeId))
      .limit(1);

    if (!routeData || routeData.length === 0) {
      return {
        success: false,
        message: "Route not found",
      };
    }

    // 2. Get all uncompleted stops for this route
    const allStops = await db
      .select()
      .from(routeCustomers)
      .where(eq(routeCustomers.routeId, input.routeId));

    const remainingStops = allStops.filter((stop) => stop.status !== "completed");

    if (remainingStops.length === 0) {
      return {
        success: false,
        message: "All customers have been completed",
      };
    }

    // 3. Try Mottainai methodology first, fallback to nearest-neighbor
    let optimizedSequence: Array<{ customerId: number; sequence: number }>;
    let usedMottainai = false;
    let visualization: any = null;
    let summary: any = null;

    try {
      console.log('[Re-optimization] Using Mottainai methodology for', remainingStops.length, 'customers');
      
      // Fetch customer details for Mottainai
      const customerIds = remainingStops.map(s => s.customerId);
      const customerDetails = await db
        .selectFrom('customers')
        .select(['id', 'latitude', 'longitude', 'name'])
        .where('id', 'in', customerIds as any)
        .execute();

      // Call Mottainai optimization
      const mottainaiResult = await optimizeRouteWithMottainai({
        startingPoint: {
          latitude: input.workerCurrentLat,
          longitude: input.workerCurrentLng,
          name: 'Current Location',
        },
        customers: customerDetails.map((c: any) => ({
          id: Number(c.id),
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          name: c.name || `Customer ${c.id}`,
        })),
      });

      optimizedSequence = mottainaiResult.optimizedOrder.map(opt => ({
        customerId: opt.customerId,
        sequence: opt.sequence,
      }));
      visualization = mottainaiResult.visualization;
      summary = mottainaiResult.summary;
      usedMottainai = true;
      
      console.log('[Re-optimization] Mottainai optimization successful');
    } catch (error: any) {
      console.error('[Re-optimization] Mottainai failed, using fallback:', error.message);
      
      // Fallback to nearest-neighbor
      optimizedSequence = solveNearestNeighbor(
        input.workerCurrentLat,
        input.workerCurrentLng,
        remainingStops
      );
    }

    // 4. Update the database with new sequence numbers
    for (const assignment of optimizedSequence) {
      const stop = remainingStops.find((s) => s.customerId === assignment.customerId);
      if (stop) {
        await db
          .update(routeCustomers)
          .set({ sequenceNumber: assignment.sequence })
          .where(eq(routeCustomers.id, stop.id));
      }
    }

    return {
      success: true,
      message: `Route re-optimized with ${optimizedSequence.length} remaining customers using ${usedMottainai ? 'Mottainai' : 'nearest-neighbor'} algorithm`,
      newSequence: optimizedSequence,
      visualization: visualization,
      summary: summary,
      usedMottainai: usedMottainai,
    };
  } catch (error: any) {
    console.error("Re-optimization error:", error);
    return {
      success: false,
      message: `Re-optimization failed: ${error.message}`,
    };
  }
}

