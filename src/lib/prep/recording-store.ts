// Speaking 録音の保存・読み込み（IndexedDB）
// localStorage はサイズ制限が厳しいため、音声は IndexedDB に保存する。
// Blob を直接保存するとブラウザによっては読み出し時に再生できないケースがあるため、
// ArrayBuffer + MIME タイプで保存し、読み出し時に Blob を再構築する。
// キー: `${sessionId}:${taskId}`。30 日より古い録音は自動削除する。

const DB_NAME = "prep_recordings";
const STORE_NAME = "recordings";
const DB_VERSION = 2;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface RecordingEntry {
  key: string;
  sessionId: string;
  taskId: string;
  /** 音声データ本体（Blob ではなく ArrayBuffer で保存する） */
  buffer: ArrayBuffer;
  mimeType: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // v1 (Blob 保存) からの移行: ストアを作り直す
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
      store.createIndex("sessionId", "sessionId");
      store.createIndex("createdAt", "createdAt");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecording(sessionId: string, taskId: string, blob: Blob): Promise<void> {
  try {
    const buffer = await blob.arrayBuffer();
    if (buffer.byteLength === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const entry: RecordingEntry = {
        key: `${sessionId}:${taskId}`,
        sessionId,
        taskId,
        buffer,
        mimeType: blob.type || "audio/webm",
        createdAt: Date.now(),
      };
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.warn("録音の保存に失敗しました:", error);
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
          if (entry.buffer && entry.buffer.byteLength > 0) {
            result.set(entry.taskId, new Blob([entry.buffer], { type: entry.mimeType }));
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.warn("録音の読み込みに失敗しました:", error);
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
