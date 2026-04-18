/**
 * GraphHopper Route API Service
 * 
 * Generates route polyline, snapped waypoints, and turn-by-turn instructions
 * using GraphHopper Route API hosted at map.mottainai.africa
 */

interface Point {
  lng: number;
  lat: number;
}

interface Instruction {
  text: string;
  distance: number;
  time: number;
  sign: number;
  street_name: string;
  interval: [number, number];
}

interface GraphHopperResponse {
  paths: Array<{
    distance: number; // in meters
    time: number; // in milliseconds
    points: {
      type: string;
      coordinates: Array<[number, number]>; // [lng, lat]
    };
    snapped_waypoints: {
      type: string;
      coordinates: Array<[number, number]>; // [lng, lat]
    };
    instructions: Instruction[];
  }>;
}

interface RouteVisualization {
  polylineCoordinates: Array<[number, number]>;
  snappedWaypoints: Array<[number, number]>;
  instructions: Instruction[];
  distance: number; // in meters
  time: number; // in milliseconds
  distanceKm: string;
  timeMinutes: number;
}

/**
 * Build points array for GraphHopper API
 * Points must be in optimized order: [starting point, customer1, customer2, ...]
 */
function buildPointsArray(points: Point[]): Array<[number, number]> {
  return points.map(p => [p.lng, p.lat]);
}

/**
 * Build GraphHopper request body
 */
function buildGraphHopperRequest(pointsArray: Array<[number, number]>) {
  return {
    profile: 'truck',
    points_encoded: false,
    points: pointsArray,
    way_point_max_distance: 0, // Unlimited snapping to roads
    pass_through: true, // Visit all waypoints in order
    'ch.disable': true, // Disable contraction hierarchies for better accuracy
  };
}

/**
 * Call GraphHopper Route API
 */
async function callGraphHopperRouteAPI(
  requestBody: object
): Promise<GraphHopperResponse> {
  const baseUrl = 'https://map.mottainai.africa/route';
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`GraphHopper API error: ${response.status} ${response.statusText}`);
    }
    
    const data: GraphHopperResponse = await response.json();
    
    if (!data.paths || data.paths.length === 0) {
      throw new Error('No paths returned from GraphHopper API');
    }
    
    return data;
  } catch (error) {
    console.error('[GraphHopper] API call failed:', error);
    throw error;
  }
}

/**
 * Extract polyline coordinates from GraphHopper response
 */
function extractPolylineCoordinates(response: GraphHopperResponse): Array<[number, number]> {
  const path = response.paths[0];
  
  if (!path.points || !path.points.coordinates) {
    throw new Error('No polyline coordinates in GraphHopper response');
  }
  
  return path.points.coordinates;
}

/**
 * Extract snapped waypoints from GraphHopper response
 */
function extractSnappedWaypoints(response: GraphHopperResponse): Array<[number, number]> {
  const path = response.paths[0];
  
  if (!path.snapped_waypoints || !path.snapped_waypoints.coordinates) {
    return [];
  }
  
  return path.snapped_waypoints.coordinates;
}

/**
 * Extract turn-by-turn instructions from GraphHopper response
 */
function extractInstructions(response: GraphHopperResponse): Instruction[] {
  const path = response.paths[0];
  
  if (!path.instructions) {
    return [];
  }
  
  return path.instructions;
}

/**
 * Main function: Generate route visualization
 * 
 * @param startingPoint Starting location
 * @param optimizedCustomers Customers in optimized order
 * @returns Route visualization data (polyline, waypoints, instructions)
 */
export async function generateRouteVisualization(
  startingPoint: Point,
  optimizedCustomers: Array<{ lat: number; lng: number }>
): Promise<RouteVisualization> {
  try {
    console.log('[GraphHopper] Starting route visualization...');
    console.log(`[GraphHopper] Starting point: ${startingPoint.lat}, ${startingPoint.lng}`);
    console.log(`[GraphHopper] Customers in route: ${optimizedCustomers.length}`);
    
    // Validate inputs
    if (!startingPoint || !startingPoint.lat || !startingPoint.lng) {
      throw new Error('Invalid starting point coordinates');
    }
    
    if (!optimizedCustomers || optimizedCustomers.length === 0) {
      throw new Error('No customers to visualize');
    }
    
    // Build points array: starting point first, then customers in optimized order
    const points: Point[] = [startingPoint, ...optimizedCustomers];
    const pointsArray = buildPointsArray(points);
    
    console.log(`[GraphHopper] Total points: ${pointsArray.length}`);
    console.log(`[GraphHopper] Points array: ${JSON.stringify(pointsArray.slice(0, 3))}...`);
    
    // Build and send request
    const requestBody = buildGraphHopperRequest(pointsArray);
    const response = await callGraphHopperRouteAPI(requestBody);
    
    console.log('[GraphHopper] API response received successfully');
    
    // Extract data from response
    const polylineCoordinates = extractPolylineCoordinates(response);
    const snappedWaypoints = extractSnappedWaypoints(response);
    const instructions = extractInstructions(response);
    
    const path = response.paths[0];
    const distance = path.distance; // in meters
    const time = path.time; // in milliseconds
    
    console.log('[GraphHopper] Route visualization generated');
    console.log(`[GraphHopper] Distance: ${distance}m, Time: ${time}ms`);
    console.log(`[GraphHopper] Polyline points: ${polylineCoordinates.length}`);
    console.log(`[GraphHopper] Snapped waypoints: ${snappedWaypoints.length}`);
    console.log(`[GraphHopper] Instructions: ${instructions.length}`);
    
    return {
      polylineCoordinates,
      snappedWaypoints,
      instructions,
      distance,
      time,
      distanceKm: (distance / 1000).toFixed(2),
      timeMinutes: Math.round(time / 60000),
    };
  } catch (error) {
    console.error('[GraphHopper] Route visualization failed:', error);
    throw error;
  }
}

/**
 * Parse instructions and map to coordinates
 * This helps match instructions to specific waypoints
 */
export function parseInstructions(
  instructions: Instruction[],
  polylineCoordinates: Array<[number, number]>
): Array<{
  instruction: string;
  distance: number;
  time: number;
  coordinate: [number, number];
}> {
  return instructions.map(instr => {
    const [startIdx, endIdx] = instr.interval;
    const coordinate = polylineCoordinates[startIdx] || polylineCoordinates[0];
    
    return {
      instruction: instr.text,
      distance: instr.distance,
      time: instr.time,
      coordinate,
    };
  });
}

