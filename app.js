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

async function send() {
  const btn = document.getElementById("submitBtn");
  try {
    const staff = document.getElementById("staff").value;
    const site = document.getElementById("site").value;
    const reportDate = document.getElementById("reportDate").value;
    const files = document.getElementById("photos").files;
    const workTypeEl = document.querySelector('input[name="workType"]:checked');
    const workType = workTypeEl ? workTypeEl.value : "";
    const workTime = document.getElementById("workTime").value;
    const extraFiles = document.getElementById("extraPhotos").files;

    // 1. バリデーション
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
    btn.innerText = "画像圧縮中..."; 
    btn.style.opacity = "0.5";

    // 2. 画像の圧縮処理 (Promises配列を定義)
    const compressionPromises = []; // ここが漏れていたためエラーになっていました

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

    // 圧縮実行
    const allImages = await Promise.all(compressionPromises);

    // 3. ブラウザのDB（IndexedDB）に保存
    btn.innerText = "予約データを保存中..."; 
    const total = allImages.length;

    for (let i = 0; i < total; i++) {
      await db.queue.add({
        payload: {
          staff,
          site,
          reportDate,
          workTypeLabel,
          workTime,
          singleImage: allImages[i]
        },
        status: 'pending'
      });
    }

    // 保存完了アラート
    alert(`${total}枚の送信予約を完了しました！\nこのまま画面を閉じても、裏側で順番に送信されます。`);
    location.reload();

  } catch (e) {
    console.error(e);
    alert("保存中にエラーが発生しました: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "送信";
    btn.style.opacity = "1.0";
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

/**
 * 送信ボタンの有効/無効を切り替える判定関数
 */
function updateButtonState() {
  const staff = document.getElementById("staff").value;
  const site = document.getElementById("site").value;
  const reportDate = document.getElementById("reportDate").value;
  const files = document.getElementById("photos").files;
  const workTypeEl = document.querySelector('input[name="workType"]:checked');
  const workType = workTypeEl ? workTypeEl.value : "";
  const workTime = document.getElementById("workTime").value;
  const extraFiles = document.getElementById("extraPhotos").files;
  const btn = document.getElementById("submitBtn");

  // 基本の必須チェック：担当者、現場、日付、区分、通常写真（1枚以上）
  let isValid = staff && site && reportDate && workType && files.length > 0;

  // 区分ごとの追加チェック
  if (workType === 'full') {
    // 定期＋フィルター：時間と追加写真の両方が必須
    if (!workTime || extraFiles.length === 0) isValid = false;
  } else if (workType === 'regular') {
    // 定期のみ：追加写真のみ必須（時間は不要）
    if (extraFiles.length === 0) isValid = false;
  } else if (workType === 'filter') {
    // フィルターのみ：時間と追加写真の両方が必須
    if (!workTime || extraFiles.length === 0) isValid = false;
  }

  // ボタンの有効・無効を切り替え
  btn.disabled = !isValid;
  
  // 見た目でも分かりやすく（有効なら不透明、無効なら半透明）
  btn.style.opacity = isValid ? "1.0" : "0.5";
  btn.style.cursor = isValid ? "pointer" : "not-allowed";
}

/**
 * 各入力項目に「入力されたらチェックする」イベントを設定
 */
// テキスト・日付・セレクト
['staff', 'site', 'reportDate', 'workTime'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateButtonState);
});

// ラジオボタン（清掃区分）
document.getElementsByName('workType').forEach(el => {
  el.addEventListener('change', updateButtonState);
});

// ファイル選択（通常・追加）
document.getElementById('photos').addEventListener('change', updateButtonState);
document.getElementById('extraPhotos').addEventListener('change', updateButtonState);

// ページ読み込み時にも一度実行して初期状態を反映
window.addEventListener('DOMContentLoaded', updateButtonState);
