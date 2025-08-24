window.showNotification = function(message, type = "info", duration = 3000) {
  const container = document.getElementById("notifications");
  if (!container) return;

  const notif = document.createElement("div");
  notif.className = `notification ${type}`;

  let iconClass = "fa-info-circle";
  if (type === "success") iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-xmark";
  if (type === "info") iconClass = "fa-info-circle";

  notif.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;

  // CSS variables for animation
  notif.style.setProperty("--fadeOutDelay", `${duration}ms`);

  container.appendChild(notif);

  // Remove after duration + fade-out (in case fade-out is 0.4s)
  setTimeout(() => notif.remove(), duration + 400);
};
