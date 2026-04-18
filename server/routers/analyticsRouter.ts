import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getRouteAnalytics,
  getWorkerRouteStats,
  getTeamRouteStats,
  recordRouteAnalytics,
  recordRouteHistory,
} from "../services/routeAnalytics";

export const analyticsRouter = router({
  /**
   * Get analytics for a specific route
   */
  getRouteAnalytics: publicProcedure
    .input(z.object({ routeId: z.number() }))
    .query(async ({ input }) => {
      return await getRouteAnalytics(input.routeId);
    }),

  /**
   * Get worker route statistics
   */
  getWorkerStats: publicProcedure
    .input(
      z.object({
        workerId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getWorkerRouteStats(input.workerId, input.startDate, input.endDate);
    }),

  /**
   * Get team-wide route statistics
   */
  getTeamStats: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getTeamRouteStats(input.startDate, input.endDate);
    }),

  /**
   * Get route history
   */
  getRouteHistory: publicProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      // Placeholder - would fetch from database
      return [];
    }),

  /**
   * Record route analytics (called after route optimization)
   */
  recordAnalytics: publicProcedure
    .input(
      z.object({
        routeId: z.number(),
        totalCustomers: z.number(),
        totalDistance: z.number(),
        totalTime: z.number(),
        optimizationMethod: z.string(),
        distanceSaved: z.number().optional(),
        timeSaved: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await recordRouteAnalytics(input.routeId, {
        totalCustomers: input.totalCustomers,
        totalDistance: input.totalDistance,
        totalTime: input.totalTime,
        optimizationMethod: input.optimizationMethod,
        distanceSaved: input.distanceSaved,
        timeSaved: input.timeSaved,
      });
    }),

  /**
   * Record route history event
   */
  recordHistory: publicProcedure
    .input(
      z.object({
        routeId: z.number(),
        eventType: z.string(),
        details: z.record(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      return await recordRouteHistory(input.routeId, input.eventType, input.details);
    }),
});

