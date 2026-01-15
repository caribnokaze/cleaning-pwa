/**
 * 1. ページ読み込み時の初期設定
 */
window.addEventListener('DOMContentLoaded', () => {
  // 日付をセット
  const dateInput = document.getElementById("reportDate");
  if (dateInput) dateInput.valueAsDate = new Date();

  // 初期状態で「通常清掃のみ」が選択されている場合の無効化処理を強制実行
  const workTimeSelect = document.getElementById('workTime');
  const extraPhotosInput = document.getElementById('extraPhotos');
  const defaultWorkType = document.querySelector('input[name="workType"]:checked');

  // 要素が存在し、かつ「通常清掃のみ(normal)」が選択されている場合
  if (workTimeSelect && extraPhotosInput && defaultWorkType && defaultWorkType.value === 'normal') {
    workTimeSelect.disabled = true;
    extraPhotosInput.disabled = true;
    workTimeSelect.style.opacity = "0.5";
    extraPhotosInput.style.opacity = "0.5";
  }
});

/**
 * 2. メインの送信関数
 */
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

    // バリデーション
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

    // 通常写真の圧縮
    for (let i = 0; i < files.length; i++) {
      compressionPromises.push(
        compressToBase64(files[i], 500, 0.15).then(data => ({
          name: `${site}_(${reportDate})_${staff}_${i + 1}`,
          data: data,
          isExtra: false
        }))
      );
    }

    // 追加写真の圧縮
    for (let i = 0; i < extraFiles.length; i++) {
      compressionPromises.push(
        compressToBase64(extraFiles[i], 500, 0.15).then(data => ({
          name: `${site}_(${reportDate})_${staff}_${workTypeLabel}_${i + 1}`,
          data: data,
          isExtra: true
        }))
      );
    }

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

      const response = await fetch("https://script.google.com/macros/s/AKfycbzUmMgIbIjJPm32E4-k8oGTDHYbNrBqmz9O19-_nTGRW0E__AS_nmzmsfMKQNpO-2Pk-A/exec", {
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

/**
 * 3. 画像圧縮関数
 */
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

/**
 * 4. 清掃区分による入力制限の切り替え
 */
document.addEventListener('change', (e) => {
  if (e.target.name === 'workType') {
    const workType = e.target.value;
    const workTimeSelect = document.getElementById('workTime');
    const extraPhotosInput = document.getElementById('extraPhotos');

    if (workType === 'normal') {
      // 通常清掃のみ：時間も写真も「無効」
      workTimeSelect.disabled = true;
      workTimeSelect.value = "";
      extraPhotosInput.disabled = true;
      extraPhotosInput.value = "";
      workTimeSelect.style.opacity = "0.5";
      extraPhotosInput.style.opacity = "0.5";

    } else if (workType === 'regular') {
      // 定期清掃のみ：時間は「無効」、写真は「有効」
      workTimeSelect.disabled = true;
      workTimeSelect.value = "";
      extraPhotosInput.disabled = false;
      workTimeSelect.style.opacity = "0.5";
      extraPhotosInput.style.opacity = "1.0";

    } else {
      // その他（フィルター関連）：時間も写真も「有効」
      workTimeSelect.disabled = false;
      extraPhotosInput.disabled = false;
      workTimeSelect.style.opacity = "1.0";
      extraPhotosInput.style.opacity = "1.0";
    }
  }
});

/**
 * 5. 枚数制限（100枚）
 */
const checkFileCount = (e) => {
  const maxFiles = 100;
  if (e.target.files.length > maxFiles) {
    alert(`一度に選択できるのは${maxFiles}枚までです。選択し直してください。`);
    e.target.value = ""; 
  }
};

document.getElementById('photos').addEventListener('change', checkFileCount);
document.getElementById('extraPhotos').addEventListener('change', checkFileCount);
