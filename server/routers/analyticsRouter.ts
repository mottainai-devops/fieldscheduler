import { publicProcedure, fieldManagerProcedure, router } from "../_core/trpc";
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
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getRouteAnalytics: fieldManagerProcedure
    .input(z.object({ routeId: z.number() }))
    .query(async ({ input }) => {
      return await getRouteAnalytics(input.routeId);
    }),

  /**
   * Get worker route statistics
   */
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getWorkerStats: fieldManagerProcedure
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
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getTeamStats: fieldManagerProcedure
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
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getRouteHistory: fieldManagerProcedure
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
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
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
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
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

