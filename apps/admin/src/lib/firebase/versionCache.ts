import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, increment } from "firebase/firestore";
import { db } from "./client";

const CACHE_PREFIX = "aurwell_v3cache_";
const VERSION_PREFIX = "aurwell_v3num_";

/**
 * Clean up legacy corrupted cache keys from previous versions
 */
function cleanupLegacyCacheKeys(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("aurwell_vcache_") || key.startsWith("aurwell_vnum_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

if (typeof window !== "undefined") {
  cleanupLegacyCacheKeys();
}

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
          if (Array.isArray(parsed)) {
            return parsed;
          }
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
        const parsed = JSON.parse(cachedDataStr) as T[];
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    // Otherwise fallback to direct fetcher
    return await fetcher();
  }
}

/**
 * Canonical Treatments Fetcher (Complete model representation)
 */
export async function fetchCanonicalTreatments(clinicId: string): Promise<any[]> {
  return await fetchWithVersionCache(
    clinicId,
    "treatments",
    async () => {
      const snap = await getDocs(collection(db, "clinics", clinicId, "treatments"));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const typesMapped = (data.types || []).map((t: any) => ({
          title: t.title || "Standard",
          nonMemberPrice: t.nonMemberPrice !== undefined ? Number(t.nonMemberPrice) : Number(t.originalPrice || 0),
          memberPrice: t.memberPrice !== undefined && t.memberPrice !== null && t.memberPrice !== "" ? Number(t.memberPrice) : (t.discountedPrice !== undefined ? Number(t.discountedPrice) : null),
        }));

        const catsMapped: string[] = Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories
          : data.categoryId
          ? [data.categoryId]
          : ["Face"];

        list.push({
          id: d.id,
          categories: catsMapped,
          title: data.title || "Untitled Treatment",
          description: data.description || "",
          bannerUrl: data.bannerUrl || "",
          featuresHeading: data.featuresHeading || "Key Benefits",
          features: Array.isArray(data.features) ? data.features : [],
          types: typesMapped.length > 0 ? typesMapped : [{ title: "Standard", nonMemberPrice: 0, memberPrice: null }],
          isActive: data.isActive !== false,
          createdAt: data.createdAt || null,
        });
      });
      return list;
    }
  );
}

/**
 * Canonical Membership Tiers Fetcher (Complete model representation)
 */
export async function fetchCanonicalMembershipTiers(clinicId: string): Promise<any[]> {
  return await fetchWithVersionCache(
    clinicId,
    "membership_tiers",
    async () => {
      const snap = await getDocs(collection(db, "clinics", clinicId, "membership_tiers"));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "VIP Membership",
          description: data.description || "",
          monthlyPrice: Number(data.monthlyPrice || data.price || 0),
          annualPrice: data.annualPrice ? Number(data.annualPrice) : null,
          minCommitmentMonths: data.minCommitmentMonths ? Number(data.minCommitmentMonths) : null,
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          includedTreatments: Array.isArray(data.includedTreatments) ? data.includedTreatments : [],
          imageUrl: data.imageUrl || "",
          terms: data.terms || "",
          isActive: data.isActive !== false,
          createdAt: data.createdAt || null,
        });
      });
      return list;
    }
  );
}

/**
 * Canonical Rewards Fetcher (Complete model representation)
 */
export async function fetchCanonicalRewards(clinicId: string): Promise<any[]> {
  return await fetchWithVersionCache(
    clinicId,
    "rewards",
    async () => {
      const snap = await getDocs(collection(db, "clinics", clinicId, "rewards"));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          isActive: data.isActive !== false,
          ...data,
        });
      });
      return list;
    }
  );
}

/**
 * Canonical Patients Fetcher (Complete model representation)
 */
export async function fetchCanonicalPatients(clinicId: string): Promise<any[]> {
  return await fetchWithVersionCache(
    clinicId,
    "patients",
    async () => {
      const snap = await getDocs(collection(db, "clinics", clinicId, "patients"));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const jDate = data.joinedAt || data.createdAt;
        list.push({
          id: d.id,
          name: data.name || data.clientName || "Unnamed Patient",
          email: data.email || "",
          phone: data.phone || "",
          loyaltyBalance: Number(data.loyaltyBalance || 0),
          visitsCount: Number(data.visitsCount || 0),
          joinedAt: jDate || null,
          ...data,
        });
      });
      return list;
    }
  );
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
      if (Array.isArray(prev)) {
        const updated = updater(prev);
        setStorageItem(cacheKey, JSON.stringify(updated));
      }
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
