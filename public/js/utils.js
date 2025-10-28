window.showAlert = function (message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const colors = {
    success: "text-green-500",
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const toast = document.createElement("div");
  toast.className = `flex items-center text-white px-4 py-3 bg-white rounded-lg shadow-lg opacity-0 transform translate-y-[-10px] transition-all duration-500 ${colors[type] || colors.info}`;
  toast.innerHTML = `<span class="text-xl mr-2">${icons[type] || icons.info}</span> <span>${message}</span>`;

  container.appendChild(toast);

  // แสดงพร้อม animation
  setTimeout(() => {
    toast.classList.remove("opacity-0", "translate-y-[-10px]");
    toast.classList.add("opacity-100", "translate-y-0");
  }, 50);

  // ซ่อนหลัง 2.5 วินาที
  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-[-10px]");
    setTimeout(() => toast.remove(), 500);
  }, 2500);
};
