(function () {
  "use strict";

  var session = localStorage.getItem("isinet-admin-session");
  if (!session) { window.location.href = "/admin/index.html"; return; }
  try {
    var s = JSON.parse(session);
    if (!s.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem("isinet-admin-session");
      window.location.href = "/admin/index.html";
      return;
    }
  } catch (e) { window.location.href = "/admin/index.html"; return; }

  var sessionData = JSON.parse(session);
  var API_BASE = window.location.origin;
  var TOKEN = sessionData.token || "";
  var LOCAL_KEY = "isinet-config";
  var REPLACES_KEY = "isinet-replaces";

  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.from((p || document).querySelectorAll(s)); };

  function showToast(msg, type) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast is-visible " + (type || "");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("is-visible"); }, 3000);
  }

  function sanitize(str) { var d = document.createElement("div"); d.textContent = str || ""; return d.innerHTML; }

  function api(method, path, body) {
    var opts = { method: method, headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN } };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API_BASE + path, opts).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Error"); return d; });
    });
  }

  /* ===== Sidebar ===== */
  var sidebar = $("#sidebar");
  var titles = {
    "general": "Datos Empresa", "logo": "Logo", "images": "Imágenes",
    "texts": "Textos", "services": "Servicios", "testimonials": "Testimonios",
    "faq": "FAQ", "messages": "Mensajes", "email-config": "Email / SMTP", "map": "Mapa"
  };

  $$(".sidebar-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var sec = this.getAttribute("data-section");
      $$(".sidebar-link").forEach(function (l) { l.classList.remove("active"); });
      this.classList.add("active");
      $$(".panel-section").forEach(function (s) { s.classList.remove("active"); });
      var target = $("#section-" + sec);
      if (target) target.classList.add("active");
      var h1 = $("#section-title");
      if (h1) h1.textContent = titles[sec] || sec;
      if (sidebar) sidebar.classList.remove("is-open");
      if (sec === "map" && typeof L !== "undefined" && leafletMap) setTimeout(function () { leafletMap.invalidateSize(); }, 100);
    });
  });

  var menuToggle = $("#menu-toggle");
  var sidebarClose = $("#sidebar-close");
  if (menuToggle) menuToggle.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
  if (sidebarClose) sidebarClose.addEventListener("click", function () { sidebar.classList.remove("is-open"); });

  var logoutBtn = $("#btn-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { localStorage.removeItem("isinet-admin-session"); window.location.href = "/admin/index.html"; });

  /* ===== Save ===== */
  var saveBtn = $("#btn-save");
  var hasChanges = false;
  function markDirty() { hasChanges = true; if (saveBtn) saveBtn.disabled = false; }
  $$(".field-input").forEach(function (i) { i.addEventListener("input", markDirty); });
  if (saveBtn) saveBtn.addEventListener("click", function () { saveConfig(); });

  /* ===== Config ===== */
  var config = {};
  function loadConfig() {
    fetch(API_BASE + "/api/config").then(function (r) { return r.json(); })
      .then(function (d) { config = d; localStorage.setItem(LOCAL_KEY, JSON.stringify(config)); fillForm(); updateMap(); updateLogo(); updateHeroImage(); })
      .catch(function () { var s = localStorage.getItem(LOCAL_KEY); if (s) try { config = JSON.parse(s); } catch(e){} fillForm(); updateMap(); updateLogo(); updateHeroImage(); });
  }
  function fillForm() {
    $$(".field-input[data-key]").forEach(function (i) { var k = i.getAttribute("data-key"); if (config[k] !== undefined) i.value = config[k]; });
  }
  function saveConfig() {
    $$(".field-input[data-key]").forEach(function (i) { config[i.getAttribute("data-key")] = i.value; });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(config));
    api("PUT", "/api/config", config).then(function () {
      showToast("Guardado", "is-success"); hasChanges = false; saveBtn.disabled = true; updateMap(); updateLogo(); updateHeroImage();
    }).catch(function () {
      showToast("Guardado localmente", "is-success"); hasChanges = false; saveBtn.disabled = true; updateMap(); updateLogo(); updateHeroImage();
    });
  }

  /* ===== Logo ===== */
  function updateLogo() {
    var p = $("#logo-preview"), ph = $("#logo-placeholder");
    if (p) { if (config.logo_url) { p.src = config.logo_url; p.style.display = "block"; if (ph) ph.style.display = "none"; } else { p.style.display = "none"; if (ph) ph.style.display = "block"; } }
  }
  var logoUpload = $("#logo-upload");
  if (logoUpload) logoUpload.addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 2*1024*1024) { showToast("Máx 2MB", "is-error"); return; }
    var r = new FileReader();
    r.onload = function (ev) { config.logo_url = ev.target.result; updateLogo(); markDirty(); showToast("Logo cargado", "is-success"); };
    r.readAsDataURL(f);
  });
  var delLogo = $("#btn-delete-logo");
  if (delLogo) delLogo.addEventListener("click", function () {
    if (!config.logo_url) return; if (!confirm("¿Eliminar logo?")) return;
    config.logo_url = ""; updateLogo(); markDirty(); showToast("Logo eliminado", "is-success");
  });

  /* ===== Hero Image ===== */
  function updateHeroImage() {
    var p = $("#hero-preview"), ph = $("#hero-placeholder");
    if (p) { if (config.hero_image_url) { p.src = config.hero_image_url; p.style.display = "block"; if (ph) ph.style.display = "none"; } else { p.style.display = "none"; if (ph) ph.style.display = "block"; } }
  }
  var heroUpload = $("#hero-upload");
  if (heroUpload) heroUpload.addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 5*1024*1024) { showToast("Máx 5MB", "is-error"); return; }
    var r = new FileReader();
    r.onload = function (ev) { config.hero_image_url = ev.target.result; updateHeroImage(); markDirty(); showToast("Imagen cargada", "is-success"); };
    r.readAsDataURL(f);
  });
  var delHero = $("#btn-delete-hero");
  if (delHero) delHero.addEventListener("click", function () {
    if (!confirm("¿Restablecer imagen por defecto?")) return;
    config.hero_image_url = ""; updateHeroImage(); markDirty(); showToast("Restablecida", "is-success");
  });

  /* ===== IMAGES MANAGER ===== */
  var allImages = [];
  var IMAGES_KEY = "isinet-all-images";

  function initImagesManager() {
    var uploadInput = $("#images-upload");
    if (uploadInput) {
      uploadInput.addEventListener("change", function (e) {
        Array.from(e.target.files).forEach(function (file) {
          if (file.size > 5*1024*1024) { showToast(file.name + " excede 5MB", "is-error"); return; }
          var reader = new FileReader();
          reader.onload = function (ev) {
            allImages.push({ id: Date.now()+Math.random(), src: ev.target.result, name: file.name });
            localStorage.setItem(IMAGES_KEY, JSON.stringify(allImages));
            renderAllSections();
            showToast("Subida: " + file.name, "is-success");
          };
          reader.readAsDataURL(file);
        });
      });
    }
    var saved = localStorage.getItem(IMAGES_KEY);
    if (saved) try { allImages = JSON.parse(saved); } catch(e) {}
    renderAllSections();
  }

  function renderAllSections() {
    renderSection("images-hero", ["hero-main.jpg"]);
    renderSection("images-about", ["about-team.jpg"]);
    renderSection("images-services", ["repair-workspace.jpg","laptop-repair.jpg","workspace-modern.jpg","office-tech.jpg","hero-glow2.jpg","technician.jpg","hero-main.jpg","network-cables.jpg","server-room.jpg","about-team.jpg"]);
    renderSection("images-stats", ["server-room.jpg"]);
    renderSection("images-gallery", ["hero-main.jpg","technician.jpg","server-room.jpg","repair-workspace.jpg","network-cables.jpg","workspace-modern.jpg","office-tech.jpg","about-team.jpg"]);
    renderUploaded();
  }

  function renderSection(containerId, files) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = files.map(function (f) { return makeImageCard(f); }).join("");
  }

  function makeImageCard(filename) {
    var safeId = filename.replace(/[^a-z0-9]/gi, "_");
    return '<div class="image-item" id="card-' + safeId + '">' +
      '<img src="/assets/img/' + filename + '" alt="' + filename + '" loading="lazy">' +
      '<div class="image-item-label">' + filename.replace(/\.\w+$/, "").replace(/-/g, " ") + '</div>' +
      '<div class="image-item-actions">' +
        '<label class="image-item-btn image-item-replace" title="Reemplazar">🔄 Reemplazar' +
          '<input type="file" accept="image/*" data-file="' + filename + '" onchange="window._replaceImage(this)" hidden>' +
        '</label>' +
        '<button class="image-item-btn image-item-delete" onclick="window._deleteFileImage(\'' + filename + '\')" title="Ocultar">✕</button>' +
      '</div>' +
    '</div>';
  }

  function renderUploaded() {
    var el = document.getElementById("images-all");
    var empty = document.getElementById("all-images-empty");
    var count = document.getElementById("count-all");
    if (!el) return;
    if (allImages.length === 0) {
      el.innerHTML = "";
      if (empty) empty.style.display = "block";
    } else {
      if (empty) empty.style.display = "none";
      el.innerHTML = allImages.map(function (img) {
        return '<div class="image-item">' +
          '<img src="' + img.src + '" alt="' + sanitize(img.name) + '" loading="lazy">' +
          '<div class="image-item-label">' + sanitize(img.name) + '</div>' +
          '<div class="image-item-actions">' +
            '<button class="image-item-btn image-item-delete" onclick="window._deleteUploadedImage(' + img.id + ')" title="Eliminar">✕ Eliminar</button>' +
          '</div>' +
        '</div>';
      }).join("");
    }
    if (count) count.textContent = allImages.length + " imágenes";
  }

  // Global handlers for inline onclick
  window._replaceImage = function (input) {
    var filename = input.getAttribute("data-file");
    var file = input.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { showToast("Máx 5MB", "is-error"); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      // Save replacement
      var replaces = {};
      try { replaces = JSON.parse(localStorage.getItem(REPLACES_KEY) || "{}"); } catch (e) {}
      var key = "replace_" + filename.replace(/\.\w+$/, "");
      replaces[key] = ev.target.result;
      localStorage.setItem(REPLACES_KEY, JSON.stringify(replaces));
      // Update ALL matching images on the page
      document.querySelectorAll('img[src="/assets/img/' + filename + '"]').forEach(function (img) {
        img.src = ev.target.result;
      });
      input.value = "";
      markDirty();
      showToast("Reemplazada: " + filename, "is-success");
    };
    reader.readAsDataURL(file);
  };

  window._deleteFileImage = function (filename) {
    if (!confirm("¿Ocultar esta imagen?")) return;
    var card = document.getElementById("card-" + filename.replace(/[^a-z0-9]/gi, "_"));
    if (card) card.style.display = "none";
    showToast("Ocultada: " + filename, "is-success");
  };

  window._deleteUploadedImage = function (id) {
    if (!confirm("¿Eliminar imagen subida?")) return;
    allImages = allImages.filter(function (i) { return i.id !== id; });
    localStorage.setItem(IMAGES_KEY, JSON.stringify(allImages));
    renderUploaded();
    showToast("Eliminada", "is-success");
  };

  /* ===== SERVICES ===== */
  var services = [];
  function loadServices() { api("GET", "/api/services").then(function (d) { services = d; renderServices(); }).catch(function () { renderServices(); }); }
  function renderServices() {
    var list = $("#services-list"); if (!list) return;
    list.innerHTML = services.map(function (s) {
      return '<div class="panel-list-item"><div class="panel-list-item-header"><span class="panel-list-item-title">' + sanitize(s.title) + '</span><button class="btn-danger" onclick="window._delSvc(\'' + s.id + '\')">Eliminar</button></div><div class="panel-list-item-fields"><div class="panel-field"><label class="field-label">Título</label><input class="field-input" value="' + sanitize(s.title) + '" onchange="window._updSvc(\'' + s.id + '\',\'title\',this.value)"></div><div class="panel-field"><label class="field-label">Icono</label><input class="field-input" value="' + sanitize(s.icon||"") + '" onchange="window._updSvc(\'' + s.id + '\',\'icon\',this.value)"></div><div class="panel-field panel-field-full"><label class="field-label">Descripción</label><textarea class="field-input field-textarea" rows="2" onchange="window._updSvc(\'' + s.id + '\',\'description\',this.value)">' + sanitize(s.description) + '</textarea></div></div></div>';
    }).join("");
  }
  window._updSvc = function (id, key, val) { var s = services.find(function (x) { return x.id === id; }); if (s) { s[key] = val; markDirty(); } };
  window._delSvc = function (id) { if (!confirm("¿Eliminar?")) return; api("DELETE", "/api/services?id=" + id).then(function () { services = services.filter(function (s) { return s.id !== id; }); renderServices(); showToast("Eliminado", "is-success"); }); };
  var addSvcBtn = $("#btn-add-service");
  if (addSvcBtn) addSvcBtn.addEventListener("click", function () { api("POST", "/api/services", { title: "Nuevo", description: "Descripción", icon: "settings" }).then(function (d) { services.push(d); renderServices(); showToast("Agregado", "is-success"); }); });

  /* ===== TESTIMONIALS ===== */
  var testimonials = [];
  function loadTestimonials() { api("GET", "/api/testimonials").then(function (d) { testimonials = d; renderTestimonials(); }).catch(function () { renderTestimonials(); }); }
  function renderTestimonials() {
    var list = $("#testimonials-list"); if (!list) return;
    list.innerHTML = testimonials.map(function (t) {
      return '<div class="panel-list-item"><div class="panel-list-item-header"><span class="panel-list-item-title">' + sanitize(t.name) + '</span><button class="btn-danger" onclick="window._delTest(\'' + t.id + '\')">Eliminar</button></div><div class="panel-list-item-fields"><div class="panel-field"><label class="field-label">Nombre</label><input class="field-input" value="' + sanitize(t.name) + '" onchange="window._updTest(\'' + t.id + '\',\'name\',this.value)"></div><div class="panel-field"><label class="field-label">Rol</label><input class="field-input" value="' + sanitize(t.role||"") + '" onchange="window._updTest(\'' + t.id + '\',\'role\',this.value)"></div><div class="panel-field panel-field-full"><label class="field-label">Comentario</label><textarea class="field-input field-textarea" rows="2" onchange="window._updTest(\'' + t.id + '\',\'comment\',this.value)">' + sanitize(t.comment) + '</textarea></div></div></div>';
    }).join("");
  }
  window._updTest = function (id, key, val) { var t = testimonials.find(function (x) { return x.id === id; }); if (t) { t[key] = val; markDirty(); } };
  window._delTest = function (id) { if (!confirm("¿Eliminar?")) return; api("DELETE", "/api/testimonials?id=" + id).then(function () { testimonials = testimonials.filter(function (t) { return t.id !== id; }); renderTestimonials(); showToast("Eliminado", "is-success"); }); };
  var addTestBtn = $("#btn-add-testimonial");
  if (addTestBtn) addTestBtn.addEventListener("click", function () { api("POST", "/api/testimonials", { name: "Nuevo", role: "Empresa", comment: "Excelente.", rating: 5 }).then(function (d) { testimonials.push(d); renderTestimonials(); showToast("Agregado", "is-success"); }); });

  /* ===== FAQ ===== */
  var faqs = [];
  function loadFAQs() { api("GET", "/api/faqs").then(function (d) { faqs = d; renderFAQs(); }).catch(function () { renderFAQs(); }); }
  function renderFAQs() {
    var list = $("#faq-list"); if (!list) return;
    list.innerHTML = faqs.map(function (f) {
      return '<div class="panel-list-item"><div class="panel-list-item-header"><span class="panel-list-item-title">' + sanitize(f.question) + '</span><button class="btn-danger" onclick="window._delFaq(\'' + f.id + '\')">Eliminar</button></div><div class="panel-list-item-fields"><div class="panel-field panel-field-full"><label class="field-label">Pregunta</label><input class="field-input" value="' + sanitize(f.question) + '" onchange="window._updFaq(\'' + f.id + '\',\'question\',this.value)"></div><div class="panel-field panel-field-full"><label class="field-label">Respuesta</label><textarea class="field-input field-textarea" rows="2" onchange="window._updFaq(\'' + f.id + '\',\'answer\',this.value)">' + sanitize(f.answer) + '</textarea></div></div></div>';
    }).join("");
  }
  window._updFaq = function (id, key, val) { var f = faqs.find(function (x) { return x.id === id; }); if (f) { f[key] = val; markDirty(); } };
  window._delFaq = function (id) { if (!confirm("¿Eliminar?")) return; api("DELETE", "/api/faqs?id=" + id).then(function () { faqs = faqs.filter(function (f) { return f.id !== id; }); renderFAQs(); showToast("Eliminado", "is-success"); }); };
  var addFaqBtn = $("#btn-add-faq");
  if (addFaqBtn) addFaqBtn.addEventListener("click", function () { api("POST", "/api/faqs", { question: "Nueva?", answer: "Respuesta." }).then(function (d) { faqs.push(d); renderFAQs(); showToast("Agregado", "is-success"); }); });

  /* ===== MAP ===== */
  var leafletMap = null, leafletMarker = null, mapInit = false;
  function initMap() {
    if (typeof L === "undefined" || mapInit) return;
    var c = document.getElementById("admin-map"); if (!c) return;
    var lat = parseFloat(config.map_lat) || -33.4489, lng = parseFloat(config.map_lng) || -70.6693;
    leafletMap = L.map("admin-map").setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(leafletMap);
    leafletMarker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap);
    leafletMarker.on("dragend", function (e) {
      var p = e.target.getLatLng();
      config.map_lat = p.lat.toFixed(6); config.map_lng = p.lng.toFixed(6);
      var el = $("#map-coords"); if (el) el.textContent = "Coordenadas: " + config.map_lat + ", " + config.map_lng;
      markDirty();
    });
    var el = $("#map-coords"); if (el) el.textContent = "Coordenadas: " + lat + ", " + lng;
    mapInit = true;
    setTimeout(function () { leafletMap.invalidateSize(); }, 100);
  }
  function updateMap(lat, lng) {
    var la = lat || parseFloat(config.map_lat) || -33.4489;
    var ln = lng || parseFloat(config.map_lng) || -70.6693;
    if (!leafletMap) initMap();
    if (leafletMap) { leafletMap.setView([la, ln], 16); if (leafletMarker) leafletMarker.setLatLng([la, ln]); var el = $("#map-coords"); if (el) el.textContent = "Coordenadas: " + la + ", " + ln; }
  }
  var mapSec = document.getElementById("section-map");
  if (mapSec) new MutationObserver(function () { if (mapSec.classList.contains("active") && leafletMap) setTimeout(function () { leafletMap.invalidateSize(); }, 100); }).observe(mapSec, { attributes: true, attributeFilter: ["class"] });

  var searchBtn = $("#btn-search-map"), addrInput = $("#map-address-input");
  if (searchBtn && addrInput) {
    searchBtn.addEventListener("click", function () {
      var addr = addrInput.value.trim();
      if (!addr) { showToast("Escribe una dirección", "is-error"); return; }
      searchBtn.textContent = "Buscando..."; searchBtn.disabled = true;
      fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(addr) + "&limit=1&countrycodes=cl")
        .then(function (r) { return r.json(); })
        .then(function (res) {
          searchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Buscar';
          searchBtn.disabled = false;
          if (!res.length) { showToast("No encontrada", "is-error"); return; }
          var r = res[0], nlat = parseFloat(r.lat), nlng = parseFloat(r.lon);
          config.map_lat = nlat.toFixed(6); config.map_lng = nlng.toFixed(6); config.address = addr;
          var li = document.querySelector('[data-key="map_lat"]'), ln = document.querySelector('[data-key="map_lng"]'), ai = document.querySelector('[data-key="address"]');
          if (li) li.value = config.map_lat; if (ln) ln.value = config.map_lng; if (ai) ai.value = addr;
          updateMap(nlat, nlng); markDirty();
          showToast("Dirección encontrada", "is-success");
        })
        .catch(function () { searchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Buscar'; searchBtn.disabled = false; });
    });
    addrInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); searchBtn.click(); } });
  }

  /* ===== MESSAGES ===== */
  function loadMessages() {
    var list = $("#messages-list"); if (!list) return;
    api("GET", "/api/contact").then(function (data) {
      if (!data.length) { list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">No hay mensajes.</p>'; return; }
      list.innerHTML = data.map(function (m) {
        var d = m.created_at ? new Date(m.created_at).toLocaleDateString("es-CL") : "";
        return '<div class="message-item"><div class="message-item-header"><span class="message-item-name">' + sanitize(m.name) + '</span><span class="message-item-date">' + d + '</span></div><div class="message-item-email">' + sanitize(m.email) + (m.phone ? ' · ' + sanitize(m.phone) : '') + '</div><div class="message-item-text">' + sanitize(m.message) + '</div></div>';
      }).join("");
    }).catch(function () { list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">Error.</p>'; });
  }

  /* ===== INIT ===== */
  loadConfig(); loadServices(); loadTestimonials(); loadFAQs(); initImagesManager(); loadMessages();
})();
