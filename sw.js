// 1. ライブラリ読み込み（※今後IndexedDBを使う可能性があれば残す）
importScripts('https://unpkg.com/dexie@3.2.4/dist/dexie.js');

// 2. データベース設定（※現時点では未使用だが削除しなくてOK）
const db = new Dexie("PhotoUploadDB");
db.version(1).stores({ queue: '++id, status' });

// ※ UI直送にするため、GAS_URL は SW では使用しない
// const GAS_URL = "..."; ← 不要なので削除

// 3. Service Workerの強制更新・有効化設定
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 即時有効化
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 4. app.js からのメッセージ受信
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // 強制更新のみ対応（送信処理はしない）
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
