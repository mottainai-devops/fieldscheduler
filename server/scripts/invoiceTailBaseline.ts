import "../_core/runtimeConfig";
import { getDb } from "../db";
import { runTailInvoiceBaseline } from "../services/invoiceTailBaseline";
import { zohoSyncHistory } from "../../drizzle/schema";

async function main() {
  if (process.env.ALLOW_INVOICE_TAIL_BASELINE !== "true") {
    throw new Error("Component C tail baseline is disabled. Set ALLOW_INVOICE_TAIL_BASELINE=true for the owner-approved controlled run.");
  }
  const db = await getDb();
  if (!db) throw new Error("Component C tail baseline cannot run: database unavailable");

  const result = await runTailInvoiceBaseline(db);
  await db.insert(zohoSyncHistory).values({
    syncType: "manual",
    status: result.status === "complete" ? "success" : "failed",
    completedAt: result.completedAt,
    invoiceStatus: result.status,
    invoiceSyncedCount: result.invoiceSyncedCount,
    invoiceFailedCount: result.invoiceFailedCount,
    durationMs: result.completedAt.getTime() - result.startedAt.getTime(),
    errorMessage: result.error,
  });

  console.log(JSON.stringify({ component: "C", action: "tail_baseline", ...result }));
  if (result.status !== "complete") process.exitCode = 1;
}

main().catch((error) => {
  console.error("Component C tail baseline failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
