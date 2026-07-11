import { syncZohoContacts } from "./zoho";
import { syncAllInvoices, syncAllPayments } from "./zohoFinancialSync";
import { getDb } from "../db";
import { zohoSyncHistory, zohoSyncJobs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface ScheduledJob {
  id: number;
  jobName: string;
  enabled: boolean;
  scheduleType: "hourly" | "daily" | "weekly" | "monthly";
  scheduleTime?: string;
  scheduleDay?: string;
  nextRunAt: Date;
}

let activeJobs: Map<number, NodeJS.Timeout> = new Map();

/**
 * Calculate next run time based on schedule type
 */
function calculateNextRunTime(
  scheduleType: string,
  scheduleTime?: string,
  scheduleDay?: string
): Date {
  const now = new Date();
  const next = new Date(now);

  switch (scheduleType) {
    case "hourly":
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
      next.setSeconds(0);
      break;

    case "daily":
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        next.setDate(next.getDate() + 1);
        next.setHours(hours, minutes, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
      }
      break;

    case "weekly":
      const dayMap: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const targetDay = dayMap[scheduleDay?.toLowerCase() || "monday"] || 1;
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;

      next.setDate(next.getDate() + daysUntilTarget);
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        next.setHours(hours, minutes, 0, 0);
      } else {
        next.setHours(0, 0, 0, 0);
      }
      break;

    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        next.setHours(hours, minutes, 0, 0);
      } else {
        next.setHours(0, 0, 0, 0);
      }
      break;

    default:
      next.setHours(next.getHours() + 1);
  }

  return next;
}

/**
 * Execute a sync job
 */
async function executeSyncJob(jobId: number, jobName: string) {
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Scheduler] Database not available");
    return;
  }

  const startTime = Date.now();
  let syncResult;
  let syncRunId: number | null = null;

  try {
    // Update job status to in_progress
    await db
      .update(zohoSyncJobs)
      .set({
        lastStatus: "pending",
        lastRunAt: new Date(),
      })
      .where(eq(zohoSyncJobs.id, jobId));

    console.log(`[Zoho Scheduler] Starting scheduled sync job: ${jobName}`);

    // T51: Pre-create zohoSyncHistory row (in_progress) so syncRunId is available
    // for per-record failure logging inside syncZohoContacts().
    // Rule #96: schema migrations and observability paths must be verified in the
    // same tranche that touches them.
    try {
      const [inserted] = await db.insert(zohoSyncHistory).values({
        syncType: "scheduled",
        status: "in_progress",
      });
      syncRunId = (inserted as any)?.insertId ?? null;
      console.log(`[Zoho Scheduler] Created sync history row id=${syncRunId}`);
    } catch (histErr) {
      console.warn('[Zoho Scheduler] Could not pre-create sync history row:', histErr);
    }

    // Execute the sync
    syncResult = await syncZohoContacts(syncRunId);
    // T28 Path A: wire payments sync after contacts sync.
    // Payments reference invoices semantically; contacts must be current first.
    console.log('[Zoho Scheduler] Starting payments sync...');
    let invoiceSyncedCount = 0;
    let invoiceFailedCount = 0;
    try {
      const paymentResult = await syncAllPayments();
      console.log(`[Zoho Scheduler] Payments sync complete: ${paymentResult.success} synced, ${paymentResult.failed} failed`);
    } catch (paymentError) {
      console.error('[Zoho Scheduler] Payments sync failed (non-fatal):', paymentError);
    }

    // T48 Fix 4: Wire invoice sync into scheduler (runs after payments)
    // T49: ZOHO_INVOICE_SYNC_ENABLED=false disables invoice sync while attribution format bug is being fixed
    const invoiceSyncEnabled = process.env.ZOHO_INVOICE_SYNC_ENABLED !== 'false';
    if (invoiceSyncEnabled) {
      console.log('[Zoho Scheduler] Starting invoice sync...');
      try {
        const invoiceResult = await syncAllInvoices();
        invoiceSyncedCount = invoiceResult.success;
        invoiceFailedCount = invoiceResult.failed;
        console.log(`[Zoho Scheduler] Invoice sync complete: ${invoiceResult.success} upserted, ${invoiceResult.failed} failed`);
      } catch (invoiceError) {
        console.error('[Zoho Scheduler] Invoice sync failed (non-fatal):', invoiceError);
      }
    } else {
      console.log('[Zoho Scheduler] Invoice sync DISABLED via ZOHO_INVOICE_SYNC_ENABLED=false (T49 attribution fix pending)');
    }

    const durationMs = Date.now() - startTime;

    // T51: Update the pre-created history row (or insert if pre-create failed)
    if (syncRunId != null) {
      await db.update(zohoSyncHistory)
        .set({
          status: syncResult.success ? "success" : "failed",
          completedAt: new Date(),
          totalContacts: syncResult.synced + syncResult.errors,
          syncedContacts: syncResult.synced,
          failedContacts: syncResult.errors,
          fieldManagerCount: syncResult.fieldManagerCount || 0,
          customermafCount: syncResult.customermafCount || 0,
          invoiceSyncedCount,
          invoiceFailedCount,
          durationMs,
          errorMessage: syncResult.success ? null : "Sync completed with errors",
        })
        .where(eq(zohoSyncHistory.id, syncRunId));
    } else {
      // Fallback: pre-create failed, insert a new row
      await db.insert(zohoSyncHistory).values({
        syncType: "scheduled",
        status: syncResult.success ? "success" : "failed",
        completedAt: new Date(),
        totalContacts: syncResult.synced + syncResult.errors,
        syncedContacts: syncResult.synced,
        failedContacts: syncResult.errors,
        fieldManagerCount: syncResult.fieldManagerCount || 0,
        customermafCount: syncResult.customermafCount || 0,
        invoiceSyncedCount,
        invoiceFailedCount,
        durationMs,
        errorMessage: syncResult.success ? null : "Sync completed with errors",
      });
    }

    // Update job with success status
    await db
      .update(zohoSyncJobs)
      .set({
        lastStatus: "success",
        lastErrorMessage: null,
        nextRunAt: calculateNextRunTime(
          "daily",
          "00:00",
          undefined
        ),
      })
      .where(eq(zohoSyncJobs.id, jobId));

    console.log(
      `[Zoho Scheduler] Sync job completed: ${syncResult.synced} synced, ${syncResult.errors} errors in ${durationMs}ms`
    );
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    console.error(`[Zoho Scheduler] Sync job failed:`, error.message);

    // T51: Update pre-created history row on error (or insert if pre-create failed)
    if (syncRunId != null) {
      await db.update(zohoSyncHistory)
        .set({
          status: "failed",
          completedAt: new Date(),
          durationMs,
          errorMessage: error.message,
          errorStack: error.stack,
        })
        .where(eq(zohoSyncHistory.id, syncRunId));
    } else {
      await db.insert(zohoSyncHistory).values({
        syncType: "scheduled",
        status: "failed",
        durationMs,
        errorMessage: error.message,
        errorStack: error.stack,
      });
    }

    // Update job with error status
    await db
      .update(zohoSyncJobs)
      .set({
        lastStatus: "failed",
        lastErrorMessage: error.message,
        nextRunAt: calculateNextRunTime("daily", "00:00", undefined),
      })
      .where(eq(zohoSyncJobs.id, jobId));
  }
}

