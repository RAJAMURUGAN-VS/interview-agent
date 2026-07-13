/**
 * usePdfChatIndexedDB — IndexedDB-backed vector chunk cache for PDF Chat.
 *
 * Why IndexedDB instead of localStorage?
 *  - localStorage: ~5 MB limit, synchronous, blocks main thread
 *  - IndexedDB: ~50–500 MB, async, non-blocking, supports binary blobs
 *
 * Data model:
 *  DB name:    "PdfVectorCache"
 *  Version:    1
 *  ObjectStore: "chunks"
 *    keyPath:   fileHash  (SHA-256 of the file bytes)
 *    indexes:
 *      - "fileName"  (for display/lookup by name)
 *      - "savedAt"   (for LRU eviction ordering)
 *
 * Each record: { fileHash, fileName, fileSize, savedAt, chunkCount }
 * The heavy vector data (embeddings) lives in the backend (ChromaDB).
 * We store chunk metadata + extracted text to:
 *   1. Skip re-uploading when the exact same file is dragged in again
 *   2. Provide an instant "file already processed" check
 */

const DB_NAME    = 'PdfVectorCache';
const DB_VERSION = 1;
const STORE_NAME = 'chunks';

// ── Record shape stored in IndexedDB ─────────────────────────────────────

export interface PdfCacheRecord {
  fileHash:   string;    // keyPath — SHA-256 hex of the raw file bytes
  fileName:   string;
  fileSize:   number;    // bytes, for display
  savedAt:    string;    // ISO timestamp
  chunkCount: number;    // number of text chunks extracted
  threadId:   string;    // last known thread_id from the backend
  chunks:     ChunkData[];
}

export interface ChunkData {
  index:   number;
  text:    string;
  page:    number;
}

// ── Open (or upgrade) the database ────────────────────────────────────────

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'fileHash' });
        // Index for fast lookup by fileName
        store.createIndex('fileName', 'fileName', { unique: false });
        // Index for LRU eviction (oldest first)
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
    req.onblocked  = () => reject(new Error('IDB blocked by another open connection'));
  });

  return _dbPromise;
}

// ── SHA-256 file hash via Web Crypto API ───────────────────────────────────

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── IDB operations ────────────────────────────────────────────────────────

/** Store a PDF cache record. Uses put() so it's idempotent on re-upload. */
export async function storePdfCache(record: PdfCacheRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Get a cached record by fileHash. Returns null on cache miss. */
export async function getPdfCache(fileHash: string): Promise<PdfCacheRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(fileHash);
    req.onsuccess = () => resolve((req.result as PdfCacheRecord) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/** List all cached PDF records sorted newest-first. */
export async function listPdfCaches(): Promise<PdfCacheRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const index   = store.index('savedAt');
    // Iterate in reverse (PREV) to get newest first
    const results: PdfCacheRecord[] = [];
    const cursor = index.openCursor(null, 'prev');
    cursor.onsuccess = (e) => {
      const c = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (c) {
        results.push(c.value as PdfCacheRecord);
        c.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

/** Delete a cached record by fileHash. */
export async function deletePdfCache(fileHash: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(fileHash);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Evict oldest entries if total count exceeds `maxEntries`.
 * Uses the savedAt index (oldest-first cursor).
 */
export async function evictOldestIfNeeded(maxEntries = 20): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const total = countReq.result;
      if (total <= maxEntries) { resolve(); return; }

      const toDelete = total - maxEntries;
      const index  = store.index('savedAt');
      const cursor = index.openCursor(); // oldest first
      let deleted = 0;

      cursor.onsuccess = (e) => {
        const c = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (c && deleted < toDelete) {
          c.delete();
          deleted++;
          c.continue();
        } else {
          resolve();
        }
      };
      cursor.onerror = () => reject(cursor.error);
    };
    countReq.onerror = () => reject(countReq.error);
  });
}

// ── React hook — pre-check cache before uploading ────────────────────────

import { useCallback } from 'react';

export function usePdfCacheCheck() {
  /**
   * Check IDB for a cached fileHash.
   * Returns { hit: true, record } if cached, { hit: false } otherwise.
   */
  const checkCache = useCallback(async (file: File) => {
    try {
      const fileHash = await computeFileHash(file);
      const record   = await getPdfCache(fileHash);
      if (record) {
        return { hit: true as const, record, fileHash };
      }
      return { hit: false as const, fileHash };
    } catch {
      // IDB not available (private browsing) — treat as miss
      return { hit: false as const, fileHash: '' };
    }
  }, []);

  /**
   * Store a PDF cache record after a successful upload.
   * Call this after the backend has processed the PDF and returned a threadId.
   */
  const storeCache = useCallback(
    async (
      file: File,
      fileHash: string,
      threadId: string,
      chunks: ChunkData[],
    ) => {
      try {
        const record: PdfCacheRecord = {
          fileHash,
          fileName:   file.name,
          fileSize:   file.size,
          savedAt:    new Date().toISOString(),
          chunkCount: chunks.length,
          threadId,
          chunks,
        };
        await storePdfCache(record);
        await evictOldestIfNeeded(20);
      } catch {
        // IDB failure is non-fatal — chat still works
      }
    },
    [],
  );

  return { checkCache, storeCache };
}
