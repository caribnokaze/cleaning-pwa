// 1. ライブラリ読み込み
importScripts('https://unpkg.com/dexie@3.2.4/dist/dexie.js');

// 2. データベース設定
const db = new Dexie("PhotoUploadDB");
db.version(1).stores({ queue: '++id, status' });

const GAS_URL = "https://script.google.com/macros/s/AKfycbzNfouxEfDaWcoljv1hJBI6DtGbQpKrZDKyljznOvM_ZeZ27i2yhR3Wk3l8zi09vgKbug/exec";

// 3. Service Workerの強制更新・有効化設定
self.addEventListener('install', (event) => {
  self.skipWaiting(); // インストール後、待機せずにすぐ適用
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // すべてのタブを即座に制御下に置く
});

// 4. 画面（app.js）からのメッセージ受信
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // 強制更新の指示を受けた場合
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  // 送信開始の指示を受けた場合
  if (event.data === 'START_UPLOAD') {
    processQueue();
  }
});

// 5. 定期チェック（10秒おき）
setInterval(() => {
  processQueue();
}, 10000);

// sw.js の processQueue 関数
async function processQueue() {
  if (self.isProcessing) return; // 二重起動防止
  self.isProcessing = true;

  try {
    const items = await db.queue.filter(item => item.status === 'pending' || !item.status).toArray();
    for (const item of items) {
      await db.queue.update(item.id, { status: 'sending' });
      try {
        await fetch(GAS_URL, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify(item.payload)
        });
        await db.queue.delete(item.id);
        
        // ★重要: GAS側の処理時間を考慮し、2秒待機してから次の画像へ
        await new Promise(r => setTimeout(r, 2000)); 
      } catch (e) {
        await db.queue.update(item.id, { status: 'pending' });
      }
    }
  } finally {
    self.isProcessing = false;
  }
}
