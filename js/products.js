document.addEventListener("DOMContentLoaded", function () {
  // --- Security ---
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

  // --- Elements ---
  const productTableBody = document.getElementById("productTableBody");
  const emptyProductAlert = document.getElementById("emptyProductAlert");
  const productForm = document.getElementById("productForm");
  const addProductModal = new bootstrap.Modal(
    document.getElementById("addProductModal")
  );
  const deleteProductModal = new bootstrap.Modal(
    document.getElementById("deleteProductModal")
  );
  const prodCategory = document.getElementById("prodCategory");
  let products = [];
  let categories = [];
  let productToDeleteId = null;

  // --- ปุ่มสุ่มบาร์โค้ด ---
  document
    .getElementById("generateBarcodeBtn")
    .addEventListener("click", function () {
      document.getElementById("prodBarcode").value = generateBarcode();
      document.getElementById("prodBarcode").classList.remove("is-invalid");
      document.getElementById("barcodeError").innerText = "";
    });

  function generateBarcode() {
    let code = "";
    for (let i = 0; i < 12; i++) code += Math.floor(Math.random() * 10);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +code[i] * (i % 2 === 0 ? 1 : 3);
    let checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  }

  // --- โหลดหมวดหมู่จาก API (แสดงเฉพาะที่ is_active = true) ---
  async function loadCategories(selectedId) {
    prodCategory.innerHTML = '<option value="">-- เลือกประเภท --</option>';
    try {
      const res = await fetch(
        "http://localhost:3000/api/categories?activeOnly=true",
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      const data = await res.json();
      categories = data.categories || data;
      categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        if (selectedId && +selectedId === cat.id) option.selected = true;
        prodCategory.appendChild(option);
      });
    } catch {
      prodCategory.innerHTML =
        '<option value="">โหลดประเภทสินค้าไม่สำเร็จ</option>';
    }
  }

  // --- โหลดสินค้าจาก API ---
  async function loadProducts() {
    productTableBody.innerHTML = "";
    emptyProductAlert.classList.add("d-none");
    try {
      const res = await fetch("http://localhost:3000/api/products", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      products = data.products || data;
      renderTable();
    } catch (err) {
      emptyProductAlert.classList.remove("d-none");
      emptyProductAlert.innerText = "เกิดข้อผิดพลาดในการโหลดสินค้า";
    }
  }

  function renderTable() {
    productTableBody.innerHTML = "";
    if (!products.length) {
      emptyProductAlert.classList.remove("d-none");
      emptyProductAlert.innerHTML =
        '<i class="bi bi-info-circle"></i> ยังไม่มีสินค้าในระบบ';
      return;
    }
    products.forEach((prod, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${prod.barcode || "-"}</td>
        <td>${prod.name}</td>
        <td>${prod.category_name || "-"}</td>
        <td>${prod.unit || "-"}</td>
        <td>฿${(+prod.cost_price).toFixed(2)}</td>
        <td>฿${(+prod.sell_price).toFixed(2)}</td>
        <td>${prod.stock_qty}</td>
        <td>
          ${
            prod.image_url
              ? `<img src="${prod.image_url}" alt="" style="max-width:40px;max-height:40px;">`
              : "-"
          }
        </td>
        <td>
          <span class="badge ${prod.is_active ? "bg-success" : "bg-secondary"}">
            ${prod.is_active ? "เปิดขาย" : "ปิดขาย"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-warning me-2 editBtn"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger deleteBtn"><i class="bi bi-trash"></i></button>
        </td>
      `;
      // เพิ่ม event edit, delete
      tr.querySelector(".editBtn").addEventListener("click", function () {
        openEditProductModal(prod);
      });
      tr.querySelector(".deleteBtn").addEventListener("click", function () {
        productToDeleteId = prod.id;
        deleteProductModal.show();
      });
      productTableBody.appendChild(tr);
    });
  }

  // --- Modal เพิ่ม/แก้ไข สินค้า ---
  document
    .getElementById("addProductBtn")
    .addEventListener("click", function () {
      productForm.reset();
      document.getElementById("prodId").value = "";
      document.getElementById("addProductModalLabel").innerText =
        "เพิ่มสินค้าใหม่";
      document.getElementById("prodBarcode").classList.remove("is-invalid");
      document.getElementById("barcodeError").innerText = "";
      loadCategories();
      addProductModal.show();
    });

  // --- เพิ่ม/แก้ไข สินค้า ---
  productForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("prodId").value;
    const barcode = document.getElementById("prodBarcode").value.trim();

    // --- ตรวจสอบบาร์โค้ดซ้ำ ---
    if (barcode) {
      const check = await fetch(
        `http://localhost:3000/api/products/barcode/${barcode}${
          id ? `?exclude=${id}` : ""
        }`,
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      const checkData = await check.json();
      if (check.ok && checkData.duplicate) {
        document.getElementById("barcodeError").innerText =
          "บาร์โค้ดนี้มีในระบบแล้ว";
        document.getElementById("prodBarcode").classList.add("is-invalid");
        return;
      } else {
        document.getElementById("barcodeError").innerText = "";
        document.getElementById("prodBarcode").classList.remove("is-invalid");
      }
    }

    const body = {
      barcode: barcode,
      name: document.getElementById("prodName").value.trim(),
      category_id: document.getElementById("prodCategory").value || null,
      unit: document.getElementById("prodUnit").value.trim(),
      cost_price: +document.getElementById("prodCostPrice").value || 0,
      sell_price: +document.getElementById("prodSellPrice").value || 0,
      stock_qty: +document.getElementById("prodStock").value || 0,
      image_url: document.getElementById("prodImageUrl").value.trim(),
      is_active: document.getElementById("prodStatus").value === "true",
    };
    try {
      let url = "http://localhost:3000/api/products";
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
      addProductModal.hide();
      productForm.reset();
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  });

  // --- เปิด Modal แก้ไข ---
  function openEditProductModal(prod) {
    document.getElementById("addProductModalLabel").innerText = "แก้ไขสินค้า";
    document.getElementById("prodId").value = prod.id;
    document.getElementById("prodBarcode").value = prod.barcode || "";
    document.getElementById("prodBarcode").classList.remove("is-invalid");
    document.getElementById("barcodeError").innerText = "";
    document.getElementById("prodName").value = prod.name;
    loadCategories(prod.category_id);
    document.getElementById("prodUnit").value = prod.unit || "";
    document.getElementById("prodCostPrice").value = prod.cost_price || "";
    document.getElementById("prodSellPrice").value = prod.sell_price;
    document.getElementById("prodStock").value = prod.stock_qty;
    document.getElementById("prodImageUrl").value = prod.image_url || "";
    document.getElementById("prodStatus").value = prod.is_active
      ? "true"
      : "false";
    addProductModal.show();
  }

  // --- Modal ปิด ต้อง reset form ---
  document
    .getElementById("addProductModal")
    .addEventListener("hidden.bs.modal", function () {
      productForm.reset();
      document.getElementById("prodId").value = "";
      document.getElementById("addProductModalLabel").innerText =
        "เพิ่มสินค้าใหม่";
      document.getElementById("prodBarcode").classList.remove("is-invalid");
      document.getElementById("barcodeError").innerText = "";
    });

  // --- ลบสินค้า ---
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", async function () {
      if (!productToDeleteId) return;
      try {
        const res = await fetch(
          `http://localhost:3000/api/products/${productToDeleteId}`,
          {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token },
          }
        );
        if (!res.ok) throw new Error("ลบสินค้าไม่สำเร็จ");
        deleteProductModal.hide();
        productToDeleteId = null;
        loadProducts();
      } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      }
    });

  // --- โหลดสินค้าแรกเข้า ---
  loadProducts();
});
