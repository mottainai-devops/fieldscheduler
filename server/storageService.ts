/**
 * S3 Storage Service for Payment Proof Uploads
 */

import { storagePut } from "./storage";
import { randomBytes } from "crypto";

/**
 * Generate a random suffix for file keys to prevent enumeration
 */
function randomSuffix(): string {
  return randomBytes(8).toString("hex");
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
  const fileExtension = fileName.split(".").pop() || "jpg";
  const fileKey = `payment-proofs/customer-${customerId}/${Date.now()}-${randomSuffix()}.${fileExtension}`;

  // Convert base64 to buffer if needed
  let fileBuffer: Buffer;
  if (typeof file === "string") {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = file.includes(",") ? file.split(",")[1] : file;
    fileBuffer = Buffer.from(base64Data, "base64");
  } else {
    fileBuffer = file;
  }

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
  const fileExtension = fileName.split(".").pop() || "jpg";
  const fileKey = `violation-photos/worker-${workerId}/${Date.now()}-${randomSuffix()}.${fileExtension}`;

  let fileBuffer: Buffer;
  if (typeof file === "string") {
    const base64Data = file.includes(",") ? file.split(",")[1] : file;
    fileBuffer = Buffer.from(base64Data, "base64");
  } else {
    fileBuffer = file;
  }

  const { url } = await storagePut(fileKey, fileBuffer, mimeType);

  return {
    fileUrl: url,
    fileKey: fileKey,
  };
}

