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
    const compressTask = async (file, name, isExtra) => {
      const base64 = await compressToBase64(file, 800, 0.5); // 800px & 画質0.5で高速化
      return { name, data: base64, isExtra };
    };

    const tasks = [];
    // 通常写真の圧縮予約
    for (let i = 0; i < files.length; i++) {
      tasks.push(compressTask(files[i], `${site}_(${reportDate})_${staff}_${i + 1}`, false));
    }
    // 追加写真の圧縮予約
    for (let i = 0; i < extraFiles.length; i++) {
      tasks.push(compressTask(extraFiles[i], `${site}_(${reportDate})_${staff}_${workTypeLabel}_${i + 1}`, true));
    }

    // 全ての圧縮を一斉に実行（ここでスマホのCPUをフル活用）
    const allImages = await Promise.all(tasks);

    // --- B. 3枚ずつ並列で送信 (スロット制御) ---
    const concurrency = 3; // 同時送信数
    const total = allImages.length;

    for (let i = 0; i < total; i += concurrency) {
      btn.innerText = `送信中 (${i + 1}〜${Math.min(i + concurrency, total)} / ${total}枚)`;
      
      // 3枚分を切り出して一斉に送信開始
      const chunk = allImages.slice(i, i + concurrency);
      
      const uploadPromises = chunk.map(async (img) => {
        const payload = { staff, site, reportDate, workTypeLabel, workTime, singleImage: img };
        const res = await fetch("https://script.google.com/macros/s/AKfycbyOWQGRpKNLCucENZ7Z6Ctnhh00BiMR6_1caPlQh_7HHDBHa5fldcgj7XKlFFK3un0gaA/exec", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const result = await res.text();
        if (!result.includes("OK")) throw new Error(`送信失敗: ${result}`);
        return result;
      });

      // 3枚全ての完了を待ってから次の3枚へ
      await Promise.all(uploadPromises);
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

// 3. 画像圧縮関数（変更なし）
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
