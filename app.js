async function send() {
  const staff = document.getElementById("staff").value;
  const site  = document.getElementById("site").value;
  const files = document.getElementById("photos").files;

  if (!files.length) {
    alert("写真を選択してください");
    return;
  }

  const formData = new FormData();
  formData.append("staff", staff);
  formData.append("site", site);

  for (const file of files) {
    formData.append("files", file);
  }

  try {
    await fetch("https://script.google.com/macros/s/AKfycbzm363SNX9qsRIhA0bUaNSjIO51gcxg2jxuNrEEtaJG5BsyNnHeNq5GZUnsTbqxpVIxIQ/exec", {
      method: "POST",
      body: formData
    });

    alert("送信完了しました");
  } catch (e) {
    alert("送信に失敗しました");
  }
}
