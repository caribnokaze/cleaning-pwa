// sw.js
importScripts('https://unpkg.com/dexie/dist/dexie.js');

const db = new Dexie("PhotoUploadDB");
db.version(1).stores({ queue: '++id, status' });

const GAS_URL = "https://script.google.com/macros/s/AKfycbzgrnfEbb6UNqg8KSLFEQgyoIhfD8ZGxb_Yx2CJu8sma9jt-FyF8W2iEXKHqziKBYIdow/exec"; // 必ずご自身のURLに書き換えてください

// A. 画面（app.js）から「保存したよ」という通知を受け取ったらすぐに実行
self.addEventListener('message', (event) => {
  if (event.data === 'START_UPLOAD') {
    processQueue();
  }
});

// B. 定期的なチェックも継続（念のため）
setInterval(() => {
  processQueue();
}, 10000);

async function processQueue() {
  const items = await db.queue.where("status").equals("pending").toArray();
  if (items.length === 0) return;

  for (const item of items) {
    try {
      await db.queue.update(item.id, { status: 'sending' });

      // 送信（画面が開いていても裏で並行して走ります）
      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(item.payload)
      });

      await db.queue.delete(item.id);
      console.log("送信成功");
    } catch (e) {
      await db.queue.update(item.id, { status: 'pending' });
      console.error("送信失敗、リトライ待機...");
    }
  }
}
