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

  const userTableBody = document.getElementById("userTableBody");
  const emptyUserAlert = document.getElementById("emptyUserAlert");
  const userModal = new bootstrap.Modal(document.getElementById("userModal"));
  const deleteUserModal = new bootstrap.Modal(
    document.getElementById("deleteUserModal")
  );
  const userForm = document.getElementById("userForm");
  const addUserBtn = document.getElementById("addUserBtn");
  let users = [];
  let userToDeleteId = null;
  let editingUserId = null;

  // โหลด users
  async function loadUsers() {
    userTableBody.innerHTML = "";
    emptyUserAlert.classList.add("d-none");
    try {
      const res = await fetch("http://localhost:3000/api/users", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      users = data.users || [];
      renderTable();
    } catch {
      emptyUserAlert.classList.remove("d-none");
      emptyUserAlert.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
  }

  function renderTable() {
    userTableBody.innerHTML = "";
    if (!users.length) {
      emptyUserAlert.classList.remove("d-none");
      emptyUserAlert.innerHTML =
        '<i class="bi bi-info-circle"></i> ยังไม่มีพนักงาน';
      return;
    }
    users.forEach((user, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${user.username}</td>
        <td>${user.name}</td>
        <td>${user.role}</td>
        <td>
          <span class="badge ${user.is_active ? "bg-success" : "bg-secondary"}">
            ${user.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-warning me-2 editBtn"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger deleteBtn"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tr.querySelector(".editBtn").onclick = () => openEditUserModal(user);
      tr.querySelector(".deleteBtn").onclick = () => {
        userToDeleteId = user.id;
        deleteUserModal.show();
      };
      userTableBody.appendChild(tr);
    });
  }

  // Modal เพิ่ม/แก้ไข
  addUserBtn.onclick = function () {
    editingUserId = null;
    userForm.reset();
    document.getElementById("userId").value = "";
    document.getElementById("username").disabled = false;
    document.getElementById("passwordHelp").innerText = "";
    document.getElementById("userModalLabel").innerText = "เพิ่มพนักงาน";
    userModal.show();
  };

  function openEditUserModal(user) {
    editingUserId = user.id;
    userForm.reset();
    document.getElementById("userId").value = user.id;
    document.getElementById("username").value = user.username;
    document.getElementById("username").disabled = true;
    document.getElementById("name").value = user.name;
    document.getElementById("role").value = user.role;
    document.getElementById("isActive").value = user.is_active
      ? "true"
      : "false";
    document.getElementById("password").value = "";
    document.getElementById("passwordHelp").innerText =
      "ไม่ต้องกรอกหากไม่ต้องการเปลี่ยนรหัสผ่าน";
    document.getElementById("userModalLabel").innerText = "แก้ไขพนักงาน";
    userModal.show();
  }

  // บันทึก (เพิ่ม/แก้ไข)
  userForm.onsubmit = async function (e) {
    e.preventDefault();
    const id = document.getElementById("userId").value;
    const body = {
      username: document.getElementById("username").value.trim(),
      name: document.getElementById("name").value.trim(),
      role: document.getElementById("role").value,
      is_active: document.getElementById("isActive").value === "true",
    };
    const password = document.getElementById("password").value;
    if (password) body.password = password;
    try {
      let url = "http://localhost:3000/api/users";
      let method = "POST";
      if (id) {
        url += "/" + id;
        method = "PUT";
      }
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "เกิดข้อผิดพลาด");
      userModal.hide();
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  // ลบ
  document.getElementById("confirmDeleteUserBtn").onclick = async function () {
    if (!userToDeleteId) return;
    try {
      const res = await fetch(
        `http://localhost:3000/api/users/${userToDeleteId}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        }
      );
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      deleteUserModal.hide();
      userToDeleteId = null;
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  // โหลดข้อมูล
  loadUsers();
});
