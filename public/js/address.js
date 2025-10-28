document.addEventListener("DOMContentLoaded", async () => {
    // ✅ ทำให้ callback เป็น async เพื่อใช้ await ด้านในได้
    const btn = document.getElementById("profileBtn");
    const menu = document.getElementById("profileMenu");
    const editBtn = menu.querySelector("#editBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    // ✅ โหลดไฟล์ modal ก่อน แล้วค่อยจับ element
    const container = document.getElementById("modalContainer");
    const res = await fetch("/partials/edit-modal.html");
    container.innerHTML = await res.text();

    // ✅ ตอนนี้ modal อยู่ใน DOM แล้ว
    const modal = document.getElementById("editModal");
    const backdrop = document.getElementById("backdrop");
    const cancelBtn = document.getElementById("cancelEdit");
    const form = document.getElementById("editAddressForm");
    const statusEl = document.getElementById("modal_status");

    // 🔹 Toggle dropdown menu
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("opacity-100");
        menu.classList.toggle("scale-100");
        menu.classList.toggle("pointer-events-auto");
    });

    // 🔹 ปิด dropdown เมื่อคลิกข้างนอก
    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
        }
    });

    // ✅ ตรวจสอบ session ด้วย JWT และโหลด Address
    fetch("/api/check-session", { credentials: "include" })
        .then(r => r.json())
        .then(async data => {
            if (!data.user) return window.location.href = "/";
            document.getElementById("username").textContent = data.user?.username || data.user?.name || "Guest";
            document.getElementById("role").textContent = data.user.role;

            // โหลด Address ของผู้ใช้
            const res = await fetch("/api/address", { credentials: "include" });
            if (res.ok) {
                const address = await res.json();
                if (address) {
                    document.getElementById("nameInput").value = address.fullName || "";
                    document.getElementById("houseNumberInput").value = address.house_number || "";
                    document.getElementById("provinceInput").value = address.province || "";
                    document.getElementById("cityInput").value = address.city || "";
                    document.getElementById("streetInput").value = address.street || "";
                    document.getElementById("zipCodeInput").value = address.zipCode || "";
                    document.getElementById("phoneInput").value = address.phone || "";
                }
            }
        })
        .catch(err => {
            console.error("Error checking session:", err);
            window.location.href = "/";
        });

    // ✅ Logout
    logoutBtn.addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        window.location.href = "/";
    });

    // 🔹 เปิด modal
    const openEditModal = () => {
        menu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
        modal.classList.remove("opacity-0", "pointer-events-none");
        modal.classList.add("opacity-100");
        modal.querySelector(".transform").classList.replace("scale-95", "scale-100");
        backdrop.classList.add("opacity-100");
    };

    editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal();
    });

    // 🔹 ปิด modal (กดยกเลิก หรือคลิกนอกกล่อง)
    const closeModal = () => {
        const box = modal.querySelector(".transform");
        box.classList.replace("scale-100", "scale-95");
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0");
        backdrop.classList.remove("opacity-100");

        setTimeout(() => {
            modal.classList.add("pointer-events-none");
        }, 200);
    };

    cancelBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);

    // 🔹 ส่ง form Address
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const phone = document.getElementById("phoneInput").value.trim();
        const phoneRegex = /^(0\d{9}|\+66\d{9})$/;

        if (!phoneRegex.test(phone)) {
            statusEl.textContent = "Please enter a valid phone number (numbers + up to 10 digits)";
            statusEl.style.color = "red";
            return;
        }

        const data = {
            fullName: document.getElementById("nameInput").value.trim(),
            house_number: document.getElementById("houseNumberInput").value.trim(),
            street: document.getElementById("streetInput").value.trim(),
            city: document.getElementById("cityInput").value.trim(),
            province: document.getElementById("provinceInput").value.trim(),
            zipCode: document.getElementById("zipCodeInput").value.trim(),
            phone
        };

        try {
            const res = await fetch("/api/address", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });

            if (res.ok) {
                statusEl.textContent = "Address updated successfully!";
                statusEl.style.color = "green";

                setTimeout(() => {
                    closeModal();
                    statusEl.textContent = "";
                }, 2000);
            } else {
                const error = await res.json();
                statusEl.textContent = "Update failed: " + (error.error || "Unknown error");
                statusEl.style.color = "red";
            }
        } catch (err) {
            console.error(err);
            statusEl.textContent = "Connection error. Please try again.";
            statusEl.style.color = "red";
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'edit_address') {
        openEditModal(); // 💡 สั่งเปิด Modal ทันที

        // (แนะนำ) ลบ query param ออกจาก URL เพื่อไม่ให้ Modal เด้งอีก
        // เมื่อผู้ใช้กดรีเฟรชหน้านี้
        const newUrl = window.location.pathname; // เอาแค่ path
        window.history.replaceState({}, '', newUrl);
    }
});
