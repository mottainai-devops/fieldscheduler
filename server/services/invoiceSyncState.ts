import { eq } from "drizzle-orm";
import { zohoInvoiceSyncState } from "../../drizzle/schema";

export const INVOICE_INCREMENTAL_STATE_KEY = "invoice_incremental_v1";

type DbClient = any;

export async function getInvoiceSyncState(db: DbClient) {
  const rows = await db
    .select()
    .from(zohoInvoiceSyncState)
    .where(eq(zohoInvoiceSyncState.stateKey, INVOICE_INCREMENTAL_STATE_KEY))
    .limit(1);
  return rows[0] ?? null;
}

export async function markInvoiceSyncAttempt(db: DbClient): Promise<void> {
  await db
    .insert(zohoInvoiceSyncState)
    .values({
      stateKey: INVOICE_INCREMENTAL_STATE_KEY,
      lastAttemptAt: new Date(),
      lastStatus: "in_progress",
      lastError: null,
    })
    .onDuplicateKeyUpdate({
      set: { lastAttemptAt: new Date(), lastStatus: "in_progress", lastError: null },
    });
}

export async function markInvoiceSyncTerminal(
  db: DbClient,
  input: { status: "complete" | "rate_limited" | "failed"; checkpoint?: Date; error?: string | null },
): Promise<void> {
  const set: Record<string, unknown> = {
    lastAttemptAt: new Date(),
    lastStatus: input.status,
    lastError: input.error ?? null,
  };
  if (input.status === "complete" && input.checkpoint) {
    set.lastSuccessfulModifiedAt = input.checkpoint;
  }

  await db
    .insert(zohoInvoiceSyncState)
    .values({
      stateKey: INVOICE_INCREMENTAL_STATE_KEY,
      lastAttemptAt: new Date(),
      lastStatus: input.status,
      lastError: input.error ?? null,
      lastSuccessfulModifiedAt: input.status === "complete" ? input.checkpoint ?? null : null,
    })
    .onDuplicateKeyUpdate({ set });
}
