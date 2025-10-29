document.addEventListener("DOMContentLoaded", () => {
    // --- Modal Elements ---
    const historyBtn = document.getElementById("historyBtn");
    const historyModal = document.getElementById("historyModal");
    const historyBackdrop = document.getElementById("historyBackdrop");
    const closeHistoryBtn = document.getElementById("closeHistoryBtn"); // ปุ่ม X
    const cancelHistoryBtn = document.getElementById("cancelHistoryBtn"); // ปุ่ม Close
    const historyContent = document.getElementById("historyContent");
    const historyLoading = document.getElementById("historyLoading");

    // --- Function to toggle modal visibility ---
    const toggleHistoryModal = (show) => {
        if (show) {
            historyModal.classList.remove("opacity-0", "pointer-events-none");
            historyModal.querySelector(".relative.z-10").classList.remove("scale-95");
            historyBackdrop.classList.remove("opacity-0");
            fetchOrderHistory(); // ดึงข้อมูลเมื่อเปิด
        } else {
            historyModal.classList.add("opacity-0", "pointer-events-none");
            historyModal.querySelector(".relative.z-10").classList.add("scale-95");
            historyBackdrop.classList.add("opacity-0");
        }
    };

    // --- Function to fetch order history (Uses Token Auth) ---
    const fetchOrderHistory = async () => {
        historyLoading.style.display = 'block';
        historyContent.innerHTML = ''; // ล้างข้อมูลเก่า
        historyContent.appendChild(historyLoading); // ใส่ loading กลับเข้าไป

        try {
            const token = localStorage.getItem("token"); // ใช้ token เพราะ backend มี verifyToken
            const res = await fetch("/api/orders/history", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                // ถ้า token หมดอายุ หรือไม่ผ่าน
                if (res.status === 401 || res.status === 403) {
                    throw new Error("Authentication failed. Please log in again.");
                }
                throw new Error("Failed to fetch history");
            }

            const orders = await res.json();
            historyLoading.style.display = 'none'; // ซ่อน loading

            if (orders.length === 0) {
                historyContent.innerHTML = '<p class="text-gray-500 text-center">You have no order history.</p>';
                return;
            }

            renderOrders(orders); // เรียกฟังก์ชันแสดงผล (ตัวใหม่)

        } catch (err) {
            console.error("Error fetching history:", err);
            historyLoading.style.display = 'none';
            historyContent.innerHTML = `<p class="text-red-500 text-center">${err.message}</p>`;
        }
    };

    // 
    const renderOrders = (orders) => {
        historyContent.innerHTML = ''; // ล้าง loading ออก

        orders.forEach(order => {
            const orderCard = document.createElement("div");

            orderCard.className = "bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 mb-4";

            // คำนวณราคารวม 
            const orderTotal = order.items.reduce((sum, item) => {
                return sum + (item.price * item.quantity);
            }, 0);

            // 2. แปลงวันที่ (จาก logic ของคุณ)
            const orderDate = new Date(order.createdAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // 3. สร้าง HTML สำหรับ Items (ใช้ตัวแปร `shirt_name` และ `shirt_image` ตามโค้ดของคุณ)
            const itemsHtml = order.items.map(item => {
                const itemTotal = item.price * item.quantity;

                // *** ใช้ 'item.shirt.shirt_image' ตามโค้ดเดิมของคุณ ***
                const imageUrl = item.shirt.shirt_image || 'https://placehold.co/100x100.png';

                return `
                <div class="flex items-center gap-4 py-3">
                    <img src="${imageUrl}" alt="${item.shirt.shirt_name}" class="w-16 h-16 object-cover rounded-md bg-gray-100">
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900">${item.shirt.shirt_name}</p>
                        <p class="text-sm text-gray-600">ขนาด: ${item.size}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-gray-900">${itemTotal.toFixed(2)}฿</p>
                        <p class="text-sm text-gray-500">จำนวน: ${item.quantity}</p>
                    </div>
                </div>
                `;
            }).join('');

            // 4. กำหนดสีของ Status
            let statusClass = '';
            if (order.status === 'success') {
                statusClass = 'bg-green-100 text-green-800';
            } else if (order.status === 'waiting_shipment') {
                statusClass = 'bg-yellow-100 text-yellow-800';
            } else if (order.status === 'shipped') {
                statusClass = 'bg-blue-100 text-blue-800';
            } else {
                statusClass = 'bg-gray-100 text-gray-800';
            }

            let trackingHtml = '';
            if (order.status === 'shipped' && order.trackingNumber) {
                trackingHtml = `
                    <p class="text-sm text-gray-500 mt-1">
                        Tracking: <span class="font-medium text-blue-600 font-mono">#${order.trackingNumber}</span>
                    </p>
                `;
            }

            // 5. สร้างโครงสร้างการ์ดคำสั่งซื้อ
            orderCard.innerHTML = `
            <div class="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-gray-800">Order #${order.id}</h2> 
                    <p class="text-sm text-gray-500">วันที่: ${orderDate} ${trackingHtml}</p>
                </div>
                <span class="capitalize ${statusClass} text-xs font-medium px-2.5 py-0.5 rounded-full">${order.status}</span>
            </div>

            <div class="p-4 divide-y divide-gray-200">
                ${itemsHtml}
            </div>

            <div class="bg-gray-50 p-4 border-t border-gray-200 text-right">
                <span class="text-sm text-gray-600">ยอดรวม: </span>
                <span class="text-xl font-bold text-gray-900">${orderTotal.toFixed(2)}฿</span>
            </div>
            `;

            // 6. เพิ่มการ์ดลงใน Modal
            historyContent.appendChild(orderCard);
        });
    };

    // --- Event Listeners ---
    if (historyBtn) {
        historyBtn.addEventListener("click", () => toggleHistoryModal(true));
    }
    if (historyBackdrop) {
        historyBackdrop.addEventListener("click", () => toggleHistoryModal(false));
    }
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener("click", () => toggleHistoryModal(false));
    }
    if (cancelHistoryBtn) {
        cancelHistoryBtn.addEventListener("click", () => toggleHistoryModal(false));
    }
});