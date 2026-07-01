(function () {
  "use strict";

  /* ============================================
     Auth Check
     ============================================ */
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

  /* ============================================
     Helpers
     ============================================ */
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

  function api(method, path, body) {
    var opts = {
      method: method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(API_BASE + path, opts).then(function (res) {
      return res.json().then(function (d) {
        if (!res.ok) throw new Error(d.error || "API error");
        return d;
      });
    });
  }

  function sanitize(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  /* ============================================
     Sidebar Navigation
     ============================================ */
  var sidebar = $("#sidebar");
  var menuToggle = $("#menu-toggle");
  var sidebarClose = $("#sidebar-close");
  var sidebarLinks = $$(".sidebar-link");
  var sectionTitle = $("#section-title");

  var titles = {
    "general": "Datos de la Empresa",
    "logo": "Logo de la Empresa",
    "hero-image": "Imagen Hero",
    "texts": "Textos de la Página",
    "images": "Gestor de Imágenes",
    "services": "Servicios",
    "testimonials": "Testimonios",
    "faq": "Preguntas Frecuentes",
    "messages": "Mensajes de Contacto",
    "map": "Mapa de Ubicación"
  };

  if (menuToggle) menuToggle.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
  if (sidebarClose) sidebarClose.addEventListener("click", function () { sidebar.classList.remove("is-open"); });

  sidebarLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var section = link.getAttribute("data-section");
      sidebarLinks.forEach(function (l) { l.classList.remove("active"); });
      link.classList.add("active");
      $$(".panel-section").forEach(function (s) { s.classList.remove("active"); });
      var target = $("#section-" + section);
      if (target) target.classList.add("active");
      if (sectionTitle) sectionTitle.textContent = titles[section] || section;
      sidebar.classList.remove("is-open");
    });
  });

  /* ============================================
     Logout
     ============================================ */
  var logoutBtn = $("#btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("isinet-admin-session");
      window.location.href = "/admin/index.html";
    });
  }

  /* ============================================
     Save Button
     ============================================ */
  var saveBtn = $("#btn-save");
  var hasChanges = false;

  function markDirty() { hasChanges = true; if (saveBtn) saveBtn.disabled = false; }

  $$(".field-input").forEach(function (input) { input.addEventListener("input", markDirty); });

  if (saveBtn) saveBtn.addEventListener("click", function () { saveConfig(); });

  /* ============================================
     Config
     ============================================ */
  var config = {};
  var LOCAL_KEY = "isinet-config";

  function loadConfig() {
    // First try API
    fetch(API_BASE + "/api/config")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        config = data;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(config));
        fillForm(); updateMap(); updateLogo(); updateHeroImage();
      })
      .catch(function () {
        // Fallback to localStorage
        var saved = localStorage.getItem(LOCAL_KEY);
        if (saved) { try { config = JSON.parse(saved); } catch (e) {} }
        fillForm(); updateMap(); updateLogo(); updateHeroImage();
      });
  }

  function fillForm() {
    $$(".field-input[data-key]").forEach(function (input) {
      var key = input.getAttribute("data-key");
      if (config[key] !== undefined) input.value = config[key];
    });
  }

  function saveConfig() {
    $$(".field-input[data-key]").forEach(function (input) {
      config[input.getAttribute("data-key")] = input.value;
    });
    // Always save to localStorage first (persists across deploys)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(config));
    // Then try API
    api("PUT", "/api/config", config)
      .then(function () {
        showToast("Configuración guardada", "is-success");
        hasChanges = false;
        saveBtn.disabled = true;
        updateMap(); updateLogo(); updateHeroImage();
      })
      .catch(function (err) {
        showToast("Guardado localmente", "is-success");
        hasChanges = false;
        saveBtn.disabled = true;
        updateMap(); updateLogo(); updateHeroImage();
      });
  }

  /* ============================================
     Logo
     ============================================ */
  function updateLogo() {
    var logoPreview = $("#logo-preview");
    var placeholder = $("#logo-placeholder");
    if (logoPreview) {
      if (config.logo_url) {
        logoPreview.src = config.logo_url;
        logoPreview.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      } else {
        logoPreview.style.display = "none";
        if (placeholder) placeholder.style.display = "block";
      }
    }
  }

  var logoUpload = $("#logo-upload");
  if (logoUpload) {
    logoUpload.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { showToast("Máximo 2MB para el logo", "is-error"); return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        config.logo_url = ev.target.result;
        updateLogo();
        markDirty();
        showToast("Logo cargado. Presiona Guardar para aplicar.", "is-success");
      };
      reader.readAsDataURL(file);
    });
  }

  var deleteLogoBtn = $("#btn-delete-logo");
  if (deleteLogoBtn) {
    deleteLogoBtn.addEventListener("click", function () {
      if (!config.logo_url) { showToast("No hay logo para eliminar", "is-error"); return; }
      if (!confirm("¿Eliminar el logo actual?")) return;
      config.logo_url = "";
      updateLogo();
      markDirty();
      showToast("Logo eliminado. Presiona Guardar para aplicar.", "is-success");
    });
  }

  /* ============================================
     Hero Image
     ============================================ */
  function updateHeroImage() {
    var heroPreview = $("#hero-preview");
    var placeholder = $("#hero-placeholder");
    if (heroPreview) {
      if (config.hero_image_url) {
        heroPreview.src = config.hero_image_url;
        heroPreview.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
      } else {
        heroPreview.style.display = "none";
        if (placeholder) placeholder.style.display = "block";
      }
    }
  }

  var heroUpload = $("#hero-upload");
  if (heroUpload) {
    heroUpload.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast("Máximo 5MB para la imagen", "is-error"); return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        config.hero_image_url = ev.target.result;
        updateHeroImage();
        markDirty();
        showToast("Imagen cargada. Presiona Guardar para aplicar.", "is-success");
      };
      reader.readAsDataURL(file);
    });
  }

  var deleteHeroBtn = $("#btn-delete-hero");
  if (deleteHeroBtn) {
    deleteHeroBtn.addEventListener("click", function () {
      if (!confirm("¿Restablecer la imagen por defecto?")) return;
      config.hero_image_url = "";
      updateHeroImage();
      markDirty();
      showToast("Imagen restablecida. Presiona Guardar.", "is-success");
    });
  }

  /* ============================================
     Map — Leaflet + Nominatim (free, no API key)
     ============================================ */
  var leafletMap = null;
  var leafletMarker = null;
  var mapInitialized = false;

  function initMap() {
    if (typeof L === "undefined" || mapInitialized) return;
    var container = document.getElementById("admin-map");
    if (!container) return;
    var lat = parseFloat(config.map_lat) || -33.4489;
    var lng = parseFloat(config.map_lng) || -70.6693;
    leafletMap = L.map("admin-map").setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19
    }).addTo(leafletMap);
    leafletMarker = L.marker([lat, lng], { draggable: true }).addTo(leafletMap);
    leafletMarker.on("dragend", function (e) {
      var pos = e.target.getLatLng();
      config.map_lat = pos.lat.toFixed(6);
      config.map_lng = pos.lng.toFixed(6);
      markDirty();
      $("#map-coords").textContent = "Coordenadas: " + config.map_lat + ", " + config.map_lng;
    });
    $("#map-coords").textContent = "Coordenadas: " + lat + ", " + lng;
    mapInitialized = true;
    setTimeout(function () { leafletMap.invalidateSize(); }, 100);
  }

  function ensureMapVisible() {
    if (!leafletMap) { initMap(); return; }
    setTimeout(function () { leafletMap.invalidateSize(); }, 100);
  }

  function updateMap(lat, lng) {
    var la = lat || parseFloat(config.map_lat) || -33.4489;
    var ln = lng || parseFloat(config.map_lng) || -70.6693;
    if (!leafletMap) { initMap(); }
    if (leafletMap) {
      leafletMap.setView([la, ln], 16);
      if (leafletMarker) leafletMarker.setLatLng([la, ln]);
      $("#map-coords").textContent = "Coordenadas: " + la + ", " + ln;
    }
  }

  // Watch for section visibility changes
  var mapSection = document.getElementById("section-map");
  if (mapSection) {
    var mapObserver = new MutationObserver(function () {
      if (mapSection.classList.contains("active")) ensureMapVisible();
    });
    mapObserver.observe(mapSection, { attributes: true, attributeFilter: ["class"] });
  }

  var searchMapBtn = $("#btn-search-map");
  var mapAddressInput = $("#map-address-input");
  if (searchMapBtn && mapAddressInput) {
    searchMapBtn.addEventListener("click", function () {
      var address = mapAddressInput.value.trim();
      if (!address) { showToast("Escribe una dirección para buscar", "is-error"); return; }
      searchMapBtn.textContent = "Buscando...";
      searchMapBtn.disabled = true;
      fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(address) + "&limit=1&countrycodes=cl")
        .then(function (r) { return r.json(); })
        .then(function (results) {
          searchMapBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Buscar';
          searchMapBtn.disabled = false;
          if (!results.length) { showToast("Dirección no encontrada", "is-error"); return; }
          var result = results[0];
          var newLat = parseFloat(result.lat);
          var newLng = parseFloat(result.lon);
          config.map_lat = newLat.toFixed(6);
          config.map_lng = newLng.toFixed(6);
          config.address = address;
          // Update form inputs so save picks up new values
          var latInput = document.querySelector('[data-key="map_lat"]');
          var lngInput = document.querySelector('[data-key="map_lng"]');
          var addrInput = document.querySelector('[data-key="address"]');
          if (latInput) latInput.value = config.map_lat;
          if (lngInput) lngInput.value = config.map_lng;
          if (addrInput) addrInput.value = address;
          // Update map immediately
          updateMap(newLat, newLng);
          markDirty();
          showToast("Dirección encontrada", "is-success");
        })
        .catch(function () {
          searchMapBtn.textContent = "Buscar";
          searchMapBtn.disabled = false;
          showToast("Error al buscar dirección", "is-error");
        });
    });
    // Enter key triggers search
    mapAddressInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); searchMapBtn.click(); }
    });
  }

  /* ============================================
     Services
     ============================================ */
  var services = [];

  function loadServices() {
    api("GET", "/api/services")
      .then(function (data) { services = data; renderServices(); })
      .catch(function () { renderServices(); });
  }

  function renderServices() {
    var list = $("#services-list");
    if (!list) return;
    list.innerHTML = services.map(function (s) {
      return '<div class="panel-list-item">' +
        '<div class="panel-list-item-header">' +
          '<span class="panel-list-item-title">' + sanitize(s.title) + '</span>' +
          '<button class="btn-danger" onclick="deleteService(\'' + s.id + '\')">Eliminar</button>' +
        '</div>' +
        '<div class="panel-list-item-fields">' +
          '<div class="panel-field"><label class="field-label">Título</label><input class="field-input" value="' + sanitize(s.title) + '" onchange="updateItem(\'services\',\'' + s.id + '\',\'title\',this.value)"></div>' +
          '<div class="panel-field"><label class="field-label">Icono</label><input class="field-input" value="' + sanitize(s.icon || "") + '" onchange="updateItem(\'services\',\'' + s.id + '\',\'icon\',this.value)"></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Descripción</label><textarea class="field-input field-textarea" rows="2" onchange="updateItem(\'services\',\'' + s.id + '\',\'description\',this.value)">' + sanitize(s.description) + '</textarea></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Imagen URL o subir</label><input class="field-input" value="' + sanitize(s.image_url || "") + '" onchange="updateItem(\'services\',\'' + s.id + '\',\'image_url\',this.value)"></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  window.updateItem = function (type, id, key, value) {
    var items = type === "services" ? services : type === "testimonials" ? testimonials : faqs;
    var item = items.find(function (i) { return i.id === id; });
    if (item) { item[key] = value; markDirty(); }
  };

  window.deleteService = function (id) {
    if (!confirm("¿Eliminar este servicio?")) return;
    api("DELETE", "/api/services?id=" + id)
      .then(function () { services = services.filter(function (s) { return s.id !== id; }); renderServices(); showToast("Eliminado", "is-success"); })
      .catch(function (e) { showToast("Error: " + e.message, "is-error"); });
  };

  var addServiceBtn = $("#btn-add-service");
  if (addServiceBtn) {
    addServiceBtn.addEventListener("click", function () {
      api("POST", "/api/services", { title: "Nuevo Servicio", description: "Descripción", icon: "settings" })
        .then(function (created) { services.push(created); renderServices(); showToast("Servicio agregado", "is-success"); })
        .catch(function (e) { showToast("Error: " + e.message, "is-error"); });
    });
  }

  /* ============================================
     Testimonials
     ============================================ */
  var testimonials = [];

  function loadTestimonials() {
    api("GET", "/api/testimonials")
      .then(function (data) { testimonials = data; renderTestimonials(); })
      .catch(function () { renderTestimonials(); });
  }

  function renderTestimonials() {
    var list = $("#testimonials-list");
    if (!list) return;
    list.innerHTML = testimonials.map(function (t) {
      return '<div class="panel-list-item">' +
        '<div class="panel-list-item-header">' +
          '<span class="panel-list-item-title">' + sanitize(t.name) + '</span>' +
          '<button class="btn-danger" onclick="deleteItem(\'testimonials\',\'' + t.id + '\')">Eliminar</button>' +
        '</div>' +
        '<div class="panel-list-item-fields">' +
          '<div class="panel-field"><label class="field-label">Nombre</label><input class="field-input" value="' + sanitize(t.name) + '" onchange="updateItem(\'testimonials\',\'' + t.id + '\',\'name\',this.value)"></div>' +
          '<div class="panel-field"><label class="field-label">Rol</label><input class="field-input" value="' + sanitize(t.role || "") + '" onchange="updateItem(\'testimonials\',\'' + t.id + '\',\'role\',this.value)"></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Comentario</label><textarea class="field-input field-textarea" rows="2" onchange="updateItem(\'testimonials\',\'' + t.id + '\',\'comment\',this.value)">' + sanitize(t.comment) + '</textarea></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  window.deleteItem = function (type, id) {
    if (!confirm("¿Eliminar este elemento?")) return;
    var endpoint = type === "testimonials" ? "/api/testimonials" : "/api/faqs";
    api("DELETE", endpoint + "?id=" + id)
      .then(function () {
        if (type === "testimonials") testimonials = testimonials.filter(function (i) { return i.id !== id; });
        else faqs = faqs.filter(function (i) { return i.id !== id; });
        if (type === "testimonials") renderTestimonials(); else renderFAQs();
        showToast("Eliminado", "is-success");
      })
      .catch(function (e) { showToast("Error: " + e.message, "is-error"); });
  };

  var addTestimonialBtn = $("#btn-add-testimonial");
  if (addTestimonialBtn) {
    addTestimonialBtn.addEventListener("click", function () {
      api("POST", "/api/testimonials", { name: "Nuevo Cliente", role: "Empresa", comment: "Excelente servicio.", rating: 5 })
        .then(function (created) { testimonials.push(created); renderTestimonials(); showToast("Testimonio agregado", "is-success"); })
        .catch(function (e) { showToast("Error: " + e.message, "is-error"); });
    });
  }

  /* ============================================
     FAQ
     ============================================ */
  var faqs = [];

  function loadFAQs() {
    api("GET", "/api/faqs")
      .then(function (data) { faqs = data; renderFAQs(); })
      .catch(function () { renderFAQs(); });
  }

  function renderFAQs() {
    var list = $("#faq-list");
    if (!list) return;
    list.innerHTML = faqs.map(function (f) {
      return '<div class="panel-list-item">' +
        '<div class="panel-list-item-header">' +
          '<span class="panel-list-item-title">' + sanitize(f.question) + '</span>' +
          '<button class="btn-danger" onclick="deleteItem(\'faqs\',\'' + f.id + '\')">Eliminar</button>' +
        '</div>' +
        '<div class="panel-list-item-fields">' +
          '<div class="panel-field panel-field-full"><label class="field-label">Pregunta</label><input class="field-input" value="' + sanitize(f.question) + '" onchange="updateItem(\'faqs\',\'' + f.id + '\',\'question\',this.value)"></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Respuesta</label><textarea class="field-input field-textarea" rows="2" onchange="updateItem(\'faqs\',\'' + f.id + '\',\'answer\',this.value)">' + sanitize(f.answer) + '</textarea></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  var addFAQBtn = $("#btn-add-faq");
  if (addFAQBtn) {
    addFAQBtn.addEventListener("click", function () {
      api("POST", "/api/faqs", { question: "Nueva pregunta", answer: "Respuesta aquí." })
        .then(function (created) { faqs.push(created); renderFAQs(); showToast("Pregunta agregada", "is-success"); })
        .catch(function (e) { showToast("Error: " + e.message, "is-error"); });
    });
  }

  /* ============================================
     Images Manager — Organized by section
     ============================================ */
  var allImages = [];
  var IMAGES_KEY = "isinet-all-images";

  // Image sections mapping: which images belong to which section
  var imageSections = {
    hero: { label: "Hero", container: "images-hero", files: ["hero-main.jpg"] },
    about: { label: "Quiénes Somos", container: "images-about", files: ["about-team.jpg"] },
    services: { label: "Servicios", container: "images-services", files: ["repair-workspace.jpg","laptop-repair.jpg","workspace-modern.jpg","office-tech.jpg","hero-glow2.jpg","technician.jpg","hero-main.jpg","network-cables.jpg","server-room.jpg","about-team.jpg"] },
    stats: { label: "Estadísticas", container: "images-stats", files: ["server-room.jpg"] },
    gallery: { label: "Galería", container: "images-gallery", files: ["hero-main.jpg","technician.jpg","server-room.jpg","repair-workspace.jpg","network-cables.jpg","workspace-modern.jpg","office-tech.jpg","about-team.jpg"] }
  };

  function initImagesManager() {
    var uploadInput = $("#images-upload");
    if (!uploadInput) return;

    // Load uploaded images
    var saved = localStorage.getItem(IMAGES_KEY);
    if (saved) { try { allImages = JSON.parse(saved); } catch (e) {} }

    // Upload handler
    uploadInput.addEventListener("change", function (e) {
      Array.from(e.target.files).forEach(function (file) {
        if (file.size > 5 * 1024 * 1024) { showToast(file.name + " excede 5MB", "is-error"); return; }
        var reader = new FileReader();
        reader.onload = function (ev) {
          allImages.push({ id: Date.now() + Math.random(), src: ev.target.result, name: file.name, date: new Date().toISOString() });
          localStorage.setItem(IMAGES_KEY, JSON.stringify(allImages));
          renderAllSections();
          showToast("Subida: " + file.name, "is-success");
        };
        reader.readAsDataURL(file);
      });
    });

    renderAllSections();
  }

  function renderImageCard(img, showDelete) {
    var deleteBtn = showDelete !== false ? '<button class="image-item-delete" onclick="deleteImage(' + img.id + ')" title="Eliminar">✕</button>' : '';
    return '<div class="image-item">' +
      '<img src="' + img.src + '" alt="' + sanitize(img.name) + '" loading="lazy">' +
      '<div class="image-item-label">' + sanitize(img.name) + '</div>' +
      deleteBtn +
    '</div>';
}

function renderImageCardFile(filename) {
    return '<div class="image-item">' +
      '<img src="assets/img/' + filename + '" alt="' + filename + '" loading="lazy">' +
      '<div class="image-item-label">' + filename.replace('.jpg','').replace('.png','').replace(/-/g,' ') + '</div>' +
    '</div>';
  }

  function renderAllSections() {
    // Hero
    var heroEl = $("#images-hero");
    if (heroEl) heroEl.innerHTML = renderImageCardFile("hero-main.jpg");

    // About
    var aboutEl = $("#images-about");
    if (aboutEl) aboutEl.innerHTML = renderImageCardFile("about-team.jpg");

    // Services
    var servicesEl = $("#images-services");
    if (servicesEl) {
      var svcFiles = ["repair-workspace.jpg","laptop-repair.jpg","workspace-modern.jpg","office-tech.jpg","hero-glow2.jpg","technician.jpg","hero-main.jpg","network-cables.jpg","server-room.jpg","about-team.jpg"];
      servicesEl.innerHTML = svcFiles.map(renderImageCardFile).join("");
      var svcCount = $("#count-services");
      if (svcCount) svcCount.textContent = svcFiles.length + " imágenes";
    }

    // Stats
    var statsEl = $("#images-stats");
    if (statsEl) statsEl.innerHTML = renderImageCardFile("server-room.jpg");

    // Gallery
    var galleryEl = $("#images-gallery");
    if (galleryEl) {
      var galFiles = ["hero-main.jpg","technician.jpg","server-room.jpg","repair-workspace.jpg","network-cables.jpg","workspace-modern.jpg","office-tech.jpg","about-team.jpg"];
      galleryEl.innerHTML = galFiles.map(renderImageCardFile).join("");
      var galCount = $("#count-gallery");
      if (galCount) galCount.textContent = galFiles.length + " imágenes";
    }

    // All uploaded images
    var allEl = $("#images-all");
    var emptyEl = $("#all-images-empty");
    var countEl = $("#count-all");
    if (allEl) {
      if (allImages.length === 0) {
        allEl.innerHTML = "";
        if (emptyEl) emptyEl.style.display = "block";
      } else {
        if (emptyEl) emptyEl.style.display = "none";
        allEl.innerHTML = allImages.map(function (img) { return renderImageCard(img, true); }).join("");
      }
      if (countEl) countEl.textContent = allImages.length + " imágenes";
    }
  }

  window.deleteImage = function (id) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    allImages = allImages.filter(function (i) { return i.id !== id; });
    localStorage.setItem(IMAGES_KEY, JSON.stringify(allImages));
    renderAllSections();
    showToast("Imagen eliminada", "is-success");
  };

  /* ============================================
     Messages
     ============================================ */
  function loadMessages() {
    var list = $("#messages-list");
    if (!list) return;
    api("GET", "/api/contact")
      .then(function (data) {
        if (!data.length) { list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">No hay mensajes de contacto aún.</p>'; return; }
        list.innerHTML = data.map(function (m) {
          var date = m.created_at ? new Date(m.created_at).toLocaleDateString("es-CL") : "";
          return '<div class="message-item">' +
            '<div class="message-item-header"><span class="message-item-name">' + sanitize(m.name) + '</span><span class="message-item-date">' + date + '</span></div>' +
            '<div class="message-item-email">' + sanitize(m.email) + (m.phone ? ' · ' + sanitize(m.phone) : '') + '</div>' +
            '<div class="message-item-text">' + sanitize(m.message) + '</div>' +
          '</div>';
        }).join("");
      })
      .catch(function () { list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">Error al cargar mensajes.</p>'; });
  }

  /* ============================================
     Init
     ============================================ */
  loadConfig();
  loadServices();
  loadTestimonials();
  loadFAQs();
  initImagesManager();
  loadMessages();
})();
