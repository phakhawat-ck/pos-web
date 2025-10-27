document.addEventListener("DOMContentLoaded", () => {
  const addShirtForm = document.getElementById("addShirtForm");
  const openAddShirtBtn = document.getElementById("openAddShirtBtn");
  const addShirtModal = document.getElementById("addShirtModal");
  const cancelAddShirt = document.getElementById("cancelAddShirt");
  const addShirtBackdrop = document.getElementById("addShirtBackdrop");
  const modalBox = addShirtModal.querySelector(".relative.z-10");
  const container = document.getElementById("shirt-container");

  // ----------------- ตรวจ session -----------------
  fetch("/api/check-session", { credentials: "include" })
    .then(r => r.json())
    .then(data => {
      if (!data.user) return window.location.href = "/";
      document.getElementById("username").textContent = data.user.username;
      document.getElementById("role").textContent = data.user.role;
      if (data.user.role === "admin") openAddShirtBtn.classList.remove("hidden");
    })
    .catch(err => {
      console.error("Error checking session:", err);
      window.location.href = "/";
    });

  // ----------------- ฟังก์ชันเปิด/ปิด modal -----------------
  function openModal() {
    addShirtModal.classList.remove("opacity-0", "pointer-events-none");
    addShirtModal.classList.add("opacity-100");
    modalBox.classList.replace("scale-95", "scale-100");
    addShirtBackdrop.classList.replace("opacity-0", "opacity-100");
  }

  function closeModal() {
    modalBox.classList.replace("scale-100", "scale-95");
    addShirtModal.classList.remove("opacity-100");
    addShirtModal.classList.add("opacity-0");
    addShirtBackdrop.classList.replace("opacity-100", "opacity-0");
    setTimeout(() => addShirtModal.classList.add("pointer-events-none"), 200);
  }

  openAddShirtBtn.addEventListener("click", () => {
    addShirtForm.reset();
    delete addShirtForm.dataset.editId;
    addShirtForm.querySelector("button[type='submit']").textContent = "Add";
    openModal();
  });

  cancelAddShirt.addEventListener("click", closeModal);
  addShirtBackdrop.addEventListener("click", closeModal);
  modalBox.addEventListener("click", e => e.stopPropagation());

  // ----------------- Submit form (Add / Edit) -----------------
  addShirtForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectedSizes = Array.from(addShirtForm.querySelectorAll("input[name='shirtSize']:checked")).map(i => i.value);
    const customSize = addShirtForm.querySelector("#shirtSizeCustom").value.trim();
    if (customSize) selectedSizes.push(customSize);

    const shirtData = {
      shirt_name: addShirtForm.querySelector("#shirtName").value,
      shirt_size: selectedSizes.join(","),
      shirt_price: parseFloat(addShirtForm.querySelector("#shirtPrice").value),
      shirt_image: addShirtForm.querySelector("#shirtImage").value || null
    };

    const editId = addShirtForm.dataset.editId;
    const url = editId ? `/api/shirts/${editId}` : "/api/shirts";
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(shirtData)
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to submit");

      alert(editId ? "แก้ไขสินค้าสำเร็จ!" : "เพิ่มสินค้าสำเร็จ!");
      addShirtForm.reset();
      delete addShirtForm.dataset.editId;
      addShirtForm.querySelector("button[type='submit']").textContent = "Add";
      closeModal();
      if (typeof loadShirts === "function") {
        loadShirts();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "เกิดข้อผิดพลาด");
    }
  });

  // ----------------- Event Delegation for Edit & Delete -----------------
  container.addEventListener("click", async (e) => {
    const target = e.target;

    // Delete
    if (target.classList.contains("del-btn")) {
      const shirtId = target.dataset.id;
      const card = target.closest(".card");
      if (!shirtId || !card) return;
      if (!confirm("คุณต้องการลบสินค้านี้หรือไม่?")) return;

      try {
        const res = await fetch(`/api/shirts/${shirtId}`, {
          method: "DELETE",
          credentials: "include"
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to delete shirt");
        alert("สินค้านี้ถูกลบเรียบร้อยแล้ว");
        card.remove();
        window.location.reload();

      } catch (err) {
        console.error(err);
        alert(err.message || "ไม่สามารถลบสินค้านี้ได้");
      }
    }

    // Edit
    if (target.classList.contains("edit-btn")) {
      const shirtId = target.dataset.id;
      if (!shirtId) return;

      try {
        const res = await fetch(`/api/shirts/${shirtId}`, { credentials: "include" });
        const shirt = await res.json();
        if (!res.ok) throw new Error(shirt.error || "Failed to fetch shirt data");

        // เติมข้อมูลลง form
        addShirtForm.dataset.editId = shirtId; // ใช้ในการ submit เป็น PUT
        addShirtForm.querySelector("button[type='submit']").textContent = "Update";
        addShirtForm.querySelector("#shirtName").value = shirt.shirt_name;
        addShirtForm.querySelector("#shirtPrice").value = shirt.shirt_price;
        addShirtForm.querySelector("#shirtImage").value = shirt.shirt_image || "";
        addShirtForm.querySelector("#shirtSizeCustom").value = "";

        const checkboxes = addShirtForm.querySelectorAll("input[name='shirtSize']");

        // รีเซ็ตก่อน
        checkboxes.forEach(cb => cb.checked = false);
        addShirtForm.querySelector("#shirtSizeCustom").value = "";

        // เติม checkbox และ custom size
        if (shirt.shirt_size) {
          const sizes = shirt.shirt_size.split(",");
          const customSizes = [];
          sizes.forEach(s => {
            let found = false;
            checkboxes.forEach(cb => {
              if (cb.value === s) {
                cb.checked = true;
                found = true;
              }
            });
            if (!found) {
              customSizes.push(s);
            }
          });
          if (customSizes.length) {
            addShirtForm.querySelector("#shirtSizeCustom").value = customSizes.join(", ");
          }
        }


        // เปิด modal
        openModal();
      } catch (err) {
        console.error(err);
        alert(err.message || "ไม่สามารถดึงข้อมูลสินค้าได้");
      }
    }
  });
});
