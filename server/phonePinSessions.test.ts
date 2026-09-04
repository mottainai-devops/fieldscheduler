import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock("./db", () => ({ getDb: mockGetDb }));
vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "phone-pin-session-test-secret" } }));

import {
  issuePhonePinSession,
  resolvePhonePinSession,
  revokePhonePinSessionsForWorker,
} from "./phonePinSessions";

function selectDb(rowsByCall: Array<Record<string, unknown>[]>, capture?: { inserted?: Record<string, unknown> }) {
  let call = 0;
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(async () => rowsByCall[call++] ?? []) })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: Record<string, unknown>) => {
        if (capture) capture.inserted = value;
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    })),
  };
}

describe("phone/PIN worker sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a signed token, persists only its hash, and resolves an active worker", async () => {
    const captured: { inserted?: Record<string, unknown> } = {};
    const issueDb = selectDb([[{ id: 7, status: "active" }]], captured);
    mockGetDb.mockResolvedValueOnce(issueDb);

    const issued = await issuePhonePinSession(7);

    expect(issued.token).toContain(".");
    expect(captured.inserted?.workerId).toBe(7);
    expect(captured.inserted?.tokenHash).not.toBe(issued.token);
    expect(captured.inserted?.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const resolveDb = selectDb([
      [{
        id: captured.inserted?.id,
        workerId: 7,
        tokenHash: captured.inserted?.tokenHash,
        revokedAt: null,
      }],
      [{ id: 7, status: "active" }],
    ]);
    mockGetDb.mockResolvedValueOnce(resolveDb);

    await expect(resolvePhonePinSession(issued.token)).resolves.toEqual({ workerId: 7 });
  });

  it("rejects an absent or malformed credential before a worker identity is derived", async () => {
    await expect(resolvePhonePinSession("")).rejects.toThrow("invalid or expired");
  });

  it("rejects expired/revoked records and inactive workers", async () => {
    const captured: { inserted?: Record<string, unknown> } = {};
    const issueDb = selectDb([[{ id: 8, status: "active" }]], captured);
    mockGetDb.mockResolvedValueOnce(issueDb);
    const issued = await issuePhonePinSession(8);

    const expiredOrRevokedDb = selectDb([[]]);
    mockGetDb.mockResolvedValueOnce(expiredOrRevokedDb);
    await expect(resolvePhonePinSession(issued.token)).rejects.toThrow("invalid or expired");

    const inactiveDb = selectDb([
      [{
        id: captured.inserted?.id,
        workerId: 8,
        tokenHash: captured.inserted?.tokenHash,
        revokedAt: null,
      }],
      [{ id: 8, status: "inactive" }],
    ]);
    mockGetDb.mockResolvedValueOnce(inactiveDb);
    await expect(resolvePhonePinSession(issued.token)).rejects.toThrow("invalid or expired");
  });

  it("rejects a token with a different signature or payload and records explicit revocation", async () => {
    const captured: { inserted?: Record<string, unknown> } = {};
    const issueDb = selectDb([[{ id: 9, status: "active" }]], captured);
    mockGetDb.mockResolvedValueOnce(issueDb);
    const issued = await issuePhonePinSession(9);

    const spoofed = `${issued.token.slice(0, -1)}${issued.token.endsWith("a") ? "b" : "a"}`;
    await expect(resolvePhonePinSession(spoofed)).rejects.toThrow("invalid or expired");

    const revokeDb = selectDb([]);
    mockGetDb.mockResolvedValueOnce(revokeDb);
    await expect(revokePhonePinSessionsForWorker(9)).resolves.toBeUndefined();
    expect(revokeDb.update).toHaveBeenCalledTimes(1);
  });
});
