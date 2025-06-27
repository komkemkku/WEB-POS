document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  if (!token) window.location.href = "/index.html";
  document.getElementById("userGreeting").innerText = `👤 ${
    name || "ผู้ใช้งาน"
  }`;
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.clear();
    window.location.href = "/index.html";
  };
  document.getElementById("backofficeBtn").onclick = () => {
    window.location.href = "backoffice.html";
  };

  const form = document.getElementById("settingsForm");
  const saveSuccess = document.getElementById("saveSuccess");
  const saveError = document.getElementById("saveError");
  const keys = [
    "shop_name",
    "shop_address",
    "shop_phone",
    "shop_tax_id",
    "shop_logo",
    "bill_header",
    "bill_footer",
    "bill_number_prefix",
    "tax_rate",
    "point_rate",
    "point_expire_months",
    "currency",
    "theme_color",
  ];

  // โหลด settings
  async function loadSettings() {
    try {
      const res = await fetch("http://localhost:3000/api/settings", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      keys.forEach((key) => {
        if (document.getElementById(key) && data.settings[key] !== undefined) {
          document.getElementById(key).value = data.settings[key];
        }
      });
    } catch (err) {
      saveError.textContent = "โหลดค่าตั้งค่าไม่สำเร็จ";
      saveError.classList.remove("d-none");
    }
  }

  // บันทึก settings
  form.onsubmit = async function (e) {
    e.preventDefault();
    let settings = {};
    keys.forEach((key) => {
      let el = document.getElementById(key);
      if (el) settings[key] = el.value;
    });
    try {
      const res = await fetch("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      saveSuccess.classList.remove("d-none");
      saveError.classList.add("d-none");
      setTimeout(() => saveSuccess.classList.add("d-none"), 2000);
    } catch (err) {
      saveError.textContent = err.message || "เกิดข้อผิดพลาด";
      saveError.classList.remove("d-none");
    }
  };

  loadSettings();
});
