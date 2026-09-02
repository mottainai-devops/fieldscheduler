import { describe, expect, it } from "vitest";
import { getInsertedId } from "./utils/mobileMutationEnvelope";

describe("Component D mobile mutation envelopes", () => {
  it("extracts a positive insert ID from the mysql2/Drizzle tuple shape", () => {
    expect(getInsertedId([{ insertId: 417 }, []], "violation")).toBe(417);
  });

  it("extracts a positive insert ID from a direct result-header shape", () => {
    expect(getInsertedId({ insertId: 418 }, "linkage request")).toBe(418);
  });

  it("fails closed instead of serializing an untyped driver result", () => {
    expect(() => getInsertedId([{ affectedRows: 1 }, []], "violation"))
      .toThrow("Unable to determine inserted violation identifier");
  });

  it("documents the stable response contract used by Flutter", () => {
    const response = { success: true, violation: { id: getInsertedId([{ insertId: 419 }, []], "violation") } };
    expect(response).toEqual({ success: true, violation: { id: 419 } });
  });
});
