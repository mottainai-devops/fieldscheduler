import express, { Router, Request, Response } from "express";
import { syncZohoContacts } from "../services/zoho";
import { getDb } from "../db";
import { zohoSyncHistory } from "../../drizzle/schema";

const router = Router();

/**
 * Zoho Webhook Handler
 * Receives webhook events from Zoho Books when customers are updated
 * Triggers real-time sync of affected customers
 */
router.post("/zoho/webhook", async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    console.log("[Zoho Webhook] Received webhook event:", {
      eventType: eventData.event_type,
      resourceType: eventData.resource_type,
      timestamp: new Date().toISOString(),
    });

    // Verify webhook signature (optional but recommended)
    // You should implement signature verification based on Zoho's documentation
    // const isValid = verifyWebhookSignature(req);
    // if (!isValid) {
    //   return res.status(401).json({ error: "Invalid signature" });
    // }

    // Handle different webhook events
    const eventType = eventData.event_type;
    const resourceType = eventData.resource_type;

    if (resourceType === "contact" && eventType === "update.complete") {
      // Customer was updated in Zoho
      console.log(
        "[Zoho Webhook] Contact update detected, triggering sync..."
      );
      triggerWebhookSync("contact_updated", eventData);
    } else if (resourceType === "contact" && eventType === "create.complete") {
      // New customer was created in Zoho
      console.log(
        "[Zoho Webhook] New contact created, triggering sync..."
      );
      triggerWebhookSync("contact_created", eventData);
    } else if (resourceType === "invoice" && eventType === "update.complete") {
      // Invoice was updated (might affect payment status)
      console.log(
        "[Zoho Webhook] Invoice update detected, triggering sync..."
      );
      triggerWebhookSync("invoice_updated", eventData);
    }

    // Respond immediately to acknowledge receipt
    res.json({ success: true, message: "Webhook received" });
  } catch (error: any) {
    console.error("[Zoho Webhook] Error handling webhook:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger sync based on webhook event
 */
async function triggerWebhookSync(
  eventType: string,
  eventData: any
) {
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Webhook] Database not available");
    return;
  }

  const startTime = Date.now();

  try {
    console.log(`[Zoho Webhook] Executing sync for event: ${eventType}`);

    // Execute the sync
    const syncResult = await syncZohoContacts();

    const durationMs = Date.now() - startTime;

    // Log sync history
    await db.insert(zohoSyncHistory).values({
      syncType: "webhook",
      status: syncResult.success ? "success" : "failed",
      totalContacts: syncResult.synced + syncResult.errors,
      syncedContacts: syncResult.synced,
      failedContacts: syncResult.errors,
      fieldManagerCount: syncResult.fieldManagerCount || 0,
      customermafCount: syncResult.customermafCount || 0,
      durationMs,
      errorMessage: syncResult.success
        ? null
        : "Webhook sync completed with errors",
    });

    console.log(
      `[Zoho Webhook] Sync completed: ${syncResult.synced} synced, ${syncResult.errors} errors in ${durationMs}ms`
    );
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    console.error(`[Zoho Webhook] Sync failed:`, error.message);

    // Log sync history with error
    await db.insert(zohoSyncHistory).values({
      syncType: "webhook",
      status: "failed",
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }
}

/**
 * Verify webhook signature from Zoho
 * Implement this based on Zoho's webhook security documentation
 */
function verifyWebhookSignature(req: Request): boolean {
  // TODO: Implement signature verification
  // Zoho sends a signature in the X-Zoho-Webhook-Signature header
  // Verify it matches the HMAC-SHA256 hash of the request body with your webhook token

  const signature = req.headers["x-zoho-webhook-signature"];
  // const body = JSON.stringify(req.body);
  // const webhookToken = process.env.ZOHO_WEBHOOK_TOKEN;

  // if (!signature || !webhookToken) {
  //   return false;
  // }

  // const expectedSignature = crypto
  //   .createHmac("sha256", webhookToken)
  //   .update(body)
  //   .digest("hex");

  // return signature === expectedSignature;

  return true; // Temporarily allow all for testing
}

export default router;

