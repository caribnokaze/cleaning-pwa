async function send() {
  const btn = document.querySelector("button");
  try {
    // フォームデータの取得
    const staff = document.getElementById("staff").value;
    const site = document.getElementById("site").value;
    const reportDate = document.getElementById("reportDate").value;
    const files = document.getElementById("photos").files;
    const workTypeEl = document.querySelector('input[name="workType"]:checked');
    const workType = workTypeEl ? workTypeEl.value : "";
    const workTime = document.getElementById("workTime").value;
    const extraFiles = document.getElementById("extraPhotos").files;

    // バリデーション
    if (!site || !staff || !reportDate || !workType || !files.length) {
      alert("必須項目をすべて入力してください");
      return;
    }

    const workTypeLabels = {
      "full": "定期清掃＋フィルター清掃",
      "regular": "定期清掃のみ",
      "filter": "フィルター清掃のみ"
    };
    const workTypeLabel = workTypeLabels[workType] || "その他";

    btn.disabled = true;
    btn.innerText = "準備中...";

    // --- 1. 送信タスクの作成（全ての画像を圧縮してリスト化） ---
    const uploadTasks = [];

    // 通常写真（main）
    for (let i = 0; i < files.length; i++) {
      btn.innerText = `圧縮中 (通常 ${i + 1}/${files.length})`;
      const base64 = await compressToBase64(files[i], 1024, 0.5); // 解像度と画質を調整
      uploadTasks.push({
        name: `${site}_(${reportDate})_${staff}_${i + 1}`,
        data: base64,
        isExtra: false
      });
    }

    // 追加写真（extra）
    for (let i = 0; i < extraFiles.length; i++) {
      btn.innerText = `圧縮中 (追加 ${i + 1}/${extraFiles.length})`;
      const base64 = await compressToBase64(extraFiles[i], 1024, 0.5);
      uploadTasks.push({
        name: `${site}_(${reportDate})_${staff}_${workTypeLabel}_${i + 1}`,
        data: base64,
        isExtra: true
      });
    }

    // --- 2. 1枚ずつ順番にGASへ送信 ---
    const total = uploadTasks.length;
    for (let i = 0; i < total; i++) {
      btn.innerText = `送信中 (${i + 1}/${total}枚目)`;

      const payload = {
        staff,
        site,
        reportDate,
        workTypeLabel,
        workTime,
        singleImage: uploadTasks[i] // 1枚分だけ送る
      };

      const response = await fetch("https://script.google.com/macros/s/AKfycbyOWQGRpKNLCucENZ7Z6Ctnhh00BiMR6_1caPlQh_7HHDBHa5fldcgj7XKlFFK3un0gaA/exec", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const result = await response.text();
      if (!result.includes("OK")) {
        throw new Error(`${i + 1}枚目の送信でエラー: ${result}`);
      }
    }

    alert("送信完了しました！\nお疲れ様でした！");
    location.reload();

  } catch (e) {
    console.error(e);
    alert("エラーが発生しました: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "送信";
  }
}

// 既存の compressToBase64 関数をそのまま使用
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
      img.onerror = () => reject(new Error("画像の読み込み失敗"));
    };
    reader.onerror = () => reject(new Error("ファイル読み取り失敗"));
  });
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById("reportDate").valueAsDate = new Date();
});
