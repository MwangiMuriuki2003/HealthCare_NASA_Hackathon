/**
 * Encrypted IndexedDB Store — offline-first persistence for AstraVitals.
 *
 * Every value is encrypted with AES-256-GCM before it reaches IndexedDB. The
 * non-extractable storage key lives in a separate object store, so a raw disk
 * copy of the database does not expose health data. (An attacker running code
 * in the same origin can still ask the browser to decrypt; that is why the
 * app also needs a passphrase/hardware key in a real deployment.)
 *
 * Stores:
 *   readings  — append-only vital readings
 *   baselines — per-astronaut normal ranges
 *   routine   — streak / last-log state
 *   outbox    — DTN store-and-forward queue
 *   keys      — non-extractable AES storage key
 */

import { DB_NAME, DB_VERSION, DEFAULT_NORMAL_RANGES } from "./db-config";
import { decryptReading, encryptReading, generateStorageKey } from "./crypto";
import type {
  AstronautBaseline,
  Metric,
  OutboxPackage,
  OutboxPayloadType,
  RoutineState,
  VitalReading,
} from "@/types/schema";

// ———————————————————————————————————————————————————————————
// IndexedDB plumbing
// ———————————————————————————————————————————————————————————

interface SealedRecord {
  id: string;
  astronautId?: string;
  metric?: string;
  recordedAt?: number;
  createdAt?: number;
  status?: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("AstraVitals storage requires a browser with IndexedDB.")
    );
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("readings")) {
        const store = db.createObjectStore("readings", { keyPath: "id" });
        store.createIndex("astronautId", "astronautId");
        store.createIndex("metric", "metric");
        store.createIndex("recordedAt", "recordedAt");
      }
      if (!db.objectStoreNames.contains("baselines")) {
        const store = db.createObjectStore("baselines", { keyPath: "id" });
        store.createIndex("astronautId", "astronautId");
        store.createIndex("metric", "metric");
      }
      if (!db.objectStoreNames.contains("routine")) {
        const store = db.createObjectStore("routine", { keyPath: "id" });
        store.createIndex("astronautId", "astronautId");
      }
      if (!db.objectStoreNames.contains("outbox")) {
        const store = db.createObjectStore("outbox", { keyPath: "id" });
        store.createIndex("astronautId", "astronautId");
        store.createIndex("status", "status");
        store.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open AstraVitals database."));
    request.onblocked = () =>
      reject(new Error("AstraVitals database upgrade is blocked by another tab."));
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode, {
      durability: "relaxed",
    });
    const store = transaction.objectStore(storeName);
    let result: T | undefined;
    let operationDone = false;

    operation(store)
      .then((value) => {
        result = value;
        operationDone = true;
      })
      .catch((error) => {
        try {
          transaction.abort();
        } catch {
          // Transaction already finished.
        }
        reject(error);
      });

    transaction.oncomplete = () => {
      if (operationDone && result !== undefined) resolve(result as T);
    };
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

// ———————————————————————————————————————————————————————————
// Encryption helpers
// ———————————————————————————————————————————————————————————

let storageKeyPromise: Promise<CryptoKey> | null = null;

async function getStorageKey(): Promise<CryptoKey> {
  if (storageKeyPromise) return storageKeyPromise;

  storageKeyPromise = (async () => {
    const existing = await withStore<{ id: string; key?: CryptoKey } | undefined>(
      "keys",
      "readonly",
      (store) => requestResult(store.get("storage-key"))
    );

    if (existing?.key) return existing.key;

    const key = await generateStorageKey();
    await withStore<void>("keys", "readwrite", async (store) => {
      await requestResult(store.put({ id: "storage-key", key }));
    });
    return key;
  })().catch((error) => {
    storageKeyPromise = null;
    throw error;
  });

  return storageKeyPromise;
}

async function seal<T>(
  value: T,
  metadata: Omit<SealedRecord, "iv" | "ciphertext">
): Promise<SealedRecord> {
  const key = await getStorageKey();
  const { encryptedData, iv } = await encryptReading(JSON.stringify(value), key);
  return { ...metadata, iv, ciphertext: encryptedData };
}

async function unseal<T>(record: SealedRecord | undefined): Promise<T | null> {
  if (!record) return null;
  try {
    const key = await getStorageKey();
    const json = await decryptReading(
      { encryptedData: record.ciphertext, iv: record.iv },
      key
    );
    return JSON.parse(json) as T;
  } catch (error) {
    console.error("AstraVitals: skipping an unreadable encrypted record.", error);
    return null;
  }
}

