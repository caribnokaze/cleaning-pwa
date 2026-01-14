async function send() {
  const btn = document.querySelector("button"); // ボタンの制御用
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

    // ボタンを無効化して連打を防ぐ
    btn.disabled = true;
    btn.innerText = "圧縮・送信中...";

    const images = [];
    for (const file of files) {
      // ※compressToBase64関数が同じapp.js内にある必要があります
      const base64 = await compressToBase64(file, 1024, 0.6);
      images.push({ name: file.name, data: base64 });
      await new Promise(r => setTimeout(r, 100));
    }

    // 送信
    await fetch("https://script.google.com/macros/s/AKfycbzgULvJ8wUnOwEQJxMUDp3Cb5M-qQ6NVobFPnQ7IN4b9l5B4goMGEEMETsGcUcmiIvkUg/exec", {
      method: "POST",
      // headers はあえて設定しない（GAS側で受け取る際は postData.contents で自動的に文字列として届くため）
      mode: "no-cors", // これを入れると、エラーで止まりにくくなります
      body: JSON.stringify({ staff, site, images })
    });

    alert("送信完了しました！\nスプレッドシートを確認してください。");
    location.reload(); // 画面をリセット

  } catch (e) {
    console.error(e);
    alert("エラーが発生しました: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "送信";
  }
}
