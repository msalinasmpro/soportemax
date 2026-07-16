(function () {
  "use strict";

  // Clear any stale sessions on login page
  localStorage.removeItem("isinet-admin-session");

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var submitBtn = document.getElementById("login-submit");

  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();

    var emailInput = document.getElementById("login-email");
    var passwordInput = document.getElementById("login-password");
    var email = emailInput ? emailInput.value.trim() : "";
    var password = passwordInput ? passwordInput.value : "";

    if (!email) { showError("Ingresa tu correo electrónico"); return; }
    if (!password) { showError("Ingresa tu contraseña"); return; }

    // UI loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-loading-icon"></span> Conectando...';
    errorEl.textContent = "";
    errorEl.style.display = "none";

    var apiBase = window.location.origin;

    fetch(apiBase + "/api/auth", {
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
      submitBtn.innerHTML = '<span class="btn-check-icon">&#10003;</span> Acceso concedido';
      submitBtn.style.background = "#22c55e";

      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 600);
    })
    .catch(function (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-text">Iniciar Sesión</span>';
      showError(err.message || "Error al conectar con el servidor");
    });

    return false;
  });

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="btn-text">Iniciar Sesión</span>';
    }
  }
})();