// ———————————————————————————————————————————————————————————
// Reading store — append-only vital readings
// ———————————————————————————————————————————————————————————

class ReadingStore {
  async addReading(reading: VitalReading): Promise<VitalReading> {
    const record: VitalReading = {
      ...reading,
      id: reading.id || crypto.randomUUID(),
      recordedAt: reading.recordedAt || Date.now(),
    };

    const sealed = await seal(record, {
      id: record.id,
      astronautId: record.astronautId,
      metric: record.metric,
      recordedAt: record.recordedAt,
    });

    await withStore<void>("readings", "readwrite", async (store) => {
      await requestResult(store.put(sealed));
    });

    // Best-effort baseline refresh; never block logging on it.
    new BaselineStore()
      .calculateBaseline(record.astronautId, record.metric)
      .catch((error) =>
        console.error("AstraVitals: baseline refresh failed.", error)
      );

    return record;
  }

  async getReadingsByAstronaut(
    astronautId: string,
    metric?: Metric,
    limit?: number
  ): Promise<VitalReading[]> {
    const records = await withStore<SealedRecord[]>(
      "readings",
      "readonly",
      async (store) => {
        const index = store.index("astronautId");
        return requestResult(index.getAll(astronautId));
      }
    );

    const readings = (
      await Promise.all(records.map((record) => unseal<VitalReading>(record)))
    )
      .filter((reading): reading is VitalReading => reading !== null)
      .filter((reading) => !metric || reading.metric === metric)
      .sort((a, b) => b.recordedAt - a.recordedAt);

    return typeof limit === "number" ? readings.slice(0, limit) : readings;
  }

  async getLatestByMetric(astronautId: string): Promise<VitalReading[]> {
    const readings = await this.getReadingsByAstronaut(astronautId);
    const latest = new Map<Metric, VitalReading>();
    for (const reading of readings) {
      if (!latest.has(reading.metric)) latest.set(reading.metric, reading);
    }
    return Array.from(latest.values());
  }

  async getReadingCount(astronautId: string): Promise<number> {
    const readings = await this.getReadingsByAstronaut(astronautId);
    return readings.length;
  }

  async resetReadings(astronautId: string): Promise<void> {
    await withStore<void>("readings", "readwrite", async (store) => {
      const index = store.index("astronautId");
      const keys = await requestResult(index.getAllKeys(astronautId));
      await Promise.all(keys.map((key) => requestResult(store.delete(key))));
    });
  }
}

// ———————————————————————————————————————————————————————————
// Baseline store — per-astronaut normal ranges
// ———————————————————————————————————————————————————————————

class BaselineStore {
  async calculateBaseline(
    astronautId: string,
    metric: Metric
  ): Promise<AstronautBaseline> {
    const readings = await new ReadingStore().getReadingsByAstronaut(
      astronautId,
      metric
    );

    const defaults = DEFAULT_NORMAL_RANGES[metric] ?? [0, 0];
    let normalMin = defaults[0];
    let normalMax = defaults[1];

    const values = readings
      .map((reading) => reading.value)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    if (values.length >= 5) {
      const lowIndex = Math.floor((values.length - 1) * 0.1);
      const highIndex = Math.ceil((values.length - 1) * 0.9);
      normalMin = values[lowIndex];
      normalMax = values[highIndex];
      if (normalMin === normalMax) {
        normalMin = defaults[0];
        normalMax = defaults[1];
      }
    }

    const now = Date.now();
    const record: AstronautBaseline = {
      id: `${astronautId}:${metric}`,
      astronautId,
      metric,
      normalMin,
      normalMax,
      updatedAt: now,
      lastCalculated: now,
      readingCount: readings.length,
    };

    const sealed = await seal(record, {
      id: record.id,
      astronautId,
      metric,
      recordedAt: now,
    });
    await withStore<void>("baselines", "readwrite", async (store) => {
      await requestResult(store.put(sealed));
    });

    return record;
  }

  async getBaseline(
    astronautId: string,
    metric: Metric
  ): Promise<AstronautBaseline | undefined> {
    const record = await withStore<SealedRecord | undefined>(
      "baselines",
      "readonly",
      (store) => requestResult(store.get(`${astronautId}:${metric}`))
    );
    return (await unseal<AstronautBaseline>(record)) ?? undefined;
  }
}

