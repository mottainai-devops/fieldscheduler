import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as arcgis from "./services/arcgis";
import * as zoho from "./services/zoho";
import { extractAssignmentsFromVRP, persistAssignments } from "./services/vrpPersist";
import { optimizeRouteWithMottainai, validateRouteInput } from "./services/mottainaiRouteOptimization";
import { analyticsRouter } from "./routers/analyticsRouter";
import { fieldWorkerRouter } from "./routers/fieldWorker";
import { workerAuthRouter } from "./routers/workerAuth";
import { paymentsRouter } from "./routers/payments";
import { integrationsRouter } from "./routers/integrations";
import { adminAuthRouter } from "./routers/adminAuth";
import { complianceRouter } from "./routers/compliance";
import { workerNotificationsRouter } from "./routers/workerNotificationsRouter";
import { adminNotificationsRouter } from "./routers/adminNotificationsRouter";
import { COOKIE_NAME } from "@shared/const";
import { customerRouter } from './routers/customerRouter';
import { calendarRouter } from './routers/calendar';
import { calendarOverridesRouter } from './routers/calendarOverrides';
import * as fieldWorkerDb from "./fieldWorkerDb";

// ---- ArcGIS ROUTER with Mottainai Integration ----
export const arcgisRouter = router({
  calculateRoute: publicProcedure
    .input(z.object({
      stops: z.array(z.object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
      })),
      customerIds: z.array(z.number()).optional(),
      startingLatitude: z.number().optional(),
      startingLongitude: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Use Mottainai methodology if customerIds provided
        if (input.customerIds && input.customerIds.length > 0) {
          console.log('[Mottainai] Route optimization requested for', input.customerIds.length, 'customers');
          
          // Fetch customer data from database
          const allCustomers = await fieldWorkerDb.getAllCustomers();
          const customers = allCustomers.filter((c: any) => input.customerIds!.includes(c.id));
          
          // Filter valid customers
          const validCustomers = customers.filter((c: any) => 
            Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude))
          );
          
          if (validCustomers.length === 0) {
            throw new Error('No customers with valid coordinates');
          }
          
          // Determine starting point
          let startingPoint = { latitude: 6.5244, longitude: 3.3792, name: 'HQ' };
          if (input.startingLatitude && input.startingLongitude) {
            const lat = input.startingLatitude;
            const lng = input.startingLongitude;
            // Validate GPS coordinates are realistic (not 0,0 or out of range)
            if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) {
              throw new Error("Invalid GPS coordinates: device location not yet acquired");
            }
            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
              throw new Error("Invalid GPS coordinates: out of valid range");
            }
            startingPoint = {
              latitude: lat,
              longitude: lng,
              name: 'Current Location'
            };
          }
          
          // Call Mottainai optimization
          const mottainaiResult = await optimizeRouteWithMottainai({
            startingPoint: {
              latitude: startingPoint.latitude,
              longitude: startingPoint.longitude,
              name: startingPoint.name,
            },
            customers: validCustomers.map((c: any) => ({
              id: Number(c.id),
              latitude: Number(c.latitude),
              longitude: Number(c.longitude),
              name: c.name || `Customer ${c.id}`,
            })),
          });
          
          // Build response with optimization results
          const response = {
            success: true,
            optimizedOrder: mottainaiResult.optimizedOrder,
            visualization: mottainaiResult.visualization,
            summary: mottainaiResult.summary,
            stops: mottainaiResult.optimizedOrder.map((opt: any) => {
              const customer = validCustomers.find((c: any) => Number(c.id) === opt.customerId);
              return {
                latitude: customer?.latitude || 0,
                longitude: customer?.longitude || 0,
                sequence: opt.sequence,
                name: customer?.name || `Customer ${opt.customerId}`,
                customerId: opt.customerId,
              };
            }),
          };
          
          console.log('[Mottainai] Optimization complete:', response.summary);
          return response;
        }
        
        // Fallback to old method for backward compatibility
        return await arcgis.calculateOptimizedRoute(input.stops);
      } catch (error: any) {
        console.error('[Route Calculation] Error:', error);
        throw new Error(`Route optimization failed: ${error.message}`);
      }
    }),
});

// ---- APP ROUTER ----
export const appRouter = router({
  arcgis: arcgisRouter,
  system: systemRouter,
  fieldWorker: fieldWorkerRouter,
  workerAuth: workerAuthRouter,
  payments: paymentsRouter,
  adminAuth: adminAuthRouter,
  integrations: integrationsRouter,
  compliance: complianceRouter,
  workerNotifications: workerNotificationsRouter,
  adminNotifications: adminNotificationsRouter,
  customer: customerRouter,
  calendar: calendarRouter,
  calendarOverrides: calendarOverridesRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;


