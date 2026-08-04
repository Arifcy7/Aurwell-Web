import {
  getDocsFromCache,
  getDocs,
  getDocFromCache,
  getDoc,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";

/**
 * Smart fetcher that attempts to read from local IndexedDB cache first.
 * If cached data exists, it returns immediately (0ms).
 * Otherwise, it falls back to fetching from the server.
 */
export async function getDocsCacheFirst(q: Query): Promise<QuerySnapshot> {
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      return cacheSnap;
    }
  } catch (e) {
    // Cache miss or not cached yet
  }
  return await getDocs(q);
}

export async function getDocCacheFirst(docRef: DocumentReference): Promise<DocumentSnapshot> {
  try {
    const cacheSnap = await getDocFromCache(docRef);
    if (cacheSnap.exists()) {
      return cacheSnap;
    }
  } catch (e) {
    // Cache miss
  }
  return await getDoc(docRef);
}
