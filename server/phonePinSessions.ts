import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { workerPhonePinSessions, workers } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export const PHONE_PIN_SESSION_HEADER = "x-field-worker-session";
const PHONE_PIN_SESSION_ISSUER = "field-scheduler";
const PHONE_PIN_SESSION_AUDIENCE = "field-worker-mobile";
const PHONE_PIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type PhonePinClaims = {
  sid?: unknown;
  sub?: unknown;
  typ?: unknown;
};

function phonePinSessionSecret(): Uint8Array {
  if (!ENV.cookieSecret) {
    throw new Error("Phone/PIN session signing is unavailable");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function equalTokenHashes(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function issuePhonePinSession(workerId: number): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("Phone/PIN session issuance is unavailable");

  const workerRows = await db
    .select({ id: workers.id, status: workers.status })
    .from(workers)
    .where(eq(workers.id, workerId))
    .limit(1);
  const worker = workerRows[0];
  if (!worker || worker.status !== "active") {
    throw new Error("Worker is not active");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PHONE_PIN_SESSION_TTL_MS);
  const sessionId = randomUUID();
  const token = await new SignJWT({ sid: sessionId, typ: "phone_pin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(PHONE_PIN_SESSION_ISSUER)
    .setAudience(PHONE_PIN_SESSION_AUDIENCE)
    .setSubject(String(workerId))
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(phonePinSessionSecret());

  await db.insert(workerPhonePinSessions).values({
    id: sessionId,
    workerId,
    tokenHash: hashSessionToken(token),
    issuedAt: now,
    expiresAt,
    lastUsedAt: now,
  });

  return { token, expiresAt };
}

export async function resolvePhonePinSession(token: string): Promise<{ workerId: number }> {
  try {
    const { payload } = await jwtVerify(token, phonePinSessionSecret(), {
      issuer: PHONE_PIN_SESSION_ISSUER,
      audience: PHONE_PIN_SESSION_AUDIENCE,
      algorithms: ["HS256"],
    });
    const claims = payload as PhonePinClaims;
    const sessionId = typeof claims.sid === "string" ? claims.sid : "";
    const workerId = Number(claims.sub);
    if (!sessionId || !Number.isInteger(workerId) || workerId <= 0 || claims.typ !== "phone_pin") {
      throw new Error("Invalid phone/PIN session");
    }

    const db = await getDb();
    if (!db) throw new Error("Phone/PIN session validation is unavailable");
    const now = new Date();
    const rows = await db
      .select({
        id: workerPhonePinSessions.id,
        workerId: workerPhonePinSessions.workerId,
        tokenHash: workerPhonePinSessions.tokenHash,
        revokedAt: workerPhonePinSessions.revokedAt,
      })
      .from(workerPhonePinSessions)
      .where(and(
        eq(workerPhonePinSessions.id, sessionId),
        eq(workerPhonePinSessions.workerId, workerId),
        isNull(workerPhonePinSessions.revokedAt),
        gt(workerPhonePinSessions.expiresAt, now),
      ))
      .limit(1);
    const session = rows[0];
    if (!session || !equalTokenHashes(session.tokenHash, hashSessionToken(token))) {
      throw new Error("Phone/PIN session is invalid");
    }

    const workerRows = await db
      .select({ id: workers.id, status: workers.status })
      .from(workers)
      .where(eq(workers.id, workerId))
      .limit(1);
    if (!workerRows[0] || workerRows[0].status !== "active") {
      throw new Error("Worker is not active");
    }

    await db.update(workerPhonePinSessions)
      .set({ lastUsedAt: now })
      .where(eq(workerPhonePinSessions.id, sessionId));
    return { workerId };
  } catch {
    throw new Error("Phone/PIN session is invalid or expired");
  }
}

/** Revoke all issued phone/PIN sessions before a PIN rotation or worker deactivation. */
export async function revokePhonePinSessionsForWorker(workerId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Phone/PIN session revocation is unavailable");
  await db.update(workerPhonePinSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(workerPhonePinSessions.workerId, workerId), isNull(workerPhonePinSessions.revokedAt)));
}
