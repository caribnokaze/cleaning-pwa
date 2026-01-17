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
  const btn = document.querySelector("button");
  let isSuccess = false;

  // ★1. 画面全体をロックするレイヤーを作成・表示
  const lockLayer = document.createElement("div");
  lockLayer.id = "screen-lock";
  lockLayer.style.position = "fixed";
  lockLayer.style.top = "0";
  lockLayer.style.left = "0";
  lockLayer.style.width = "100%";
  lockLayer.style.height = "100%";
  lockLayer.style.background = "rgba(0,0,0,0.1)"; // ほんのりグレー
  lockLayer.style.zIndex = "9999"; // 一番手前に
  lockLayer.style.cursor = "not-allowed";
  document.body.appendChild(lockLayer);

  try {
    // --- (バリデーションと変数取得は変更なし) ---
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
      // ★バリデーション失敗時はロックを解除
      document.body.removeChild(lockLayer);
      return;
    }

    const workTypeLabels = {
      "normal": "通常清掃のみ",
      "full": "定期清掃＋フィルター清掃",
      "regular": "定期清掃のみ",
      "filter": "フィルター清掃のみ"
    };
    const workTypeLabel = workTypeLabels[workType] || "その他";

    // 保存開始
    btn.disabled = true;
    btn.innerText = "データを保存中...";

    // --- (圧縮と保存の処理は変更なし) ---
    const compressionPromises = [];
    for (let i = 0; i < files.length; i++) {
      compressionPromises.push(compressToBase64(files[i], 800, 0.3).then(data => ({
        name: `${site}_(${reportDate})_${staff}_${i + 1}`,
        data: data,
        isExtra: false
      })));
    }
    for (let i = 0; i < extraFiles.length; i++) {
      compressionPromises.push(compressToBase64(extraFiles[i], 800, 0.3).then(data => ({
        name: `${site}_(${reportDate})_${staff}_${workTypeLabel}_${i + 1}`,
        data: data,
        isExtra: true
      })));
    }

    const allImages = await Promise.all(compressionPromises);
    const total = allImages.length;
    for (let i = 0; i < total; i++) {      
      await db.queue.add({
        payload: { staff, site, reportDate, workTypeLabel, workTime, singleImage: allImages[i] },
        status: 'pending'
      });
    }

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('START_UPLOAD');
    }

    isSuccess = true; 

    // 表示の更新
    btn.innerText = "送信完了";
    btn.style.background = "#28a745";
    btn.style.color = "#ffffff";
    
    const msg = document.createElement("p");
    msg.id = "success-msg";
    msg.innerHTML = `<strong>お疲れ様でした！</strong><br>${total}枚の送信予約を受け付けました。<br>5秒後に画面を戻します。`;
    msg.style.textAlign = "center";
    msg.style.color = "#28a745";
    msg.style.marginTop = "10px";
    btn.parentNode.insertBefore(msg, btn);

    // ★リロードまでロックを維持
    setTimeout(() => {
      location.reload();
    }, 5000);

  } catch (e) {
    console.error(e);
    alert("保存中にエラーが発生しました: " + e.message);
    // ★エラー時は操作できるようにロックを解除
    if (document.getElementById("screen-lock")) {
      document.body.removeChild(lockLayer);
    }
    btn.disabled = false;
    btn.innerText = "送信";
  } finally {
    if (!isSuccess) {
      // 成功時以外はボタンを戻す
      btn.disabled = false;
      btn.innerText = "送信";
    }
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
