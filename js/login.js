document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginAlert = document.getElementById("loginAlert");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");

  // Toggle password visibility (ถ้ามี togglePassword)
  if (togglePassword && eyeIcon) {
    togglePassword.addEventListener("click", function () {
      const type = passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = type;
      eyeIcon.className = type === "password" ? "bi bi-eye" : "bi bi-eye-slash";
    });
  }

  // login form submit
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    loginAlert.classList.add("d-none");

    try {
      const response = await fetch("http://api-pos-production-751a.up.railway.app/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (err) {
        data = {};
      }

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("name", data.name);
        localStorage.setItem("role", data.role);
        window.location.href = "/frontend/main.html";
      } else {
        showAlert(data.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (err) {
      showAlert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  });

  // input remove alert
  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener("input", function () {
      loginAlert.classList.add("d-none");
    });
  });

  function showAlert(msg) {
    loginAlert.innerText = msg;
    loginAlert.classList.remove("d-none");
  }
});
