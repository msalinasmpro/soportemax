(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var submitBtn = document.getElementById("login-submit");

  // Check if already logged in — redirect silently
  var session = localStorage.getItem("isinet-admin-session");
  if (session) {
    try {
      var s = JSON.parse(session);
      if (s.expiresAt && Date.now() < s.expiresAt && s.token) {
        window.location.replace("dashboard.html");
        return;
      }
    } catch (e) { localStorage.removeItem("isinet-admin-session"); }
  }

  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value;

    if (!email) { showError("Ingresa tu correo electrónico"); return; }
    if (!password) { showError("Ingresa tu contraseña"); return; }

    // UI loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-loading-icon"></span> Conectando...';
    errorEl.textContent = "";
    errorEl.style.display = "none";

    var apiBase = window.location.origin;

    fetch(apiBase + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || "Error de autenticación");
        return data;
      });
    })
    .then(function (data) {
      // Save session
      var sessionObj = {
        token: data.token,
        user: data.user,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      };
      localStorage.setItem("isinet-admin-session", JSON.stringify(sessionObj));

      // Success animation
      submitBtn.innerHTML = '<span class="btn-check-icon">✓</span> Acceso concedido';
      submitBtn.style.background = "#22c55e";

      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 800);
    })
    .catch(function (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-text">Iniciar Sesión</span>';
      showError(err.message || "Error al conectar con el servidor");
    });
  });

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }
  }
})();
