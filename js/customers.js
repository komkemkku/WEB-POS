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

  // Elements
  const customerTableBody = document.getElementById("customerTableBody");
  const emptyCustomerAlert = document.getElementById("emptyCustomerAlert");
  const customerForm = document.getElementById("customerForm");
  const addCustomerModal = new bootstrap.Modal(
    document.getElementById("addCustomerModal")
  );
  const deleteCustomerModal = new bootstrap.Modal(
    document.getElementById("deleteCustomerModal")
  );
  const searchInput = document.getElementById("searchInput");
  let customers = [];
  let customerToDeleteId = null;

  // Load customers
  async function loadCustomers() {
    customerTableBody.innerHTML = "";
    emptyCustomerAlert.classList.add("d-none");
    try {
      const res = await fetch("http://localhost:3000/api/customers", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      customers = data.customers || data;
      renderTable(customers);
    } catch {
      emptyCustomerAlert.classList.remove("d-none");
      emptyCustomerAlert.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
  }

  function renderTable(data) {
    customerTableBody.innerHTML = "";
    if (!data.length) {
      emptyCustomerAlert.classList.remove("d-none");
      emptyCustomerAlert.innerHTML =
        '<i class="bi bi-info-circle"></i> ยังไม่มีข้อมูลลูกค้า';
      return;
    }
    data.forEach((cust, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${cust.name}</td>
        <td>${cust.phone || "-"}</td>
        <td>${cust.email || "-"}</td>
        <td>${cust.point || 0}</td>
        <td>${
          cust.created_at
            ? new Date(cust.created_at).toLocaleDateString("th-TH")
            : "-"
        }</td>
        <td>
          <button class="btn btn-sm btn-warning me-2 editBtn"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger deleteBtn"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tr.querySelector(".editBtn").onclick = function () {
        openEditCustomerModal(cust);
      };
      tr.querySelector(".deleteBtn").onclick = function () {
        customerToDeleteId = cust.id;
        deleteCustomerModal.show();
      };
      customerTableBody.appendChild(tr);
    });
  }

  // ค้นหาลูกค้า
  searchInput.addEventListener("input", function () {
    const keyword = searchInput.value.trim().toLowerCase();
    if (!keyword) return renderTable(customers);
    const filtered = customers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(keyword) ||
        (c.phone || "").includes(keyword) ||
        (c.email || "").toLowerCase().includes(keyword)
    );
    renderTable(filtered);
  });

  // Modal เพิ่ม/แก้ไข
  document.getElementById("addCustomerBtn").onclick = function () {
    customerForm.reset();
    document.getElementById("custId").value = "";
    document.getElementById("addCustomerModalLabel").innerText =
      "เพิ่มลูกค้าใหม่";
    addCustomerModal.show();
  };

  customerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("custId").value;
    const body = {
      name: document.getElementById("custName").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      email: document.getElementById("custEmail").value.trim(),
      point: +document.getElementById("custPoint").value || 0,
    };
    try {
      let url = "http://localhost:3000/api/customers";
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
      addCustomerModal.hide();
      customerForm.reset();
      loadCustomers();
    } catch (err) {
      alert(err.message);
    }
  });

  function openEditCustomerModal(cust) {
    document.getElementById("addCustomerModalLabel").innerText =
      "แก้ไขข้อมูลลูกค้า";
    document.getElementById("custId").value = cust.id;
    document.getElementById("custName").value = cust.name;
    document.getElementById("custPhone").value = cust.phone || "";
    document.getElementById("custEmail").value = cust.email || "";
    document.getElementById("custPoint").value = cust.point || 0;
    addCustomerModal.show();
  }

  // Modal ปิด reset form
  document
    .getElementById("addCustomerModal")
    .addEventListener("hidden.bs.modal", function () {
      customerForm.reset();
      document.getElementById("custId").value = "";
      document.getElementById("addCustomerModalLabel").innerText =
        "เพิ่มลูกค้าใหม่";
    });

  // ลบลูกค้า
  document.getElementById("confirmDeleteBtn").onclick = async function () {
    if (!customerToDeleteId) return;
    try {
      const res = await fetch(
        `http://localhost:3000/api/customers/${customerToDeleteId}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token },
        }
      );
      if (!res.ok) throw new Error("ลบลูกค้าไม่สำเร็จ");
      deleteCustomerModal.hide();
      customerToDeleteId = null;
      loadCustomers();
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  // โหลดลูกค้าแรกเข้า
  loadCustomers();
});
