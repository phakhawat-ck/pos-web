document.addEventListener("DOMContentLoaded", () => {
    const addShirtForm = document.getElementById("addShirtForm");
    const addShirtDiv = document.getElementById("addShirtDiv");

    const colorsContainer = document.getElementById("colorsContainer");
    // document.getElementById("addColorBtn").addEventListener("click", () => {
    //     const input = document.createElement("input");
    //     input.type = "color";
    //     input.className = "shirtColor";
    //     colorsContainer.appendChild(input);
    // });


    fetch("/api/check-session", {
        credentials: "include" // ✅ ส่ง cookie (JWT) ไปด้วย
    })
        .then(r => r.json())
        .then(data => {
            if (!data.user) return window.location.href = "/";
            document.getElementById("username").textContent = data.user.username;
            document.getElementById("role").textContent = data.user.role;
            if (data.user.role === "admin") addShirtDiv.classList.remove("hidden");
        })
        .catch(err => {
            console.error("Error checking session:", err);
            window.location.href = "/";
        });

    addShirtForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newShirt = {
            shirt_name: document.getElementById("shirtName").value,
            shirt_size: document.getElementById("shirtSize").value,
            shirt_price: parseFloat(document.getElementById("shirtPrice").value),
            shirt_image: document.getElementById("shirtImage").value || null
        };

        try {
            const res = await fetch("/api/shirts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", 
                body: JSON.stringify(newShirt)
            });

            const text = await res.text();
            console.log(text);
            const data = JSON.parse(text);

            if (!res.ok) {
                return alert("Error adding shirt: " + (data.error || res.status));
            }

            alert("Shirt added successfully!");
            addShirtForm.reset();

            if (typeof loadShirts === "function") loadShirts();
        } catch (err) {
            alert("Error adding shirt: " + err.message);
        }
    });

});
