import { eq, and, or, desc } from "drizzle-orm";
import { getDb } from "./db";
import { buildingIdLinkageRequests, customerBuildingIdRelations, customers, workers } from "../drizzle/schema";

// Create a linkage request from worker
export async function createLinkageRequest(data: {
  mainCustomerId: number;
  annexCustomerId: number;
  requestedBy: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if a request already exists for this pair
  const existing = await db
    .select()
    .from(buildingIdLinkageRequests)
    .where(
      and(
        eq(buildingIdLinkageRequests.mainCustomerId, data.mainCustomerId),
        eq(buildingIdLinkageRequests.annexCustomerId, data.annexCustomerId),
        eq(buildingIdLinkageRequests.status, "pending")
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("A pending linkage request already exists for these customers");
  }
  
  const result = await db.insert(buildingIdLinkageRequests).values({
    mainCustomerId: data.mainCustomerId,
    annexCustomerId: data.annexCustomerId,
    requestedBy: data.requestedBy,
    notes: data.notes,
  });
  
  return result;
}

// Get all pending linkage requests
export async function getPendingLinkageRequests() {
  const db = await getDb();
  if (!db) return [];
  
  const requests = await db
    .select()
    .from(buildingIdLinkageRequests)
    .where(eq(buildingIdLinkageRequests.status, "pending"))
    .orderBy(desc(buildingIdLinkageRequests.createdAt));
  
  // Enrich with customer and worker info
  const enriched = await Promise.all(
    requests.map(async (request) => {
      const mainCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, request.mainCustomerId))
        .limit(1);
      
      const annexCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, request.annexCustomerId))
        .limit(1);
      
      const worker = await db
        .select()
        .from(workers)
        .where(eq(workers.id, request.requestedBy))
        .limit(1);
      
      return {
        ...request,
        mainCustomer: mainCustomer[0] || null,
        annexCustomer: annexCustomer[0] || null,
        requestedByWorker: worker[0] || null,
      };
    })
  );
  
  return enriched;
}

// Approve a linkage request
export async function approveLinkageRequest(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the request
  const request = await db
    .select()
    .from(buildingIdLinkageRequests)
    .where(eq(buildingIdLinkageRequests.id, requestId))
    .limit(1);
  
  if (request.length === 0) {
    throw new Error("Linkage request not found");
  }
  
  if (request[0].status !== "pending") {
    throw new Error("This request has already been reviewed");
  }
  
  // Update request status
  await db
    .update(buildingIdLinkageRequests)
    .set({
      status: "approved",
      reviewedBy: userId,
      reviewedAt: new Date(),
    })
    .where(eq(buildingIdLinkageRequests.id, requestId));
  
  // Create the actual relationship
  await db.insert(customerBuildingIdRelations).values({
    mainCustomerId: request[0].mainCustomerId,
    annexCustomerId: request[0].annexCustomerId,
    linkedBy: request[0].requestedBy,
    approvedBy: userId,
  });
  
  return { success: true };
}

// Reject a linkage request
export async function rejectLinkageRequest(requestId: number, userId: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const request = await db
    .select()
    .from(buildingIdLinkageRequests)
    .where(eq(buildingIdLinkageRequests.id, requestId))
    .limit(1);
  
  if (request.length === 0) {
    throw new Error("Linkage request not found");
  }
  
  if (request[0].status !== "pending") {
    throw new Error("This request has already been reviewed");
  }
  
  await db
    .update(buildingIdLinkageRequests)
    .set({
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: new Date(),
      rejectionReason,
    })
    .where(eq(buildingIdLinkageRequests.id, requestId));
  
  return { success: true };
}

// Get customer linkage status (main or annex of which customer)
export async function getCustomerLinkageStatus(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Check if this customer is a main
  const asMain = await db
    .select()
    .from(customerBuildingIdRelations)
    .where(eq(customerBuildingIdRelations.mainCustomerId, customerId));
  
  if (asMain.length > 0) {
    // This is a main customer, get all annexes
    const annexes = await Promise.all(
      asMain.map(async (rel) => {
        const annexCustomer = await db
          .select()
          .from(customers)
          .where(eq(customers.id, rel.annexCustomerId))
          .limit(1);
        return annexCustomer[0] || null;
      })
    );
    
    return {
      type: "main" as const,
      annexCustomers: annexes.filter(Boolean),
    };
  }
  
  // Check if this customer is an annex
  const asAnnex = await db
    .select()
    .from(customerBuildingIdRelations)
    .where(eq(customerBuildingIdRelations.annexCustomerId, customerId))
    .limit(1);
  
  if (asAnnex.length > 0) {
    const mainCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, asAnnex[0].mainCustomerId))
      .limit(1);
    
    return {
      type: "annex" as const,
      mainCustomer: mainCustomer[0] || null,
    };
  }
  
  return null; // No linkage
}

// Get all linkage relationships
export async function getAllLinkageRelationships() {
  const db = await getDb();
  if (!db) return [];
  
  const relations = await db
    .select()
    .from(customerBuildingIdRelations)
    .orderBy(desc(customerBuildingIdRelations.createdAt));
  
  const enriched = await Promise.all(
    relations.map(async (rel) => {
      const mainCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, rel.mainCustomerId))
        .limit(1);
      
      const annexCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, rel.annexCustomerId))
        .limit(1);
      
      return {
        ...rel,
        mainCustomer: mainCustomer[0] || null,
        annexCustomer: annexCustomer[0] || null,
      };
    })
  );
  
  return enriched;
}

// Remove a linkage relationship
export async function removeLinkageRelationship(relationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(customerBuildingIdRelations)
    .where(eq(customerBuildingIdRelations.id, relationId));
  
  return { success: true };
}

