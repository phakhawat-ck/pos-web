// ====================== CART.JS (Refactored) ======================
// ไฟล์นี้เป็น "ศูนย์กลาง" จัดการ UI ตะกร้าทั้งหมด (Dropdown, Badge, Delete)

// --- 1. ดึง Element ของตะกร้าทั้งหมด ---
const cartBtn = document.getElementById("cartBtn");
const cartDropdown = document.getElementById("cartDropdown");
const cartDropdownItems = document.getElementById("cartDropdownItems");
const cartCount = document.getElementById("cartCount");
const cartDropdownCount = document.getElementById("cartDropdownCount");
const cartDropdownTotal = document.getElementById("cartDropdownTotal");

// --- 2. Logic การเปิด/ปิด Dropdown ---
if (cartBtn) {
  cartBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // ป้องกัน event bubble ไป document
    cartDropdown.classList.toggle("opacity-0");
    cartDropdown.classList.toggle("pointer-events-none");
  });
}

// ปิด dropdown เมื่อคลิกข้างนอก
document.addEventListener("click", (e) => {
  if (cartDropdown && !cartDropdown.contains(e.target) && e.target !== cartBtn) {
    cartDropdown.classList.add("opacity-0");
    cartDropdown.classList.add("pointer-events-none");
  }
});

// --- 3. ฟังก์ชันหลัก: โหลดและวาด UI ตะกร้า ---
/**
 * ฟังก์ชันนี้จะดึงข้อมูลตะกร้าจาก Backend
 * และอัปเดต UI ทุกส่วนที่เกี่ยวข้อง (Badge, Dropdown list, Total price)
 * (ประกาศเป็น Global Function ให้ไฟล์อื่นเรียกใช้ได้)
 */
async function loadCartData() {
  // ตรวจสอบว่ามี Element ตะกร้าในหน้านี้หรือไม่
  if (!cartCount || !cartDropdownItems) {
    // console.log("Cart UI elements not found on this page.");
    return;
  }

  try {
    const res = await fetch("/api/cart", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch cart data");

    const data = await res.json();
    const items = data.items || [];

    // Map ข้อมูล (เผื่อ server ส่งมาไม่ตรง)
    const mappedItems = items.map(i => ({
      id: i.id,
      shirtName: i.shirtName || i.shirt?.shirt_name,
      size: i.size,
      price: i.price,
      quantity: i.quantity
    }));

    // --- คำนวณยอดรวม (จาก shop.js เดิม) ---
    const totalQuantity = mappedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = mappedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // --- อัปเดต UI ทุกส่วน ---
    cartCount.textContent = totalQuantity;
    if (cartDropdownCount) cartDropdownCount.textContent = totalQuantity;
    if (cartDropdownTotal) cartDropdownTotal.textContent = totalPrice.toFixed(2); // .toFixed(2) เพื่อให้เป็นทศนิยม 2 ตำแหน่ง

    // --- วาดรายการใน Dropdown ---
    cartDropdownItems.innerHTML = "";
    if (mappedItems.length === 0) {
      cartDropdownItems.innerHTML = `<p class="text-center text-gray-500 py-4">ตะกร้าว่าง</p>`;
      return;
    }

    mappedItems.forEach(item => {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center p-2 border-b border-gray-100";
      div.innerHTML = `
        <div>
          <p class="font-medium">${item.shirtName}</p>
          <p class="text-sm text-gray-500">ขนาด: ${item.size} x ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold">${item.price}฿</span>
          <button class="remove-btn text-red-500 hover:text-red-700" data-id="${item.id}">
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

// --- 4. Logic การลบสินค้า (Event Delegation) ---
if (cartDropdownItems) {
  cartDropdownItems.addEventListener("click", async (e) => {
    const btn = e.target.closest(".remove-btn");
    if (!btn) return;

    const itemId = parseInt(btn.dataset.id);
    
    // Disable ปุ่มชั่วคราว
    btn.disabled = true;
    btn.classList.add("opacity-50");

    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok && res.status !== 404) {
        const errorData = await res.json();
        throw new Error(errorData.error || "ลบไม่สำเร็จ (Server Error)");
      }
      
      // ✅ ลบสำเร็จ: โหลดตะกร้าใหม่ทั้งหมด
      await loadCartData(); 
      
    } catch (err) {
      console.error(err);
      alert(err.message || "ไม่สามารถลบสินค้าได้");
      // คืนค่าปุ่มถ้าลบไม่สำเร็จ
      btn.disabled = false;
      btn.classList.remove("opacity-50");
    }
  });
}

// --- 5. โหลดตะกร้าครั้งแรกเมื่อหน้าเว็บพร้อม ---
document.addEventListener("DOMContentLoaded", loadCartData);