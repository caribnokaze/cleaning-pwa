// sw.js
importScripts('https://unpkg.com/dexie/dist/dexie.js');

const db = new Dexie("PhotoUploadDB");
db.version(1).stores({ queue: '++id, status' });

const GAS_URL = "あなたのGASのURL";

// 画面が閉じられていても、定期的に実行される
setInterval(() => {
  processQueue();
}, 10000); // 10秒おきにチェック

async function processQueue() {
  // 「pending（未送信）」のものを取得
  const items = await db.queue.where("status").equals("pending").toArray();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      // 送信中ステータスに変更して重複送信防止
      await db.queue.update(item.id, { status: 'sending' });

      const response = await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors", 
        body: JSON.stringify(item.payload)
      });

      // 成功したらDBから削除
      await db.queue.delete(item.id);
      console.log("送信成功");
    } catch (e) {
      // 失敗したら「pending」に戻して次回リトライ
      await db.queue.update(item.id, { status: 'pending' });
      console.error("バックグラウンド送信失敗、リトライ待機中...");
    }
  }
}
