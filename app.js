async function send() {
  try {
    const staff = document.getElementById("staff").value;
    const site  = document.getElementById("site").value;
    const files = document.getElementById("photos").files;

    if (!files.length) {
      alert("写真を選択してください");
      return;
    }

    if (files.length > 10) {
      alert("スマホからは10枚まで送信できます");
      return;
    }

    const images = [];

    for (const file of files) {
      const base64 = await compressToBase64(file, 1024, 0.6);
      images.push({ name: file.name, data: base64 });
      await new Promise(r => setTimeout(r, 100));
    }

    await fetch("https://script.google.com/macros/s/AKfycbxdseNyzHh1ISA3Wk_zv6Xy9FUOvSgWCRtgxZgMA3sLWHSFVb_bkd4cZwKwXD6AXSqCOg/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff, site, images })
    });

    alert("送信完了しました");

  } catch (e) {
    alert("エラー: " + e.message);
  }
}
