const cartDropdownItems = document.getElementById("cartDropdownItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");

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

    if (items.length === 0) {
      cartDropdownItems.innerHTML = `<p class="text-center text-gray-500 py-4">ไม่มีสินค้าในตะกร้า</p>`;
      checkoutTotal.textContent = "0.00";
      placeOrderBtn.disabled = true;
      placeOrderBtn.classList.add("opacity-50", "cursor-not-allowed");
      return;
    }

    let total = 0;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalItemsEl = document.getElementById("totalItems");

    items.forEach(item => {
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

    checkoutTotal.textContent = total.toFixed(2);
    totalItemsEl.textContent = totalQuantity;


    // 🔹 เพิ่ม event ลบสินค้า
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("คุณต้องการลบสินค้านี้ออกจากตะกร้าหรือไม่?")) return;

        try {
          const res = await fetch(`/api/cart/${id}`, {
            method: "DELETE",
            credentials: "include",
          });

          const result = await res.json();

          if (res.ok) {
            alert("ลบสินค้าเรียบร้อยแล้ว");
            loadCheckoutData(); // รีโหลดตะกร้าใหม่
          } else {
            alert(result.error || "ไม่สามารถลบสินค้าได้");
          }
        } catch (err) {
          console.error("เกิดข้อผิดพลาดในการลบสินค้า:", err);
          alert("ไม่สามารถลบสินค้าได้");
        }
      });
    });

  } catch (err) {
    console.error("โหลดข้อมูลตะกร้าไม่สำเร็จ:", err);
    cartDropdownItems.innerHTML = `<p class="text-center text-red-500 py-4">เกิดข้อผิดพลาดในการโหลดสินค้า</p>`;
  }
}

// Handle place order button
placeOrderBtn.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await res.json(); // อ่าน json ไม่ว่าจะ ok หรือไม่

    if (res.ok) {
      alert("สั่งซื้อสำเร็จ! ขอบคุณที่ใช้บริการ");
      // ✅ เพิ่มบรรทัดนี้เพื่อรีเฟรชตะกร้า (ให้กลายเป็นว่าง)
      loadCheckoutData();
    } else {
      // ใช้ data.error (ถ้ามี) หรือ data.message
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
    if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลที่อยู่ได้");

    const data = await res.json();


    document.getElementById("fullName").textContent = data.fullName || "-";
    document.getElementById("houseNumber").textContent = data.house_number || "-";
    document.getElementById("street").textContent = data.street || "-";
    document.getElementById("city").textContent = data.city || "-";
    document.getElementById("province").textContent = data.province || "-";
    document.getElementById("zipCode").textContent = data.zipCode || "-";
    document.getElementById("phone").textContent = data.phone || "-";

  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการโหลดที่อยู่:", err);
    document.getElementById("addressContainer").innerHTML = `
      <p class="text-red-500">ไม่สามารถโหลดข้อมูลที่อยู่ได้ กรุณากรอกที่อยู่ก่อน</p>
    `;
    placeOrderBtn.disabled = true;
    placeOrderBtn.classList.add("opacity-50", "cursor-not-allowed");
  }
}

document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'main.html';
});

document.addEventListener("DOMContentLoaded", () => {
  loadCheckoutData();
  loadAddress();
});
