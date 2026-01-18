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

// sw.js 内の processQueue 関数
async function processQueue() {
  const items = await db.queue
    .filter(item => item.status === 'pending' || !item.status)
    .toArray();

  if (items.length === 0) return;

  for (const item of items) {
    try {
      await db.queue.update(item.id, { status: 'sending' });

      // Chrome の Failed to fetch 回避策:
      // 文字列を直接送るのではなく、Blob 形式にして Content-Type を「単純なリクエスト」に固定する
      const blob = new Blob([JSON.stringify(item.payload)], { type: 'text/plain' });

      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors", 
        body: blob,
        keepalive: true, // リロード対策
        credentials: 'omit' // Chrome の CORS エラーを抑制するために追加
      });

      // no-cors の場合、成功判定ができないため、通信が終わったら削除
      await db.queue.delete(item.id);
      console.log("GASへの送信処理を完了しました ID:", item.id);
    } catch (e) {
      await db.queue.update(item.id, { status: 'pending' });
      console.error("送信エラー (Fetch失敗):", e);
    }
  }
}
