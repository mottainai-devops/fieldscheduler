import "../_core/runtimeConfig";
import * as zoho from "../services/zoho";
import { formatZohoLastModifiedTime } from "../services/invoiceIncremental";

async function main() {
  if (process.env.ALLOW_INVOICE_INCREMENTAL_PREFLIGHT !== "true") {
    throw new Error("Component C preflight is disabled. Set ALLOW_INVOICE_INCREMENTAL_PREFLIGHT=true for the approved one-time syntax check.");
  }
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const invoices = await zoho.getInvoicesModifiedSince(since);
  console.log(JSON.stringify({
    component: "C",
    action: "incremental_filter_preflight",
    status: "complete",
    lastModifiedTime: formatZohoLastModifiedTime(since),
    returnedInvoiceCount: invoices.length,
  }));
}

main().catch((error) => {
  console.error("Component C incremental filter preflight failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