/**
 * Schedule a job to run at the specified time
 */
function scheduleJobExecution(job: ScheduledJob) {
  if (!job.enabled) {
    console.log(`[Zoho Scheduler] Job ${job.jobName} is disabled`);
    return;
  }

  const now = new Date();
  const nextRun = job.nextRunAt;
  const delayMs = nextRun.getTime() - now.getTime();

  if (delayMs < 0) {
    // T57: Permanent stall fix (Option B) — advance stale nextRunAt instead of silently dropping.
    // Handles PM2 restarts, extended downtime, and missed windows.
    console.warn(
      `[Zoho Scheduler] Job ${job.jobName} nextRunAt is in the past (${nextRun.toISOString()}). Advancing to next valid window.`
    );
    const advanced = calculateNextRunTime(
      job.scheduleType,
      job.scheduleTime,
      job.scheduleDay
    );
    // Persist the advanced nextRunAt so it survives the next restart
    getDb().then(db => {
      if (db) {
        db.update(zohoSyncJobs)
          .set({ nextRunAt: advanced })
          .where(eq(zohoSyncJobs.id, job.id))
          .catch((err: any) => console.error('[Zoho Scheduler] Failed to persist advanced nextRunAt:', err));
      }
    }).catch(() => {});
    // Reschedule with the corrected time
    scheduleJobExecution({ ...job, nextRunAt: advanced });
    return;
  }

  console.log(
    `[Zoho Scheduler] Scheduling job ${job.jobName} to run in ${Math.round(delayMs / 1000)}s at ${nextRun.toISOString()}`
  );

  // Clear existing timeout if any
  if (activeJobs.has(job.id)) {
    clearTimeout(activeJobs.get(job.id));
  }

  // Schedule the job
  const timeout = setTimeout(() => {
    executeSyncJob(job.id, job.jobName)
      .then(() => {
        // Reschedule after execution
        loadAndScheduleJobs();
      })
      .catch((error) => {
        console.error(
          `[Zoho Scheduler] Error executing job ${job.jobName}:`,
          error
        );
        // Try to reschedule anyway
        loadAndScheduleJobs();
      });
  }, delayMs);

  activeJobs.set(job.id, timeout);
}

