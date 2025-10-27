document.addEventListener("DOMContentLoaded", () => {
  const addShirtForm = document.getElementById("addShirtForm");
  const openAddShirtBtn = document.getElementById("openAddShirtBtn");
  const addShirtModal = document.getElementById("addShirtModal");
  const cancelAddShirt = document.getElementById("cancelAddShirt");
  const addShirtBackdrop = document.getElementById("addShirtBackdrop");
  const modalBox = addShirtModal.querySelector(".relative.z-10"); // ตัว box ของ modal

  // ตรวจ session
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

  // เปิด modal
  openAddShirtBtn.addEventListener("click", () => {
    addShirtModal.classList.remove("opacity-0", "pointer-events-none");
    addShirtModal.classList.add("opacity-100");
    modalBox.classList.replace("scale-95", "scale-100");
    addShirtBackdrop.classList.replace("opacity-0", "opacity-100");
  });

  // ปิด modal
  function closeModal() {
    modalBox.classList.replace("scale-100", "scale-95");
    addShirtModal.classList.remove("opacity-100");
    addShirtModal.classList.add("opacity-0");
    addShirtBackdrop.classList.replace("opacity-100", "opacity-0");
    setTimeout(() => addShirtModal.classList.add("pointer-events-none"), 200);
  }

  // ปุ่ม cancel
  cancelAddShirt.addEventListener("click", closeModal);

  // คลิก backdrop ปิด modal
  addShirtBackdrop.addEventListener("click", closeModal);

  // หยุด propagation เมื่อคลิกใน box
  modalBox.addEventListener("click", e => e.stopPropagation());

  // Submit form
  addShirtForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newShirt = {
      shirt_name: document.getElementById("shirtName").value,
      shirt_size: document.getElementById("shirtSize").value,
      shirt_price: parseFloat(document.getElementById("shirtPrice").value),
      shirt_image: document.getElementById("shirtImage").value || null
    };

    try {
      const res = await fetch("/api/shirts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newShirt)
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok) return alert("Error adding shirt: " + (data.error || res.status));

      alert("Shirt added successfully!");
      addShirtForm.reset();
      closeModal();
      if (typeof loadShirts === "function") loadShirts();
    } catch (err) {
      alert("Error adding shirt: " + err.message);
    }
  });
});
