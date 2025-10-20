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

    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      const div = document.createElement("div");
      div.className = "flex justify-between items-center p-2 bg-white ";
      div.innerHTML = `
        <div>
          <p class="font-medium">${item.shirtName}</p>
          <p class="text-sm text-gray-500">ขนาด: ${item.size} x ${item.quantity}</p>
        </div>
        <p class="font-semibold">${itemTotal.toFixed(2)}฿</p>
        
      `;
      cartDropdownItems.appendChild(div);
    });

    checkoutTotal.textContent = total.toFixed(2);

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

    if (res.ok) {
      alert("สั่งซื้อสำเร็จ! ขอบคุณที่ใช้บริการ");
      window.location.href = "/thank-you"; // หรือ redirect ไปหน้าอื่น
    } else {
      const error = await res.json();
      alert("เกิดข้อผิดพลาด: " + error.message);
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
      <p class="text-red-500">ไม่สามารถโหลดข้อมูลที่อยู่ได้</p>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCheckoutData();
  loadAddress();
});
