/**
 * S3 Storage Service for Payment Evidence Files
 * Uses Manus built-in S3 storage helpers
 */

import { storagePut } from "../storage";

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload payment evidence file to S3
 * @param file - File buffer or base64 string
 * @param fileName - Original file name
 * @param contentType - MIME type (e.g., 'image/jpeg', 'application/pdf')
 * @returns S3 key and public URL
 */
export async function uploadPaymentEvidence(
  file: Buffer | string,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  try {
    // Generate unique key with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `payment-evidence/${timestamp}-${sanitizedFileName}`;

    // Convert base64 to buffer if needed
    let fileBuffer: Buffer;
    if (typeof file === 'string') {
      // Remove data URL prefix if present
      const base64Data = file.replace(/^data:.*?;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fileBuffer = file;
    }

    // Upload to S3 using Manus storage helper
    const result = await storagePut(key, fileBuffer, contentType);

    console.log(`Payment evidence uploaded: ${result.key}`);
    return result;
  } catch (error) {
    console.error('Error uploading payment evidence:', error);
    throw new Error('Failed to upload payment evidence');
  }
}

/**
 * Delete payment evidence file from S3
 * @param key - S3 object key
 */
export async function deletePaymentEvidence(key: string): Promise<void> {
  try {
    // Note: Manus storage helpers don't expose delete yet
    // For now, we'll just log the deletion request
    console.log(`Payment evidence deletion requested: ${key}`);
    // TODO: Implement deletion when Manus adds storageDelete helper
  } catch (error) {
    console.error('Error deleting payment evidence:', error);
    throw new Error('Failed to delete payment evidence');
  }
}

