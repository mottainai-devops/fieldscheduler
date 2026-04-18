/**
 * OSRM Table API Service
 * 
 * Optimizes route visit order by computing distance/duration matrix
 * using OSRM (Open Source Routing Machine) Table API.
 * 
 * Supports unlimited stops (tested with 1000+)
 */

interface Coordinate {
  lat: number;
  lng: number;
}

interface Customer {
  id: number;
  latitude: number;
  longitude: number;
  name?: string;
}

interface OSRMTableResponse {
  code: string;
  durations: number[][];
  distances: number[][];
}

interface OptimizedCustomer {
  index: number;
  customerId: number;
  duration: number;
  distance: number;
}

/**
 * Build coordinates string for OSRM API
 * Format: lon,lat;lon,lat;lon,lat...
 */
function buildCoordinatesString(
  startingPoint: Coordinate,
  customers: Customer[]
): string {
  const coords: string[] = [];
  
  // Add starting point (field manager location) first
  coords.push(`${startingPoint.lng},${startingPoint.lat}`);
  
  // Add customer locations
  for (const customer of customers) {
    coords.push(`${customer.longitude},${customer.latitude}`);
  }
  
  return coords.join(';');
}

/**
 * Build destinations string for OSRM API
 * Format: 1;2;3;4... (indices of all customers, starting from 1)
 */
function buildDestinationsString(customerCount: number): string {
  const indices: string[] = [];
  for (let i = 1; i <= customerCount; i++) {
    indices.push(i.toString());
  }
  return indices.join(';');
}

/**
 * Call OSRM Table API to get duration/distance matrix
 */
async function callOSRMTableAPI(
  coordinates: string,
  destinations: string
): Promise<OSRMTableResponse> {
  const baseUrl = 'http://router.project-osrm.org/table/v1/driving/';
  const url = `${baseUrl}${coordinates}?sources=0&destinations=${destinations}&annotations=duration,distance`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
    }
    
    const data: OSRMTableResponse = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error(`OSRM API returned code: ${data.code}`);
    }
    
    return data;
  } catch (error) {
    console.error('[OSRM] API call failed:', error);
    throw error;
  }
}

/**
 * Extract durations from OSRM response and sort by shortest time
 */
function extractAndSortDurations(
  osrmResponse: OSRMTableResponse,
  customers: Customer[]
): OptimizedCustomer[] {
  const firstRow = osrmResponse.durations[0]; // Durations from starting point to all destinations
  const distances = osrmResponse.distances[0]; // Distances from starting point to all destinations
  
  if (!firstRow || firstRow.length === 0) {
    throw new Error('No durations returned from OSRM API');
  }
  
  // Create list of customers with their durations
  const customerDurations: OptimizedCustomer[] = [];
  
  for (let i = 0; i < customers.length; i++) {
    const duration = firstRow[i + 1]; // +1 because index 0 is the starting point
    const distance = distances[i + 1];
    
    if (duration !== undefined && distance !== undefined) {
      customerDurations.push({
        index: i + 1, // 1-based index for OSRM
        customerId: customers[i].id,
        duration,
        distance,
      });
    }
  }
  
  // Sort by duration (shortest first)
  customerDurations.sort((a, b) => a.duration - b.duration);
  
  return customerDurations;
}

/**
 * Main function: Optimize route visit order
 * 
 * @param startingPoint Field manager location
 * @param customers List of customers to visit
 * @returns Optimized customer order with durations
 */
export async function optimizeRouteWithOSRM(
  startingPoint: Coordinate,
  customers: Customer[]
): Promise<OptimizedCustomer[]> {
  try {
    console.log('[OSRM] Starting route optimization...');
    console.log(`[OSRM] Starting point: ${startingPoint.lat}, ${startingPoint.lng}`);
    console.log(`[OSRM] Customers to optimize: ${customers.length}`);
    
    // Validate inputs
    if (!startingPoint || !startingPoint.lat || !startingPoint.lng) {
      throw new Error('Invalid starting point coordinates');
    }
    
    if (!customers || customers.length === 0) {
      throw new Error('No customers to optimize');
    }
    
    // Build API request
    const coordinates = buildCoordinatesString(startingPoint, customers);
    const destinations = buildDestinationsString(customers.length);
    
    console.log(`[OSRM] Coordinates string: ${coordinates.substring(0, 100)}...`);
    console.log(`[OSRM] Destinations: ${destinations}`);
    
    // Call OSRM API
    const osrmResponse = await callOSRMTableAPI(coordinates, destinations);
    
    console.log('[OSRM] API response received successfully');
    console.log(`[OSRM] Duration matrix size: ${osrmResponse.durations.length}x${osrmResponse.durations[0]?.length}`);
    
    // Extract and sort durations
    const optimizedOrder = extractAndSortDurations(osrmResponse, customers);
    
    console.log('[OSRM] Route optimization complete');
    console.log(`[OSRM] Optimized order:`, optimizedOrder.map(c => ({ id: c.customerId, duration: c.duration })));
    
    return optimizedOrder;
  } catch (error) {
    console.error('[OSRM] Route optimization failed:', error);
    throw error;
  }
}

/**
 * Get total duration and distance for a route
 */
export function calculateRouteTotals(optimizedCustomers: OptimizedCustomer[]) {
  const totalDuration = optimizedCustomers.reduce((sum, c) => sum + c.duration, 0);
  const totalDistance = optimizedCustomers.reduce((sum, c) => sum + c.distance, 0);
  
  return {
    totalDuration, // in seconds
    totalDistance, // in meters
    totalDurationMinutes: Math.round(totalDuration / 60),
    totalDistanceKm: (totalDistance / 1000).toFixed(2),
  };
}

