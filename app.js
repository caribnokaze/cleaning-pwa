async function send() {
  const btn = document.querySelector("button"); 
  try {
    const staff = document.getElementById("staff").value;
    const site  = document.getElementById("site").value;
    const reportDate = document.getElementById("reportDate").value;
    const files = document.getElementById("photos").files;

    // ラジオボタン（清掃区分）
    const workTypeEl = document.querySelector('input[name="workType"]:checked');
    const workType = workTypeEl ? workTypeEl.value : "";
    
    // セレクトボックス（清掃時間）
    const workTime = document.getElementById("workTime").value;
    
    // 2つ目のファイル選択（追加写真）
    const extraFiles = document.getElementById("extraPhotos").files;

    if (!site) {
      alert("現場名を選択してください");
      return;
    }

    if (!staff || !reportDate) {
      alert("日付、担当者名を入力してください");
      return;
    }

    if (!workType) {
      alert("清掃区分を選択してください");
      return;
    }

    if (!files.length) {
      alert("完了写真を選択してください");
      return;
    }

    btn.disabled = true;
    btn.innerText = "圧縮・送信中...";

    // --- 写真の圧縮処理（1つ目のフォーム） ---
    const images = [];
    for (const file of files) {
      const base64 = await compressToBase64(file, 1024, 0.6);
      images.push({ name: file.name, data: base64, type: "main" }); // typeを付けて区別可能に
      await new Promise(r => setTimeout(r, 100));
    }

    // --- 【追加】写真の圧縮処理（2つ目のフォーム） ---
    const extraImages = [];
    for (const file of extraFiles) {
      const base64 = await compressToBase64(file, 1024, 0.6);
      extraImages.push({ name: file.name, data: base64, type: "extra" });
      await new Promise(r => setTimeout(r, 100));
    }

    // --- GASに送信するデータを構築 ---
    const payload = {
      staff,
      site,
      reportDate,
      workType,  // 清掃区分
      workTime,  // 清掃時間
      images,    // 1つ目の写真
      extraImages // 2つ目の写真
    };

    // GASにPOST送信
    await fetch("https://script.google.com/macros/s/AKfycbwdtjDqgXwJJgy8qmxebrF4oX40dxNG-iOktWCt2JjGboSTU9Rti7ExgHtIu4K04Pl8/exec", {
      method: "POST",
      mode: "no-cors", 
      body: JSON.stringify(payload)
    });

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

// --- 以下、圧縮関数とロード時の処理は変更なし ---
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

window.addEventListener('load', () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = ("0" + (today.getMonth() + 1)).slice(-2);
  const dd = ("0" + today.getDate()).slice(-2);
  document.getElementById('reportDate').value = `${yyyy}-${mm}-${dd}`;
});
