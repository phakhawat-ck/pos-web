// shop.js

// รอ DOM โหลดก่อน
document.addEventListener("DOMContentLoaded", () => {
    loadShirts();
});

// ---------------------- โหลดเสื้อ ----------------------
async function loadShirts() {
    try {
        // --- 1. ตรวจสอบ Role ของ User ---
        let isAdmin = false;
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const sessionRes = await fetch("/api/check-session", {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (sessionRes.ok) {
                    const sessionData = await sessionRes.json();
                    if (sessionData.user && sessionData.user.role === "admin") {
                        isAdmin = true;
                    }
                } else {
                     console.warn("Check session failed, assuming user is not admin.");
                }
            } catch (sessionErr) {
                console.error("Error checking session in shop.js:", sessionErr);
            }
        }
        console.log("Is Admin:", isAdmin);

        // --- 2. ดึงข้อมูล Shirt ---
        const res = await fetch("/api/shirts"); //
        if (!res.ok) throw new Error("Failed to fetch shirts"); //

        const shirts = await res.json(); //
        const container = document.getElementById("shirt-container"); //
        container.innerHTML = ""; //

        // --- 3. วน Loop แสดงผล + กรองตาม isHidden ---
        shirts.forEach(shirt => { //

            // ✅ ตรวจสอบเงื่อนไขการซ่อน
            if (!isAdmin && shirt.isHidden) {
                console.log(`Shirt "${shirt.shirt_name}" (ID: ${shirt.id}) is hidden for non-admins.`);
                return; // ข้ามการสร้าง Card
            }

            // --- สร้าง Card ---
            const card = document.createElement("div"); //
            let cardClasses = "card w-[250px] overflow-hidden flex flex-col m-5 transform hover:scale-110 transition-transform duration-500"; //
            if (isAdmin && shirt.isHidden) {
                cardClasses += " opacity-60 border-2 border-dashed border-red-400 bg-gray-100";
            }
             card.className = cardClasses;

            const sizes = shirt.shirt_size ? shirt.shirt_size.split(",") : []; //

            // --- HTML ของ Card ---
            card.innerHTML = `
                <div class="img flex-1 bg-amber-950 flex items-center justify-center w-[250px] h-[360px]">
                  <img src="${shirt.shirt_image || 'https://placehold.co/250x360.png'}"
                       alt="${shirt.shirt_name}" class="object-cover h-full w-full">
                </div>
                <div class="det p-2 flex flex-col justify-between">
                  <div class="name"><p class="font-bold text-black text-lg">${shirt.shirt_name}</p></div>
                  <div class="flex items-center gap-2 mt-2">
                    <div class="size flex gap-2">
                      ${sizes.map(size => `<button class="size-btn border px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200">${size}</button>`).join("")}
                    </div>
                    <button class="add-to-cart ml-auto bg-blue-600 text-white rounded-md px-3 py-1 transition-all duration-300 transform opacity-0 scale-90 pointer-events-none">+</button>
                  </div>
                  <div class="pr mt-2"><p class="text-black/70 font-semibold text-lg">$ ${shirt.shirt_price}</p></div>
                  ${isAdmin ? `
                    <div class="admin-actions flex gap-2 mt-2">
                      <button class="edit-btn bg-yellow-500 text-white rounded-md px-3 py-1" data-id="${shirt.id}">Edit</button>
                      <button class="del-btn bg-red-500 text-white rounded-md px-3 py-1" data-id="${shirt.id}">Delete</button>
                    </div>
                  ` : ""}
                </div>
              `; //

            container.appendChild(card); //

            // --- Logic การเลือก Size และ Add to Cart (โค้ดเดิมของคุณ) ---
            const sizeButtons = card.querySelectorAll(".size-btn"); //
            const addBtn = card.querySelector(".add-to-cart"); //
            let selectedSize = null; //

            // --- Event Listener สำหรับปุ่ม Size ---
            sizeButtons.forEach(btn => { //
                btn.addEventListener("click", () => { //
                    // เอา class active ออกจากปุ่ม size อื่นๆ
                    sizeButtons.forEach(b => b.classList.remove("bg-gray-600", "text-white")); //
                    // เพิ่ม class active ให้ปุ่มที่กด
                    btn.classList.add("bg-gray-600", "text-white"); //
                    // เก็บ size ที่เลือกไว้
                    selectedSize = btn.textContent; //

                    // แสดงปุ่ม Add to Cart
                    addBtn.classList.remove("pointer-events-none", "opacity-0", "scale-90"); //
                    addBtn.classList.add("opacity-100", "scale-100"); //
                });
            });

            // --- Event Listener สำหรับปุ่ม Add to Cart ---
            addBtn.addEventListener("click", async () => { //
                // ถ้ายังไม่ได้เลือก size (เผื่อกรณีผิดพลาด)
                if (!selectedSize) {
                    showAlert("กรุณาเลือกขนาดก่อนเพิ่มลงตะกร้า", "warning");
                    return;
                }

                try {
                    // ส่งข้อมูลไป API /api/add-to-cart
                    const res = await fetch("/api/add-to-cart", { //
                        method: "POST", //
                        headers: { "Content-Type": "application/json" }, //
                        // credentials: "include", // ถ้า API นี้ต้องการ Token (ในโค้ดเดิมของคุณไม่ได้ส่ง)
                        body: JSON.stringify({ //
                            shirtId: shirt.id, //
                            size: selectedSize, //
                            price: shirt.shirt_price //
                        })
                    });

                    const data = await res.json(); //
                    if (!res.ok || data.error) throw new Error(data.error || "Add to cart failed"); //

                    // แสดงข้อความสำเร็จ
                    showAlert(`${shirt.shirt_name} (ขนาด ${selectedSize}) ถูกเพิ่มลงตะกร้าเรียบร้อย!`, "success"); //

                    // รีเซ็ตปุ่ม Size และซ่อนปุ่ม Add to Cart
                    sizeButtons.forEach(b => b.classList.remove("bg-gray-600", "text-white")); //
                    selectedSize = null; //
                    addBtn.classList.add("opacity-0", "scale-90", "pointer-events-none"); //
                    addBtn.classList.remove("opacity-100", "scale-100"); //

                    // เรียกฟังก์ชันจาก cart.js เพื่ออัปเดต UI ตะกร้า
                    if (typeof loadCartData === 'function') { //
                        loadCartData(); //
                    } else { //
                        console.warn("loadCartData() is not defined. Make sure cart.js is loaded."); //
                    }

                } catch (err) { //
                    console.error(err); //
                    showAlert(err.message || "เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า"); //
                }
            }); // จบ addBtn listener

        }); // จบ forEach shirt
    } catch (err) {
        console.error("❌ Error loading shirts:", err); //
        const container = document.getElementById("shirt-container"); //
        if(container) container.innerHTML = `<p class="text-red-500 text-center p-5">Error loading shirts: ${err.message}</p>`;
    }
}