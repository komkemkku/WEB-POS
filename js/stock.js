document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  if (!token) window.location.href = "/index.html";
  document.getElementById("userGreeting").innerText = `👤 ${name || "ผู้ใช้งาน"}`;
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.clear();
    window.location.href = "/index.html";
  };
  document.getElementById("backofficeBtn").onclick = () => {
    window.location.href = "backoffice.html";
  };

  const productTableBody = document.getElementById("productTableBody");
  const stockProductSelect = document.getElementById("stockProductSelect");
  const stockForm = document.getElementById("stockForm");
  const addStockModal = new bootstrap.Modal(
    document.getElementById("addStockModal")
  );
  const addStockBtn = document.getElementById("addStockBtn");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const stockHistoryModal = new bootstrap.Modal(
    document.getElementById("stockHistoryModal")
  );
  const stockHistoryBody = document.getElementById("stockHistoryBody");
  const productPagination = document.getElementById("productPagination");

  let categories = [];
  let products = [];
  let currentPage = 1;
  const pageSize = 10;
  let totalPages = 1;
  let currentSearch = "";
  let currentCategory = "";

  // โหลดหมวดหมู่
  async function loadCategories() {
    const res = await fetch("http://localhost:3000/api/categories", {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    categories = data.categories || [];
    categoryFilter.innerHTML = `<option value="">ทุกหมวดหมู่</option>`;
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.text = cat.name;
      categoryFilter.appendChild(opt);
    });
  }

  // โหลดสินค้า (pagination + filter)
  async function loadProducts(page = 1) {
    currentSearch = searchInput.value.trim();
    currentCategory = categoryFilter.value;
    let url = `http://localhost:3000/api/products?page=${page}&pageSize=${pageSize}`;
    if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
    if (currentCategory) url += `&category_id=${currentCategory}`;
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    products = data.products || [];
    totalPages = data.totalPages || 1;
    currentPage = data.page || 1;
    renderProductTable();
    renderProductPagination();
    renderProductSelect();
  }

  // ตารางสินค้า
  function renderProductTable() {
    productTableBody.innerHTML = "";
    products.forEach((prod, idx) => {
      const cat = categories.find((c) => c.id == prod.category_id);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1 + (currentPage - 1) * pageSize}</td>
        <td>${prod.barcode || "-"}</td>
        <td>${prod.name}</td>
        <td>${cat ? cat.name : "-"}</td>
        <td>${(+prod.cost_price).toFixed(2)}</td>
        <td>${(+prod.sell_price).toFixed(2)}</td>
        <td class="fw-bold text-primary">${prod.stock_qty}</td>
        <td>${prod.unit || ""}</td>
        <td><button class="btn btn-sm btn-info stockHistoryBtn"><i class="bi bi-clock-history"></i></button></td>
      `;
      tr.querySelector(".stockHistoryBtn").onclick = function () {
        openStockHistoryModal(prod);
      };
      productTableBody.appendChild(tr);
    });
  }

  // Pagination
  function renderProductPagination() {
    if (!productPagination) return;
    let html = "";
    html += `<li class="page-item${
      currentPage === 1 ? " disabled" : ""
    }">
      <a class="page-link" href="#" onclick="return gotoProductPage(${
        currentPage - 1
      })">&laquo;</a>
    </li>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item${
        currentPage === i ? " active" : ""
      }">
        <a class="page-link" href="#" onclick="return gotoProductPage(${i})">${i}</a>
      </li>`;
    }
    html += `<li class="page-item${
      currentPage === totalPages ? " disabled" : ""
    }">
      <a class="page-link" href="#" onclick="return gotoProductPage(${
        currentPage + 1
      })">&raquo;</a>
    </li>`;
    productPagination.innerHTML = html;
  }
  window.gotoProductPage = function (page) {
    if (page < 1 || page > totalPages) return false;
    loadProducts(page);
    return false;
  };

  // Product Select สำหรับ modal เพิ่มสต็อค
  function renderProductSelect() {
    stockProductSelect.innerHTML = "";
    products.forEach((prod) => {
      const opt = document.createElement("option");
      opt.value = prod.id;
      opt.text = `${prod.name} (${prod.barcode || "-"}) [เหลือ ${prod.stock_qty}]`;
      stockProductSelect.appendChild(opt);
    });
  }

  // เปิด modal เพิ่ม/ปรับสต็อค
  addStockBtn.onclick = function () {
    stockForm.reset();
    renderProductSelect();
    addStockModal.show();
  };

  // บันทึกการเพิ่ม/ปรับสต็อค
  stockForm.onsubmit = async function (e) {
    e.preventDefault();
    const prodId = +stockProductSelect.value;
    const qty = +document.getElementById("stockQtyInput").value;
    const changeType = document.getElementById("changeTypeSelect").value;
    const note = document.getElementById("stockNoteInput").value;
    if (!prodId || !qty) {
      alert("กรุณาระบุสินค้าและจำนวน");
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/api/stock-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          product_id: prodId,
          quantity: qty,
          change_type: changeType,
          note,
        }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      addStockModal.hide();
      loadProducts(currentPage);
    } catch (err) {
      alert(err.message);
    }
  };

  // ฟิลเตอร์ & search
  searchInput.oninput = categoryFilter.onchange = function () {
    loadProducts(1);
  };

  // ดูประวัติ (pagination)
  async function openStockHistoryModal(prod) {
    let currentHistoryPage = 1;
    const historyPageSize = 10;
    let totalHistoryPages = 1;

    async function loadHistoryPage(page = 1) {
      const res = await fetch(
        `http://localhost:3000/api/stock-movements?product_id=${prod.id}&page=${page}&pageSize=${historyPageSize}`,
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      const data = await res.json();
      const movements = data.movements || [];
      totalHistoryPages = data.totalPages || 1;
      currentHistoryPage = data.page || 1;

      stockHistoryBody.innerHTML = "";
      movements.forEach((mv) => {
        stockHistoryBody.innerHTML += `
          <tr>
            <td>${mv.created_at ? mv.created_at.split("T")[0] : ""}</td>
            <td>${mv.change_type}</td>
            <td class="fw-bold">${mv.quantity > 0 ? "+" : ""}${mv.quantity}</td>
            <td>${mv.user_name || "-"}</td>
            <td>${mv.note || ""}</td>
          </tr>
        `;
      });

      // Render pagination
      const pagination = document.getElementById("stockHistoryPagination");
      if (pagination) {
        let html = "";
        html += `<li class="page-item${
          currentHistoryPage === 1 ? " disabled" : ""
        }">
          <a class="page-link" href="#" onclick="return gotoStockHistoryPage(${
            currentHistoryPage - 1
          })">&laquo;</a>
        </li>`;
        for (let i = 1; i <= totalHistoryPages; i++) {
          html += `<li class="page-item${
            currentHistoryPage === i ? " active" : ""
          }">
            <a class="page-link" href="#" onclick="return gotoStockHistoryPage(${i})">${i}</a>
          </li>`;
        }
        html += `<li class="page-item${
          currentHistoryPage === totalHistoryPages ? " disabled" : ""
        }">
          <a class="page-link" href="#" onclick="return gotoStockHistoryPage(${
            currentHistoryPage + 1
          })">&raquo;</a>
        </li>`;
        pagination.innerHTML = html;
      }
    }

    window.gotoStockHistoryPage = function (page) {
      if (page < 1 || page > totalHistoryPages) return false;
      loadHistoryPage(page);
      return false;
    };

    await loadHistoryPage(1);
    stockHistoryModal.show();
  }

  // โหลดเริ่มต้น
  loadCategories();
  loadProducts(1);
});
