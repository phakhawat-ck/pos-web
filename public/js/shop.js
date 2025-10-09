// ✅ รอ DOM โหลดก่อน
document.addEventListener("DOMContentLoaded", loadShirts);

async function loadShirts() {
    try {
        // 🔹 ดึงข้อมูลจาก backend (API Prisma)
        const res = await fetch("/api/shirts", {
            credentials: "include" // ✅ เผื่ออนาคตมีการจำกัดสิทธิ์
        });
        if (!res.ok) throw new Error("Failed to fetch shirts");

        const shirts = await res.json();
        const container = document.getElementById("shirt-container");
        container.innerHTML = "";

        shirts.forEach(shirt => {
            const card = document.createElement("div");
            card.className =
                "card h-[480px] w-[250px] overflow-hidden flex flex-col m-5 transform hover:scale-110 transition-transform duration-500";

            card.innerHTML = `
        <div class="img flex-1 bg-amber-950 flex items-center justify-center">
          <img src="${shirt.shirt_image || 'https://placehold.co/250x360.png'}"
               alt="${shirt.shirt_name}"
               class="object-cover h-full w-full">
        </div>

        <div class="det p-2 flex flex-col justify-between h-[120px]">
          <div class="name">
            <p class="font-bold text-black text-lg">${shirt.shirt_name}</p>
            <span class="text-sm text-[#6A6A6A]">${shirt.shirt_size}</span>
          </div>

          <div class="color flex gap-2 mt-2">
            ${shirt.shirt_color.map(color => `
              <button class="w-6 h-6 rounded-full border-2 border-gray-300"
                      style="background-color:${color}"></button>
            `).join('')}
          </div>

          <div class="pr">
            <p class="text-black/70 font-semibold text-lg">$ ${shirt.shirt_price}</p>
          </div>
        </div>
      `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("❌ Error loading shirts:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("profileBtn");
    const menu = document.getElementById("profileMenu");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("opacity-100");
        menu.classList.toggle("scale-100");
        menu.classList.toggle("pointer-events-auto");
    });

    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove("opacity-100", "scale-100", "pointer-events-auto");
        }
    });

    // ✅ ตรวจสอบ session ด้วย JWT
    fetch("/api/check-session", {
        credentials: "include"
    })
    .then(r => r.json())
    .then(data => {
        if (!data.user) window.location.href = "/";
        else {
            document.getElementById("username").textContent = data.user.username;
            document.getElementById("role").textContent = data.user.role;
        }
    })
    .catch(err => {
        console.error("Error checking session:", err);
        window.location.href = "/";
    });

    // ✅ Logout
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        await fetch("/api/logout", {
            method: "POST",
            credentials: "include"
        });
        window.location.href = "/";
    });
});
