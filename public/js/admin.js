document.addEventListener("DOMContentLoaded", () => {
    
    // ----------------- SECTION 1: รวม Element Selectors -----------------
    
    // --- (จากโค้ดของคุณ) Elements "Add Shirt" ---
    const addShirtForm = document.getElementById("addShirtForm");
    const openAddShirtBtn = document.getElementById("openAddShirtBtn");
    const addShirtModal = document.getElementById("addShirtModal");
    const cancelAddShirt = document.getElementById("cancelAddShirt");
    const addShirtBackdrop = document.getElementById("addShirtBackdrop");
    const modalBox = addShirtModal ? addShirtModal.querySelector(".relative.z-10") : null;
    const container = document.getElementById("shirt-container");

    // --- (จากโค้ดของผม) Elements "Manage Orders" ---
    const openAdminOrdersBtn = document.getElementById("openAdminOrdersBtn");
    const adminOrdersModal = document.getElementById("adminOrdersModal");
    const adminOrdersBackdrop = document.getElementById("adminOrdersBackdrop");
    const closeAdminOrdersBtn = document.getElementById("closeAdminOrdersBtn");
    const ordersTbody = document.getElementById("orders-table-body");

    // --- (จากโค้ดของผม) Elements "Order Detail" (Modal ซ้อน) ---
    const orderDetailModal = document.getElementById("orderDetailModal");
    const orderDetailBackdrop = document.getElementById("orderDetailBackdrop");
    const closeOrderDetailBtn = document.getElementById("closeOrderDetailBtn");
    const modalDetailTitle = document.getElementById("modalDetailTitle");
    const modalDetailBody = document.getElementById("modalDetailBody");
    
    // (ใช้ Token สำหรับการยืนยันตัวตนทั้งหมด)
    const token = localStorage.getItem('token');

    
    // ----------------- SECTION 2: ตรวจ Session (ใช้ Logic ของคุณ) -----------------
    
    fetch("/api/check-session", {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
        if (!data.user) {
            console.warn("User not logged in.");
            return; // ไม่ต้อง redirect เพราะนี่คือหน้า main
        }
        
        // อัปเดต UI (จากโค้ดของคุณ)
        const usernameEl = document.getElementById("username");
        const roleEl = document.getElementById("role");
        if (usernameEl) usernameEl.textContent = data.user.username;
        if (roleEl) roleEl.textContent = data.user.role;

        // ถ้ารเป็น Admin: แสดงปุ่ม Admin ทั้งสอง
        if (data.user.role === "admin") {
            if(openAddShirtBtn) openAddShirtBtn.classList.remove("hidden");
            if(openAdminOrdersBtn) openAdminOrdersBtn.classList.remove("hidden");
        }
    })
    .catch(err => {
        console.error("Error checking session:", err);
    });

    
    // ----------------- SECTION 3: Logic Modal "Add Shirt" (ใช้ Logic ของคุณ) -----------------
    
    function openAddShirtModal() {
        if (!addShirtModal) return;
        addShirtModal.classList.remove("opacity-0", "pointer-events-none");
        addShirtModal.classList.add("opacity-100");
        modalBox.classList.replace("scale-95", "scale-100");
        addShirtBackdrop.classList.replace("opacity-0", "opacity-100");
    }

    function closeAddShirtModal() {
        if (!addShirtModal) return;
        modalBox.classList.replace("scale-100", "scale-95");
        addShirtModal.classList.remove("opacity-100");
        addShirtModal.classList.add("opacity-0");
        addShirtBackdrop.classList.replace("opacity-100", "opacity-0");
        setTimeout(() => addShirtModal.classList.add("pointer-events-none"), 200);
    }

    if (openAddShirtBtn) {
        openAddShirtBtn.addEventListener("click", () => {
            if (!addShirtForm) return;
            addShirtForm.reset();
            delete addShirtForm.dataset.editId;
            addShirtForm.querySelector("button[type='submit']").textContent = "Add";
            openAddShirtModal();
        });
    }
    if (cancelAddShirt) cancelAddShirt.addEventListener("click", closeAddShirtModal);
    if (addShirtBackdrop) addShirtBackdrop.addEventListener("click", closeAddShirtModal);


    // ----------------- SECTION 4: Submit form (Add / Edit Shirt) (ใช้ Logic ของคุณ) -----------------
    
    if (addShirtForm) {
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
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` // ใช้ Token
                    },
                    body: JSON.stringify(shirtData)
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || "Failed to submit");

                showAlert(editId ? "แก้ไขสินค้าสำเร็จ!" : "เพิ่มสินค้าสำเร็จ!");
                addShirtForm.reset();
                delete addShirtForm.dataset.editId;
                addShirtForm.querySelector("button[type='submit']").textContent = "Add";
                closeAddShirtModal();
                
                // โหลดสินค้าใหม่ (ฟังก์ชันนี้ควรอยู่ใน shop.js)
                if (typeof loadShirts === "function") {
                    loadShirts(); 
                } else {
                    window.location.reload(); // Fallback
                }
            } catch (err) {
                console.error(err);
                alert(err.message || "เกิดข้อผิดพลาด");
            }
        });
    }

    // ----------------- SECTION 5: Click Event (Edit / Delete Shirt) (ใช้ Logic ของคุณ) -----------------
    
    if (container) {
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
                        headers: { "Authorization": `Bearer ${token}` } // ใช้ Token
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) throw new Error(data.error || "Failed to delete shirt");
                    
                    alert("สินค้านี้ถูกลบเรียบร้อยแล้ว");
                    
                    if (typeof loadShirts === "function") {
                        loadShirts(); // โหลดใหม่ดีกว่า reload
                    } else {
                        card.remove(); // ถ้าไม่มีฟังก์ชันก็แค่ลบ card
                    }

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
                    const res = await fetch(`/api/shirts/${shirtId}`, {
                         headers: { "Authorization": `Bearer ${token}` } // ใช้ Token
                    });
                    const shirt = await res.json();
                    if (!res.ok) throw new Error(shirt.error || "Failed to fetch shirt data");

                    // เติมข้อมูลลง form
                    addShirtForm.dataset.editId = shirtId; 
                    addShirtForm.querySelector("button[type='submit']").textContent = "Update";
                    addShirtForm.querySelector("#shirtName").value = shirt.shirt_name;
                    addShirtForm.querySelector("#shirtPrice").value = shirt.shirt_price;
                    addShirtForm.querySelector("#shirtImage").value = shirt.shirt_image || "";
                    addShirtForm.querySelector("#shirtSizeCustom").value = "";

                    const checkboxes = addShirtForm.querySelectorAll("input[name='shirtSize']");
                    checkboxes.forEach(cb => cb.checked = false);

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
                            if (!found) customSizes.push(s);
                        });
                        if (customSizes.length) {
                            addShirtForm.querySelector("#shirtSizeCustom").value = customSizes.join(", ");
                        }
                    }
                    
                    openAddShirtModal(); // เปิด modal
                } catch (err) {
                    console.error(err);
                    alert(err.message || "ไม่สามารถดึงข้อมูลสินค้าได้");
                }
            }
        });
    }

    
    // ----------------- SECTION 6: Logic Modal "Manage Orders" (จากโค้ดของผม) -----------------
    
    const toggleAdminOrdersModal = (show) => {
        if (!adminOrdersModal) return;
        if (show) {
            adminOrdersModal.classList.remove("opacity-0", "pointer-events-none");
            adminOrdersModal.querySelector(".relative.z-10").classList.remove("scale-95");
            adminOrdersBackdrop.classList.remove("opacity-0");
            loadAdminOrders(); // 👈 โหลดข้อมูลใหม่ทุกครั้งที่เปิด
        } else {
            adminOrdersModal.classList.add("opacity-0", "pointer-events-none");
            adminOrdersModal.querySelector(".relative.z-10").classList.add("scale-95");
            adminOrdersBackdrop.classList.add("opacity-0");
        }
    };
    
    if (openAdminOrdersBtn) openAdminOrdersBtn.addEventListener("click", () => toggleAdminOrdersModal(true));
    if (closeAdminOrdersBtn) closeAdminOrdersBtn.addEventListener("click", () => toggleAdminOrdersModal(false));
    if (adminOrdersBackdrop) adminOrdersBackdrop.addEventListener("click", () => toggleAdminOrdersModal(false));

    
    // ----------------- SECTION 7: Logic Modal "Order Detail" (จากโค้ดของผม) -----------------
    
    const toggleOrderDetailModal = (show) => {
        if (!orderDetailModal) return;
        if (show) {
            orderDetailModal.classList.remove("opacity-0", "pointer-events-none");
            orderDetailModal.querySelector(".relative.z-10").classList.remove("scale-95");
            orderDetailBackdrop.classList.remove("opacity-0");
        } else {
            orderDetailModal.classList.add("opacity-0", "pointer-events-none");
            orderDetailModal.querySelector(".relative.z-10").classList.add("scale-95");
            orderDetailBackdrop.classList.add("opacity-0");
        }
    };

    if (closeOrderDetailBtn) closeOrderDetailBtn.addEventListener("click", () => toggleOrderDetailModal(false));
    if (orderDetailBackdrop) orderDetailBackdrop.addEventListener("click", () => toggleOrderDetailModal(false));

    
    // ----------------- SECTION 8: Logic Data "Orders" (จากโค้ดของผม) -----------------
    
    async function loadAdminOrders() {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '<tr><td colspan="6" class="text-center p-5">กำลังโหลด...</td></tr>';
        
        try {
            const res = await fetch("/api/admin/orders", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch orders");

            const orders = await res.json();
            ordersTbody.innerHTML = ""; 

            if (orders.length === 0) {
                ordersTbody.innerHTML = '<tr><td colspan="6" class="text-center p-5">ไม่พบออเดอร์</td></tr>';
                return;
            }

            orders.forEach(order => {
                const tr = document.createElement("tr");
                tr.className = "border-b border-gray-200 hover:bg-gray-100";

                const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                const date = new Date(order.createdAt).toLocaleDateString('th-TH', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });

                // ✅ แก้ไข `success` -> `waiting_shipment`
                let statusButtonHtml;
                if (order.status === 'waiting_shipment') { // 👈 แก้ไขแล้ว
                    statusButtonHtml = `
                    <button class="mark-shipped-btn bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1 px-2 rounded" data-id="${order.id}">
                        <i class="fa-solid fa-box"></i> Mark as Shipped
                    </button>`;
                } else if (order.status === 'shipped') {
                    statusButtonHtml = `<span class="text-green-600 font-semibold"><i class="fa-solid fa-circle-check"></i> Shipped</span>`;
                } else {
                    statusButtonHtml = `<span class="text-gray-500">${order.status}</span>`;
                }

                tr.innerHTML = `
                    <td class="px-5 py-4 text-sm">${order.id}</td>
                    <td class="px-5 py-4 text-sm">${order.user.username} (ID: ${order.user.id})</td>
                    <td class="px-5 py-4 text-sm">${date}</td>
                    <td class="px-5 py-4 text-sm">${total.toFixed(2)}฿</td>
                    <td class="px-5 py-4 text-sm font-medium" id="status-cell-${order.id}">${statusButtonHtml}</td>
                    <td class="px-5 py-4 text-sm">
                        <button class="view-btn bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded" data-order='${JSON.stringify(order)}'>
                            <i class="fa-solid fa-eye"></i> ดูรายละเอียด
                        </button>
                    </td>
                `;
                ordersTbody.appendChild(tr);
            });
            
            addTableEventListeners();

        } catch (err) {
            console.error(err);
            ordersTbody.innerHTML = `<tr><td colspan="6" class="text-center p-5 text-red-500">Error: ${err.message}</td></tr>`;
        }
    }

    function addTableEventListeners() {
        if (!ordersTbody) return;
        
        // (Clone และ Replace เพื่อลบ Event Listener เก่า ป้องกันการผูกซ้ำซ้อน)
        const newTbody = ordersTbody.cloneNode(true);
        ordersTbody.parentNode.replaceChild(newTbody, ordersTbody);
        
        newTbody.addEventListener("click", (e) => {
            const viewBtn = e.target.closest(".view-btn");
            if (viewBtn) {
                const orderData = JSON.parse(viewBtn.dataset.order);
                showOrderDetailModal(orderData); // (เปลี่ยนชื่อฟังก์ชันเล็กน้อย)
                return;
            }

            const shipBtn = e.target.closest(".mark-shipped-btn");
            if (shipBtn) {
                const orderId = shipBtn.dataset.id;
                if (confirm(`คุณต้องการยืนยันการจัดส่ง Order #${orderId} หรือไม่?`)) {
                    markOrderAsShipped(orderId);
                }
            }
        });
    }

    async function showOrderDetailModal(order) {
        modalDetailTitle.textContent = `รายละเอียด Order #${order.id} (ลูกค้า: ${order.user.username})`;

        const itemsHtml = order.items.map(item => `
            <div class="flex items-center gap-4 border-b pb-2">
                <img src="${item.shirt.shirt_image || 'https://placehold.co/80x80'}" alt="${item.shirt.shirt_name}" class="w-20 h-20 object-cover rounded">
                <div>
                    <p class="font-bold">${item.shirt.shirt_name}</p>
                    <p class="text-sm text-gray-600">ขนาด: ${item.size}</p>
                    <p class="text-sm text-gray-600">จำนวน: ${item.quantity} x ${item.price}฿</p>
                </div>
                <p class="ml-auto font-semibold">${(item.quantity * item.price).toFixed(2)}฿</p>
            </div>
        `).join("");

        let addressHtml = `<p class="text-gray-500">กำลังโหลดที่อยู่...</p>`;
        modalDetailBody.innerHTML = `<div><h4 class="font-bold text-lg mb-2">รายการสินค้า</h4>${itemsHtml}</div>
                                 <div><h4 class="font-bold text-lg mb-2">ข้อมูลจัดส่ง</h4><div id="modal-address">${addressHtml}</div></div>`;

        toggleOrderDetailModal(true); // 👈 เปิด Modal Detail

        try {
            const addrRes = await fetch(`/api/admin/address/${order.userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!addrRes.ok) {
                const err = await addrRes.json();
                throw new Error(err.error || "Address not found");
            }

            const address = await addrRes.json();
            
            // (เช็ก field ที่อยู่ของคุณให้ตรง)
            addressHtml = `
                <p><strong>ชื่อผู้รับ:</strong> ${address.fullName || "-"}</p>
                <p><strong>ที่อยู่:</strong> ${address.house_number || "-"}, ${address.street || "-"}</p>
                <p><strong>ตำบล/อำเภอ:</strong> ${address.city || "-"}</p>
                <p><strong>จังหวัด/รหัส ปณ.:</strong> ${address.province || "-"} ${address.zipCode || "-"}</p>
                <p><strong>เบอร์โทร:</strong> ${address.phone || "-"}</p>
            `;
            const modalAddressEl = document.getElementById("modal-address");
            if (modalAddressEl) modalAddressEl.innerHTML = addressHtml;

        } catch (err) {
            const modalAddressEl = document.getElementById("modal-address");
            if(modalAddressEl) modalAddressEl.innerHTML = `<p class="text-red-500">(${err.message})</p>`;
        }
    }

    async function markOrderAsShipped(orderId) {
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: "shipped" })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }

            alert(`Order #${orderId} ถูกอัปเดตเป็น Shipped!`);

            const statusCell = document.getElementById(`status-cell-${orderId}`);
            if (statusCell) {
                statusCell.innerHTML = `<span class="text-green-600 font-semibold"><i class="fa-solid fa-circle-check"></i> Shipped</span>`;
            }

        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาด: " + err.message);
        }
    }

}); // <-- ปิด "DOMContentLoaded"