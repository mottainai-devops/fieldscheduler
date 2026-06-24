/**
 * notificationDb.ts — Worker notification database helpers.
 * Created as a stub to satisfy the import in server/routers/fieldWorker.ts.
 */
import { getDb } from "./db";
import { workerNotifications } from "../drizzle/schema";

export async function createWorkerNotification(data: {
  workerId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workerNotifications).values({
    workerId: data.workerId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId ?? null,
  });
}
