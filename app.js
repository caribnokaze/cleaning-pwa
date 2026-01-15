// 1. ページ読み込み時に日付をセット
window.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById("reportDate");
  if (dateInput) dateInput.valueAsDate = new Date();
});

// 2. メインの送信関数（1枚ずつ順番に送信する安定モデル）
async function send() {
  const btn = document.querySelector("button");
  try {
    const staff = document.getElementById("staff").value;
    const site = document.getElementById("site").value;
    const reportDate = document.getElementById("reportDate").value;
    const files = document.getElementById("photos").files;
    const workTypeEl = document.querySelector('input[name="workType"]:checked');
    const workType = workTypeEl ? workTypeEl.value : "";
    const workTime = document.getElementById("workTime").value;
    const extraFiles = document.getElementById("extraPhotos").files;

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
    btn.innerText = "圧縮中...";

    // --- A. 圧縮タスクの作成 ---
    const tasks = [];
    // 通常写真
    for (let i = 0; i < files.length; i++) {
      const base64 = await compressToBase64(files[i], 1024, 0.5);
      tasks.push({ name: `${site}_(${reportDate})_${staff}_${i + 1}`, data: base64, isExtra: false });
    }
    // 追加写真
    for (let i = 0; i < extraFiles.length; i++) {
      const base64 = await compressToBase64(extraFiles[i], 1024, 0.5);
      tasks.push({ name: `${site}_(${reportDate})_${staff}_${workTypeLabel}_${i + 1}`, data: base64, isExtra: true });
    }

    // --- B. 1枚ずつ順番に送信 ---
    const total = tasks.length;
    for (let i = 0; i < total; i++) {
      btn.innerText = `送信中 (${i + 1} / ${total}枚目)`;
      
      const payload = { 
        staff, 
        site, 
        reportDate, 
        workTypeLabel, 
        workTime, 
        singleImage: tasks[i] 
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

    alert("すべての送信が完了しました！\nお疲れ様でした。");
    location.reload();

  } catch (e) {
    console.error(e);
    alert("エラーが発生しました: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "送信";
  }
}

// 3. 画像圧縮関数
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
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    };
  });
}
