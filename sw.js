// Service Worker本体 (sw.js)
importScripts('https://unpkg.com/dexie/dist/dexie.js');

const db = new Dexie("PhotoUploadDB");
db.version(1).stores({ queue: '++id, status' });

const GAS_URL = "あなたのGASのURL";

// 5秒おきに送信待ちデータがないかチェックする（擬似バックグラウンド同期）
setInterval(() => {
  processQueue();
}, 5000);

async function processQueue() {
  const pendingItems = await db.queue.where("status").equals("pending").toArray();
  
  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors", // GASへのリクエストにはこれが必要な場合があります
        body: JSON.stringify(item.payload)
      });

      // 送信成功したらDBから削除、またはstatusを更新
      await db.queue.delete(item.id);
      console.log("バックグラウンド送信成功:", item.id);
    } catch (e) {
      console.error("送信失敗（リトライします）:", e);
    }
  }
}
