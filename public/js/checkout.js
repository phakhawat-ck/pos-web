const cartDropdownItems = document.getElementById("cartDropdownItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const totalItemsEl = document.getElementById("totalItems");

// -----------------------------------------------------------
// 🔹 1. สร้างตัวแปรสถานะส่วนกลาง (Global State)
// -----------------------------------------------------------
let hasItemsInCart = false;
let hasShippingAddress = false;

// -----------------------------------------------------------
// 🔹 2. สร้างฟังก์ชันอัปเดตปุ่มกลาง
// -----------------------------------------------------------
function updatePlaceOrderButtonState() {
  if (hasItemsInCart && hasShippingAddress) {
    // มีทั้งของ และ ที่อยู่: เปิดปุ่ม
    placeOrderBtn.disabled = false;
    placeOrderBtn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    // ขาดอย่างใดอย่างหนึ่ง: ปิดปุ่ม
    placeOrderBtn.disabled = true;
    placeOrderBtn.classList.add("opacity-50", "cursor-not-allowed");
  }
}

async function loadCheckoutData() {
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

    cartDropdownItems.innerHTML = "";

    // --- 1. จัดการกรณีตะกร้าว่าง ---
    if (items.length === 0) {
      cartDropdownItems.innerHTML = `<p class="text-center text-gray-500 py-4">ไม่มีสินค้าในตะกร้า</p>`;
      checkoutTotal.textContent = "0.00";
      if (totalItemsEl) totalItemsEl.textContent = "0";

      // 🔹 3. อัปเดตสถานะ (ไม่มีของ)
      hasItemsInCart = false;
      return;
    }

    // --- 2. จัดการกรณีมีสินค้า ---
    let total = 0;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    items.forEach(item => {
      // ... (โค้ดสร้าง div เหมือนเดิม) ...
       const itemTotal = item.price * item.quantity;
       total += itemTotal;

       const div = document.createElement("div");
       div.className = "flex justify-between items-center p-2 bg-white ";
       div.innerHTML = `
     <div class="flex items-center gap-4 ">
       <span class="text-[20px] font-bold text-indigo-600  text-center">${item.quantity} x </span>
       <div>
         <p class="font-medium">${item.shirtName}</p>
         <p class="text-sm text-gray-500">size: ${item.size}</p>
       </div>
     </div>
     <div class="flex items-center gap-3">
       <p class="font-semibold">${itemTotal.toFixed(2)}฿</p>
       <button class="delete-btn text-red-700 opacity-70 hover:opacity-100 hover:scale-110 transition-all" data-id="${item.id}">
         <i class="fa-solid fa-trash"></i>
       </button>
     </div>
   `;
       cartDropdownItems.appendChild(div);
    });

    // --- 3. อัปเดตยอดรวม ---
    checkoutTotal.textContent = total.toFixed(2);
    if (totalItemsEl) totalItemsEl.textContent = totalQuantity;

    // 🔹 3. อัปเดตสถานะ (มีของ)
    hasItemsInCart = true;

  } catch (err) {
    console.error("โหลดข้อมูลตะกร้าไม่สำเร็จ:", err);
    cartDropdownItems.innerHTML = `<p class="text-center text-red-500 py-4">เกิดข้อผิดพลาดในการโหลดสินค้า</p>`;
    // 🔹 3. อัปเดตสถานะ (ถือว่าไม่มีของ ถ้าโหลดเฟล)
    hasItemsInCart = false;
  } finally {
    // 🔹 4. เรียกฟังก์ชันอัปเดตปุ่มกลาง (ไม่ว่าจะสำเร็จหรือล้มเหลว)
    updatePlaceOrderButtonState();
  }
}

// ... (โค้ด Event Listener ของปุ่มลบ ไม่ต้องแก้) ...
cartDropdownItems.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  if (!confirm("คุณต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?")) return;

  try {
    btn.disabled = true; 
    const res = await fetch(`/api/cart/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await res.json();
    if (res.ok) {
      loadCheckoutData(); 
    } else {
      alert(result.error || "ไม่สามารถลบสินค้าได้");
      btn.disabled = false;
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการลบสินค้า:", err);
    alert("ไม่สามารถลบสินค้าได้");
    btn.disabled = false; 
  }
});


placeOrderBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (res.ok) {
      alert("สั่งซื้อสำเร็จ! ขอบคุณที่ใช้บริการ");
      loadCheckoutData(); 
    } else {
      alert("เกิดข้อผิดพลาด: " + (data.error || data.message || "ไม่สามารถสั่งซื้อได้"));
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการยืนยันการสั่งซื้อ:", err);
    alert("ไม่สามารถสั่งซื้อได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
  }
});


async function loadAddress() {
  try {
    const res = await fetch("/api/address", { credentials: "include" });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "ไม่สามารถโหลดข้อมูลที่อยู่ได้");
    }

    const data = await res.json();
    
    if (!data || !data.fullName) {
      throw new Error("ผู้ใช้ยังไม่ได้กรอกที่อยู่");
    }

    document.getElementById("fullName").textContent = data.fullName;
    document.getElementById("houseNumber").textContent = data.house_number;
    document.getElementById("street").textContent = data.street;
    document.getElementById("city").textContent = data.city;
    document.getElementById("province").textContent = data.province;
    document.getElementById("zipCode").textContent = data.zipCode;
    document.getElementById("phone").textContent = data.phone;

    // 🔹 3. อัปเดตสถานะ (มีที่อยู่)
    hasShippingAddress = true;

  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการโหลดที่อยู่:", err.message);
    document.getElementById("addressContainer").innerHTML = `
      <p class="text-red-500">คุณยังไม่ได้กรอกที่อยู่จัดส่ง</p>
      <a href="/main.html?action=edit_address" class="text-indigo-600 hover:underline">ไปที่หน้าจัดการที่อยู่</a>
    `;
    
    // 🔹 3. อัปเดตสถานะ (ไม่มีที่อยู่)
    hasShippingAddress = false;
  } finally {
    // 🔹 4. เรียกฟังก์ชันอัปเดตปุ่มกลาง (ไม่ว่าจะสำเร็จหรือล้มเหลว)
    updatePlaceOrderButtonState();
  }
}

document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'main.html';
});

document.addEventListener("DOMContentLoaded", () => {
  updatePlaceOrderButtonState(); 
  
  // จากนั้นค่อยโหลดข้อมูล
  loadCheckoutData();
  loadAddress();
});