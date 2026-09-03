/**
 * S3 Storage Service for Payment Proof Uploads
 */

import { evidenceKeyFromReference, storagePut } from "./storage";
import { randomBytes } from "crypto";

const MAX_UPLOAD_BYTES = 3_500_000;

/**
 * Generate a random suffix for file keys to prevent enumeration
 */
function randomSuffix(): string {
  return randomBytes(8).toString("hex");
}

function decodeBase64Upload(file: Buffer | string): Buffer {
  if (Buffer.isBuffer(file)) return file;

  const base64Data = file.includes(",") ? file.slice(file.indexOf(",") + 1) : file;
  const normalized = base64Data.replace(/\s/g, "");
  const validBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized);
  if (!normalized || !validBase64) {
    throw new Error("Invalid evidence file data");
  }

  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Evidence file is invalid or exceeds the upload limit");
  }
  return buffer;
}

function safeExtension(fileName: string, fallback: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension || fallback;
}

/** Convert APK fileUrl payloads to permitted, durable violation-photo keys. */
export function violationEvidenceKeysFromReferences(references: string[]): string[] {
  return references.map(reference => {
    const key = evidenceKeyFromReference(reference);
    if (!key || !key.startsWith("violation-photos/")) {
      throw new Error("Evidence reference is invalid");
    }
    return key;
  });
}

/**
 * Upload payment proof file to S3
 * @param file - File buffer or base64 string
 * @param fileName - Original file name
 * @param mimeType - File MIME type (e.g., 'image/jpeg', 'application/pdf')
 * @param customerId - Customer ID for organizing files
 * @returns Object with fileUrl and fileKey
 */
export async function uploadPaymentProof(
  file: Buffer | string,
  fileName: string,
  mimeType: string,
  customerId: number
): Promise<{ fileUrl: string; fileKey: string }> {
  // Create a unique file key with customer ID and random suffix
  const fileExtension = safeExtension(fileName, "bin");
  const fileKey = `payment-proofs/customer-${customerId}/${Date.now()}-${randomSuffix()}.${fileExtension}`;

  const fileBuffer = decodeBase64Upload(file);

  // Upload to S3
  const { url } = await storagePut(fileKey, fileBuffer, mimeType);

  return {
    fileUrl: url,
    fileKey: fileKey,
  };
}

/**
 * Upload violation photo to S3
 * @param file - File buffer or base64 string
 * @param fileName - Original file name
 * @param mimeType - File MIME type
 * @param workerId - Worker ID for organizing files
 * @returns Object with fileUrl and fileKey
 */
export async function uploadViolationPhoto(
  file: Buffer | string,
  fileName: string,
  mimeType: string,
  workerId: number
): Promise<{ fileUrl: string; fileKey: string }> {
  const fileExtension = safeExtension(fileName, "jpg");
  const fileKey = `violation-photos/worker-${workerId}/${Date.now()}-${randomSuffix()}.${fileExtension}`;

  const fileBuffer = decodeBase64Upload(file);

  const { url } = await storagePut(fileKey, fileBuffer, mimeType);

  return {
    fileUrl: url,
    fileKey: fileKey,
  };
}
