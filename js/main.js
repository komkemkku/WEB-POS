const API_URL = "http://api-pos-production-751a.up.railway.app/api";
let accessToken = localStorage.getItem("token") || "";

let products = [];
let categories = [];
let cart = [];
let promotions = [];
let customers = [];
let selectedPromotion = null;
let cartDiscount = 0;
let customer = null;
let userProfile = null;
let settings = {};
let pointRate = 50; // default
let redeemPoint = 0; // จำนวนพ้อยท์ที่ลูกค้าเลือกใช้
let redeemDiscount = 0; // ส่วนลดที่ได้จากการใช้พ้อยท์

// Loader (กรณีใส่ spinner ภายหลัง)
function showLoading(elId, show = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.toggle("d-none", !show);
}

// ====== Init ======
document.addEventListener("DOMContentLoaded", async () => {
  await checkUserRole();
  await fetchSettings();
  await fetchCategories();
  await fetchProducts();
  await fetchPromotions();
  await fetchCustomers();
  renderCategoryButtons();
  renderProductList();
  renderCustomerSelect();
  renderPromotionSelect();
  renderCart();
  updateChange();
  updateCustomerPointInfo();

  // ค้นหาสินค้า
  const searchInput = document.getElementById("searchInput");
  if (searchInput)
    searchInput.addEventListener("input", debounce(searchProduct, 300));

  // คลิกหมวดหมู่
  const catList = document.getElementById("categoryList");
  if (catList) {
    catList.addEventListener("click", async (e) => {
      if (e.target.classList.contains("category-btn")) {
        document
          .querySelectorAll(".category-btn")
          .forEach((btn) => btn.classList.remove("active", "btn-primary"));
        e.target.classList.add("active", "btn-primary");
        e.target.classList.remove("btn-outline-primary");
        document.querySelectorAll(".category-btn:not(.active)").forEach((b) => {
          b.classList.remove("btn-primary");
          b.classList.add("btn-outline-primary");
        });
        const catId = e.target.getAttribute("data-id");
        await fetchProducts(catId);
        renderCart(); // รีเฟรช cart ด้วย
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    });
  }

  // Checkout
  const btnCheckout = document.getElementById("btnCheckout");
  if (btnCheckout) btnCheckout.onclick = checkout;

  // รับเงิน = เงินทอน
  const receivedAmount = document.getElementById("receivedAmount");
  if (receivedAmount) receivedAmount.addEventListener("input", updateChange);

  // เลือกลูกค้า
  const customerSelect = document.getElementById("customerSelect");
  if (customerSelect)
    customerSelect.addEventListener("change", function () {
      const id = this.value;
      customer = customers.find((c) => String(c.id) === id) || null;
      updateCustomerPointInfo();
      redeemPoint = 0;
      redeemDiscount = 0;
      updateRedeemPointUI();
      calcCartTotal();
    });

  // เลือกโปรโมชัน
  const promotionSelect = document.getElementById("promotionSelect");
  if (promotionSelect)
    promotionSelect.addEventListener("change", function () {
      const id = this.value;
      selectedPromotion = promotions.find((p) => String(p.id) === id) || null;
      calcCartTotal();
    });

  // Greeting
  if (userProfile) {
    const greet = document.getElementById("userGreeting");
    if (greet)
      greet.textContent = `สวัสดี! ${userProfile.name || ""} (${
        userProfile.role || ""
      })`;
  }
});

// ====== Fetch Settings ======
async function fetchSettings() {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach((s) => {
        settings[s.key] = s.value;
      });
    } else if (data.settings) {
      data.settings.forEach((s) => {
        settings[s.key] = s.value;
      });
    }
    if (settings.point_rate) {
      pointRate = parseInt(settings.point_rate) || 50;
    }
  } catch (e) {
    pointRate = 50;
  }
}

// ====== Check Token & Role ======
async function checkUserRole() {
  if (!accessToken) {
    window.location = "/login.html";
    return;
  }
  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Unauthorized");
    const data = await res.json();
    userProfile = data.user || {};
    // แสดงปุ่มหลังบ้าน ถ้า admin หรือ manager
    if (userProfile.role === "admin" || userProfile.role === "manager") {
      const backBtn = document.getElementById("backBtn");
      if (backBtn) {
        backBtn.classList.remove("d-none");
        backBtn.onclick = () => (window.location = "/frontend/backoffice.html");
      }
    }
    const greet = document.getElementById("userGreeting");
    if (greet)
      greet.innerText = `สวัสดี! ${userProfile.name || "ผู้ใช้งาน"} (${
        userProfile.role || ""
      })`;
  } catch {
    window.location = "/login.html";
  }
}

