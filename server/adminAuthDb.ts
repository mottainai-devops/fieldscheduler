import { getDb } from "./db";
import { adminUsers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Create a new admin user with hashed password
 */
export async function createAdminUser(email: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const [admin] = await db.insert(adminUsers).values({
    email,
    passwordHash,
    name,
    role: "admin",
  });
  
  return admin;
}

/**
 * Verify admin login credentials
 */
export async function verifyAdminLogin(email: string, password: string) {
  const db = await getDb();
  if (!db) return null;
  
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  
  if (!admin) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, admin.passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  // Update last signed in
  await db
    .update(adminUsers)
    .set({ lastSignedIn: new Date() })
    .where(eq(adminUsers.id, admin.id));
  
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

/**
 * Get admin user by ID
 */
export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [admin] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  
  return admin || null;
}

/**
 * Generate password reset token
 */
export async function generateResetToken(email: string) {
  const db = await getDb();
  if (!db) return null;
  
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  
  if (!admin) {
    return null;
  }
  
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
  
  await db
    .update(adminUsers)
    .set({ resetToken, resetTokenExpiry })
    .where(eq(adminUsers.id, admin.id));
  
  return { resetToken, email: admin.email, name: admin.name };
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };
  
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.resetToken, token))
    .limit(1);
  
  if (!admin) {
    return { success: false, message: "Invalid reset token" };
  }
  
  if (!admin.resetTokenExpiry || admin.resetTokenExpiry < new Date()) {
    return { success: false, message: "Reset token has expired" };
  }
  
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await db
    .update(adminUsers)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(adminUsers.id, admin.id));
  
  return { success: true, message: "Password reset successfully" };
}

/**
 * Get all admin users (for super admin)
 */
export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      createdAt: adminUsers.createdAt,
      lastSignedIn: adminUsers.lastSignedIn,
    })
    .from(adminUsers);
}

