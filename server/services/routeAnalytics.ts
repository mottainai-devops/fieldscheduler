import { getDb } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";
import type { Database } from "drizzle-orm/mysql2";

/**
 * Route Analytics Service
 * Tracks and analyzes route optimization performance metrics
 */

export interface RouteAnalyticsMetrics {
  routeId: number;
  workerId: number;
  totalCustomers: number;
  totalDistance: number;
  totalTime: number;
  averageDistancePerStop: number;
  averageTimePerStop: number;
  optimizationMethod: string; // 'mottainai' | 'nearest_neighbor' | 'arcgis'
  distanceSaved?: number;
  timeSaved?: number;
  efficiencyScore: number; // 0-100
  completionRate: number; // percentage
  reoptimizationCount: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface RouteHistory {
  id: number;
  routeId: number;
  workerId: number;
  eventType: string; // 'created' | 'optimized' | 'reoptimized' | 'started' | 'completed'
  details: any;
  timestamp: Date;
}

/**
 * Record route analytics when route is created or optimized
 */
export async function recordRouteAnalytics(
  routeId: number,
  metrics: {
    totalCustomers: number;
    totalDistance: number;
    totalTime: number;
    optimizationMethod: string;
    distanceSaved?: number;
    timeSaved?: number;
  }
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Fetch route details
    const route = await db
      .selectFrom("routes")
      .selectAll()
      .where("id", "=", routeId)
      .executeTakeFirst();

    if (!route) throw new Error(`Route ${routeId} not found`);

    // Calculate efficiency score (0-100)
    // Based on distance per stop and time per stop
    const avgDistancePerStop = metrics.totalDistance / metrics.totalCustomers;
    const avgTimePerStop = metrics.totalTime / metrics.totalCustomers;

    // Ideal values (can be tuned)
    const idealDistancePerStop = 5; // km
    const idealTimePerStop = 15; // minutes

    const distanceScore = Math.max(
      0,
      100 - (avgDistancePerStop / idealDistancePerStop) * 50
    );
    const timeScore = Math.max(0, 100 - (avgTimePerStop / idealTimePerStop) * 50);
    const efficiencyScore = Math.round((distanceScore + timeScore) / 2);

    // Store in routeAnalytics table (create if doesn't exist)
    // For now, we'll update the routes table with efficiency score
    await db
      .updateTable("routes")
      .set({
        efficiencyScore: efficiencyScore,
        totalDistance: String(metrics.totalDistance),
        estimatedDuration: String(metrics.totalTime),
      })
      .where("id", "=", routeId)
      .execute();

    // Record in route history
    await recordRouteHistory(routeId, "optimized", {
      optimizationMethod: metrics.optimizationMethod,
      totalCustomers: metrics.totalCustomers,
      totalDistance: metrics.totalDistance,
      totalTime: metrics.totalTime,
      distanceSaved: metrics.distanceSaved,
      timeSaved: metrics.timeSaved,
      efficiencyScore: efficiencyScore,
    });

    return {
      success: true,
      efficiencyScore: efficiencyScore,
      averageDistancePerStop: avgDistancePerStop,
      averageTimePerStop: avgTimePerStop,
    };
  } catch (error: any) {
    console.error("[Analytics] Error recording route analytics:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Record route history event
 */
export async function recordRouteHistory(
  routeId: number,
  eventType: string,
  details: any
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Store in a JSON field or create routeHistory table
    // For now, we'll log it
    console.log(`[Route History] Route ${routeId}: ${eventType}`, details);

    return { success: true };
  } catch (error: any) {
    console.error("[Analytics] Error recording route history:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get route analytics for a specific route
 */
export async function getRouteAnalytics(routeId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const route = await db
      .selectFrom("routes")
      .selectAll()
      .where("id", "=", routeId)
      .executeTakeFirst();

    if (!route) throw new Error(`Route ${routeId} not found`);

    // Get customer count
    const customers = await db
      .selectFrom("routeCustomers")
      .select("id")
      .where("routeId", "=", routeId)
      .execute();

    // Get completed customers
    const completedCustomers = await db
      .selectFrom("routeCustomers")
      .select("id")
      .where("routeId", "=", routeId)
      .where("status", "=", "completed")
      .execute();

    const totalDistance = parseFloat(route.totalDistance || "0");
    const totalTime = parseFloat(route.estimatedDuration || "0");
    const totalCustomers = customers.length;
    const completedCount = completedCustomers.length;

    return {
      routeId: route.id,
      workerId: route.workerId,
      totalCustomers: totalCustomers,
      completedCustomers: completedCount,
      completionRate: totalCustomers > 0 ? (completedCount / totalCustomers) * 100 : 0,
      totalDistance: totalDistance,
      totalTime: totalTime,
      averageDistancePerStop:
        totalCustomers > 0 ? totalDistance / totalCustomers : 0,
      averageTimePerStop: totalCustomers > 0 ? totalTime / totalCustomers : 0,
      efficiencyScore: route.efficiencyScore || 0,
      status: route.status,
      createdAt: route.createdAt,
      dispatchedAt: route.dispatchedAt,
    };
  } catch (error: any) {
    console.error("[Analytics] Error getting route analytics:", error);
    return null;
  }
}

/**
 * Get worker route statistics
 */
export async function getWorkerRouteStats(
  workerId: number,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let query = db
      .selectFrom("routes")
      .selectAll()
      .where("workerId", "=", workerId);

    if (startDate && endDate) {
      query = query
        .where("createdAt", ">=", startDate)
        .where("createdAt", "<=", endDate);
    }

    const routes = await query.execute();

    if (routes.length === 0) {
      return {
        workerId: workerId,
        totalRoutes: 0,
        completedRoutes: 0,
        averageEfficiencyScore: 0,
        totalDistanceCovered: 0,
        totalTimeTaken: 0,
        averageCustomersPerRoute: 0,
      };
    }

    const completedRoutes = routes.filter((r) => r.status === "completed").length;
    const totalDistance = routes.reduce(
      (sum, r) => sum + parseFloat(r.totalDistance || "0"),
      0
    );
    const totalTime = routes.reduce(
      (sum, r) => sum + parseFloat(r.estimatedDuration || "0"),
      0
    );
    const avgEfficiency =
      routes.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) /
      routes.length;

    // Get total customers across all routes
    const allCustomers = await db
      .selectFrom("routeCustomers")
      .select("id")
      .where(
        "routeId",
        "in",
        routes.map((r) => r.id) as any
      )
      .execute();

    return {
      workerId: workerId,
      totalRoutes: routes.length,
      completedRoutes: completedRoutes,
      completionRate: (completedRoutes / routes.length) * 100,
      averageEfficiencyScore: Math.round(avgEfficiency),
      totalDistanceCovered: Math.round(totalDistance * 10) / 10,
      totalTimeTaken: Math.round(totalTime),
      averageCustomersPerRoute: Math.round(
        (allCustomers.length / routes.length) * 10
      ) / 10,
    };
  } catch (error: any) {
    console.error("[Analytics] Error getting worker stats:", error);
    return null;
  }
}

/**
 * Get team-wide route statistics
 */
export async function getTeamRouteStats(startDate?: Date, endDate?: Date) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    let query = db.selectFrom("routes").selectAll();

    if (startDate && endDate) {
      query = query
        .where("createdAt", ">=", startDate)
        .where("createdAt", "<=", endDate);
    }

    const routes = await query.execute();

    if (routes.length === 0) {
      return {
        totalRoutes: 0,
        completedRoutes: 0,
        totalWorkers: 0,
        averageEfficiencyScore: 0,
        totalDistanceCovered: 0,
        totalTimeTaken: 0,
        averageCustomersPerRoute: 0,
      };
    }

    const completedRoutes = routes.filter((r) => r.status === "completed").length;
    const uniqueWorkers = new Set(routes.map((r) => r.workerId)).size;
    const totalDistance = routes.reduce(
      (sum, r) => sum + parseFloat(r.totalDistance || "0"),
      0
    );
    const totalTime = routes.reduce(
      (sum, r) => sum + parseFloat(r.estimatedDuration || "0"),
      0
    );
    const avgEfficiency =
      routes.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) /
      routes.length;