// ====== Debounce ======
function debounce(fn, ms = 500) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ======================== Category =========================
async function fetchCategories() {
  const res = await fetch(`${API_URL}/categories?is_active=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  let arr = Array.isArray(data) ? data : data.categories || [];
  categories = arr.filter((c) => c.is_active);
  renderCategoryButtons();
}

function renderCategoryButtons() {
  const list = document.getElementById("categoryList");
  if (!list) return;
  let html = `
    <button type="button"
      class="btn btn-lg btn-primary btn-category category-btn active me-2 mb-2"
      data-id="">
      <i class="bi bi-layers"></i> ทั้งหมด
    </button>
  `;
  categories.forEach((cat, idx) => {
    html += `
      <button type="button"
        class="btn btn-lg btn-outline-primary btn-category category-btn me-2 mb-2"
        data-id="${cat.id}">
        <i class="bi bi-folder${(idx % 4) + 1}"></i> ${cat.name}
      </button>
    `;
  });
  list.innerHTML = `<div class="d-flex flex-wrap">${html}</div>`;
}

// ======================== Product =========================
async function fetchProducts(categoryId = "", search = "") {
  let url = `${API_URL}/products?is_active=true`;
  if (categoryId) url += `&category_id=${categoryId}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  products = Array.isArray(data) ? data : data.products || [];
  renderProductList(); // สำคัญ! ต้อง render หลัง fetch เสมอ
}

function renderProductList() {
  const list = document.getElementById("productList");
  if (!list) return;
  let html = "";
  if (!products.length) {
    html = `<div class="col-12 text-center text-danger py-4">ไม่พบสินค้า</div>`;
  } else {
    products.forEach((prod) => {
      html += `
        <div class="col">
          <div class="card product-card h-100 shadow-sm border-0" style="cursor:pointer;">
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <h6 class="card-title fw-bold text-dark">${
                  prod.name || "-"
                }</h6>
                <div class="small text-secondary">${prod.barcode || ""}</div>
              </div>
              <div class="d-flex flex-row justify-content-between align-items-end mt-3">
                <span class="fw-bold fs-5 text-success">฿${
                  prod.sell_price !== undefined
                    ? Number(prod.sell_price).toFixed(2)
                    : "0.00"
                }</span>
                <button class="btn btn-outline-success btn-sm rounded-pill px-3"
                  onclick="addToCart(${prod.id}); event.stopPropagation();">
                  <i class="bi bi-plus-circle"></i> เลือก
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }
  list.innerHTML = html;
}

// ======================== Search =========================
async function searchProduct() {
  const searchEl = document.getElementById("searchInput");
  let search = searchEl ? searchEl.value.trim() : "";
  let catBtn = document.querySelector(".category-btn.active");
  let catId = catBtn ? catBtn.getAttribute("data-id") : "";
  await fetchProducts(catId, search);
}

// ====== Cart Functions ======
function addToCart(productId) {
  const prod = products.find((p) => p.id === productId);
  if (!prod) return;
  let idx = cart.findIndex(
    (item) => item.product_id === productId && !item.remark
  );
  if (idx > -1) {
    cart[idx].qty += 1;
  } else {
    cart.push({
      product_id: prod.id,
      name: prod.name,
      price: prod.sell_price,
      qty: 1,
      remark: "",
    });
  }
  renderCart();
}

function removeCart(idx) {
  cart.splice(idx, 1);
  renderCart();
}

function updateCartQty(idx, qty) {
  let q = parseInt(qty);
  if (isNaN(q) || q < 1) q = 1;
  cart[idx].qty = q;
  renderCart();
}

function updateCartRemark(idx, val) {
  cart[idx].remark = val;
}

function clearCart() {
  if (confirm("คุณต้องการยกเลิกบิลหรือไม่?")) {
    cart = [];
    renderCart();
  }
}

function renderCart() {
  const tbody = document.getElementById("cartTableBody");
  if (!tbody) return;
  let html = "";
  cart.forEach((item, idx) => {
    html += `<tr>
      <td>${item.name}</td>
      <td>
        <input type="number" min="1" value="${
          item.qty
        }" class="form-control form-control-sm"
          onchange="updateCartQty(${idx}, this.value)">
      </td>
      <td>
        <input type="text" value="${
          item.remark || ""
        }" class="form-control form-control-sm"
          onchange="updateCartRemark(${idx}, this.value)">
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="removeCart(${idx})"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
  updateRedeemPointUI();
  calcCartTotal();
}

// ====== Fetch Promotions/Customers ======
async function fetchPromotions() {
  const res = await fetch(`${API_URL}/promotions?is_active=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  promotions = Array.isArray(data) ? data : data.promotions || [];
}
async function fetchCustomers() {
  const res = await fetch(`${API_URL}/customers?is_active=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  customers = Array.isArray(data) ? data : data.customers || [];
}
function renderPromotionSelect() {
  const select = document.getElementById("promotionSelect");
  if (!select) return;
  let html = `<option value="">-- ไม่ใช้โปรโมชัน --</option>`;
  promotions.forEach((p) => {
    html += `<option value="${p.id}">${p.name} (${
      p.amount ? "-" + p.amount : ""
    } บาท)</option>`;
  });
  select.innerHTML = html;
}
function renderCustomerSelect() {
  const select = document.getElementById("customerSelect");
  if (!select) return;
  let html = `<option value="">ลูกค้าทั่วไป</option>`;
  customers.forEach((c) => {
    html += `<option value="${c.id}">${
      c.name || c.phone || "รหัส " + c.id
    }</option>`;
  });
  select.innerHTML = html;
}

// ====== Redeem Point ======
function updateRedeemPointUI() {
  const input = document.getElementById("redeemPointInput");
  const btn = document.getElementById("btnRedeemPoint");
  const info = document.getElementById("redeemPointInfo");
  if (!input || !btn || !info) return;

  // ต้องเลือก customer ก่อน
  if (!customer || typeof customer.point === "undefined") {
    input.value = 0;
    input.disabled = true;
    btn.disabled = true;
    info.textContent = "กรุณาเลือกลูกค้าเพื่อใช้พ้อยท์";
    redeemPoint = 0;
    redeemDiscount = 0;
    calcCartTotal();
    return;
  }

  // ดึงค่าจาก settings
  const rate = parseInt(settings.point_redeem_rate) || 10; // เช่น 10 พ้อยท์ = 1 บาท
  const min = parseInt(settings.point_redeem_min) || rate; // ขั้นต่ำ
  const subtotal = cart.reduce((a, b) => a + Number(b.qty) * Number(b.price), 0);
  const usablePoint = Math.min(customer.point, Math.floor(subtotal / (1 / (rate || 1))));

  input.disabled = false;
  btn.disabled = false;
  input.max = usablePoint;
  input.min = min;
  info.textContent = `มีพ้อยท์ ${customer.point} | ใช้ขั้นต่ำ ${min} | ทุก ${rate} พ้อยท์ = 1 บาท | ใช้ได้สูงสุด ${usablePoint}`;

  // ถ้าเคยใช้ ให้แสดงค่าเดิม
  input.value = redeemPoint > 0 ? redeemPoint : 0;
}

// กดปุ่มใช้พ้อยท์
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRedeemPoint");
  const input = document.getElementById("redeemPointInput");
  if (btn && input) {
    btn.onclick = function () {
      const rate = parseInt(settings.point_redeem_rate) || 10;
      const min = parseInt(settings.point_redeem_min) || rate;
      let val = parseInt(input.value) || 0;
      val = Math.max(min, Math.min(val, customer ? customer.point : 0));
      // ปัดเศษลงให้เป็นจำนวนเท่าของ rate
      val = Math.floor(val / rate) * rate;
      redeemPoint = val;
      redeemDiscount = (val / rate);
      input.value = redeemPoint;
      updateRedeemPointUI();
      calcCartTotal();
    };
  }
});

// ====== Cart Summary ======
function calcCartTotal() {
  let subtotal = cart.reduce((a, b) => a + Number(b.qty) * Number(b.price), 0);
  let discount = 0;

  if (selectedPromotion) {
    switch (selectedPromotion.type) {
      case "PERCENT":
        discount = subtotal * (parseFloat(selectedPromotion.amount) / 100);
        break;
      case "BAHT":
        discount = parseFloat(selectedPromotion.amount);
        break;
      case "BUY1GET1":
        cart.forEach((item) => {
          const freeQty = Math.floor(Number(item.qty) / 2);
          discount += freeQty * Number(item.price);
        });
        break;
      default:
        discount = 0;
    }
  }

  cartDiscount = discount;
  let total = Math.max(0, subtotal - discount - redeemDiscount);
  const cartTotal = document.getElementById("cartTotal");
  if (cartTotal) cartTotal.innerText = total.toFixed(2);
  updateChange();
}

// ====== เงินทอน ======
function updateChange() {
  const receivedEl = document.getElementById("receivedAmount");
  const cartTotalEl = document.getElementById("cartTotal");
  const changeEl = document.getElementById("changeAmount");
  if (!receivedEl || !cartTotalEl || !changeEl) return;
  let received = parseFloat(receivedEl.value) || 0;
  let total = parseFloat(cartTotalEl.innerText) || 0;
  let change = received - total;
  changeEl.innerText = change >= 0 ? change.toFixed(2) : "0.00";
}

// ====== Checkout/บันทึกขาย ======
async function checkout() {
  if (!cart.length) return showAlert("saleError", "กรุณาเลือกสินค้า", true);
  const cartTotalEl = document.getElementById("cartTotal");
  const receivedEl = document.getElementById("receivedAmount");
  if (!cartTotalEl || !receivedEl) return;
  const total = parseFloat(cartTotalEl.innerText) || 0;
  const received = parseFloat(receivedEl.value) || 0;
  if (received < total)
    return showAlert("saleError", "รับเงินน้อยกว่ายอดสุทธิ", true);

  // ===== ใช้ pointRate ที่ได้จาก settings =====
  let point = 0;
  if (customer && total >= pointRate) {
    point = Math.floor(total / pointRate);
  }
  // ========================

  let payload = {
    items: cart.map((i) => ({
      product_id: i.product_id,
      qty: i.qty,
      unit_price: i.price,
      remark: i.remark,
    })),
    total_amount: total,
    received_amount: received,
    change_amount: received - total,
    promotion_id: selectedPromotion ? selectedPromotion.id : null,
    discount_amount: selectedPromotion ? cartDiscount : 0,
    customer_id: customer ? customer.id : null,
    payment_method: "cash",
    remark: "",
    point: point,
    redeem_point: redeemPoint,
    redeem_discount: redeemDiscount,
  };

  try {
    const res = await fetch(`${API_URL}/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      // ตัด point ออกจาก customer ฝั่ง client (แสดงผลทันที)
      if (customer && redeemPoint > 0) {
        customer.point = Math.max(0, customer.point - redeemPoint);
        updateCustomerPointInfo();
      }
      showAlert(
        "saleSuccess",
        `ขายสินค้าเรียบร้อย! ลูกค้าได้รับ ${point} พ้อยท์`
      );
      fetchReceipt(data.sale_id);
      cart = [];
      renderCart();
      receivedEl.value = "";
      updateChange();
    } else {
      const data = await res.json();
      showAlert("saleError", data.message || "ผิดพลาด", true);
    }
  } catch (err) {
    showAlert("saleError", err.message || "เกิดข้อผิดพลาด", true);
  }
}

// ====== ใบเสร็จ Modal ======
async function fetchReceipt(sale_id) {
  const res = await fetch(`${API_URL}/sales/${sale_id}/receipt`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.ok) {
    const { sale, items, settings } = await res.json();
    showReceiptModal(sale, items, settings);
  }
}

function showReceiptModal(sale, items, settings) {
  const subtotal =
    sale.subtotal_amount !== undefined && sale.subtotal_amount !== null
      ? Number(sale.subtotal_amount)
      : Number(sale.total_amount || 0) + Number(sale.discount_amount || 0);

  let html = `
    <div class="modal-header">
        <h5 class="modal-title">ใบเสร็จรับเงิน</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
        <div class="text-center mb-2">
            <b>${settings?.shop_name || "ร้านค้า"}</b><br>
            <small>${settings?.shop_address || ""}</small>
        </div>
        <div class="mb-2">
            <b>ลูกค้า:</b> ${sale.customer_name || "-"} 
            ${sale.customer_phone ? `(${sale.customer_phone})` : ""}<br>
            <b>เลขที่บิล:</b> <span>${sale.receipt_no}</span><br>
            <b>วันที่:</b> <span>${new Date(
              sale.sale_datetime
            ).toLocaleString()}</span><br>
            <b>พนักงาน:</b> <span>${sale.user_name || ""}</span>
        </div>
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
                        <td>${i.product_name}${
                      i.remark ? " (" + i.remark + ")" : ""
                    }</td>
                        <td class="text-end">${i.quantity}</td>
                        <td class="text-end">฿${Number(i.unit_price).toFixed(
                          2
                        )}</td>
                        <td class="text-end">฿${(
                          Number(i.unit_price) * Number(i.quantity)
                        ).toFixed(2)}</td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
        <div class="d-flex justify-content-between"><b>รวม</b><b>฿${subtotal.toFixed(
          2
        )}</b></div>
        <div class="d-flex justify-content-between"><span>ส่วนลดโปรโมชัน</span><span>฿${Number(
          sale.discount_amount || 0
        ).toFixed(2)}</span></div>
        <div class="d-flex justify-content-between"><span>ส่วนลดจากพ้อยท์</span><span>฿${Number(
          sale.redeem_discount || 0
        ).toFixed(2)} (${sale.redeem_point || 0} พ้อยท์)</span></div>
        ${
          sale.promotion_name
            ? `<div class="d-flex justify-content-between"><span>โปรโมชัน</span><span>${sale.promotion_name}</span></div>`
            : ""
        }
        <div class="d-flex justify-content-between"><span>รับเงิน</span><span>฿${Number(
          sale.received_amount
        ).toFixed(2)}</span></div>
        <div class="d-flex justify-content-between"><span>เงินทอน</span><span>฿${Number(
          sale.change_amount
        ).toFixed(2)}</span></div>
        <hr>
        <div class="d-flex justify-content-between"><span>พ้อยท์ที่ได้รับ</span><span><b>${
          sale.point || 0
        }</b> พ้อยท์</span></div>
        <div class="d-flex justify-content-between"><span>พ้อยท์สะสมล่าสุด</span><span><b>${
          sale.point_total || 0
        }</b> พ้อยท์</span></div>
    </div>
    <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
        <button class="btn btn-outline-dark" onclick="window.print()">พิมพ์</button>
    </div>
  `;
  const receiptContent = document.getElementById("receiptContent");
  if (receiptContent) receiptContent.innerHTML = html;
  const receiptModal = document.getElementById("receiptModal");
  if (receiptModal) {
    const modal = new bootstrap.Modal(receiptModal);
    modal.show();
    setTimeout(() => window.print(), 500);
  }
}

// ====== Alert Helper ======
function showAlert(elId, msg, isError = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("d-none", false);
  el.classList.toggle("alert-danger", isError);
  el.classList.toggle("alert-success", !isError);
  setTimeout(() => el.classList.add("d-none"), 2500);
}

// สำหรับ event ใน HTML
window.addToCart = addToCart;
window.removeCart = removeCart;
window.updateCartQty = updateCartQty;
window.updateCartRemark = updateCartRemark;
window.clearCart = clearCart;

// ฟังก์ชันใหม่สำหรับอัปเดตข้อมูลพ้อยท์ของลูกค้า
function updateCustomerPointInfo() {
  const info = document.getElementById("customerPointInfo");
  if (!info) return;
  if (customer && typeof customer.point !== "undefined") {
    info.textContent = `พ้อยท์สะสม: ${customer.point} พ้อยท์`;
  } else {
    info.textContent = "";
  }
}

// หลังจากเลือก customer
const customerSelect = document.getElementById("customerSelect");
if (customerSelect)
  customerSelect.addEventListener("change", function () {
    const id = this.value;
    customer = customers.find((c) => String(c.id) === id) || null;
    updateCustomerPointInfo();
    redeemPoint = 0;
    redeemDiscount = 0;
    updateRedeemPointUI();
    calcCartTotal();
  });

// เรียกครั้งแรกหลัง renderCustomerSelect
document.addEventListener("DOMContentLoaded", () => {
  updateCustomerPointInfo();
});
