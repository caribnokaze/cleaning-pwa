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
    const base64 = await toBase64(file);
    images.push({
      name: file.name,
      data: base64
    });
  }

  await fetch("https://script.google.com/macros/s/AKfycbxdseNyzHh1ISA3Wk_zv6Xy9FUOvSgWCRtgxZgMA3sLWHSFVb_bkd4cZwKwXD6AXSqCOg/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staff,
      site,
      images
    })
  });

  alert("送信完了しました");
}

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  });
}