// ———————————————————————————————————————————————————————————
// Routine store — streak + last-log tracking
// ———————————————————————————————————————————————————————————

class RoutineStore {
  async recordLog(astronautId: string): Promise<RoutineState> {
    const existing = await this.getRoutine(astronautId);
    const now = Date.now();

    let streakDays = 1;
    if (existing) {
      const elapsedDays = daysBetween(existing.lastLogAt, now);
      if (elapsedDays <= 0) streakDays = Math.max(1, existing.streakDays);
      else if (elapsedDays === 1) streakDays = existing.streakDays + 1;
      else streakDays = 1;
    }

    const record: RoutineState = {
      id: astronautId,
      astronautId,
      streakDays,
      lastLogAt: now,
      totalLogs: (existing?.totalLogs ?? 0) + 1,
      lastMedReading: existing?.lastMedReading ?? null,
      lastCriticalReading: existing?.lastCriticalReading ?? null,
    };

    const sealed = await seal(record, {
      id: record.id,
      astronautId,
      recordedAt: now,
    });
    await withStore<void>("routine", "readwrite", async (store) => {
      await requestResult(store.put(sealed));
    });

    return record;
  }

  async getRoutine(astronautId: string): Promise<RoutineState | undefined> {
    const record = await withStore<SealedRecord | undefined>(
      "routine",
      "readonly",
      (store) => requestResult(store.get(astronautId))
    );
    return (await unseal<RoutineState>(record)) ?? undefined;
  }
}

function daysBetween(from: number, to: number): number {
  const start = new Date(from);
  const end = new Date(to);
  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate()
  );
  return Math.round((endUtc - startUtc) / 86_400_000);
}

// ———————————————————————————————————————————————————————————
// Outbox queue — DTN store-and-forward
// ———————————————————————————————————————————————————————————

class OutboxQueue {
  async addPackage(
    astronautId: string,
    payloadType: OutboxPayloadType,
    payload: unknown
  ): Promise<OutboxPackage> {
    const now = Date.now();
    const record: OutboxPackage = {
      id: crypto.randomUUID(),
      astronautId,
      payloadType,
      payload,
      status: "pending",
      createdAt: now,
      attempts: 0,
      lastAttemptAt: null,
    };

    const sealed = await seal(record, {
      id: record.id,
      astronautId,
      createdAt: now,
      status: record.status,
    });
    await withStore<void>("outbox", "readwrite", async (store) => {
      await requestResult(store.put(sealed));
    });

    return record;
  }

  async getPendingPackages(): Promise<OutboxPackage[]> {
    const records = await withStore<SealedRecord[]>(
      "outbox",
      "readonly",
      async (store) => {
        const index = store.index("status");
        return requestResult(index.getAll("pending"));
      }
    );

    const packages = await Promise.all(
      records.map((record) => unseal<OutboxPackage>(record))
    );
    return packages
      .filter((item): item is OutboxPackage => item !== null)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async markSynced(packageId: string): Promise<void> {
    await this.updateStatus(packageId, "synced");
  }

  async markFailed(packageId: string): Promise<void> {
    const record = await withStore<SealedRecord | undefined>(
      "outbox",
      "readonly",
      (store) => requestResult(store.get(packageId))
    );
    const item = await unseal<OutboxPackage>(record);
    if (!item) return;

    const updated: OutboxPackage = {
      ...item,
      status: "failed",
      attempts: item.attempts + 1,
      lastAttemptAt: Date.now(),
    };
    await this.put(updated);
  }

  private async updateStatus(
    packageId: string,
    status: OutboxPackage["status"]
  ): Promise<void> {
    const record = await withStore<SealedRecord | undefined>(
      "outbox",
      "readonly",
      (store) => requestResult(store.get(packageId))
    );
    const item = await unseal<OutboxPackage>(record);
    if (!item) return;
    await this.put({ ...item, status, lastAttemptAt: Date.now() });
  }

  private async put(item: OutboxPackage): Promise<void> {
    const sealed = await seal(item, {
      id: item.id,
      astronautId: item.astronautId,
      createdAt: item.createdAt,
      status: item.status,
    });
    await withStore<void>("outbox", "readwrite", async (store) => {
      await requestResult(store.put(sealed));
    });
  }
}

export { ReadingStore, BaselineStore, RoutineStore, OutboxQueue };
export type { SealedRecord };
