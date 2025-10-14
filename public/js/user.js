
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("profileBtn");
    const menu = document.getElementById("profileMenu");
    const editBtn = menu.querySelector("button:first-child");
    const logoutBtn = document.getElementById("logoutBtn");

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
    editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
        modal.classList.remove("opacity-0", "pointer-events-none");
        modal.classList.add("opacity-100");
        modal.querySelector(".transform").classList.replace("scale-95", "scale-100");
        backdrop.classList.add("opacity-100");
    });

    // 🔹 ปิด modal (กดยกเลิก หรือคลิกนอกกล่อง)
    const closeModal = () => {
        const box = modal.querySelector(".transform");

        // เริ่ม animation ปิด
        box.classList.replace("scale-100", "scale-95");
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0");
        backdrop.classList.remove("opacity-100");

        // หลัง animation 200ms → ปิดการคลิก
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
        const phoneRegex = /^\+?\d{1,10}$/;

        if (!phoneRegex.test(phone)) {
            statusEl.textContent = "Please enter a valid phone number (numbers + up to 10 digits)";
            statusEl.style.color = "red";
            return;
        }

        const data = {
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

                // ปิด modal หลัง 2 วินาที
                setTimeout(() => {
                    closeModal();
                    statusEl.textContent = ""; // ล้างข้อความหลังปิด modal
                }, 2000); // 2000ms = 2 วินาที
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
});