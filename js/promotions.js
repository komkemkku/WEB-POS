document.addEventListener("DOMContentLoaded", function () {
  // --- Auth ---
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }
  document.getElementById("userGreeting").innerText = `👤 ${
    name || "ผู้ใช้งาน"
  }`;
  document.getElementById("logoutBtn").onclick = function () {
    localStorage.clear();
    window.location.href = "/index.html";
  };

  // Elements
  const promotionTableBody = document.getElementById("promotionTableBody");
  const emptyPromotionAlert = document.getElementById("emptyPromotionAlert");
  const promotionForm = document.getElementById("promotionForm");
  const addPromotionModal = new bootstrap.Modal(
    document.getElementById("addPromotionModal")
  );
  const deletePromotionModal = new bootstrap.Modal(
    document.getElementById("deletePromotionModal")
  );

  // For modal form
  const promoProductSelect = document.getElementById("promoProductSelect");
  const promoProductList = document.getElementById("promoProductList");
  const rewardList = document.getElementById("rewardList");
  const addRewardBtn = document.getElementById("addRewardBtn");

  let promotions = [];
  let products = [];
  let promoToDeleteId = null;
  let editRewards = [];
  let editPromoItems = [];

  // โหลดสินค้าทั้งหมด
  async function loadProducts() {
    try {
      const res = await fetch("http://localhost:3000/api/products", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      products = data.products || [];
      renderProductSelect();
    } catch {
      promoProductSelect.innerHTML = "<option>โหลดสินค้าไม่ได้</option>";
    }
  }

  // โหลดโปรโมชัน
  async function loadPromotions() {
    promotionTableBody.innerHTML = "";
    emptyPromotionAlert.classList.add("d-none");
    try {
      const res = await fetch("http://localhost:3000/api/promotions", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      promotions = data.promotions || data;
      renderTable();
    } catch {
      emptyPromotionAlert.classList.remove("d-none");
      emptyPromotionAlert.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
  }

  // สร้าง option สำหรับเลือกสินค้าหลายตัว
  function renderProductSelect() {
    promoProductSelect.innerHTML = "";
    products.forEach((prod) => {
      const opt = document.createElement("option");
      opt.value = prod.id;
      opt.text = prod.name + (prod.barcode ? ` (${prod.barcode})` : "");
      promoProductSelect.appendChild(opt);
    });
  }

  // สร้าง list สำหรับสินค้ากำหนดจำนวน
  function renderPromoProductList() {
    promoProductList.innerHTML = "";
    editPromoItems.forEach((item, idx) => {
      const prod = products.find((p) => p.id == item.product_id);
      const prodName = prod ? prod.name : "สินค้าไม่พบ";
      promoProductList.innerHTML += `
        <div class="input-group mb-2">
          <span class="input-group-text">${prodName}</span>
          <input type="number" class="form-control promoQtyInput" data-idx="${idx}" value="${item.quantity}" min="1" style="max-width:90px;">
          <button type="button" class="btn btn-outline-danger btn-sm removePromoItemBtn" data-idx="${idx}"><i class="bi bi-x"></i></button>
        </div>`;
    });
    promoProductList.querySelectorAll(".promoQtyInput").forEach((input) => {
      input.oninput = function () {
        let idx = +this.getAttribute("data-idx");
        let val = +this.value;
        if (val < 1) val = 1;
        editPromoItems[idx].quantity = val;
      };
    });
    promoProductList.querySelectorAll(".removePromoItemBtn").forEach((btn) => {
      btn.onclick = function () {
        editPromoItems.splice(+this.getAttribute("data-idx"), 1);
        renderPromoProductList();
        syncProductSelect();
      };
    });
  }

  // เลือกสินค้าแบบ multiselect
  promoProductSelect.onchange = function () {
    const selected = Array.from(this.selectedOptions).map((opt) => +opt.value);
    // merge กับที่ระบุจำนวนไว้แล้ว (แต่ไม่ซ้ำ)
    selected.forEach((pid) => {
      if (!editPromoItems.find((item) => item.product_id === pid)) {
        editPromoItems.push({ product_id: pid, quantity: 1 });
      }
    });
    // remove อันที่ไม่ได้ select แล้ว
    editPromoItems = editPromoItems.filter((item) =>
      selected.includes(item.product_id)
    );
    renderPromoProductList();
  };

  // sync select (เวลา remove ใน list)
  function syncProductSelect() {
    Array.from(promoProductSelect.options).forEach((opt) => {
      opt.selected = !!editPromoItems.find(
        (item) => item.product_id == opt.value
      );
    });
  }

  // สร้างรายการของรางวัล/ส่วนลด
  function renderRewardList() {
    rewardList.innerHTML = "";
    editRewards.forEach((rw, idx) => {
      let html = `
        <div class="input-group mb-2">
          <select class="form-select rewardTypeSelect" data-idx="${idx}">
            <option value="discount" ${
              rw.reward_type === "discount" ? "selected" : ""
            }>ส่วนลด (บาท)</option>
            <option value="free_product" ${
              rw.reward_type === "free_product" ? "selected" : ""
            }>แถมสินค้า</option>
          </select>
          <input type="number" class="form-control rewardAmountInput" data-idx="${idx}" value="${
        rw.amount
      }" min="1" style="max-width:90px;">
      `;
      if (rw.reward_type === "free_product") {
        html += `
        <select class="form-select rewardProductSelect" data-idx="${idx}" style="max-width:170px;">
          ${products
            .map(
              (p) =>
                `<option value="${p.id}" ${
                  rw.product_id == p.id ? "selected" : ""
                }>${p.name}</option>`
            )
            .join("")}
        </select>
        <input type="number" class="form-control rewardQtyInput" data-idx="${idx}" value="${
          rw.quantity || 1
        }" min="1" style="max-width:80px;">
        `;
      }
      html += `
          <button type="button" class="btn btn-outline-danger btn-sm removeRewardBtn" data-idx="${idx}"><i class="bi bi-x"></i></button>
        </div>
      `;
      rewardList.innerHTML += html;
    });

    // Events
    rewardList.querySelectorAll(".rewardTypeSelect").forEach((sel) => {
      sel.onchange = function () {
        let idx = +this.getAttribute("data-idx");
        editRewards[idx].reward_type = this.value;
        // เปลี่ยนชนิด reset
        if (this.value === "discount") {
          delete editRewards[idx].product_id;
          delete editRewards[idx].quantity;
          editRewards[idx].amount = 1;
        } else {
          editRewards[idx].amount = 1;
          editRewards[idx].product_id = products[0] ? products[0].id : null;
          editRewards[idx].quantity = 1;
        }
        renderRewardList();
      };
    });
    rewardList.querySelectorAll(".rewardAmountInput").forEach((inp) => {
      inp.oninput = function () {
        let idx = +this.getAttribute("data-idx");
        editRewards[idx].amount = +this.value;
      };
    });
    rewardList.querySelectorAll(".rewardProductSelect")?.forEach((sel) => {
      sel.onchange = function () {
        let idx = +this.getAttribute("data-idx");
        editRewards[idx].product_id = +this.value;
      };
    });
    rewardList.querySelectorAll(".rewardQtyInput")?.forEach((inp) => {
      inp.oninput = function () {
        let idx = +this.getAttribute("data-idx");
        editRewards[idx].quantity = +this.value;
      };
    });
    rewardList.querySelectorAll(".removeRewardBtn").forEach((btn) => {
      btn.onclick = function () {
        editRewards.splice(+this.getAttribute("data-idx"), 1);
        renderRewardList();
      };
    });
  }

  // ปุ่มเพิ่มของรางวัล
  addRewardBtn.onclick = function () {
    editRewards.push({ reward_type: "discount", amount: 1 });
    renderRewardList();
  };

  // เปิด modal (เพิ่ม/แก้ไข)
  document.getElementById("addPromotionBtn").onclick = function () {
    promotionForm.reset();
    document.getElementById("promoId").value = "";
    document.getElementById("addPromotionModalLabel").innerText =
      "เพิ่มโปรโมชั่นใหม่";
    editRewards = [];
    editPromoItems = [];
    promoProductSelect.selectedIndex = -1;
    renderPromoProductList();
    renderRewardList();
    addPromotionModal.show();
  };

  // --- render table ---
  function renderTable() {
    promotionTableBody.innerHTML = "";
    if (!promotions.length) {
      emptyPromotionAlert.classList.remove("d-none");
      emptyPromotionAlert.innerHTML =
        '<i class="bi bi-info-circle"></i> ยังไม่มีโปรโมชั่นในระบบ';
      return;
    }
    promotions.forEach((promo, idx) => {
      // แปลงสินค้าเข้าร่วม
      const itemNames = (promo.items || [])
        .map((item) => {
          const prod = products.find((p) => p.id == item.product_id);
          return prod
            ? `${prod.name}${item.quantity > 1 ? " x" + item.quantity : ""}`
            : "สินค้าหาย";
        })
        .join("<br>");
      // แปลงของรางวัล
      const rewardListText = (promo.rewards || [])
        .map((rw) => {
          if (rw.reward_type === "discount") {
            return `ส่วนลด ${rw.amount} บาท`;
          } else if (rw.reward_type === "free_product") {
            const prod = products.find((p) => p.id == rw.product_id);
            return prod
              ? `แถม ${prod.name} x${rw.quantity || 1}`
              : "แถมสินค้าหาย";
          }
          return "-";
        })
        .join("<br>");
      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${promo.name}</td>
      <td>${promo.detail || "-"}</td>
      <td>${itemNames || "-"}</td>
      <td>${rewardListText || "-"}</td>
      <td>${promo.start_date ? promo.start_date.split("T")[0] : "-"}</td>
      <td>${promo.end_date ? promo.end_date.split("T")[0] : "-"}</td>
      <td>
        <span class="badge ${promo.is_active ? "bg-success" : "bg-secondary"}">
          ${promo.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-warning me-2 editBtn"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger deleteBtn"><i class="bi bi-trash"></i></button>
      </td>
    `;
      tr.querySelector(".editBtn").onclick = function () {
        openEditPromotionModal(promo);
      };
      tr.querySelector(".deleteBtn").onclick = function () {
        promoToDeleteId = promo.id;
        deletePromotionModal.show();
      };
      promotionTableBody.appendChild(tr);
    });
  }

  // แก้ไขโปรโมชั่น (โหลดรายละเอียด)
  async function openEditPromotionModal(promo) {
    document.getElementById("addPromotionModalLabel").innerText =
      "แก้ไขโปรโมชั่น";
    document.getElementById("promoId").value = promo.id;
    document.getElementById("promoName").value = promo.name;
    document.getElementById("promoDetail").value = promo.detail || "";
    document.getElementById("promoStartDate").value = promo.start_date
      ? promo.start_date.split("T")[0]
      : "";
    document.getElementById("promoEndDate").value = promo.end_date
      ? promo.end_date.split("T")[0]
      : "";
    document.getElementById("promoStatus").value = promo.is_active
      ? "true"
      : "false";
    // load รายการสินค้า/รางวัล
    let items = [];
    let rewards = [];
    if (promo.items) {
      items = promo.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      }));
      rewards = promo.rewards || [];
    } else {
      const res = await fetch(
        `http://localhost:3000/api/promotions/${promo.id}/detail`,
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      const data = await res.json();
      items = data.items || [];
      rewards = data.rewards || [];
    }
    editPromoItems = items;
    editRewards = rewards;
    // select ใน multiselect
    Array.from(promoProductSelect.options).forEach((opt) => {
      opt.selected = !!editPromoItems.find(
        (item) => item.product_id == opt.value
      );
    });
    renderPromoProductList();
    renderRewardList();
    addPromotionModal.show();
  }

  // บันทึกโปรโมชัน
  promotionForm.onsubmit = async function (e) {
    e.preventDefault();
    // validate
    if (!document.getElementById("promoName").value.trim()) {
      alert("กรุณากรอกชื่อโปรโมชั่น");
      return;
    }
    const id = document.getElementById("promoId").value;
    const body = {
      name: document.getElementById("promoName").value.trim(),
      detail: document.getElementById("promoDetail").value.trim(),
      start_date: document.getElementById("promoStartDate").value,
      end_date: document.getElementById("promoEndDate").value,
      is_active: document.getElementById("promoStatus").value === "true",
      items: editPromoItems.map((i) => ({
        product_id: +i.product_id,
        quantity: +i.quantity,
      })),
      rewards: editRewards.map((rw) => ({
        reward_type: rw.reward_type,
        amount: +rw.amount,
        product_id: rw.product_id ? +rw.product_id : null,
        quantity: rw.quantity ? +rw.quantity : null,
      })),
    };
    try {
      let url = "http://localhost:3000/api/promotions";
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
      addPromotionModal.hide();
      promotionForm.reset();
      loadPromotions();
    } catch (err) {
      alert(err.message);
    }
  };

  // Modal Confirm Delete
  document.getElementById("confirmDeleteBtn").onclick = async function () {
    if (!promoToDeleteId) return;
    try {
      const res = await fetch(
        `http://localhost:3000/api/promotions/${promoToDeleteId}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        }
      );
      if (!res.ok) throw new Error("ลบโปรโมชั่นไม่สำเร็จ");
      deletePromotionModal.hide();
      promoToDeleteId = null;
      loadPromotions();
    } catch (err) {
      alert(err.message);
    }
  };

  // โหลดข้อมูล
  loadProducts();
  loadPromotions();
});
