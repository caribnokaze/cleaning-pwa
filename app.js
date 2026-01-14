async function send() {
  const btn = document.querySelector("button"); 
  try {
    const staff = document.getElementById("staff").value;
    const site  = document.getElementById("site").value;
    const reportDate = document.getElementById("reportDate").value;
    const files = document.getElementById("photos").files;

    if (!staff || !site　|| !reportDate) {
      alert("日付、担当者名、現場名を入力してください");
      return;
    }

    if (!files.length) {
      alert("写真を選択してください");
      return;
    }

    btn.disabled = true;
    btn.innerText = "圧縮・送信中...";

    const images = [];
    for (const file of files) {
      // 下に定義した関数を呼び出す
      const base64 = await compressToBase64(file, 1024, 0.6);
      images.push({ name: file.name, data: base64 });
      await new Promise(r => setTimeout(r, 100));
    }

    // GASに送信
    await fetch("https://script.google.com/macros/s/AKfycbzgULvJ8wUnOwEQJxMUDp3Cb5M-qQ6NVobFPnQ7IN4b9l5B4goMGEEMETsGcUcmiIvkUg/exec", {
      method: "POST",
      mode: "no-cors", 
      body: JSON.stringify({ staff, site, reportDate, images })
    });

    alert("送信完了しました！\nスプレッドシートを確認してください。");
    location.reload(); 

  } catch (e) {
    console.error(e);
    alert("エラーが発生しました: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "送信";
  }
}

function compressToBase64(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(new Error("画像の読み込み失敗"));
    };
    reader.onerror = (err) => reject(new Error("ファイル読み取り失敗"));
  });
}

// ページ読み込み時に実行
window.addEventListener('load', () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = ("0" + (today.getMonth() + 1)).slice(-2);
  const dd = ("0" + today.getDate()).slice(-2);
  
  // yyyy-mm-dd 形式にしてセット
  document.getElementById('reportDate').value = `${yyyy}-${mm}-${dd}`;
});