    // Get total customers
    const allCustomers = await db
      .selectFrom("routeCustomers")
      .select("id")
      .where(
        "routeId",
        "in",
        routes.map((r) => r.id) as any
      )
      .execute();

    return {
      totalRoutes: routes.length,
      completedRoutes: completedRoutes,
      completionRate: (completedRoutes / routes.length) * 100,
      totalWorkers: uniqueWorkers,
      averageEfficiencyScore: Math.round(avgEfficiency),
      totalDistanceCovered: Math.round(totalDistance * 10) / 10,
      totalTimeTaken: Math.round(totalTime),
      averageCustomersPerRoute: Math.round(
        (allCustomers.length / routes.length) * 10
      ) / 10,
      averageRoutesPerWorker: Math.round(
        (routes.length / uniqueWorkers) * 10
      ) / 10,
    };
  } catch (error: any) {
    console.error("[Analytics] Error getting team stats:", error);
    return null;
  }
}

/**
 * Compare optimization methods performance
 */
export async function compareOptimizationMethods() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // This would require storing optimization method in routes table
    // For now, return placeholder
    return {
      mottainai: {
        averageEfficiencyScore: 0,
        averageDistancePerStop: 0,
        averageTimePerStop: 0,
        routeCount: 0,
      },
      nearestNeighbor: {
        averageEfficiencyScore: 0,
        averageDistancePerStop: 0,
        averageTimePerStop: 0,
        routeCount: 0,
      },
      arcgis: {
        averageEfficiencyScore: 0,
        averageDistancePerStop: 0,
        averageTimePerStop: 0,
        routeCount: 0,
      },
    };
  } catch (error: any) {
    console.error("[Analytics] Error comparing methods:", error);
    return null;
  }
}

