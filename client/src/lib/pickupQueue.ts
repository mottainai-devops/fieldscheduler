/**
 * Pickup submission queue — IndexedDB-backed offline store for supervisor pickups.
 *
 * Separate from the existing offlineStorage/offlineQueue which handle route/customer
 * status updates. This store holds full multipart pickup payloads including photo
 * blobs so they can be retried after network recovery.
 *
 * DB version bump: FieldWorkerDB v2 adds the `pickupQueue` object store.
 */

const DB_NAME = "FieldWorkerDB";
const DB_VERSION = 2; // bumped from v1 to add pickupQueue store
const PICKUP_QUEUE_STORE = "pickupQueue";

export type PickupQueueStatus = "pending" | "failed" | "syncing";

export interface QueuedPickup {
  id?: number;
  // Route context
  routeId: number;
  customerId: number;
  customerName: string;
  // Payload fields (mirrors PickupModal formData)
  webhookUrl: string;
  supervisorId: string;
  binType: string;
  binQuantity: string;
  incidentReport: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  unitCode: string;
  arcgisBuildingId: string;
  mafCode: string;
  latitude: string;
  longitude: string;
  lotCode: string;
  companyId: string;
  companyName: string;
  webhookType: "payt" | "monthly";
  pickUpDate: string;
  submittedFrom: "FieldWorker";
  source: "field_worker";
  surveyToken: string;
  surveyAppUserId: string;
  // Photos stored as Blobs for offline persistence
  beforePhotoBlob: Blob;
  beforePhotoName: string;
  afterPhotoBlob: Blob;
  afterPhotoName: string;
  // Queue metadata
  status: PickupQueueStatus;
  retries: number;
  lastError: string;
  queuedAt: number;
  lastAttemptAt: number | null;
}

// ─── DB initialisation ────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Add pickupQueue store if it doesn't exist (v1 -> v2 upgrade)
      if (!db.objectStoreNames.contains(PICKUP_QUEUE_STORE)) {
        const store = db.createObjectStore(PICKUP_QUEUE_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("queuedAt", "queuedAt", { unique: false });
        store.createIndex("routeId", "routeId", { unique: false });
      }
    };
  });
  return dbPromise;
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export async function enqueuePickup(
  pickup: Omit<QueuedPickup, "id" | "status" | "retries" | "lastError" | "queuedAt" | "lastAttemptAt">
): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PICKUP_QUEUE_STORE, "readwrite");
    const req = tx.objectStore(PICKUP_QUEUE_STORE).add({
      ...pickup,
      status: "pending" as PickupQueueStatus,
      retries: 0,
      lastError: "",
      queuedAt: Date.now(),
      lastAttemptAt: null,
    });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllQueuedPickups(): Promise<QueuedPickup[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PICKUP_QUEUE_STORE, "readonly");
    const req = tx.objectStore(PICKUP_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedPickup[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingPickups(): Promise<QueuedPickup[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PICKUP_QUEUE_STORE, "readonly");
    const index = tx.objectStore(PICKUP_QUEUE_STORE).index("status");
    const req = index.getAll("pending");
    req.onsuccess = () => resolve((req.result as QueuedPickup[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getPickupQueueCount(): Promise<number> {
  const all = await getAllQueuedPickups();
  return all.filter((p) => p.status === "pending" || p.status === "failed").length;
}

export async function updatePickupStatus(
  id: number,
  status: PickupQueueStatus,
  lastError = ""
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PICKUP_QUEUE_STORE, "readwrite");
    const store = tx.objectStore(PICKUP_QUEUE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as QueuedPickup;
      if (!record) { resolve(); return; }
      record.status = status;
      record.lastError = lastError;
      record.lastAttemptAt = Date.now();
      if (status === "failed") record.retries += 1;
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeQueuedPickup(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PICKUP_QUEUE_STORE, "readwrite");
    const req = tx.objectStore(PICKUP_QUEUE_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Resize helper ────────────────────────────────────────────────────────────

const MAX_PHOTO_DIMENSION = 1280;
const PHOTO_QUALITY = 0.82;

/**
 * Resize a photo File/Blob to MAX_PHOTO_DIMENSION on the longest side.
 * Returns a new Blob (JPEG). Falls back to original if Canvas API unavailable.
 */
export async function resizePhoto(file: File | Blob, fileName: string): Promise<{ blob: Blob; name: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      let newW = width;
      let newH = height;
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        if (width > height) {
          newW = MAX_PHOTO_DIMENSION;
          newH = Math.round((height / width) * MAX_PHOTO_DIMENSION);
        } else {
          newH = MAX_PHOTO_DIMENSION;
          newW = Math.round((width / height) * MAX_PHOTO_DIMENSION);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ blob: file, name: fileName }); return; }
      ctx.drawImage(img, 0, 0, newW, newH);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve({ blob: file, name: fileName }); return; }
          const baseName = fileName.replace(/\.[^.]+$/, "");
          resolve({ blob, name: `${baseName}.jpg` });
        },
        "image/jpeg",
        PHOTO_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, name: fileName });
    };
    img.src = url;
  });
}

