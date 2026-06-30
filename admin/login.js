(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var submitBtn = document.getElementById("login-submit");

  // Check if already logged in
  var session = localStorage.getItem("isinet-admin-session");
  if (session) {
    try {
      var s = JSON.parse(session);
      if (s.expiresAt && Date.now() < s.expiresAt) {
        window.location.href = "dashboard.html";
        return;
      }
    } catch (e) { /* ignore */ }
  }

  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = (document.getElementById("login-email") || {}).value || "";
    var password = (document.getElementById("login-password") || {}).value || "";

    if (!email.trim()) { showError("Ingresa tu correo electrónico"); return; }
    if (!password) { showError("Ingresa tu contraseña"); return; }

    form.classList.add("is-sending");
    submitBtn.disabled = true;
    errorEl.textContent = "";

    // Login via API
    var apiBase = window.location.origin;
    fetch(apiBase + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);
      localStorage.setItem("isinet-admin-session", JSON.stringify({
        token: data.token,
        user: data.user,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      }));
      window.location.href = "dashboard.html";
    })
    .catch(function (err) {
      form.classList.remove("is-sending");
      submitBtn.disabled = false;
      showError(err.message || "Error al conectar con el servidor");
    });
  });

  function showError(msg) {
    if (errorEl) errorEl.textContent = msg;
  }
})();
