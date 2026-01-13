// 画像を圧縮して Base64 に変換
function compressToBase64(file, maxWidth = 1280, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const scale = Math.min(maxWidth / img.width, 1);

      const canvas = document.createElement("canvas");
      canvas.width  = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        const fr = new FileReader();
        fr.onload = () => {
          // data:image/jpeg;base64,xxxx を除去
          resolve(fr.result.split(",")[1]);
        };
        fr.readAsDataURL(blob);
      }, "image/jpeg", quality);
    };

    reader.readAsDataURL(file);
  });
}

async function send() {
  const staff = document.getElementById("staff").value;
  const site  = document.getElementById("site").value;
  const files = document.getElementById("photos").files;

  if (!files.length) {
    alert("写真を選択してください");
    return;
  }

  const images = [];

  for (const file of files) {
    const base64 = await compressToBase64(file);
    images.push({
      name: file.name,
      data: base64
    });
  }

  await fetch(
    "https://script.google.com/macros/s/AKfycbxdseNyzHh1ISA3Wk_zv6Xy9FUOvSgWCRtgxZgMA3sLWHSFVb_bkd4cZwKwXD6AXSqCOg/exec",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff,
        site,
        images
      })
    }
  );

  alert("送信完了しました");
}
