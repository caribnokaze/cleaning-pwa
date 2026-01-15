// 1. ページ読み込み時に日付をセット
window.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById("reportDate");
  if (dateInput) dateInput.valueAsDate = new Date();
});

// 2. メインの送信関数（一斉圧縮 ＋ 順次送信モデル）
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
      "normal": "通常清掃のみ",
      "full": "定期清掃＋フィルター清掃",
      "regular": "定期清掃のみ",
      "filter": "フィルター清掃のみ"
    };
    const workTypeLabel = workTypeLabels[workType] || "その他";

    btn.disabled = true;
    btn.innerText = "画像を圧縮中...";

    // --- A. 全ての画像を並列で一斉に圧縮する ---
    const compressionPromises = [];

    // 通常写真の圧縮予約
    for (let i = 0; i < files.length; i++) {
      compressionPromises.push(
        compressToBase64(files[i], 500, 0.15).then(data => ({
          name: `${site}_(${reportDate})_${staff}_${i + 1}`,
          data: data,
          isExtra: false
        }))
      );
    }

    // 追加写真の圧縮予約
    for (let i = 0; i < extraFiles.length; i++) {
      compressionPromises.push(
        compressToBase64(extraFiles[i], 500, 0.15).then(data => ({
          name: `${site}_(${reportDate})_${staff}_${workTypeLabel}_${i + 1}`,
          data: data,
          isExtra: true
        }))
      );
    }

    // 全枚数の圧縮完了を待つ
    const allImages = await Promise.all(compressionPromises);

    // --- B. 圧縮されたデータを1枚ずつ順番に送信 ---
    const total = allImages.length;
    for (let i = 0; i < total; i++) {
      btn.innerText = `送信中 (${i + 1} / ${total}枚目)`;
      
      const payload = { 
        staff, 
        site, 
        reportDate, 
        workTypeLabel, 
        workTime, 
        singleImage: allImages[i] 
      };

      const response = await fetch("https://script.google.com/macros/s/AKfycbzVsmfGgeYTsSOIqT3eTjZhxZqQsD2SaP8p692EMabyUdGEiLLZ_jtuUr8h3nOn9mA/exec", {
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
      img.onerror = () => reject(new Error("画像の読み込み失敗"));
    };
    reader.onerror = () => reject(new Error("ファイル読み取り失敗"));
  });
}

// 清掃区分によって入力可否を切り替える設定
document.addEventListener('change', (e) => {
  // ラジオボタン「workType」が変更されたかチェック
  if (e.target.name === 'workType') {
    const workType = e.target.value;
    const workTimeSelect = document.getElementById('workTime');
    const extraPhotosInput = document.getElementById('extraPhotos');

    if (workType === 'normal') {
      // 「通常清掃のみ」の場合は無効化し、値をリセット
      workTimeSelect.disabled = true;
      workTimeSelect.value = ""; 
      extraPhotosInput.disabled = true;
      extraPhotosInput.value = "";
      
      // 見た目も少し薄くして「入力不可」を分かりやすくする（任意）
      workTimeSelect.style.opacity = "0.5";
      extraPhotosInput.style.opacity = "0.5";
    } else {
      // それ以外（フィルター清掃を含む場合）は有効化
      workTimeSelect.disabled = false;
      extraPhotosInput.disabled = false;
      
      // 見た目を元に戻す
      workTimeSelect.style.opacity = "1.0";
      extraPhotosInput.style.opacity = "1.0";
    }
  }
});
