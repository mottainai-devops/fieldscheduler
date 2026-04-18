/**
 * Mottainai Route Optimization Service
 * 
 * Implements the complete Mottainai methodology:
 * 1. Use OSRM Table API to optimize visit order (shortest time)
 * 2. Use GraphHopper Route API to generate polyline visualization
 * 
 * Supports unlimited stops (1000+)
 */

import { optimizeRouteWithOSRM, calculateRouteTotals } from './osrmTableApi';
import { generateRouteVisualization } from './graphhopperRouteApi';

export interface MottainaiRouteInput {
  startingPoint: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  customers: Array<{
    id: number;
    latitude: number;
    longitude: number;
    name?: string;
  }>;
}

export interface MottainaiRouteOutput {
  success: boolean;
  message?: string;
  optimizedOrder: Array<{
    customerId: number;
    sequence: number;
    duration: number;
    distance: number;
  }>;
  visualization: {
    polylineCoordinates: Array<[number, number]>;
    snappedWaypoints: Array<[number, number]>;
    instructions: Array<{
      text: string;
      distance: number;
      time: number;
      sign: number;
      street_name: string;
    }>;
    distance: number;
    time: number;
    distanceKm: string;
    timeMinutes: number;
  };
  summary: {
    totalDistance: number;
    totalDistanceKm: string;
    totalDuration: number;
    totalDurationMinutes: number;
    customerCount: number;
  };
}

/**
 * Main function: Optimize route using Mottainai methodology
 */
export async function optimizeRouteWithMottainai(
  input: MottainaiRouteInput
): Promise<MottainaiRouteOutput> {
  try {
    console.log('[Mottainai] Starting route optimization...');
    console.log(`[Mottainai] Starting point: ${input.startingPoint.latitude}, ${input.startingPoint.longitude}`);
    console.log(`[Mottainai] Customers to optimize: ${input.customers.length}`);

    // Validate inputs
    if (!input.startingPoint || !Number.isFinite(input.startingPoint.latitude) || !Number.isFinite(input.startingPoint.longitude)) {
      throw new Error('Invalid starting point coordinates');
    }

    if (!input.customers || input.customers.length === 0) {
      throw new Error('No customers to optimize');
    }

    // Filter out customers with invalid coordinates
    const validCustomers = input.customers.filter(c =>
      Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
    );

    if (validCustomers.length === 0) {
      throw new Error('No customers with valid coordinates');
    }

    console.log(`[Mottainai] Valid customers: ${validCustomers.length}`);

    // Step 1: Optimize visit order using OSRM Table API
    console.log('[Mottainai] Step 1: Optimizing visit order with OSRM...');
    const osrmOptimizedOrder = await optimizeRouteWithOSRM(
      {
        lat: input.startingPoint.latitude,
        lng: input.startingPoint.longitude,
      },
      validCustomers.map(c => ({
        id: c.id,
        latitude: c.latitude,
        longitude: c.longitude,
      }))
    );

    console.log('[Mottainai] OSRM optimization complete');
    console.log(`[Mottainai] Optimized sequence: ${osrmOptimizedOrder.map(c => c.customerId).join(' -> ')}`);

    // Build optimized customer array in the order returned by OSRM
    const optimizedCustomers = osrmOptimizedOrder
      .map(opt => {
        const customer = validCustomers.find(c => c.id === opt.customerId);
        return customer ? {
          ...customer,
          osrmIndex: opt.index,
          duration: opt.duration,
          distance: opt.distance,
        } : null;
      })
      .filter((c): c is any => c !== null);

    // Step 2: Generate polyline visualization using GraphHopper
    console.log('[Mottainai] Step 2: Generating route visualization with GraphHopper...');
    const visualization = await generateRouteVisualization(
      {
        lat: input.startingPoint.latitude,
        lng: input.startingPoint.longitude,
      },
      optimizedCustomers.map(c => ({
        lat: c.latitude,
        lng: c.longitude,
      }))
    );

    console.log('[Mottainai] GraphHopper visualization complete');

    // Calculate totals
    const totals = calculateRouteTotals(osrmOptimizedOrder);

    // Build output
    const output: MottainaiRouteOutput = {
      success: true,
      optimizedOrder: osrmOptimizedOrder.map((opt, idx) => ({
        customerId: opt.customerId,
        sequence: idx + 1,
        duration: opt.duration,
        distance: opt.distance,
      })),
      visualization: {
        polylineCoordinates: visualization.polylineCoordinates,
        snappedWaypoints: visualization.snappedWaypoints,
        instructions: visualization.instructions,
        distance: visualization.distance,
        time: visualization.time,
        distanceKm: visualization.distanceKm,
        timeMinutes: visualization.timeMinutes,
      },
      summary: {
        totalDistance: totals.totalDistance,
        totalDistanceKm: totals.totalDistanceKm,
        totalDuration: totals.totalDuration,
        totalDurationMinutes: totals.totalDurationMinutes,
        customerCount: validCustomers.length,
      },
    };

    console.log('[Mottainai] Route optimization complete');
    console.log(`[Mottainai] Summary:`, output.summary);

    return output;
  } catch (error) {
    console.error('[Mottainai] Route optimization failed:', error);
    throw error;
  }
}

/**
 * Validate route input before processing
 */
export function validateRouteInput(input: any): { valid: boolean; error?: string } {
  if (!input) {
    return { valid: false, error: 'Input is required' };
  }

  if (!input.startingPoint) {
    return { valid: false, error: 'Starting point is required' };
  }

  if (!Number.isFinite(input.startingPoint.latitude) || !Number.isFinite(input.startingPoint.longitude)) {
    return { valid: false, error: 'Invalid starting point coordinates' };
  }

  if (!Array.isArray(input.customers)) {
    return { valid: false, error: 'Customers must be an array' };
  }

  if (input.customers.length === 0) {
    return { valid: false, error: 'At least one customer is required' };
  }

  const validCustomers = input.customers.filter((c: any) =>
    Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
  );

  if (validCustomers.length === 0) {
    return { valid: false, error: 'No customers with valid coordinates' };
  }

  return { valid: true };
}

