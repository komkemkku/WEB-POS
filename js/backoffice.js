document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  if (!token) window.location.href = "/index.html";
  document.getElementById("userGreeting").innerText = `👤 ${
    name || "ผู้ใช้งาน"
  }`;
  document.getElementById("logoutBtn").onclick = function () {
    localStorage.clear();
    window.location.href = "/index.html";
  };
  document.getElementById("posBtn").onclick = function () {
    window.location.href = "main.html";
  };
});
