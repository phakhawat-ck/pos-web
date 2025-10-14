const cartBtn = document.getElementById("cartBtn");
const cartDropdown = document.getElementById("cartDropdown");
const cartDropdownItems = document.getElementById("cartDropdownItems");
const cartCount = document.getElementById("cartCount");

// Toggle dropdown
cartBtn.addEventListener("click", () => {
  cartDropdown.classList.toggle("opacity-0");
  cartDropdown.classList.toggle("pointer-events-none");
});

// โหลดตะกร้าจาก backend และ render ทั้ง badge + dropdown
async function loadCartData() {
  try {
    const res = await fetch("/api/cart", { credentials: "include" });
    const data = await res.json();

    const items = data.items.map(i => ({
      id: i.id,
      shirtName: i.shirtName || i.shirt?.shirt_name,
      size: i.size,
      price: i.price,
      quantity: i.quantity
    }));

    // อัปเดต badge
    cartCount.textContent = items.length;

    // render dropdown
    cartDropdownItems.innerHTML = "";
    if (items.length === 0) {
      cartDropdownItems.innerHTML = `<p class="text-center text-gray-500 py-4">ตะกร้าว่าง</p>`;
      return;
    }

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center p-2 border-b border-gray-100";
      div.innerHTML = `
        <div>
          <p class="font-medium">${item.shirtName}</p>
          <p class="text-sm text-gray-500">ขนาด: ${item.size} x ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold">${item.price}฿</span>
          <button class="remove-btn hover:text-red-700" data-id="${item.id}">
            <i class="fa-solid fa-trash "></i>
          </button>
        </div>
      `;
      cartDropdownItems.appendChild(div);
    });

  } catch (err) {
    console.error("โหลดตะกร้าไม่สำเร็จ:", err);
  }
}

// Event delegation สำหรับปุ่มลบ
cartDropdownItems.addEventListener("click", async (e) => {
  const btn = e.target.closest(".remove-btn");
  if (!btn) return;

  const itemId = parseInt(btn.dataset.id);
  try {
    const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw new Error("ลบไม่สำเร็จ");
    await loadCartData(); // โหลดตะกร้าใหม่หลังลบ
  } catch (err) {
    console.error(err);
    alert("ไม่สามารถลบสินค้าได้");
  }
});

// เริ่มโหลดตอน DOM พร้อม
document.addEventListener("DOMContentLoaded", loadCartData );
