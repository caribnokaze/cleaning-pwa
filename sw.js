// 1. ライブラリ読み込み
importScripts('https://unpkg.com/dexie/dist/dexie.js');

// 2. データベース設定
const db = new Dexie("PhotoUploadDB");
db.version(1).stores({ queue: '++id, status' });

const GAS_URL = "https://script.google.com/macros/s/AKfycbzgrnfEbb6UNqg8KSLFEQgyoIhfD8ZGxb_Yx2CJu8sma9jt-FyF8W2iEXKHqziKBYIdow/exec";

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

// 6. 送信処理の本体
async function processQueue() {
  // pending（未送信）のもの、またはstatusが未設定のものを取得
  const items = await db.queue
    .filter(item => item.status === 'pending' || !item.status)
    .toArray();

  if (items.length === 0) return;

  for (const item of items) {
    try {
      // 送信中ステータスに変更
      await db.queue.update(item.id, { status: 'sending' });

      // Google Apps Scriptへ送信
      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(item.payload)
      });

      // 送信成功したら削除
      await db.queue.delete(item.id);
      console.log("GASへの送信に成功しました ID:", item.id);
    } catch (e) {
      // 失敗したら pending に戻して次回リトライ
      await db.queue.update(item.id, { status: 'pending' });
      console.error("送信エラー:", e);
    }
  }
}
