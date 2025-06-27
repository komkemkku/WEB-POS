document.addEventListener("DOMContentLoaded", function () {
  // --- Auth ---
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("userGreeting").innerText = `👤 ${
    name || "ผู้ใช้งาน"
  }`;
  document.getElementById("logoutBtn").onclick = function () {
    localStorage.clear();
    window.location.href = "index.html";
  };

  // --- Backoffice Btn ---
  const backofficeBtn = document.getElementById("backBtn");
  if (role === "admin" || role === "manager") {
    backofficeBtn.style.display = "";
    backofficeBtn.onclick = function () {
      window.location.href = "backoffice.html";
    };
  } else {
    backofficeBtn.style.display = "none";
  }

  // --- Elements ---
  const productList = document.getElementById("productList");
  const productLoading = document.getElementById("productLoading");
  const productNotFound = document.getElementById("productNotFound");
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");
  const paymentAmount = document.getElementById("paymentAmount");
  const changeAmount = document.getElementById("changeAmount");
  const checkoutForm = document.getElementById("checkoutForm");
  const saleSuccess = document.getElementById("saleSuccess");
  const saleError = document.getElementById("saleError");
  const customerSelect = document.getElementById("customerSelect");

  let products = [];
  let cart = [];
  let customers = [];

  const API_URL = "http://localhost:3000/api";
  let accessToken = localStorage.getItem("token") || "";

  // --- Load customers ---
  async function loadCustomers() {
    try {
      const res = await fetch("http://localhost:3000/api/customers", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      customers = data.customers || [];
      customerSelect.innerHTML = '<option value="">- เลือกลูกค้า -</option>';
      customers.forEach((cust) => {
        const opt = document.createElement("option");
        opt.value = cust.id;
        opt.textContent = `${cust.name} (${cust.phone || ""})`;
        customerSelect.appendChild(opt);
      });
    } catch {
      customerSelect.innerHTML = '<option value="">โหลดลูกค้าไม่ได้</option>';
    }
  }

  // --- Load products ---
  async function loadProducts(keyword = "") {
    productList.innerHTML = "";
    productLoading.classList.remove("d-none");
    productNotFound.classList.add("d-none");
    try {
      let url = "http://localhost:3000/api/products";
      if (keyword && keyword.trim() !== "")
        url += `?q=${encodeURIComponent(keyword)}`;
      const res = await fetch(url, {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "โหลดสินค้าล้มเหลว");
      products = (data.products || data).filter(
        (prod) => prod.is_active !== false
      );
      renderProductList();
    } catch (err) {
      productNotFound.innerText = err.message;
      productNotFound.classList.remove("d-none");
    } finally {
      productLoading.classList.add("d-none");
    }
  }

  // --- Render products ---
  function renderProductList() {
    productList.innerHTML = "";
    if (!products.length) {
      productNotFound.classList.remove("d-none");
      return;
    }
    productNotFound.classList.add("d-none");
    products.forEach((prod) => {
      const card = document.createElement("div");
      card.className = "col";
      card.innerHTML = `
        <div class="card h-100 shadow border-0 rounded-4">
          <div class="card-body d-flex flex-column align-items-center">
            <h5 class="card-title text-center">${prod.name}</h5>
            <p class="mb-2 small text-muted">${prod.category_name || "-"}</p>
            <div class="fw-bold text-success fs-5 mb-2">฿${(+prod.sell_price).toFixed(
              2
            )}</div>
            <div class="mb-2 small">คงเหลือ: ${prod.stock_qty}</div>
            <button class="btn btn-sm btn-primary addToCartBtn" ${
              prod.stock_qty <= 0 ? "disabled" : ""
            }>
              <i class="bi bi-cart-plus"></i> หยิบใส่ตะกร้า
            </button>
          </div>
        </div>
      `;
      card.querySelector(".addToCartBtn").onclick = function () {
        addToCart(prod.id);
      };
      productList.appendChild(card);
    });
  }

  // --- Cart functions ---
  function addToCart(productId) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    let item = cart.find((c) => c.id === productId);
    if (item) {
      if (item.qty < prod.stock_qty) item.qty++;
    } else {
      cart.push({ ...prod, qty: 1 });
    }
    renderCart();
  }

  function renderCart() {
    cartList.innerHTML = "";
    if (!cart.length) {
      cartList.innerHTML = `<div class="alert alert-info text-center">ยังไม่มีสินค้าในตะกร้า</div>`;
      cartTotal.innerText = "฿0.00";
      changeAmount.innerText = "฿0.00";
      return;
    }
    cart.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "d-flex align-items-center mb-2";
      row.innerHTML = `
        <span class="flex-grow-1">${item.name}</span>
        <div class="input-group input-group-sm mx-2" style="width:110px;">
          <button class="btn btn-outline-secondary minusBtn" type="button"><i class="bi bi-dash"></i></button>
          <input type="number" class="form-control text-center qtyInput" min="1" max="${
            item.stock_qty
          }" value="${item.qty}">
          <button class="btn btn-outline-secondary plusBtn" type="button"><i class="bi bi-plus"></i></button>
        </div>
        <span style="width:60px;" class="text-end">฿${(
          +item.sell_price * item.qty
        ).toFixed(2)}</span>
        <button class="btn btn-sm btn-danger ms-2 removeBtn"><i class="bi bi-trash"></i></button>
      `;
      // Qty event
      row.querySelector(".minusBtn").onclick = () =>
        updateCartQty(item.id, item.qty - 1);
      row.querySelector(".plusBtn").onclick = () =>
        updateCartQty(item.id, item.qty + 1);
      row.querySelector(".qtyInput").onchange = (e) =>
        updateCartQty(item.id, +e.target.value);
      row.querySelector(".removeBtn").onclick = () => removeCartItem(item.id);
      cartList.appendChild(row);
    });
    cartTotal.innerText = `฿${cart
      .reduce((sum, i) => sum + i.qty * i.sell_price, 0)
      .toFixed(2)}`;
    updateChange();
  }

  function updateCartQty(productId, qty) {
    let item = cart.find((c) => c.id === productId);
    const prod = products.find((p) => p.id === productId);
    if (!item || !prod) return;
    if (qty <= 0) return removeCartItem(productId);
    if (qty > prod.stock_qty) qty = prod.stock_qty;
    item.qty = qty;
    renderCart();
  }

  function removeCartItem(productId) {
    cart = cart.filter((c) => c.id !== productId);
    renderCart();
  }

  function updateChange() {
    let total = cart.reduce((sum, i) => sum + i.qty * i.sell_price, 0);
    let paid = +paymentAmount.value || 0;
    let change = paid - total;
    changeAmount.innerText = change >= 0 ? `฿${change.toFixed(2)}` : "฿0.00";
  }

  paymentAmount.oninput = updateChange;

  // --- Search ---
  searchForm.onsubmit = function (e) {
    e.preventDefault();
    loadProducts(searchInput.value.trim());
  };

  // --- Checkout / Sale ---
  checkoutForm.onsubmit = async function (e) {
    e.preventDefault();
    if (!cart.length) return;
    let total = cart.reduce((sum, i) => sum + i.qty * i.sell_price, 0);
    let paid = +paymentAmount.value || 0;
    if (paid < total) {
      saleError.classList.remove("d-none");
      saleError.innerText = "รับเงินน้อยกว่าราคาสินค้า";
      setTimeout(() => saleError.classList.add("d-none"), 3000);
      return;
    }
    saleError.classList.add("d-none");

    try {
      // ส่งไป backend ให้สอดคล้องกับ sales/sale_items
      const res = await fetch("http://localhost:3000/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          customer_id: customerSelect.value || null,
          payment_method: "เงินสด",
          received_amount: paid,
          change_amount: paid - total,
          total_amount: total,
          sale_items: cart.map((i) => ({
            product_id: i.id,
            quantity: i.qty,
            unit_price: i.sell_price,
            cost_price: i.cost_price,
            total_price: i.qty * i.sell_price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "เกิดข้อผิดพลาด");
      saleSuccess.classList.remove("d-none");
      saleSuccess.innerText = "ขายสินค้าสำเร็จ!";
      setTimeout(() => saleSuccess.classList.add("d-none"), 2000);
      cart = [];
      renderCart();
      paymentAmount.value = "";
      updateChange();
      loadProducts();
    } catch (err) {
      saleError.classList.remove("d-none");
      saleError.innerText = err.message;
      setTimeout(() => saleError.classList.add("d-none"), 3000);
    }
  };

  // --- Initial load ---
  loadProducts();
  loadCustomers();
  renderCart();
});

// --- ส่วนแสดงประวัติการขาย (Sales History) ---
const API_URL = "http://localhost:3000/api";
let accessToken = localStorage.getItem("token") || "";

let salesData = [];
let currentPage = 1;
const pageSize = 10;

document.addEventListener("DOMContentLoaded", async () => {
  await fetchSales();
  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    };
  }
});

