import { z } from "zod";
import * as fieldWorkerDb from "../fieldWorkerDb";
import { clusterCustomers } from "../utils/clustering";
import { clusterCustomersByCount } from "../utils/clusteringByCount";
import { protectedProcedure, router } from "../_core/trpc";

export const fieldWorkerRouter = router({
  // Worker operations
  getWorkers: protectedProcedure.query(async () => {
    return await fieldWorkerDb.getAllWorkers();
  }),

  getWorkerById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerById(input.id);
    }),

  createWorker: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      skills: z.string().optional(),
      status: z.enum(["active", "inactive", "on_leave"]).optional(),
      shiftStart: z.string().optional(),
      shiftEnd: z.string().optional(),
      pin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createWorker(input);
    }),

  updateWorker: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      skills: z.string().optional(),
      status: z.enum(["active", "inactive", "on_leave"]).optional(),
      shiftStart: z.string().optional(),
      shiftEnd: z.string().optional(),
      pin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await fieldWorkerDb.updateWorker(id, data);
    }),

  deleteWorker: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteWorker(input.id);
    }),

  // Customer operations
  getCustomers: protectedProcedure.query(async () => {
    return await fieldWorkerDb.getAllCustomers();
  }),

  getCustomersByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomersByIds(input.ids);
    }),

  getCustomerById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomerById(input.id);
    }),

  getAllCustomers: protectedProcedure.query(async () => {
    return await fieldWorkerDb.getAllCustomers();
  }),

  createCustomer: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      customermaf: z.string().optional(),
      fieldManager: z.number().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      serviceType: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      buildingId: z.string().optional(),
      zohoContactId: z.string().optional(),
      coordinateSource: z.string().optional(),
      isMainBuilding: z.number().optional(),
      mainBuildingCustomerId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createCustomer(input);
    }),

  updateCustomer: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      customermaf: z.string().optional(),
      fieldManager: z.number().optional(),
      assignmentStatus: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      serviceType: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      buildingId: z.string().optional(),
      zohoContactId: z.string().optional(),
      coordinateSource: z.string().optional(),
      isMainBuilding: z.number().optional(),
      mainBuildingCustomerId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await fieldWorkerDb.updateCustomer(id, data);
    }),

  deleteCustomer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteCustomer(input.id);
    }),

  // Vehicle operations
  getVehicles: protectedProcedure.query(async () => {
    return await fieldWorkerDb.getVehicles();
  }),

  getVehicleById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getVehicleById(input.id);
    }),

  createVehicle: protectedProcedure
    .input(z.object({
      name: z.string(),
      plateNumber: z.string().optional(),
      capacity: z.number().optional(),
      status: z.enum(["available", "in_use", "maintenance"]).optional(),
      startLatitude: z.string().optional(),
      startLongitude: z.string().optional(),
      maxDistance: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createVehicle(input);
    }),

  updateVehicle: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      plateNumber: z.string().optional(),
      capacity: z.number().optional(),
      status: z.enum(["available", "in_use", "maintenance"]).optional(),
      startLatitude: z.string().optional(),
      startLongitude: z.string().optional(),
      maxDistance: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await fieldWorkerDb.updateVehicle(id, data);
    }),

  deleteVehicle: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteVehicle(input.id);
    }),

  // Route operations
  getRoutes: protectedProcedure.query(async () => {
    return await fieldWorkerDb.getAllRoutes();
  }),

  getRouteById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteById(input.id);
    }),

  getRouteDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteDetails(input.id);
    }),

  getRoutesByWorkerId: protectedProcedure
    .input(z.object({ workerId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRoutesByWorkerId(input.workerId);
    }),

  createRoute: protectedProcedure
    .input(z.object({
      workerId: z.number().optional(),
      vehicleId: z.number().optional(),
      totalDistance: z.string().optional(),
      estimatedDuration: z.string().optional(),
      efficiencyScore: z.number().optional(),
      status: z.enum(["assigned", "pending", "in_progress", "completed", "cancelled", "optimized"]).optional(),
      scheduledDate: z.string().optional(),
      customerIds: z.array(z.number()).optional(),
      dispatchedAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('\n========== CREATE ROUTE REQUEST ==========');
      console.log('[CREATE ROUTE] Timestamp:', new Date().toISOString());
      console.log('[CREATE ROUTE] Input received:', JSON.stringify(input, null, 2));
      console.log('[CREATE ROUTE] Input keys:', Object.keys(input));
      console.log('[CREATE ROUTE] WorkerId:', input.workerId, 'Type:', typeof input.workerId);
      console.log('[CREATE ROUTE] CustomerIds:', input.customerIds, 'Count:', input.customerIds?.length);
      
      try {
        console.log('[CREATE ROUTE] Calling fieldWorkerDb.createRoute...');
        const result = await fieldWorkerDb.createRoute(input);
        console.log('[CREATE ROUTE] ✅ SUCCESS! Result:', JSON.stringify(result, null, 2));
        console.log('========================================\n');
        return result;
      } catch (error: any) {
        console.error('[CREATE ROUTE] ❌ ERROR occurred!');
        console.error('[CREATE ROUTE] Error message:', error.message);
        console.error('[CREATE ROUTE] Error stack:', error.stack);
        console.error('[CREATE ROUTE] Full error:', JSON.stringify(error, null, 2));
        console.error('========================================\n');
        throw error;
      }
    }),

  updateRoute: protectedProcedure
    .input(z.object({
      id: z.number(),
      workerId: z.number().optional(),
      vehicleId: z.number().optional(),
      totalDistance: z.string().optional(),
      estimatedDuration: z.string().optional(),
      efficiencyScore: z.number().optional(),
      status: z.enum(["assigned", "pending", "in_progress", "completed", "cancelled", "optimized"]).optional(),
      scheduledDate: z.string().optional(),
      customerIds: z.array(z.number()).optional(),
      dispatchedAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await fieldWorkerDb.updateRoute(id, data);
    }),

  deleteRoute: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteRoute(input.id);
    }),

  // Clustering operations
  getCustomerClusters: protectedProcedure
    .input(z.object({
      clusterDistance: z.number().default(5),
      minClusterSize: z.number().default(3),
      maxClusterRadius: z.number().default(10),
    }))
    .query(async ({ input }) => {
      try {
        const customers = await fieldWorkerDb.getAllCustomers();
        const clusters = clusterCustomers(customers, input.clusterDistance, input.minClusterSize, input.maxClusterRadius);
        return clusters || [];
      } catch (error) {
        console.error("Error clustering customers:", error);
        return [];
      }
    }),

  getCustomerClustersByCount: protectedProcedure
    .input(z.object({
      customersPerCluster: z.number().default(5),
    }))
    .query(async ({ input }) => {
      try {
        const customers = await fieldWorkerDb.getAllCustomers();
        const clusters = clusterCustomersByCount(customers, input.customersPerCluster);
        return clusters || [];
      } catch (error) {
        console.error("Error clustering customers by count:", error);
        return [];
      }
    }),

  // Filter Preset operations
  getFilterPresets: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) return [];
      try {
        return await fieldWorkerDb.getFilterPresets(ctx.user.id);
      } catch (error) {
        console.error("Error getting filter presets:", error);
        return [];
      }
    }),

  saveFilterPreset: protectedProcedure
    .input(z.object({
      name: z.string(),
      buildingId: z.string().optional(),
      fieldManager: z.string().optional(),
      searchCustomer: z.string().optional(),
      assignmentStatus: z.string().optional(),
      clusterMode: z.string().optional(),
      clusterDistance: z.number().optional(),
      customersPerCluster: z.number().optional(),
      minClusterSize: z.number().optional(),
      maxClusterRadius: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      try {
        return await fieldWorkerDb.saveFilterPreset(ctx.user.id, input);
      } catch (error: any) {
        console.error("Error saving filter preset:", error);
        throw error;
      }
    }),

  deleteFilterPreset: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      try {
        return await fieldWorkerDb.deleteFilterPreset(input.id, ctx.user.id);
      } catch (error: any) {
        console.error("Error deleting filter preset:", error);
        throw error;
      }
    }),

  updateFilterPreset: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      buildingId: z.string().optional(),
      fieldManager: z.string().optional(),
      searchCustomer: z.string().optional(),
      assignmentStatus: z.string().optional(),
      clusterMode: z.string().optional(),
      clusterDistance: z.number().optional(),
      customersPerCluster: z.number().optional(),
      minClusterSize: z.number().optional(),
      maxClusterRadius: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const { id, ...data } = input;
      try {
        return await fieldWorkerDb.updateFilterPreset(id, data, ctx.user.id);
      } catch (error: any) {
        console.error("Error updating filter preset:", error);
        throw error;
      }
    }),

  // Field Manager Tagging endpoints
  getFieldManagerTags: protectedProcedure
    .input(z.object({ fieldManagerId: z.number() }))
    .query(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.getFieldManagerTags(input.fieldManagerId);
    }),

  getAllFieldManagerTags: protectedProcedure.query(async () => {
    const fmTagDb = await import("../fieldManagerTagDb");
    return await fmTagDb.getAllFieldManagerTags();
  }),

  addFieldManagerTag: protectedProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      customermaf: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.addFieldManagerTag(
        input.fieldManagerId,
        input.customermaf,
        input.description
      );
    }),

  removeFieldManagerTag: protectedProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      customermaf: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.removeFieldManagerTag(
        input.fieldManagerId,
        input.customermaf
      );
    }),

  updateFieldManagerTagDescription: protectedProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      customermaf: z.string(),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.updateFieldManagerTagDescription(
        input.fieldManagerId,
        input.customermaf,
        input.description
      );
    }),

  bulkAddFieldManagerTags: protectedProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      tags: z.array(z.object({
        customermaf: z.string(),
        description: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.bulkAddFieldManagerTags(
        input.fieldManagerId,
        input.tags
      );
    }),

  // Route optimization using ArcGIS
  optimizeRoute: protectedProcedure
    .input(z.object({
      customerIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const arcgis = await import("../services/arcgis");
      
      // Get customer details with coordinates
      const customersData = await Promise.all(
        input.customerIds.map(id => fieldWorkerDb.getCustomerById(id))
      );
      
      // Filter out null customers and those without coordinates
      const validCustomers = customersData.filter(
        c => c && c.latitude && c.longitude
      ) as Array<{ id: number; latitude: string; longitude: string; name: string; address: string }>;
      
      if (validCustomers.length < 2) {
        throw new Error("At least 2 customers with valid coordinates required");
      }
      
      // Prepare stops for ArcGIS
      const stops = validCustomers.map(c => ({
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        name: c.name || c.address,
      }));
      
      // Call ArcGIS optimization
      const result = await arcgis.calculateOptimizedRoute(stops);
      
      if (!result) {
        throw new Error("Route optimization failed");
      }
      
      // Map the optimized sequence back to customers
      const optimizedStops = result.stops.map((stop, index) => {
        const customer = validCustomers[index];
        return {
          ...customer,
          customerId: customer.id,
          sequence: stop.sequence,
          latitude: stop.latitude,
          longitude: stop.longitude,
        };
      });
      
      return {
        stops: optimizedStops,
        totalDistance: result.totalDistance,
        totalTime: result.totalTime,
      };
    }),
});