// ─── Sync engine ──────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
let syncListeners: Array<() => void> = [];

export function onPickupSyncComplete(cb: () => void) {
  syncListeners.push(cb);
}

async function submitQueuedPickup(pickup: QueuedPickup): Promise<void> {
  const formData = new FormData();
  formData.append("formId", pickup.webhookUrl);
  formData.append("supervisorId", pickup.supervisorId);
  formData.append("binType", pickup.binType);
  formData.append("binQuantity", pickup.binQuantity);
  formData.append("incidentReport", pickup.incidentReport);
  formData.append("customerName", pickup.customerName);
  formData.append("customerPhone", pickup.customerPhone);
  formData.append("customerEmail", pickup.customerEmail);
  formData.append("customerAddress", pickup.customerAddress);
  formData.append("customerId", String(pickup.customerId));
  formData.append("unitCode", pickup.unitCode);
  formData.append("arcgisBuildingId", pickup.arcgisBuildingId);
  formData.append("buildingId", pickup.arcgisBuildingId);
  formData.append("mafCode", pickup.mafCode);
  formData.append("userIdentificationNumber", pickup.mafCode);
  formData.append("latitude", pickup.latitude);
  formData.append("longitude", pickup.longitude);
  formData.append("lotCode", pickup.lotCode);
  if (pickup.companyId) formData.append("companyId", pickup.companyId);
  if (pickup.companyName) formData.append("companyName", pickup.companyName);
  formData.append("isMonthly", String(pickup.webhookType === "monthly"));
  formData.append("customerType", pickup.webhookType === "monthly" ? "Monthly Billing - Residential" : "PAYT - Residential");
  formData.append("pickUpDate", pickup.pickUpDate);
  formData.append("pickupDate", pickup.pickUpDate);
  formData.append("submittedFrom", "FieldWorker");
  formData.append("source", "field_worker");
  if (pickup.surveyToken) formData.append("surveyToken", pickup.surveyToken);
  if (pickup.surveyAppUserId) formData.append("surveyAppUserId", pickup.surveyAppUserId);
  formData.append("beforePhoto", pickup.beforePhotoBlob, pickup.beforePhotoName);
  formData.append("afterPhoto", pickup.afterPhotoBlob, pickup.afterPhotoName);

  const flushHeaders: HeadersInit = {};
  if (pickup.surveyToken) flushHeaders["Authorization"] = `Bearer ${pickup.surveyToken}`;

  const res = await fetch("https://upwork.kowope.xyz/forms/submit", {
    method: "POST",
    headers: flushHeaders,
    body: formData,
  });
  if (res.status === 401) {
    // B6: Token expired — throw a typed error so syncPickupQueue can call the
    // on401Callback without clearing the queue.
    throw Object.assign(new Error("TOKEN_EXPIRED"), { status: 401 });
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(errText || `HTTP ${res.status}`);
  }
}

export async function syncPickupQueue(
  onPickedCallback?: (routeId: number, customerId: number) => Promise<void>,
  on401Callback?: () => void
): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const pending = await getPendingPickups();
  let synced = 0;
  let failed = 0;

  for (const pickup of pending) {
    if (pickup.retries >= MAX_RETRIES) {
      await updatePickupStatus(pickup.id!, "failed", `Max retries (${MAX_RETRIES}) exceeded`);
      failed++;
      continue;
    }
    await updatePickupStatus(pickup.id!, "syncing");
    try {
      await submitQueuedPickup(pickup);
      // Mark as picked in DB via callback
      if (onPickedCallback) {
        await onPickedCallback(pickup.routeId, pickup.customerId).catch(() => {});
      }
      await removeQueuedPickup(pickup.id!);
      synced++;
    } catch (err: any) {
      if ((err as any).status === 401) {
        // B6: Token expired — reset this item back to 'pending' (not 'failed') so it
        // can be retried after re-login, then stop processing the rest of the queue.
        await updatePickupStatus(pickup.id!, "pending", "Token expired — please re-login");
        if (on401Callback) on401Callback();
        break; // Stop processing; all remaining items stay pending
      }
      await updatePickupStatus(pickup.id!, "failed", err?.message || "Submission failed");
      failed++;
    }
  }

  syncListeners.forEach((cb) => cb());
  return { synced, failed };
}

// Auto-sync on network recovery
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncPickupQueue().catch(() => {});
  });
}
