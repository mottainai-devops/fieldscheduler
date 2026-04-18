/**
 * Utility functions for extracting and managing building IDs from customer names
 */

/**
 * Extract building ID from customer name
 * Examples:
 * - "13301 OYSISW12 414" → "13301"
 * - "1050048 OYSISW8 410" → "1050048"
 * - "ACME Corp Building 123" → "123"
 */
export function extractBuildingId(customerName: string): string | null {
  if (!customerName) return null;
  
  // Try to find a numeric ID at the start of the name
  const match = customerName.match(/^(\d+)/);
  if (match) {
    return match[1];
  }
  
  // Try to find "Building" followed by a number
  const buildingMatch = customerName.match(/building\s+(\d+)/i);
  if (buildingMatch) {
    return buildingMatch[1];
  }
  
  return null;
}

/**
 * Group customers by building ID
 */
export interface BuildingGroup {
  buildingId: string;
  customers: Array<{
    id: number;
    name: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    isMainBuilding: number;
    mainBuildingCustomerId?: number;
  }>;
  mainCustomer?: {
    id: number;
    name: string;
  };
  substituteCustomers: Array<{
    id: number;
    name: string;
  }>;
}

export function groupCustomersByBuildingId(customers: any[]): BuildingGroup[] {
  const buildingMap = new Map<string, any[]>();
  
  // Group customers by building ID
  for (const customer of customers) {
    const buildingId = customer.buildingId || extractBuildingId(customer.name);
    if (buildingId) {
      if (!buildingMap.has(buildingId)) {
        buildingMap.set(buildingId, []);
      }
      buildingMap.get(buildingId)!.push({
        ...customer,
        extractedBuildingId: buildingId,
      });
    }
  }
  
  // Convert to BuildingGroup format
  const groups: BuildingGroup[] = [];
  
  buildingMap.forEach((groupCustomers, buildingId) => {
    // Only create groups for buildings with multiple customers
    if (groupCustomers.length > 1) {
      const mainCustomer = groupCustomers.find((c: any) => c.isMainBuilding === 1);
      const substituteCustomers = groupCustomers.filter((c: any) => c.isMainBuilding !== 1);
      
      groups.push({
        buildingId,
        customers: groupCustomers,
        mainCustomer: mainCustomer ? {
          id: mainCustomer.id,
          name: mainCustomer.name,
        } : undefined,
        substituteCustomers: substituteCustomers.map((c: any) => ({
          id: c.id,
          name: c.name,
        })),
      });
    }
  });
  
  return groups;
}

/**
 * Check if a customer name likely contains a building ID
 */
export function hasBuildingId(customerName: string): boolean {
  return extractBuildingId(customerName) !== null;
}

/**
 * Format building group display name
 */
export function formatBuildingGroupName(buildingId: string, customerCount: number): string {
  return `Building ${buildingId} (${customerCount} customers)`;
}

