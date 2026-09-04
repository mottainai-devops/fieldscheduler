import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb, mockHashPin, mockRevokeSessions } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockHashPin: vi.fn(),
  mockRevokeSessions: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mockGetDb }));
vi.mock("./utils/pinHashing", () => ({ hashPin: mockHashPin }));
vi.mock("./phonePinSessions", () => ({ revokePhonePinSessionsForWorker: mockRevokeSessions }));

import { updateWorker } from "./fieldWorkerDb";

function updateDb() {
  return {
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({ affectedRows: 1 })) })),
    })),
  };
}

describe("phone/PIN session revocation on worker changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHashPin.mockResolvedValue("bcrypt-hash");
    mockRevokeSessions.mockResolvedValue(undefined);
  });

  it("revokes every issued session before a PIN rotation", async () => {
    mockGetDb.mockResolvedValueOnce(updateDb());

    await updateWorker(7, { pin: "new-pin" });

    expect(mockRevokeSessions).toHaveBeenCalledWith(7);
    expect(mockHashPin).toHaveBeenCalledWith("new-pin");
  });

  it("revokes every issued session before a worker becomes inactive or on leave", async () => {
    mockGetDb.mockResolvedValueOnce(updateDb());
    await updateWorker(8, { status: "inactive" });

    mockGetDb.mockResolvedValueOnce(updateDb());
    await updateWorker(9, { status: "on_leave" });

    expect(mockRevokeSessions).toHaveBeenNthCalledWith(1, 8);
    expect(mockRevokeSessions).toHaveBeenNthCalledWith(2, 9);
  });

  it("does not revoke a session for a non-security-only worker update", async () => {
    mockGetDb.mockResolvedValueOnce(updateDb());

    await updateWorker(10, { name: "Updated Worker" });

    expect(mockRevokeSessions).not.toHaveBeenCalled();
  });
});
