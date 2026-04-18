/**
 * Clustering utilities for grouping customers by proximity
 * Uses DBSCAN-like algorithm for density-based clustering
 */

interface Customer {
  id: number;
  name: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
}

interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  customers: Customer[];
  radius: number; // in kilometers
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Cluster customers based on proximity using DBSCAN algorithm
 * @param customers Array of customers with coordinates
 * @param maxDistance Maximum distance in km for customers to be in same cluster
 * @param minPoints Minimum number of points to form a cluster
 * @returns Array of clusters
 */
export function clusterCustomers(
  customers: Customer[],
  maxDistance: number = 5, // 5km default
  minPoints: number = 3
): Cluster[] {
  // Filter customers with valid coordinates
  const validCustomers = customers.filter(
    c => c.latitude !== null && c.longitude !== null
  );

  if (validCustomers.length === 0) {
    return [];
  }

  const clusters: Cluster[] = [];
  const visited = new Set<number>();
  const clustered = new Set<number>();

  validCustomers.forEach((customer, index) => {
    if (visited.has(index)) return;
    
    visited.add(index);
    const neighbors = getNeighbors(validCustomers, index, maxDistance);
    
    if (neighbors.length < minPoints) {
      // Mark as noise (will be handled later)
      return;
    }

    // Create new cluster
    const clusterCustomers: Customer[] = [customer];
    clustered.add(index);

    // Expand cluster
    const neighborSet = new Set(neighbors);
    let i = 0;
    const maxIterations = validCustomers.length * 2; // Safety limit
    
    while (i < neighbors.length && i < maxIterations) {
      const neighborIndex = neighbors[i];
      
      if (!visited.has(neighborIndex)) {
        visited.add(neighborIndex);
        const neighborNeighbors = getNeighbors(validCustomers, neighborIndex, maxDistance);
        
        if (neighborNeighbors.length >= minPoints) {
          // Only add neighbors not already in the set
          neighborNeighbors.forEach(n => {
            if (!neighborSet.has(n)) {
              neighbors.push(n);
              neighborSet.add(n);
            }
          });
        }
      }
      
      if (!clustered.has(neighborIndex)) {
        clusterCustomers.push(validCustomers[neighborIndex]);
        clustered.add(neighborIndex);
      }
      
      i++;
    }

    // Calculate centroid
    const centroid = calculateCentroid(clusterCustomers);
    const radius = calculateClusterRadius(clusterCustomers, centroid);

    clusters.push({
      id: clusters.length + 1,
      centroid,
      customers: clusterCustomers,
      radius,
    });
  });

  return clusters;
}

/**
 * Get neighbors within maxDistance of a customer
 */
function getNeighbors(customers: Customer[], index: number, maxDistance: number): number[] {
  const customer = customers[index];
  const lat1 = parseFloat(customer.latitude!);
  const lon1 = parseFloat(customer.longitude!);
  
  const neighbors: number[] = [];
  
  customers.forEach((other, otherIndex) => {
    if (index === otherIndex) return;
    
    const lat2 = parseFloat(other.latitude!);
    const lon2 = parseFloat(other.longitude!);
    
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    
    if (distance <= maxDistance) {
      neighbors.push(otherIndex);
    }
  });
  
  return neighbors;
}

/**
 * Calculate the centroid (center point) of a cluster
 */
function calculateCentroid(customers: Customer[]): { lat: number; lng: number } {
  let sumLat = 0;
  let sumLng = 0;
  
  customers.forEach(customer => {
    sumLat += parseFloat(customer.latitude!);
    sumLng += parseFloat(customer.longitude!);
  });
  
  return {
    lat: sumLat / customers.length,
    lng: sumLng / customers.length,
  };
}

/**
 * Calculate the radius of a cluster (max distance from centroid)
 */
function calculateClusterRadius(customers: Customer[], centroid: { lat: number; lng: number }): number {
  let maxDistance = 0;
  
  customers.forEach(customer => {
    const lat = parseFloat(customer.latitude!);
    const lng = parseFloat(customer.longitude!);
    const distance = calculateDistance(centroid.lat, centroid.lng, lat, lng);
    
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });
  
  return maxDistance;
}

/**
 * Find which cluster a customer belongs to
 */
export function findCustomerCluster(customerId: number, clusters: Cluster[]): Cluster | null {
  for (const cluster of clusters) {
    if (cluster.customers.some(c => c.id === customerId)) {
      return cluster;
    }
  }
  return null;
}

/**
 * Get all customers in the same cluster as the given customer
 */
export function getClusterMembers(customerId: number, clusters: Cluster[]): Customer[] {
  const cluster = findCustomerCluster(customerId, clusters);
  return cluster ? cluster.customers : [];
}

/**
 * Suggest optimal clusters for route creation
 * Returns clusters sorted by size (largest first)
 */
export function suggestClusters(customers: Customer[], maxDistance: number = 5): Cluster[] {
  const clusters = clusterCustomers(customers, maxDistance);
  return clusters.sort((a, b) => b.customers.length - a.customers.length);
}

