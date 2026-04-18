/**
 * K-means clustering for grouping customers by target count
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
 * Calculate centroid of a group of customers
 */
function calculateCentroid(customers: Customer[]): { lat: number; lng: number } {
  const sum = customers.reduce(
    (acc, customer) => {
      const lat = parseFloat(customer.latitude!);
      const lng = parseFloat(customer.longitude!);
      return {
        lat: acc.lat + lat,
        lng: acc.lng + lng,
      };
    },
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / customers.length,
    lng: sum.lng / customers.length,
  };
}

/**
 * Calculate radius of cluster (max distance from centroid)
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
 * Cluster customers using K-means algorithm based on target customer count
 * @param customers Array of customers with coordinates
 * @param customersPerCluster Target number of customers per cluster
 * @param maxIterations Maximum iterations for convergence
 * @returns Array of clusters
 */
export function clusterCustomersByCount(
  customers: Customer[],
  customersPerCluster: number = 10,
  maxIterations: number = 100
): Cluster[] {
  // Filter customers with valid coordinates
  const validCustomers = customers.filter(
    c => c.latitude !== null && c.longitude !== null
  );

  if (validCustomers.length === 0) {
    return [];
  }

  // Calculate number of clusters needed
  const k = Math.max(1, Math.ceil(validCustomers.length / customersPerCluster));

  // Initialize centroids using k-means++ algorithm
  const centroids: { lat: number; lng: number }[] = [];
  
  // First centroid: random customer
  const firstCustomer = validCustomers[Math.floor(Math.random() * validCustomers.length)];
  centroids.push({
    lat: parseFloat(firstCustomer.latitude!),
    lng: parseFloat(firstCustomer.longitude!),
  });

  // Remaining centroids: choose customers far from existing centroids
  while (centroids.length < k) {
    const distances = validCustomers.map(customer => {
      const lat = parseFloat(customer.latitude!);
      const lng = parseFloat(customer.longitude!);
      
      // Find minimum distance to any existing centroid
      const minDist = Math.min(...centroids.map(centroid =>
        calculateDistance(lat, lng, centroid.lat, centroid.lng)
      ));
      
      return minDist;
    });

    // Choose customer with maximum minimum distance
    const maxDistIndex = distances.indexOf(Math.max(...distances));
    const nextCustomer = validCustomers[maxDistIndex];
    centroids.push({
      lat: parseFloat(nextCustomer.latitude!),
      lng: parseFloat(nextCustomer.longitude!),
    });
  }

  // K-means iteration
  let assignments: number[] = new Array(validCustomers.length).fill(0);
  let iteration = 0;

  while (iteration < maxIterations) {
    // Assign each customer to nearest centroid
    const newAssignments = validCustomers.map((customer, index) => {
      const lat = parseFloat(customer.latitude!);
      const lng = parseFloat(customer.longitude!);
      
      const distances = centroids.map(centroid =>
        calculateDistance(lat, lng, centroid.lat, centroid.lng)
      );
      
      return distances.indexOf(Math.min(...distances));
    });

    // Check for convergence
    if (JSON.stringify(assignments) === JSON.stringify(newAssignments)) {
      break;
    }

    assignments = newAssignments;

    // Recalculate centroids
    for (let i = 0; i < k; i++) {
      const clusterCustomers = validCustomers.filter((_, index) => assignments[index] === i);
      
      if (clusterCustomers.length > 0) {
        centroids[i] = calculateCentroid(clusterCustomers);
      }
    }

    iteration++;
  }

  // Build final clusters
  const clusters: Cluster[] = [];
  
  for (let i = 0; i < k; i++) {
    const clusterCustomers = validCustomers.filter((_, index) => assignments[index] === i);
    
    if (clusterCustomers.length > 0) {
      const centroid = centroids[i];
      const radius = calculateClusterRadius(clusterCustomers, centroid);
      
      clusters.push({
        id: i + 1,
        centroid,
        customers: clusterCustomers,
        radius,
      });
    }
  }

  return clusters;
}

