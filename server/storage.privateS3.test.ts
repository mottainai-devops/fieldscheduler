import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  s3Client: vi.fn(),
  getSignedUrl: vi.fn(),
  env: {
    awsRegion: "eu-west-1",
    evidenceS3Bucket: "fieldscheduler",
  },
}));

vi.mock("@aws-sdk/client-s3", () => {
  class PutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class GetObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class S3Client {
    constructor(input: unknown) {
      mocks.s3Client(input);
      return { send: mocks.send };
    }
  }
  return { GetObjectCommand, PutObjectCommand, S3Client };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

vi.mock("./_core/env", () => ({ ENV: mocks.env }));

import {
  EVIDENCE_REFERENCE_PREFIX,
  evidenceKeyFromReference,
  normalizeEvidenceKey,
  storageGet,
  storagePut,
  toEvidenceReference,
} from "./storage";
import { violationEvidenceKeysFromReferences } from "./storageService";

describe("private evidence S3 adapter", () => {
  beforeEach(() => {
    mocks.env.awsRegion = "eu-west-1";
    mocks.env.evidenceS3Bucket = "fieldscheduler";
    mocks.send.mockReset();
    mocks.s3Client.mockReset();
    mocks.getSignedUrl.mockReset();
  });

  it("writes only an allow-listed key with SSE-S3 via the configured bucket and region", async () => {
    mocks.send.mockResolvedValue({ ETag: "ignored" });

    const result = await storagePut(
      "violation-photos/worker-7/1710000000000-a.jpg",
      Buffer.from("photo"),
      "image/jpeg",
    );

    expect(mocks.s3Client).toHaveBeenCalledWith({ region: "eu-west-1" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "fieldscheduler",
      Key: "violation-photos/worker-7/1710000000000-a.jpg",
      ContentType: "image/jpeg",
      ServerSideEncryption: "AES256",
    });
    expect(result).toEqual({
      key: "violation-photos/worker-7/1710000000000-a.jpg",
      url: `${EVIDENCE_REFERENCE_PREFIX}violation-photos/worker-7/1710000000000-a.jpg`,
    });
  });

  it("rejects non-evidence prefixes and path traversal before any S3 request", async () => {
    expect(() => normalizeEvidenceKey("payment-evidence/other.jpg")).toThrow("Invalid evidence storage key");
    expect(() => normalizeEvidenceKey("violation-photos/worker-7/../other.jpg")).toThrow("Invalid evidence storage key");
    await expect(storagePut("private/other.jpg", Buffer.from("x"))).rejects.toThrow("Invalid evidence storage key");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("fails closed without exposing credential or provider details when the role cannot write", async () => {
    mocks.send.mockRejectedValue(new Error("CredentialsProviderError: instance role unavailable"));

    await expect(storagePut("payment-proofs/customer-1/receipt.jpg", Buffer.from("x")))
      .rejects.toThrow("Evidence storage upload is unavailable");
  });

  it("mints a short-lived GetObject URL only for an allow-listed durable key", async () => {
    mocks.getSignedUrl.mockResolvedValue("https://signed.example.test/private-object");

    await expect(storageGet("payment-proofs/customer-1/receipt.jpg")).resolves.toEqual({
      key: "payment-proofs/customer-1/receipt.jpg",
      url: "https://signed.example.test/private-object",
    });
    expect(mocks.getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: { Bucket: "fieldscheduler", Key: "payment-proofs/customer-1/receipt.jpg" } }),
      { expiresIn: 600 },
    );
    await expect(storageGet("unapproved-prefix/private.jpg")).rejects.toThrow("Invalid evidence storage key");
  });

  it("accepts only an adapter-issued opaque reference as a durable key", () => {
    const key = "violation-photos/worker-7/evidence.jpg";
    expect(toEvidenceReference(key)).toBe(`${EVIDENCE_REFERENCE_PREFIX}${key}`);
    expect(evidenceKeyFromReference(toEvidenceReference(key))).toBe(key);
    expect(evidenceKeyFromReference("https://example.test/public.jpg")).toBeNull();
    expect(evidenceKeyFromReference(`${EVIDENCE_REFERENCE_PREFIX}unapproved/other.jpg`)).toBeNull();
  });

  it("keeps the current APK upload-to-createViolation contract while preventing cross-purpose attachment", () => {
    const violationReference = toEvidenceReference("violation-photos/worker-7/evidence.jpg");
    expect(violationEvidenceKeysFromReferences([violationReference]))
      .toEqual(["violation-photos/worker-7/evidence.jpg"]);
    expect(() => violationEvidenceKeysFromReferences([
      toEvidenceReference("payment-proofs/customer-1/receipt.jpg"),
    ])).toThrow("Evidence reference is invalid");
  });
});