/**
 * Load all jobs from database and schedule them
 */
export async function loadAndScheduleJobs() {
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Scheduler] Database not available");
    return;
  }

  try {
    // Clear existing jobs
    activeJobs.forEach((timeout) => clearTimeout(timeout));
    activeJobs.clear();

    // Load jobs from database
    const jobs = await db.select().from(zohoSyncJobs);

    console.log(`[Zoho Scheduler] Loaded ${jobs.length} jobs from database`);

    for (const job of jobs) {
      if (job.enabled && job.nextRunAt) {
        scheduleJobExecution({
          id: job.id,
          jobName: job.jobName,
          enabled: job.enabled === 1,
          scheduleType: job.scheduleType as "hourly" | "daily" | "weekly" | "monthly",
          scheduleTime: job.scheduleTime || undefined,
          scheduleDay: job.scheduleDay || undefined,
          nextRunAt: job.nextRunAt,
        });
      }
    }
  } catch (error) {
    console.error("[Zoho Scheduler] Error loading jobs:", error);
  }
}

/**
 * Create a new scheduled sync job
 */
export async function createSyncJob(
  jobName: string,
  scheduleType: "hourly" | "daily" | "weekly" | "monthly",
  scheduleTime?: string,
  scheduleDay?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const nextRunAt = calculateNextRunTime(scheduleType, scheduleTime, scheduleDay);

  const result = await db.insert(zohoSyncJobs).values({
    jobName,
    enabled: 1,
    scheduleType,
    scheduleTime,
    scheduleDay,
    nextRunAt,
    lastStatus: "pending",
  });

  console.log(
    `[Zoho Scheduler] Created new job: ${jobName} (${scheduleType})`
  );

  // Reload and reschedule all jobs
  await loadAndScheduleJobs();

  return result;
}

/**
 * Update a scheduled sync job
 */
export async function updateSyncJob(
  jobId: number,
  updates: {
    enabled?: boolean;
    scheduleType?: "hourly" | "daily" | "weekly" | "monthly";
    scheduleTime?: string;
    scheduleDay?: string;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: any = {};
  if (updates.enabled !== undefined) {
    updateData.enabled = updates.enabled ? 1 : 0;
  }
  if (updates.scheduleType) {
    updateData.scheduleType = updates.scheduleType;
  }
  if (updates.scheduleTime !== undefined) {
    updateData.scheduleTime = updates.scheduleTime;
  }
  if (updates.scheduleDay !== undefined) {
    updateData.scheduleDay = updates.scheduleDay;
  }

  // Recalculate next run time if schedule changed
  if (updates.scheduleType || updates.scheduleTime || updates.scheduleDay) {
    const job = await db
      .select()
      .from(zohoSyncJobs)
      .where(eq(zohoSyncJobs.id, jobId))
      .limit(1);

    if (job.length > 0) {
      const nextRunAt = calculateNextRunTime(
        updates.scheduleType || job[0].scheduleType,
        updates.scheduleTime || job[0].scheduleTime || undefined,
        updates.scheduleDay || job[0].scheduleDay || undefined
      );
      updateData.nextRunAt = nextRunAt;
    }
  }

  await db.update(zohoSyncJobs).set(updateData).where(eq(zohoSyncJobs.id, jobId));

  console.log(`[Zoho Scheduler] Updated job ${jobId}`);

  // Reload and reschedule all jobs
  await loadAndScheduleJobs();
}

/**
 * Delete a scheduled sync job
 */
export async function deleteSyncJob(jobId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(zohoSyncJobs).where(eq(zohoSyncJobs.id, jobId));

  console.log(`[Zoho Scheduler] Deleted job ${jobId}`);

  // Clear the job timeout
  if (activeJobs.has(jobId)) {
    clearTimeout(activeJobs.get(jobId));
    activeJobs.delete(jobId);
  }

  // Reload and reschedule remaining jobs
  await loadAndScheduleJobs();
}

/**
 * Get all sync jobs
 */
export async function getAllSyncJobs() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(zohoSyncJobs);
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(zohoSyncHistory)
    .orderBy((t) => t.createdAt)
    .limit(limit);
}

/**
 * Initialize the scheduler on server startup
 */
export async function initializeScheduler() {
  console.log("[Zoho Scheduler] Initializing scheduler...");
  await loadAndScheduleJobs();
  console.log("[Zoho Scheduler] Scheduler initialized");
}

/**
 * Shutdown the scheduler
 */
export function shutdownScheduler() {
  console.log("[Zoho Scheduler] Shutting down scheduler...");
  activeJobs.forEach((timeout) => clearTimeout(timeout));
  activeJobs.clear();
  console.log("[Zoho Scheduler] Scheduler shut down");
}

