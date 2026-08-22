import {
  getDocs,
  getDoc,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";

/**
 * Fetches fresh documents from the server and updates local IndexedDB cache.
 * Automatically falls back to offline cache if network is unavailable.
 */
export async function getDocsCacheFirst(q: Query): Promise<QuerySnapshot> {
  return await getDocs(q);
}

export async function getDocCacheFirst(docRef: DocumentReference): Promise<DocumentSnapshot> {
  return await getDoc(docRef);
}

