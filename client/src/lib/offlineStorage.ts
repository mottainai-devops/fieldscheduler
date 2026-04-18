/**
 * IndexedDB storage layer for offline support
 * Stores routes, customers, and pending updates
 */

const DB_NAME = "FieldWorkerDB";
const DB_VERSION = 1;

// Store names
const STORES = {
  ROUTES: "routes",
  CUSTOMERS: "customers",
  PENDING_UPDATES: "pendingUpdates",
  GPS_LOGS: "gpsLogs",
};

interface Route {
  id: number;
  workerId: number;
  scheduledDate: string;
  status: string;
  totalDistance: number | null;
  estimatedDuration: number | null;
  actualDistance: number | null;
  actualDuration: number | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
  customers: Customer[];
}

interface Customer {
  id: number;
  routeId: number;
  customerId: number;
  sequenceNumber: number;
  status: string;
  arrivalTime: string | null;
  departureTime: string | null;
  notes: string | null;
  latitude: string | null;
  longitude: string | null;
  customerName: string | null;
  customerAddress: string | null;
}

interface PendingUpdate {
  id?: number;
  type: "customer_status" | "gps_log" | "route_status" | "customer_note";
  data: any;
  timestamp: number;
  retries: number;
}

interface GPSLog {
  id?: number;
  workerId: number;
  latitude: number;
  longitude: number;
  timestamp: number;
  synced: boolean;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create routes store
        if (!db.objectStoreNames.contains(STORES.ROUTES)) {
          const routeStore = db.createObjectStore(STORES.ROUTES, { keyPath: "id" });
          routeStore.createIndex("workerId", "workerId", { unique: false });
          routeStore.createIndex("scheduledDate", "scheduledDate", { unique: false });
        }

        // Create customers store
        if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
          const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: "id" });
          customerStore.createIndex("routeId", "routeId", { unique: false });
          customerStore.createIndex("customerId", "customerId", { unique: false });
        }

        // Create pending updates store
        if (!db.objectStoreNames.contains(STORES.PENDING_UPDATES)) {
          const updateStore = db.createObjectStore(STORES.PENDING_UPDATES, {
            keyPath: "id",
            autoIncrement: true,
          });
          updateStore.createIndex("type", "type", { unique: false });
          updateStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Create GPS logs store
        if (!db.objectStoreNames.contains(STORES.GPS_LOGS)) {
          const gpsStore = db.createObjectStore(STORES.GPS_LOGS, {
            keyPath: "id",
            autoIncrement: true,
          });
          gpsStore.createIndex("workerId", "workerId", { unique: false });
          gpsStore.createIndex("synced", "synced", { unique: false });
          gpsStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  // Routes
  async saveRoute(route: Route): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.ROUTES, "readwrite");
    await tx.objectStore(STORES.ROUTES).put(route);
  }

  async getRoute(routeId: number): Promise<Route | null> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.ROUTES, "readonly");
    const route = await (tx.objectStore(STORES.ROUTES).get(routeId) as any);
    return route || null;
  }

  async getRoutesByWorker(workerId: number): Promise<Route[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.ROUTES, "readonly");
    const index = tx.objectStore(STORES.ROUTES).index("workerId");
    const routes = await (index.getAll(workerId) as any);
    return routes || [];
  }

  async getAllRoutes(): Promise<Route[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.ROUTES, "readonly");
    const routes = await (tx.objectStore(STORES.ROUTES).getAll() as any);
    return routes || [];
  }

  // Customers
  async saveCustomer(customer: Customer): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.CUSTOMERS, "readwrite");
    await tx.objectStore(STORES.CUSTOMERS).put(customer);
  }

  async getCustomersByRoute(routeId: number): Promise<Customer[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.CUSTOMERS, "readonly");
    const index = tx.objectStore(STORES.CUSTOMERS).index("routeId");
    const customers = await (index.getAll(routeId) as any);
    return customers || [];
  }

  async updateCustomerStatus(
    customerId: number,
    status: string,
    arrivalTime?: string,
    departureTime?: string
  ): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.CUSTOMERS, "readwrite");
    const store = tx.objectStore(STORES.CUSTOMERS);
    const customer = await (store.get(customerId) as any);
    
    if (customer) {
      customer.status = status;
      if (arrivalTime) customer.arrivalTime = arrivalTime;
      if (departureTime) customer.departureTime = departureTime;
      await store.put(customer);
    }
  }

  // Pending Updates
  async addPendingUpdate(update: Omit<PendingUpdate, "id">): Promise<number> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.PENDING_UPDATES, "readwrite");
    const key = await tx.objectStore(STORES.PENDING_UPDATES).add(update);
    return key as number;
  }

  async getPendingUpdates(): Promise<PendingUpdate[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.PENDING_UPDATES, "readonly");
    const updates = await tx.objectStore(STORES.PENDING_UPDATES).getAll();
    return updates || [];
  }

  async removePendingUpdate(id: number): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.PENDING_UPDATES, "readwrite");
    await tx.objectStore(STORES.PENDING_UPDATES).delete(id);
  }

  async updatePendingUpdateRetries(id: number, retries: number): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.PENDING_UPDATES, "readwrite");
    const store = tx.objectStore(STORES.PENDING_UPDATES);
    const update = await store.get(id);
    
    if (update) {
      update.retries = retries;
      await store.put(update);
    }
  }

  // GPS Logs
  async addGPSLog(log: Omit<GPSLog, "id">): Promise<number> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.GPS_LOGS, "readwrite");
    const key = await tx.objectStore(STORES.GPS_LOGS).add(log);
    return key as number;
  }

  async getUnsyncedGPSLogs(): Promise<GPSLog[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.GPS_LOGS, "readonly");
    const index = tx.objectStore(STORES.GPS_LOGS).index("synced");
    const logs = await index.getAll(false);
    return logs || [];
  }

  async markGPSLogSynced(id: number): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(STORES.GPS_LOGS, "readwrite");
    const store = tx.objectStore(STORES.GPS_LOGS);
    const log = await store.get(id);
    
    if (log) {
      log.synced = true;
      await store.put(log);
    }
  }

  // Clear all data (for logout)
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(
      [STORES.ROUTES, STORES.CUSTOMERS, STORES.PENDING_UPDATES, STORES.GPS_LOGS],
      "readwrite"
    );
    
    await Promise.all([
      tx.objectStore(STORES.ROUTES).clear(),
      tx.objectStore(STORES.CUSTOMERS).clear(),
      tx.objectStore(STORES.PENDING_UPDATES).clear(),
      tx.objectStore(STORES.GPS_LOGS).clear(),
    ]);
  }
}

export const offlineStorage = new OfflineStorage();
export type { Route, Customer, PendingUpdate, GPSLog };

