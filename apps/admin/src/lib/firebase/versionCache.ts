import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "./client";

const CACHE_PREFIX = "aurwell_vcache_";
const VERSION_PREFIX = "aurwell_vnum_";

/**
 * Safely get an item from browser localStorage
 */
function getStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("[VersionCache] localStorage read failed:", e);
    return null;
  }
}

/**
 * Safely set an item in browser localStorage
 */
function setStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("[VersionCache] localStorage write failed (quota exceeded?):", e);
  }
}

/**
 * Safely remove an item from browser localStorage
 */
function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("[VersionCache] localStorage delete failed:", e);
  }
}

/**
 * Fetch a collection with smart version-checking.
 * - Reads only 1 small metadata doc (settings/versions).
 * - If version matches local cache, returns cached items in 0ms (0 extra reads).
 * - If version changed or cold start, runs fetcher(), saves fresh items to cache, and returns them.
 */
export async function fetchWithVersionCache<T>(
  clinicId: string,
  collectionName: string,
  fetcher: () => Promise<T[]>,
  versionKey: string = collectionName
): Promise<T[]> {
  if (!clinicId) return [];

  const cacheKey = `${CACHE_PREFIX}${clinicId}_${collectionName}`;
  const versionStorageKey = `${VERSION_PREFIX}${clinicId}_${versionKey}`;

  const cachedDataStr = getStorageItem(cacheKey);
  const cachedVersionStr = getStorageItem(versionStorageKey);

  try {
    // 1. Fetch the single shared versions doc for the clinic
    const versionsRef = doc(db, "clinics", clinicId, "settings", "versions");
    const versionsSnap = await getDoc(versionsRef);

    const serverVersion = versionsSnap.exists()
      ? Number(versionsSnap.data()?.[versionKey] ?? 0)
      : 0;

    // 2. If we have cached data and version matches, return cache immediately
    if (cachedDataStr && cachedVersionStr !== null) {
      const cachedVersion = Number(cachedVersionStr);
      if (cachedVersion === serverVersion && serverVersion > 0) {
        try {
          const parsed = JSON.parse(cachedDataStr) as T[];
          return parsed;
        } catch {
          // JSON parse failed, proceed to fresh fetch
        }
      }
    }

    // 3. Version mismatch, cold start, or uninitialized: run the fresh fetcher
    const freshData = await fetcher();

    // If server had no version doc initialized yet, initialize it
    const targetVersion = serverVersion > 0 ? serverVersion : 1;
    if (serverVersion === 0) {
      setDoc(versionsRef, { [versionKey]: 1 }, { merge: true }).catch(() => {});
    }

    // 4. Update local cache
    setStorageItem(cacheKey, JSON.stringify(freshData));
    setStorageItem(versionStorageKey, String(targetVersion));

    return freshData;
  } catch (err) {
    console.error(`[VersionCache] Error during version sync for ${collectionName}:`, err);
    // If error occurs (e.g. offline), fallback to cached data if available
    if (cachedDataStr) {
      try {
        return JSON.parse(cachedDataStr) as T[];
      } catch {}
    }
    // Otherwise fallback to direct fetcher
    return await fetcher();
  }
}

/**
 * Atomically increments the collection version on the server when data changes (Add / Edit / Delete).
 * Also keeps the current tab's localStorage version in sync.
 */
export async function incrementCollectionVersion(
  clinicId: string,
  versionKey: string
): Promise<void> {
  if (!clinicId) return;

  const versionStorageKey = `${VERSION_PREFIX}${clinicId}_${versionKey}`;

  try {
    const versionsRef = doc(db, "clinics", clinicId, "settings", "versions");
    await setDoc(
      versionsRef,
      {
        [versionKey]: increment(1),
      },
      { merge: true }
    );

    // Increment local version counter so the current browser tab doesn't think it's stale
    const currentVer = Number(getStorageItem(versionStorageKey) || 0);
    setStorageItem(versionStorageKey, String(currentVer + 1));
  } catch (err) {
    console.error(`[VersionCache] Failed to increment version for ${versionKey}:`, err);
  }
}

/**
 * Directly updates local cached items (for optimistic UI updates)
 */
export function updateLocalCache<T>(
  clinicId: string,
  collectionName: string,
  updater: (prev: T[]) => T[]
): void {
  if (!clinicId) return;
  const cacheKey = `${CACHE_PREFIX}${clinicId}_${collectionName}`;
  const cachedDataStr = getStorageItem(cacheKey);
  if (cachedDataStr) {
    try {
      const prev = JSON.parse(cachedDataStr) as T[];
      const updated = updater(prev);
      setStorageItem(cacheKey, JSON.stringify(updated));
    } catch {}
  }
}

/**
 * Clear cache for a specific collection or everything for a clinic
 */
export function invalidateCollectionCache(
  clinicId: string,
  collectionName: string,
  versionKey: string = collectionName
): void {
  removeStorageItem(`${CACHE_PREFIX}${clinicId}_${collectionName}`);
  removeStorageItem(`${VERSION_PREFIX}${clinicId}_${versionKey}`);
}
