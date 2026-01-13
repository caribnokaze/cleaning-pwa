async function send() {
  const staff = document.getElementById("staff").value;
  const site  = document.getElementById("site").value;
  const fileInput = document.getElementById("photos");
  const files = fileInput.files;

  if (!files.length) {
    alert("写真を選択してください");
    return;
  }

  // ボタンを無効化（連打防止）
  const btn = document.querySelector("button");
  btn.disabled = true;
  btn.innerText = "送信中...";

  try {
    // すべてのファイルをBase64に変換
    const filePromises = Array.from(files).map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          base64: reader.result,
          name: file.name
        });
        reader.onerror = reject;
        reader.readAsDataURL(file); // Base64として読み込み
      });
    });

    const fileObjects = await Promise.all(filePromises);

    const payload = {
      staff: staff,
      site: site,
      files: fileObjects
    };

    const response = await fetch("https://script.google.com/macros/s/AKfycbxdseNyzHh1ISA3Wk_zv6Xy9FUOvSgWCRtgxZgMA3sLWHSFVb_bkd4cZwKwXD6AXSqCOg/exec", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    if (result === "OK") {
      alert("送信完了しました");
      // フォームをリセット
      fileInput.value = "";
    } else {
      alert("エラーが発生しました: " + result);
    }
  } catch (e) {
    console.error("エラー詳細:", e); // これを足すと、ブラウザのコンソールに理由が出ます
    alert("送信に失敗しました。詳細はコンソールを確認してください。");
  } finally {
    btn.disabled = false;
    btn.innerText = "送信";
  }
}