async function fetchSales() {
  const res = await fetch(`${API_URL}/sales`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  salesData = Array.isArray(data) ? data : data.sales || [];
  renderSalesTable();
  renderPagination();
}

function renderSalesTable() {
  const tbody = document.getElementById("salesTableBody");
  if (!tbody) return;
  let html = "";
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageSales = salesData.slice(start, end);
  pageSales.forEach((sale) => {
    html += `
      <tr>
        <td>${new Date(sale.sale_datetime).toLocaleString()}</td>
        <td>${sale.receipt_no}</td>
        <td>${sale.customer_name || "-"}</td>
        <td>฿${Number(sale.total_amount).toFixed(2)}</td>
        <td>${sale.user_name || "-"}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="showSaleDetail(${sale.id})">
            <i class="bi bi-file-earmark-text"></i> ดู
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderPagination() {
  const totalPages = Math.ceil(salesData.length / pageSize);
  const pagination = document.getElementById("salesPagination");
  if (!pagination) return;
  let html = "";

  html += `<li class="page-item${currentPage === 1 ? " disabled" : ""}">
    <a class="page-link" href="#" onclick="gotoPage(${currentPage - 1});return false;">&laquo;</a>
  </li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item${currentPage === i ? " active" : ""}">
      <a class="page-link" href="#" onclick="gotoPage(${i});return false;">${i}</a>
    </li>`;
  }

  html += `<li class="page-item${currentPage === totalPages ? " disabled" : ""}">
    <a class="page-link" href="#" onclick="gotoPage(${currentPage + 1});return false;">&raquo;</a>
  </li>`;

  pagination.innerHTML = html;
}

window.gotoPage = function (page) {
  const totalPages = Math.ceil(salesData.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderSalesTable();
  renderPagination();
};

// ดูรายละเอียดบิล
window.showSaleDetail = async function (sale_id) {
  const res = await fetch(`${API_URL}/sales/${sale_id}/receipt`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  renderSaleDetail(data);
};

function renderSaleDetail({ sale, items, settings }) {
  let subtotal = Number(sale.total_amount || 0)
    + Number(sale.discount_amount || 0)
    + Number(sale.redeem_discount || 0);

  let html = `
    <div>
      <b>เลขที่บิล:</b> ${sale.receipt_no}<br>
      <b>วันที่:</b> ${new Date(sale.sale_datetime).toLocaleString()}<br>
      <b>ลูกค้า:</b> ${sale.customer_name || "-"}<br>
      <b>แคชเชียร์:</b> ${sale.user_name || "-"}<br>
    </div>
    <hr>
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>สินค้า</th>
          <th class="text-end">จำนวน</th>
          <th class="text-end">ราคา/หน่วย</th>
          <th class="text-end">รวม</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (i) => `
            <tr>
              <td>${i.product_name}${i.remark ? " (" + i.remark + ")" : ""}</td>
              <td class="text-end">${i.quantity}</td>
              <td class="text-end">฿${Number(i.unit_price).toFixed(2)}</td>
              <td class="text-end">฿${(Number(i.unit_price) * Number(i.quantity)).toFixed(2)}</td>
            </tr>
          `
          )
          .join("")}
      </tbody>
    </table>
    <div class="d-flex justify-content-between"><b>รวม</b><b>฿${subtotal.toFixed(2)}</b></div>
    <div class="d-flex justify-content-between"><span>ส่วนลดโปรโมชัน</span><span>฿${Number(sale.discount_amount || 0).toFixed(2)}</span></div>
    <div class="d-flex justify-content-between"><span>ส่วนลดจากพ้อยท์</span><span>฿${Number(sale.redeem_discount || 0).toFixed(2)} (${sale.redeem_point || 0} พ้อยท์)</span></div>
    <div class="d-flex justify-content-between"><span>รับเงิน</span><span>฿${Number(sale.received_amount).toFixed(2)}</span></div>
    <div class="d-flex justify-content-between"><span>เงินทอน</span><span>฿${Number(sale.change_amount).toFixed(2)}</span></div>
    <hr>
    <div class="d-flex justify-content-between"><span>พ้อยท์ที่ได้รับ</span><span><b>${sale.point || 0}</b> พ้อยท์</span></div>
    <div class="d-flex justify-content-between"><span>พ้อยท์สะสมล่าสุด</span><span><b>${sale.point_total || 0}</b> พ้อยท์</span></div>
  `;
  document.getElementById("saleItems").innerHTML = html;
  const modal = new bootstrap.Modal(document.getElementById("saleDetailModal"));
  modal.show();
}
