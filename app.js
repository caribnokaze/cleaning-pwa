async function send() {
  const btn = document.querySelector("button"); 
  try {
    const staff = document.getElementById("staff").value;
    const site  = document.getElementById("site").value;
    const files = document.getElementById("photos").files;

    if (!staff || !site) {
      alert("名前と現場名を入力してください");
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
    await fetch("https://script.google.com/macros/s/AKfycbzRysdY4-1cgbsFhXl-cAvS5XPUuU8V1RiNdhYfXnLVt1yEO3i_Kp2j2BMHYKM_DsGi6w/exec", {
      method: "POST",
      mode: "no-cors", 
      body: JSON.stringify({ staff, site, images })
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
