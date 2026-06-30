(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var submitBtn = document.getElementById("login-submit");

  // Check if already logged in
  var session = localStorage.getItem("soportemax-admin-session");
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

    // Try Supabase auth
    if (window.__supabaseClient) {
      window.__supabaseClient.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw res.error;
          localStorage.setItem("soportemax-admin-session", JSON.stringify({
            user: res.data.user,
            expiresAt: Date.now() + (res.data.session.expires_in * 1000)
          }));
          window.location.href = "dashboard.html";
        })
        .catch(function (err) {
          form.classList.remove("is-sending");
          submitBtn.disabled = false;
          showError(err.message || "Credenciales incorrectas");
        });
    } else {
      // Demo mode — accept admin@example.com / admin123
      setTimeout(function () {
        if (email === "admin@example.com" && password === "admin123") {
          localStorage.setItem("soportemax-admin-session", JSON.stringify({
            user: { email: email },
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
          }));
          window.location.href = "dashboard.html";
        } else {
          form.classList.remove("is-sending");
          submitBtn.disabled = false;
          showError("Credenciales incorrectas. Usa admin@example.com / admin123");
        }
      }, 800);
    }
  });

  function showError(msg) {
    if (errorEl) errorEl.textContent = msg;
  }
})();
