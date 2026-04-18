import { getDb } from "./db";
import { workers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function createWorkerAccount(email: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if worker already exists
  const existing = await db.select().from(workers).where(eq(workers.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error("Worker with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert worker
  const result = await db.insert(workers).values({
    email,
    pin: passwordHash, // Store hashed password in pin field
    name,
    status: "active",
  });

  return result;
}

export async function verifyWorkerLogin(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(workers).where(eq(workers.email, email)).limit(1);
  
  if (result.length === 0) {
    return null;
  }

  const worker = result[0];
  
  if (!worker.pin) {
    return null;
  }

  // Verify password
  const isValid = await bcrypt.compare(password, worker.pin);
  
  if (!isValid) {
    return null;
  }

  return {
    id: worker.id,
    email: worker.email!,
    name: worker.name,
    role: "worker" as const,
  };
}

export async function getWorkerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  
  if (result.length === 0) {
    return null;
  }

  const worker = result[0];
  
  return {
    id: worker.id,
    email: worker.email!,
    name: worker.name,
    role: "worker" as const,
  };
}

