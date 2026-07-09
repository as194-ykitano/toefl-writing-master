// Speaking 録音の保存・読み込み（IndexedDB）
// localStorage はサイズ制限が厳しいため、音声 Blob は IndexedDB に保存する。
// キー: `${sessionId}:${taskId}`。30 日より古い録音は自動削除する。

const DB_NAME = "prep_recordings";
const STORE_NAME = "recordings";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface RecordingEntry {
  key: string;
  sessionId: string;
  taskId: string;
  blob: Blob;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("sessionId", "sessionId");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecording(sessionId: string, taskId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const entry: RecordingEntry = {
        key: `${sessionId}:${taskId}`,
        sessionId,
        taskId,
        blob,
        createdAt: Date.now(),
      };
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // 保存できなくても演習自体は続行できる
  }
}

/** セッションの録音を taskId → Blob の Map で返す */
export async function loadRecordings(sessionId: string): Promise<Map<string, Blob>> {
  const result = new Map<string, Blob>();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.objectStore(STORE_NAME).index("sessionId");
      const request = index.openCursor(IDBKeyRange.only(sessionId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as RecordingEntry;
          result.set(entry.taskId, entry.blob);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    // 読み込み失敗時は空のまま返す
  }
  return result;
}

/** 30 日より古い録音を削除する（結果画面表示時などに呼ぶ） */
export async function pruneOldRecordings(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const index = tx.objectStore(STORE_NAME).index("createdAt");
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now() - MAX_AGE_MS));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch {
    // 失敗しても実害なし
  }
}
