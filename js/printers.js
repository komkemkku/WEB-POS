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

  const printerTableBody = document.getElementById("printerTableBody");
  const emptyPrinterAlert = document.getElementById("emptyPrinterAlert");
  const addPrinterModal = new bootstrap.Modal(
    document.getElementById("addPrinterModal")
  );
  const deletePrinterModal = new bootstrap.Modal(
    document.getElementById("deletePrinterModal")
  );
  const printerForm = document.getElementById("printerForm");

  let printers = [];
  let printerToDeleteId = null;

  async function loadPrinters() {
    printerTableBody.innerHTML = "";
    emptyPrinterAlert.classList.add("d-none");
    try {
      const res = await fetch("http://localhost:3000/api/printers", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      printers = data.printers || data;
      renderTable();
    } catch {
      emptyPrinterAlert.classList.remove("d-none");
      emptyPrinterAlert.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
  }

  function renderTable() {
    printerTableBody.innerHTML = "";
    if (!printers.length) {
      emptyPrinterAlert.classList.remove("d-none");
      emptyPrinterAlert.innerHTML =
        '<i class="bi bi-info-circle"></i> ยังไม่มีเครื่องพิมพ์ในระบบ';
      return;
    }
    printers.forEach((printer, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${printer.name}</td>
        <td>${printer.type}</td>
        <td>${printer.connection}</td>
        <td>
          <span class="badge ${
            printer.is_active ? "bg-success" : "bg-secondary"
          }">
            ${printer.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-warning me-2 editBtn"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger deleteBtn"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tr.querySelector(".editBtn").onclick = function () {
        openEditPrinterModal(printer);
      };
      tr.querySelector(".deleteBtn").onclick = function () {
        printerToDeleteId = printer.id;
        deletePrinterModal.show();
      };
      printerTableBody.appendChild(tr);
    });
  }

  document.getElementById("addPrinterBtn").onclick = function () {
    printerForm.reset();
    document.getElementById("printerId").value = "";
    document.getElementById("addPrinterModalLabel").innerText =
      "เพิ่มเครื่องพิมพ์";
    addPrinterModal.show();
  };

  function openEditPrinterModal(printer) {
    document.getElementById("addPrinterModalLabel").innerText =
      "แก้ไขเครื่องพิมพ์";
    document.getElementById("printerId").value = printer.id;
    document.getElementById("printerName").value = printer.name;
    document.getElementById("printerType").value = printer.type;
    document.getElementById("printerConnection").value = printer.connection;
    document.getElementById("printerStatus").value = printer.is_active
      ? "true"
      : "false";
    addPrinterModal.show();
  }

  printerForm.onsubmit = async function (e) {
    e.preventDefault();
    const id = document.getElementById("printerId").value;
    const body = {
      name: document.getElementById("printerName").value.trim(),
      type: document.getElementById("printerType").value,
      connection: document.getElementById("printerConnection").value.trim(),
      is_active: document.getElementById("printerStatus").value === "true",
    };
    try {
      let url = "http://localhost:3000/api/printers";
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
      addPrinterModal.hide();
      printerForm.reset();
      loadPrinters();
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById("confirmDeletePrinterBtn").onclick =
    async function () {
      if (!printerToDeleteId) return;
      try {
        const res = await fetch(
          `http://localhost:3000/api/printers/${printerToDeleteId}`,
          {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token },
          }
        );
        if (!res.ok) throw new Error("ลบเครื่องพิมพ์ไม่สำเร็จ");
        deletePrinterModal.hide();
        printerToDeleteId = null;
        loadPrinters();
      } catch (err) {
        alert(err.message);
      }
    };

  loadPrinters();
});
