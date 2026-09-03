/**
 * Private evidence storage backed by owner-managed AWS S3.
 *
 * Authentication deliberately uses the AWS SDK default credential provider chain.
 * On production EC2 that resolves the attached instance role; static access keys
 * are neither read nor supported by this module.
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

export const EVIDENCE_REFERENCE_PREFIX = "evidence-s3://";
export const EVIDENCE_URL_TTL_SECONDS = 10 * 60;

const ALLOWED_EVIDENCE_PREFIXES = ["violation-photos/", "payment-proofs/"] as const;

type EvidenceStorageConfig = {
  bucket: string;
  region: string;
};

/**
 * Read non-secret deployment configuration. Both values are required so a stale
 * or partly deployed process cannot accidentally write to an unintended bucket.
 */
export function getEvidenceStorageConfig(): EvidenceStorageConfig {
  const bucket = ENV.evidenceS3Bucket.trim();
  const region = ENV.awsRegion.trim();

  if (!bucket || !region) {
    throw new Error("Evidence storage is not configured");
  }

  return { bucket, region };
}

/** Reject traversal, absolute, and non-evidence object paths before AWS sees them. */
export function normalizeEvidenceKey(value: string): string {
  const key = value.trim().replace(/^\/+/, "");
  const hasAllowedPrefix = ALLOWED_EVIDENCE_PREFIXES.some(prefix => key.startsWith(prefix));

  if (
    !key ||
    !hasAllowedPrefix ||
    key.includes("..") ||
    key.includes("\\") ||
    key.includes("?") ||
    key.includes("#") ||
    /[\u0000-\u001f]/.test(key)
  ) {
    throw new Error("Invalid evidence storage key");
  }

  return key;
}

/**
 * This opaque, durable reference is returned to older mobile clients in the
 * existing fileUrl field. It is intentionally not an S3 URL and cannot be used
 * to read an object directly.
 */
export function toEvidenceReference(key: string): string {
  return `${EVIDENCE_REFERENCE_PREFIX}${normalizeEvidenceKey(key)}`;
}

/** Return an allow-listed S3 key only for a reference issued by this adapter. */
export function evidenceKeyFromReference(reference: string | null | undefined): string | null {
  if (!reference || !reference.startsWith(EVIDENCE_REFERENCE_PREFIX)) {
    return null;
  }

  try {
    return normalizeEvidenceKey(reference.slice(EVIDENCE_REFERENCE_PREFIX.length));
  } catch {
    return null;
  }
}

function createS3Client(region: string): S3Client {
  // No credentials option: the SDK uses the EC2 instance role in production.
  return new S3Client({ region });
}

function storageUnavailable(action: "upload" | "read"): Error {
  return new Error(`Evidence storage ${action} is unavailable`);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { bucket, region } = getEvidenceStorageConfig();
  const key = normalizeEvidenceKey(relKey);

  try {
    await createS3Client(region).send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
      // SSE-S3 is explicit even though the bucket may also have a default rule.
      ServerSideEncryption: "AES256",
    }));
  } catch (error) {
    // Do not expose a bucket name, credential state, provider endpoint, or AWS
    // response detail to a mobile client. The server log intentionally records
    // only the non-secret error class for operations staff.
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`[Evidence storage] ${"upload"} failed: ${errorName}`);
    throw storageUnavailable("upload");
  }

  return { key, url: toEvidenceReference(key) };
}

/** Mint a short-lived GET URL only after an authorized server read reaches this helper. */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { bucket, region } = getEvidenceStorageConfig();
  const key = normalizeEvidenceKey(relKey);

  try {
    const url = await getSignedUrl(
      createS3Client(region),
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: EVIDENCE_URL_TTL_SECONDS },
    );
    return { key, url };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`[Evidence storage] ${"read"} failed: ${errorName}`);
    throw storageUnavailable("read");
  }
}
