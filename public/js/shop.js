
// ====================== SHOP.JS ======================

// รอ DOM โหลดก่อน
document.addEventListener("DOMContentLoaded", () => {
    loadShirts();
    loadCartFromBackend();
});

// ---------------------- โหลดเสื้อ ----------------------
async function loadShirts() {
    try {
        const res = await fetch("/api/shirts", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch shirts");

        const shirts = await res.json();
        const container = document.getElementById("shirt-container");
        container.innerHTML = "";

        // Fetch user role (admin or not)
        const sessionRes = await fetch("/api/check-session", { credentials: "include" });
        const sessionData = await sessionRes.json();
        const user = sessionData.user;
        const isAdmin = user && user.role === "admin"; // Assuming the user object has a `role` property

        shirts.forEach(shirt => {
            const card = document.createElement("div");
            card.className = "card w-[250px] overflow-hidden flex flex-col m-5 transform hover:scale-110 transition-transform duration-500";

            const sizes = shirt.shirt_size ? shirt.shirt_size.split(",") : [];

            card.innerHTML = `
        <div class="img flex-1 bg-amber-950 flex items-center justify-center w-[250px] h-[360px]">
          <img src="${shirt.shirt_image || 'https://placehold.co/250x360.png'}"
               alt="${shirt.shirt_name}" class="object-cover h-full w-full">
        </div>

        <div class="det p-2 flex flex-col justify-between">
          <div class="name">
            <p class="font-bold text-black text-lg">${shirt.shirt_name}</p>
          </div>

          <div class="flex items-center gap-2 mt-2">
            <div class="size flex gap-2">
              ${sizes.map(size => `<button class="size-btn border px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200">${size}</button>`).join("")}
            </div>
            <button class="add-to-cart ml-auto bg-blue-600 text-white rounded-md px-3 py-1 transition-all duration-300 transform opacity-0 scale-90 pointer-events-none">+</button>
          </div>

          <div class="pr mt-2">
            <p class="text-black/70 font-semibold text-lg">$ ${shirt.shirt_price}</p>
          </div>
          
          ${isAdmin ? `
            <div class="admin-actions flex gap-2 mt-2">
              <button class="edit-btn bg-yellow-500 text-white rounded-md px-3 py-1" data-id="${shirt.id}">Edit</button>
              <button class="del-btn bg-red-500 text-white rounded-md px-3 py-1" data-id="${shirt.id}">Delete</button>
            </div>
          ` : ""}
        </div>
      `;

            container.appendChild(card);

            // ----------------- เลือก size -----------------
            const sizeButtons = card.querySelectorAll(".size-btn");
            const addBtn = card.querySelector(".add-to-cart");
            let selectedSize = null;

            sizeButtons.forEach(btn => {
                btn.addEventListener("click", () => {
                    sizeButtons.forEach(b => b.classList.remove("bg-gray-600", "text-white"));
                    btn.classList.add("bg-gray-600", "text-white");
                    selectedSize = btn.textContent;

                    addBtn.classList.remove("pointer-events-none", "opacity-0", "scale-90");
                    addBtn.classList.add("opacity-100", "scale-100");
                });
            });

            // ----------------- Add to Cart -----------------
            addBtn.addEventListener("click", async () => {
                if (!selectedSize) return alert("กรุณาเลือกขนาดก่อนเพิ่มลงตะกร้า");

                try {
                    const res = await fetch("/api/add-to-cart", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            shirtId: shirt.id,
                            size: selectedSize,
                            price: shirt.shirt_price
                        })
                    });

                    const data = await res.json();
                    if (!res.ok || data.error) throw new Error(data.error || "Add to cart failed");

                    alert(`${shirt.shirt_name} ขนาด ${selectedSize} ถูกเพิ่มลงตะกร้าเรียบร้อย!`);

                    // รีเซ็ต size
                    sizeButtons.forEach(b => b.classList.remove("bg-gray-600", "text-white"));
                    selectedSize = null;
                    addBtn.classList.add("opacity-0", "scale-90", "pointer-events-none");
                    addBtn.classList.remove("opacity-100", "scale-100");

                    // Update cart realtime
                    updateCartUI(data.items || []);
                } catch (err) {
                    console.error(err);
                    alert(err.message || "เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า");
                }
            });


            // ----------------- Edit Shirt -----------------
            // const editBtn = card.querySelector(".edit-btn");
            // if (editBtn) {
            //     editBtn.addEventListener("click", () => {
            //         window.location.href = `/admin/edit-shirt/${shirt.id}`; // Redirect to the admin edit page
            //     });
            // }
        });
    } catch (err) {
        console.error("❌ Error loading shirts:", err);
    }
}

