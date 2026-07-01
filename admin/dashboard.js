(function () {
  "use strict";

  // Auth
  var sess = localStorage.getItem("isinet-admin-session");
  if (!sess) { window.location.href = "/admin/index.html"; return; }
  try { var s = JSON.parse(sess); if (!s.expiresAt || Date.now() > s.expiresAt || !s.token) { localStorage.removeItem("isinet-admin-session"); window.location.href = "/admin/index.html"; return; } } catch (e) { window.location.href = "/admin/index.html"; return; }
  var TOKEN = JSON.parse(sess).token;
  var API = window.location.origin;
  var LKEY = "isinet-config";
  var RKEY = "isinet-replaces";

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.from(document.querySelectorAll(s)); }
  function show(m, t) { var el = $("#toast"); if (!el) return; el.textContent = m; el.className = "toast is-visible " + (t || ""); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("is-visible"); }, 3000); }
  function san(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
  function apiCall(m, p, b) { var o = { method: m, headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN } }; if (b) o.body = JSON.stringify(b); return fetch(API + p, o).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error); return d; }); }); }

  var cfg = {};
  var dirty = false;
  var saveBtn = $("#btn-save");
  function markDirty() { dirty = true; if (saveBtn) saveBtn.disabled = false; }

  // Sidebar
  var sb = $("#sidebar");
  var titleMap = { general: "Datos Empresa", logo: "Logo", images: "Imágenes", texts: "Textos", services: "Servicios", testimonials: "Testimonios", faq: "FAQ", messages: "Mensajes", "email-config": "Email / SMTP", map: "Mapa" };
  $$(".sidebar-link").forEach(function (l) {
    l.addEventListener("click", function (e) {
      e.preventDefault();
      var sec = this.getAttribute("data-section");
      $$(".sidebar-link").forEach(function (x) { x.classList.remove("active"); });
      this.classList.add("active");
      $$(".panel-section").forEach(function (x) { x.classList.remove("active"); });
      var t = $("#section-" + sec); if (t) t.classList.add("active");
      var h = $("#section-title"); if (h) h.textContent = titleMap[sec] || sec;
      if (sb) sb.classList.remove("is-open");
    });
  });
  var mt = $("#menu-toggle"), sc = $("#sidebar-close");
  if (mt) mt.addEventListener("click", function () { sb.classList.toggle("is-open"); });
  if (sc) sc.addEventListener("click", function () { sb.classList.remove("is-open"); });
  var lo = $("#btn-logout"); if (lo) lo.addEventListener("click", function () { localStorage.removeItem("isinet-admin-session"); window.location.href = "/admin/index.html"; });

  // Config
  function loadConfig() {
    fetch(API + "/api/config").then(function (r) { return r.json(); }).then(function (d) { cfg = d; localStorage.setItem(LKEY, JSON.stringify(cfg)); fillForm(); }).catch(function () { var s = localStorage.getItem(LKEY); if (s) try { cfg = JSON.parse(s); } catch(e){} fillForm(); });
  }
  function fillForm() {
    $$(".field-input[data-key]").forEach(function (i) { var k = i.getAttribute("data-key"); if (cfg[k] !== undefined) i.value = cfg[k]; });
    updateLogo(); updateHero();
  }
  function saveConfig() {
    $$(".field-input[data-key]").forEach(function (i) { cfg[i.getAttribute("data-key")] = i.value; });
    localStorage.setItem(LKEY, JSON.stringify(cfg));
    apiCall("PUT", "/api/config", cfg).then(function () { show("Guardado", "is-success"); dirty = false; saveBtn.disabled = true; }).catch(function () { show("Guardado local", "is-success"); dirty = false; saveBtn.disabled = true; });
  }
  $$(".field-input").forEach(function (i) { i.addEventListener("input", markDirty); });
  if (saveBtn) saveBtn.addEventListener("click", saveConfig);

  // Logo
  function updateLogo() { var p = $("#logo-preview"), ph = $("#logo-placeholder"); if (!p) return; if (cfg.logo_url) { p.src = cfg.logo_url; p.style.display = "block"; if (ph) ph.style.display = "none"; } else { p.style.display = "none"; if (ph) ph.style.display = "block"; } }
  var lu = $("#logo-upload"); if (lu) lu.addEventListener("change", function () { var f = this.files[0]; if (!f || f.size > 2e6) return; var r = new FileReader(); r.onload = function (e) { cfg.logo_url = e.target.result; updateLogo(); markDirty(); show("Logo cargado", "is-success"); }; r.readAsDataURL(f); });
  var dl = $("#btn-delete-logo"); if (dl) dl.addEventListener("click", function () { if (!cfg.logo_url || !confirm("¿Eliminar logo?")) return; cfg.logo_url = ""; updateLogo(); markDirty(); show("Eliminado", "is-success"); });

  // Hero image
  function updateHero() { var p = $("#hero-preview"), ph = $("#hero-placeholder"); if (!p) return; if (cfg.hero_image_url) { p.src = cfg.hero_image_url; p.style.display = "block"; if (ph) ph.style.display = "none"; } else { p.style.display = "none"; if (ph) ph.style.display = "block"; } }
  var hu = $("#hero-upload"); if (hu) hu.addEventListener("change", function () { var f = this.files[0]; if (!f || f.size > 5e6) return; var r = new FileReader(); r.onload = function (e) { cfg.hero_image_url = e.target.result; updateHero(); markDirty(); show("Imagen cargada", "is-success"); }; r.readAsDataURL(f); });
  var dh = $("#btn-delete-hero"); if (dh) dh.addEventListener("click", function () { if (!confirm("¿Restablecer?")) return; cfg.hero_image_url = ""; updateHero(); markDirty(); show("Restablecida", "is-success"); });

  // ===== IMAGES =====
  var imgs = [];
  var IKEY = "isinet-images";
  function loadImgs() { var s = localStorage.getItem(IKEY); if (s) try { imgs = JSON.parse(s); } catch(e){} }

  var imgIdx = 0;
  function imgCard(file) {
    var id = "ri-" + (imgIdx++);
    return '<div class="image-item">' +
      '<img src="/assets/img/' + file + '" alt="' + file + '">' +
      '<div class="image-item-label">' + file.replace(/\.\w+$/, "").replace(/-/g, " ") + '</div>' +
      '<div class="image-item-actions">' +
        '<label class="image-item-btn image-item-replace" for="' + id + '">🔄 Reemplazar</label>' +
        '<input type="file" accept="image/*" id="' + id + '" data-file="' + file + '" class="hidden-file-input">' +
        '<button class="image-item-btn image-item-delete" data-del="' + file + '">✕</button>' +
      '</div>' +
    '</div>';
  }

  function renderImgs() {
    imgIdx = 0;
    set("images-hero", ["hero-main.jpg"]);
    set("images-about", ["about-team.jpg"]);
    set("images-services", ["repair-workspace.jpg","laptop-repair.jpg","workspace-modern.jpg","office-tech.jpg","hero-glow2.jpg","technician.jpg","hero-main.jpg","network-cables.jpg","server-room.jpg","about-team.jpg"]);
    set("images-stats", ["server-room.jpg"]);
    set("images-gallery", ["hero-main.jpg","technician.jpg","server-room.jpg","repair-workspace.jpg","network-cables.jpg","workspace-modern.jpg","office-tech.jpg","about-team.jpg"]);
    renderUploaded();
    bindImgEvents();
  }

  function set(id, files) { var el = document.getElementById(id); if (el) el.innerHTML = files.map(imgCard).join(""); }

  function renderUploaded() {
    var el = document.getElementById("images-all"), emp = document.getElementById("all-images-empty"), cnt = document.getElementById("count-all");
    if (!el) return;
    if (imgs.length === 0) { el.innerHTML = ""; if (emp) emp.style.display = "block"; } else {
      if (emp) emp.style.display = "none";
      el.innerHTML = imgs.map(function (img) {
        return '<div class="image-item"><img src="' + img.src + '" alt="' + san(img.name) + '"><div class="image-item-label">' + san(img.name) + '</div><div class="image-item-actions"><button class="image-item-btn image-item-delete" data-delup="' + img.id + '">✕</button></div></div>';
      }).join("");
    }
    if (cnt) cnt.textContent = imgs.length + " imágenes";
  }

  function bindImgEvents() {
    // File inputs — change event
    $$(".hidden-file-input").forEach(function (inp) {
      inp.addEventListener("change", function handler() {
        var file = this.files[0];
        var fname = this.getAttribute("data-file");
        if (!file || !fname) return;
        if (file.size > 5e6) { show("Máx 5MB", "is-error"); return; }
        var self = this;
        var reader = new FileReader();
        reader.onload = function (ev) {
          var r = {}; try { r = JSON.parse(localStorage.getItem(RKEY) || "{}"); } catch(e) {}
          r["replace_" + fname.replace(/\.\w+$/, "")] = ev.target.result;
          localStorage.setItem(RKEY, JSON.stringify(r));
          $$('.image-item img[src="/assets/img/' + fname + '"]').forEach(function (i) { i.src = ev.target.result; });
          self.value = "";
          markDirty();
          show("Reemplazada: " + fname, "is-success");
        };
        reader.readAsDataURL(file);
      });
    });
    // Delete buttons
    $$(".image-item-btn.image-item-delete[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = this.getAttribute("data-del");
        if (confirm("¿Ocultar " + f + "?")) { var c = this.closest(".image-item"); if (c) c.style.display = "none"; show("Ocultada", "is-success"); }
      });
    });
    $$(".image-item-btn.image-item-delete[data-delup]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = parseFloat(this.getAttribute("data-delup"));
        if (!confirm("¿Eliminar?")) return;
        imgs = imgs.filter(function (i) { return i.id !== id; });
        localStorage.setItem(IKEY, JSON.stringify(imgs));
        renderUploaded();
        bindImgEvents();
        show("Eliminada", "is-success");
      });
    });
  }

  // Upload new images
  var upl = $("#images-upload");
  if (upl) upl.addEventListener("change", function () {
    Array.from(this.files).forEach(function (f) {
      if (f.size > 5e6) { show(f.name + " excede 5MB", "is-error"); return; }
      var r = new FileReader();
      r.onload = function (e) { imgs.push({ id: Date.now() + Math.random(), src: e.target.result, name: f.name }); localStorage.setItem(IKEY, JSON.stringify(imgs)); renderImgs(); show("Subida: " + f.name, "is-success"); };
      r.readAsDataURL(f);
    });
  });

  // ===== SERVICES =====
  var svcs = [];
  function loadSvcs() { apiCall("GET", "/api/services").then(function (d) { svcs = d; renderSvcs(); }).catch(function () { renderSvcs(); }); }
  function renderSvcs() { var l = $("#services-list"); if (!l) return; l.innerHTML = svcs.map(function (s) { return '<div class="panel-list-item"><div class="panel-list-item-header"><span class="panel-list-item-title">' + san(s.title) + '</span><button class="btn-danger" data-delsvc="' + s.id + '">Eliminar</button></div><div class="panel-list-item-fields"><div class="panel-field"><label class="field-label">Título</label><input class="field-input" value="' + san(s.title) + '" data-updsvc="' + s.id + ':title"></div><div class="panel-field"><label class="field-label">Icono</label><input class="field-input" value="' + san(s.icon || "") + '" data-updsvc="' + s.id + ':icon"></div><div class="panel-field panel-field-full"><label class="field-label">Descripción</label><textarea class="field-input field-textarea" rows="2" data-updsvc="' + s.id + ':description">' + san(s.description) + '</textarea></div></div></div>'; }).join(""); }
  $$(document).on; // placeholder

  // ===== TESTIMONIALS =====
  var tests = [];
  function loadTests() { apiCall("GET", "/api/testimonials").then(function (d) { tests = d; renderTests(); }).catch(function () { renderTests(); }); }
  function renderTests() { var l = $("#testimonials-list"); if (!l) return; l.innerHTML = tests.map(function (t) { return '<div class="panel-list-item"><div class="panel-list-item-header"><span class="panel-list-item-title">' + san(t.name) + '</span><button class="btn-danger" data-deltest="' + t.id + '">Eliminar</button></div><div class="panel-list-item-fields"><div class="panel-field"><label class="field-label">Nombre</label><input class="field-input" value="' + san(t.name) + '" data-updtest="' + t.id + ':name"></div><div class="panel-field"><label class="field-label">Rol</label><input class="field-input" value="' + san(t.role || "") + '" data-updtest="' + t.id + ':role"></div><div class="panel-field panel-field-full"><label class="field-label">Comentario</label><textarea class="field-input field-textarea" rows="2" data-updtest="' + t.id + ':comment">' + san(t.comment) + '</textarea></div></div></div>'; }).join(""); }

  // ===== FAQ =====
  var faqs = [];
  function loadFaqs() { apiCall("GET", "/api/faqs").then(function (d) { faqs = d; renderFaqs(); }).catch(function () { renderFaqs(); }); }
  function renderFaqs() { var l = $("#faq-list"); if (!l) return; l.innerHTML = faqs.map(function (f) { return '<div class="panel-list-item"><div class="panel-list-item-header"><span class="panel-list-item-title">' + san(f.question) + '</span><button class="btn-danger" data-delfaq="' + f.id + '">Eliminar</button></div><div class="panel-list-item-fields"><div class="panel-field panel-field-full"><label class="field-label">Pregunta</label><input class="field-input" value="' + san(f.question) + '" data-updfaq="' + f.id + ':question"></div><div class="panel-field panel-field-full"><label class="field-label">Respuesta</label><textarea class="field-input field-textarea" rows="2" data-updfaq="' + f.id + ':answer">' + san(f.answer) + '</textarea></div></div></div>'; }).join(""); }

  // ===== MAP =====
  var map = null, marker = null;
  function initMap() {
    if (typeof L === "undefined" || map) return;
    var c = document.getElementById("admin-map"); if (!c) return;
    var lat = parseFloat(cfg.map_lat) || -33.4489, lng = parseFloat(cfg.map_lng) || -70.6693;
    map = L.map("admin-map").setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM", maxZoom: 19 }).addTo(map);
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", function (e) { var p = e.target.getLatLng(); cfg.map_lat = p.lat.toFixed(6); cfg.map_lng = p.lng.toFixed(6); markDirty(); });
    setTimeout(function () { map.invalidateSize(); }, 100);
  }
  var ms = document.getElementById("section-map");
  if (ms) new MutationObserver(function () { if (ms.classList.contains("active") && map) setTimeout(function () { map.invalidateSize(); }, 100); }).observe(ms, { attributes: true, attributeFilter: ["class"] });
  var sBtn = $("#btn-search-map"), aIn = $("#map-address-input");
  if (sBtn && aIn) {
    sBtn.addEventListener("click", function () {
      var addr = aIn.value.trim(); if (!addr) { show("Escribe una dirección", "is-error"); return; }
      sBtn.textContent = "Buscando..."; sBtn.disabled = true;
      fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(addr) + "&limit=1&countrycodes=cl").then(function (r) { return r.json(); }).then(function (res) {
        sBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Buscar'; sBtn.disabled = false;
        if (!res.length) { show("No encontrada", "is-error"); return; }
        var r = res[0], nlat = parseFloat(r.lat), nlng = parseFloat(r.lon);
        cfg.map_lat = nlat.toFixed(6); cfg.map_lng = nlng.toFixed(6); cfg.address = addr;
        var li = $("[data-key='map_lat']"), ln = $("[data-key='map_lng']"), ai = $("[data-key='address']");
        if (li) li.value = cfg.map_lat; if (ln) ln.value = cfg.map_lng; if (ai) ai.value = addr;
        if (!map) initMap();
        if (map) { map.setView([nlat, nlng], 16); if (marker) marker.setLatLng([nlat, nlng]); }
        markDirty(); show("Dirección encontrada", "is-success");
      }).catch(function () { sBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Buscar'; sBtn.disabled = false; });
    });
    aIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); sBtn.click(); } });
  }

  // ===== MESSAGES =====
  function loadMsgs() { var l = $("#messages-list"); if (!l) return; apiCall("GET", "/api/contact").then(function (d) { if (!d.length) { l.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">No hay mensajes.</p>'; return; } l.innerHTML = d.map(function (m) { return '<div class="message-item"><div class="message-item-header"><span class="message-item-name">' + san(m.name) + '</span><span class="message-item-date">' + (m.created_at ? new Date(m.created_at).toLocaleDateString("es-CL") : "") + '</span></div><div class="message-item-email">' + san(m.email) + (m.phone ? " · " + san(m.phone) : "") + '</div><div class="message-item-text">' + san(m.message) + '</div></div>'; }).join(""); }).catch(function () {}); }

  // Event delegation for CRUD buttons
  document.addEventListener("click", function (e) {
    var el;
    // Services delete
    el = e.target.closest("[data-delsvc]"); if (el) { var sid = el.getAttribute("data-delsvc"); if (confirm("¿Eliminar?")) apiCall("DELETE", "/api/services?id=" + sid).then(function () { svcs = svcs.filter(function (s) { return s.id !== sid; }); renderSvcs(); show("Eliminado", "is-success"); }); return; }
    // Testimonials delete
    el = e.target.closest("[data-deltest]"); if (el) { var tid = el.getAttribute("data-deltest"); if (confirm("¿Eliminar?")) apiCall("DELETE", "/api/testimonials?id=" + tid).then(function () { tests = tests.filter(function (t) { return t.id !== tid; }); renderTests(); show("Eliminado", "is-success"); }); return; }
    // FAQ delete
    el = e.target.closest("[data-delfaq]"); if (el) { var fid = el.getAttribute("data-delfaq"); if (confirm("¿Eliminar?")) apiCall("DELETE", "/api/faqs?id=" + fid).then(function () { faqs = faqs.filter(function (f) { return f.id !== fid; }); renderFaqs(); show("Eliminado", "is-success"); }); return; }
  });

  // Event delegation for CRUD inputs
  document.addEventListener("change", function (e) {
    var el;
    el = e.target.closest("[data-updsvc]"); if (el) { var p = el.getAttribute("data-updsvc").split(":"); var s = svcs.find(function (x) { return x.id === p[0]; }); if (s) { s[p[1]] = el.value; markDirty(); } return; }
    el = e.target.closest("[data-updtest]"); if (el) { var p2 = el.getAttribute("data-updtest").split(":"); var t = tests.find(function (x) { return x.id === p2[0]; }); if (t) { t[p2[1]] = el.value; markDirty(); } return; }
    el = e.target.closest("[data-updfaq]"); if (el) { var p3 = el.getAttribute("data-updfaq").split(":"); var f = faqs.find(function (x) { return x.id === p3[0]; }); if (f) { f[p3[1]] = el.value; markDirty(); } return; }
  });

  // Add buttons
  var as = $("#btn-add-service"); if (as) as.addEventListener("click", function () { apiCall("POST", "/api/services", { title: "Nuevo", description: "Descripción", icon: "settings" }).then(function (d) { svcs.push(d); renderSvcs(); show("Agregado", "is-success"); }); });
  var at = $("#btn-add-testimonial"); if (at) at.addEventListener("click", function () { apiCall("POST", "/api/testimonials", { name: "Nuevo", role: "Empresa", comment: "Excelente.", rating: 5 }).then(function (d) { tests.push(d); renderTests(); show("Agregado", "is-success"); }); });
  var af = $("#btn-add-faq"); if (af) af.addEventListener("click", function () { apiCall("POST", "/api/faqs", { question: "Nueva?", answer: "Respuesta." }).then(function (d) { faqs.push(d); renderFaqs(); show("Agregado", "is-success"); }); });

  // INIT
  loadConfig(); loadSvcs(); loadTests(); loadFaqs(); loadImgs(); renderImgs(); loadMsgs();
})();
