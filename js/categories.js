document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }
  document.getElementById("userGreeting").innerText = `👤 ${
    name || "ผู้ใช้งาน"
  }`;
  document.getElementById("logoutBtn").addEventListener("click", function () {
    localStorage.clear();
    window.location.href = "/index.html";
  });
  document.getElementById("posBtn").addEventListener("click", function () {
    window.location.href = "main.html";
  });

  // Element
  const categoryTableBody = document.getElementById("categoryTableBody");
  const emptyCategoryAlert = document.getElementById("emptyCategoryAlert");
  const categoryForm = document.getElementById("categoryForm");
  const addCategoryModal = new bootstrap.Modal(
    document.getElementById("addCategoryModal")
  );
  const deleteCategoryModal = new bootstrap.Modal(
    document.getElementById("deleteCategoryModal")
  );
  let categories = [];
  let categoryToDeleteId = null;

  // โหลดหมวดหมู่
  async function loadCategories() {
    categoryTableBody.innerHTML = "";
    emptyCategoryAlert.classList.add("d-none");
    try {
      const res = await fetch("http://localhost:3000/api/categories", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      categories = data.categories || [];
      renderTable();
    } catch (err) {
      emptyCategoryAlert.classList.remove("d-none");
      emptyCategoryAlert.innerText = "เกิดข้อผิดพลาดในการโหลดหมวดหมู่";
    }
  }

  function renderTable() {
    categoryTableBody.innerHTML = "";
    if (!categories.length) {
      emptyCategoryAlert.classList.remove("d-none");
      emptyCategoryAlert.innerHTML =
        '<i class="bi bi-info-circle"></i> ยังไม่มีหมวดหมู่ในระบบ';
      return;
    }
    categories.forEach((cat, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${cat.name}</td>
        <td>
          <span class="badge ${
            cat.is_active ? "bg-success" : "bg-secondary"
          }">${cat.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-warning me-2 editBtn"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger deleteBtn"><i class="bi bi-trash"></i></button>
        </td>
      `;
      // Edit
      tr.querySelector(".editBtn").addEventListener("click", function () {
        openEditCategoryModal(cat);
      });
      // Delete
      tr.querySelector(".deleteBtn").addEventListener("click", function () {
        categoryToDeleteId = cat.id;
        deleteCategoryModal.show();
      });
      categoryTableBody.appendChild(tr);
    });
  }

  // เพิ่ม/แก้ไขหมวดหมู่
  categoryForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("catId").value;
    const body = {
      name: document.getElementById("catName").value.trim(),
      is_active: document.getElementById("catStatus").value === "true",
    };
    try {
      let url = "http://localhost:3000/api/categories";
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
      addCategoryModal.hide();
      categoryForm.reset();
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  });

  // เปิด Modal Edit
  function openEditCategoryModal(cat) {
    document.getElementById("addCategoryModalLabel").innerText =
      "แก้ไขหมวดหมู่";
    document.getElementById("catId").value = cat.id;
    document.getElementById("catName").value = cat.name;
    document.getElementById("catStatus").value = cat.is_active
      ? "true"
      : "false";
    addCategoryModal.show();
  }

  document
    .getElementById("addCategoryModal")
    .addEventListener("hidden.bs.modal", function () {
      categoryForm.reset();
      document.getElementById("catId").value = "";
      document.getElementById("addCategoryModalLabel").innerText =
        "เพิ่มหมวดหมู่";
    });

  // ลบหมวดหมู่
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", async function () {
      if (!categoryToDeleteId) return;
      try {
        const res = await fetch(
          `http://localhost:3000/api/categories/${categoryToDeleteId}`,
          {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token },
          }
        );
        if (!res.ok) throw new Error("ลบหมวดหมู่ไม่สำเร็จ");
        deleteCategoryModal.hide();
        categoryToDeleteId = null;
        loadCategories();
      } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      }
    });

  // โหลดครั้งแรก
  loadCategories();
});