// ---------------------- อัปเดต UI ตะกร้า ----------------------
function updateCartUI(items) {
    const cartCount = document.getElementById("cartCount");
    const cartDropdownItems = document.getElementById("cartDropdownItems");
    const cartDropdownCount = document.getElementById("cartDropdownCount");
    const cartDropdownTotal = document.getElementById("cartDropdownTotal");
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    

    if (cartDropdownCount) cartDropdownCount.textContent = totalQuantity;
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (cartDropdownTotal) cartDropdownTotal.textContent = totalPrice;

    if (cartCount) cartCount.textContent = totalQuantity;
    if (cartDropdownItems) {
        cartDropdownItems.innerHTML = "";
        if (items.length === 0) {
            cartDropdownItems.innerHTML = `<p class="text-center text-gray-500 py-4">ตะกร้าว่าง</p>`;
        } else {
            items.forEach(item => {
                const div = document.createElement("div");
                div.className = "flex justify-between items-center p-2 border-b border-gray-100";
                div.innerHTML = `
          <div>
            <p class="font-medium">${item.shirtName || item.shirt?.shirt_name}</p>
            <p class="text-sm text-gray-500">ขนาด: ${item.size} x ${item.quantity}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold">${item.price}฿</span>
            <button class="remove-btn text-red-500 hover:text-red-700" data-id="${item.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
                cartDropdownItems.appendChild(div);
            });
        }
    }
}

// ---------------------- โหลด cart จาก backend ----------------------
async function loadCartFromBackend() {
    try {
        const res = await fetch("/api/cart", { credentials: "include" });
        const data = await res.json();
        updateCartUI(data.items || []);
    } catch (err) {
        console.error("❌ Error loading cart:", err);
    }
}


// ---------------------- Remove cart item ----------------------
document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".remove-btn");
    if (!btn) return;

    const itemId = parseInt(btn.dataset.id);

    try {
        const res = await fetch(`/api/cart/${itemId}`, {
            method: "DELETE",
            credentials: "include",
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "ลบไม่สำเร็จ");

        // ✅ ลบ element ออกจาก DOM โดยตรง
        const itemEl = btn.closest("div.flex.justify-between.items-center");
        if (itemEl) itemEl.remove();

        // ✅ โหลด cart ใหม่จาก backend เพื่อ sync จำนวนและ total
        loadCartFromBackend();

    } catch (err) {
        console.error(err);
        alert(err.message || "ไม่สามารถลบสินค้าได้");
    }
});


// ---------------------- Toggle dropdown ----------------------
const cartBtn = document.getElementById("cartBtn");
const cartDropdown = document.getElementById("cartDropdown");

cartBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // ป้องกัน event bubble ไป document
    cartDropdown.classList.toggle("opacity-0");
    cartDropdown.classList.toggle("pointer-events-none");
});

// ปิด dropdown เมื่อคลิกข้างนอก
document.addEventListener("click", (e) => {
    if (!cartDropdown.contains(e.target) && e.target !== cartBtn) {
        cartDropdown.classList.add("opacity-0");
        cartDropdown.classList.add("pointer-events-none");
    }
});
