import axios from "axios";
import crypto from "crypto";
import { ENV } from "../_core/env";
import { getOrSet, keyGeocode } from "../lib/cache";
import { solveVRP } from "../lib/vrpClient";

const ARCGIS_API_KEY = process.env.ARCGIS_API_KEY;
const ARCGIS_GEOCODE_URL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
const ARCGIS_ROUTE_URL = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve";

export interface GeocodedAddress {
  latitude: number;
  longitude: number;
  address: string;
  score: number;
}

export interface RouteResult {
  totalDistance: number; // in kilometers
  totalTime: number; // in minutes
  stops: Array<{
    latitude: number;
    longitude: number;
    sequence: number;
    arrivalTime?: string;
  }>;
}

/**
 * Geocode an address to get latitude and longitude
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  if (!ARCGIS_API_KEY) {
    console.error("ArcGIS API key not configured");
    return null;
  }

  try {
    const response = await axios.get(ARCGIS_GEOCODE_URL, {
      params: {
        address,
        f: "json",
        token: ARCGIS_API_KEY,
        outFields: "Match_addr,Score",
      },
    });

    if (response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      return {
        latitude: candidate.location.y,
        longitude: candidate.location.x,
        address: candidate.attributes.Match_addr,
        score: candidate.attributes.Score,
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Calculate optimized route between multiple stops
 */
export async function calculateOptimizedRoute(
  stops: Array<{ latitude: number; longitude: number; name?: string }>
): Promise<RouteResult | null> {
  // Note: This is the TSP (single route) implementation
  // For VRP (multi-vehicle), use calculateOptimizedRouteVRP() or calculateOptimizedRouteDispatcher()
  if (!ARCGIS_API_KEY) {
    console.error("ArcGIS API key not configured");
    return null;
  }

  if (stops.length < 2) {
    console.error("At least 2 stops required for routing");
    return null;
  }

  try {
    // Format stops for ArcGIS API
    const stopsParam = stops
      .map((stop, idx) => `${stop.longitude},${stop.latitude}`)
      .join(";");

    const response = await axios.post(
      ARCGIS_ROUTE_URL,
      new URLSearchParams({
        stops: stopsParam,
        f: "json",
        token: ARCGIS_API_KEY,
        returnDirections: "false",
        returnRoutes: "true",
        returnStops: "true",
        findBestSequence: "true",
        preserveFirstStop: "true",
        preserveLastStop: "false",
        outSR: "4326",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.routes && response.data.routes.features.length > 0) {
      const route = response.data.routes.features[0];
      const routeStops = response.data.stops?.features || [];

      return {
        totalDistance: (route.attributes.Total_Kilometers || 0),
        totalTime: (route.attributes.Total_TravelTime || 0),
        stops: routeStops.map((stop: any, idx: number) => ({
          latitude: stop.geometry.y,
          longitude: stop.geometry.x,
          sequence: stop.attributes.Sequence || idx + 1,
          arrivalTime: stop.attributes.ArriveTime,
        })),
      };
    }

    return null;
  } catch (error) {
    console.error("Route calculation error:", error);
    return null;
  }
}

/**
 * Calculate distance between two points using ArcGIS
 */
export async function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<number | null> {
  const result = await calculateOptimizedRoute([from, to]);
  return result ? result.totalDistance : null;
}

/**
 * Geocode address with Redis caching
 */
export async function geocodeAddressCached(address: string): Promise<GeocodedAddress | null> {
  const h = crypto.createHash('sha1').update(address.trim().toLowerCase()).digest('hex');
  return getOrSet(keyGeocode(h), ENV.cacheTtlGeocode, async () => {
    return await geocodeAddress(address);
  });
}

/**
 * Calculate optimized route using VRP (multi-vehicle) or TSP (single route)
 */
export async function calculateOptimizedRouteVRP(args: {
  depot: { name: string; lat: number; lng: number; twStart?: string; twEnd?: string };
  workers: Array<{ name: string; capacity?: number; earliest?: string; latest?: string }>;
  orders: Array<{ name: string; lat: number; lng: number; serviceTime?: number; twStart?: string; twEnd?: string }>;
  parameters?: Record<string, any>;
}) {
  const depots = [{
    Name: args.depot.name,
    Lat: args.depot.lat,
    Lng: args.depot.lng,
    TWStart: args.depot.twStart,
    TWEnd: args.depot.twEnd,
  }];
  const routes = args.workers.map((w) => ({
    Name: w.name,
    StartDepotName: args.depot.name,
    EndDepotName: args.depot.name,
    Capacities: [w.capacity ?? 0],
    EarliestStart: w.earliest || '06:00',
    LatestStart: w.latest || '07:00',
    ReturnToDepot: true,
  }));
  const orders = args.orders.map((o) => ({
    Name: o.name,
    Lat: o.lat,
    Lng: o.lng,
    ServiceTime: o.serviceTime ?? 8,
    TWStart: o.twStart,
    TWEnd: o.twEnd,
  }));
  return await solveVRP({
    depots,
    orders,
    routes,
    parameters: { populateDirections: false, ...(args.parameters || {}) },
  });
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocodeAddresses(
  addresses: string[]
): Promise<Array<GeocodedAddress | null>> {
  const results: Array<GeocodedAddress | null> = [];

  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);
    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Route optimization dispatcher: uses VRP if enabled, otherwise TSP
 */
const calculateOptimizedRouteTSP = calculateOptimizedRoute;
export async function calculateOptimizedRouteDispatcher(input: any) {
  if (!ENV.useVRP) {
    return await calculateOptimizedRouteTSP(input);
  }
  return await calculateOptimizedRouteVRP(input);
}

