(function () {
  "use strict";

  /* ============================================
     Auth Check
     ============================================ */
  var session = localStorage.getItem("soportemax-admin-session");
  if (!session) { window.location.href = "index.html"; return; }
  try {
    var s = JSON.parse(session);
    if (!s.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem("soportemax-admin-session");
      window.location.href = "index.html";
      return;
    }
  } catch (e) { window.location.href = "index.html"; return; }

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

  function sanitize(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================================
     Supabase Client
     ============================================ */
  var sb = null;
  var SUPABASE_URL = "YOUR_SUPABASE_URL";
  var SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";

  function initSupabase() {
    if (typeof supabase !== "undefined" && SUPABASE_URL.indexOf("YOUR_") === -1) {
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  }

  /* ============================================
     Navigation
     ============================================ */
  var sidebar = $("#sidebar");
  var menuToggle = $("#menu-toggle");
  var sidebarClose = $("#sidebar-close");
  var sidebarLinks = $$(".sidebar-link");
  var sectionTitle = $("#section-title");

  var titles = {
    "general": "Configuración General",
    "services": "Servicios",
    "testimonials": "Testimonios",
    "faq": "Preguntas Frecuentes",
    "gallery": "Galería de Imágenes",
    "contact-config": "Mensajes de Contacto",
    "seo": "SEO & Meta Tags"
  };

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("is-open");
    });
  }
  if (sidebarClose) {
    sidebarClose.addEventListener("click", function () {
      sidebar.classList.remove("is-open");
    });
  }

  sidebarLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var section = link.getAttribute("data-section");
      // Update active link
      sidebarLinks.forEach(function (l) { l.classList.remove("active"); });
      link.classList.add("active");
      // Show section
      $$(".panel-section").forEach(function (s) { s.classList.remove("active"); });
      var target = $("#section-" + section);
      if (target) target.classList.add("active");
      // Update title
      if (sectionTitle) sectionTitle.textContent = titles[section] || section;
      // Close mobile sidebar
      sidebar.classList.remove("is-open");
    });
  });

  /* ============================================
     Logout
     ============================================ */
  var logoutBtn = $("#btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("soportemax-admin-session");
      window.location.href = "index.html";
    });
  }

  /* ============================================
     Save Button
     ============================================ */
  var saveBtn = $("#btn-save");
  var hasChanges = false;

  function markDirty() { hasChanges = true; if (saveBtn) saveBtn.disabled = false; }

  $$(".field-input").forEach(function (input) {
    input.addEventListener("input", markDirty);
  });

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      saveConfig();
    });
  }

  /* ============================================
     Config CRUD
     ============================================ */
  var config = {};

  function loadConfig() {
    // Load from localStorage
    var saved = localStorage.getItem("soportemax-config");
    if (saved) {
      try { config = JSON.parse(saved); } catch (e) { config = {}; }
    }

    // Load from Supabase if available
    if (sb) {
      sb.from("site_config").select("*").then(function (res) {
        if (res.data) {
          res.data.forEach(function (row) { config[row.key] = row.value; });
          fillForm();
          localStorage.setItem("soportemax-config", JSON.stringify(config));
        }
      }).catch(function () {});
    }

    fillForm();
  }

  function fillForm() {
    $$(".field-input[data-key]").forEach(function (input) {
      var key = input.getAttribute("data-key");
      if (config[key] !== undefined) {
        input.value = typeof config[key] === "string" ? config[key] : JSON.stringify(config[key]);
      }
    });
  }

  function saveConfig() {
    $$(".field-input[data-key]").forEach(function (input) {
      var key = input.getAttribute("data-key");
      config[key] = input.value;
    });

    localStorage.setItem("soportemax-config", JSON.stringify(config));

    if (sb) {
      var promises = Object.keys(config).map(function (key) {
        return sb.from("site_config").upsert({ key: key, value: config[key], updated_at: new Date().toISOString() });
      });
      Promise.all(promises).then(function () {
        showToast("Configuración guardada", "is-success");
        hasChanges = false;
        saveBtn.disabled = true;
      }).catch(function () {
        showToast("Error al guardar en la nube", "is-error");
      });
    } else {
      showToast("Configuración guardada localmente", "is-success");
      hasChanges = false;
      saveBtn.disabled = true;
    }
  }

  /* ============================================
     Services CRUD
     ============================================ */
  var services = [];

  function loadServices() {
    if (sb) {
      sb.from("services").select("*").order("sort_order").then(function (res) {
        if (res.data) { services = res.data; renderServices(); }
      }).catch(function () {
        services = window.__BRAND__ ? window.__BRAND__.services : [];
        renderServices();
      });
    } else {
      services = window.__BRAND__ ? window.__BRAND__.services : [];
      renderServices();
    }
  }

  function renderServices() {
    var list = $("#services-list");
    if (!list) return;
    list.innerHTML = services.map(function (s, i) {
      return '<div class="panel-list-item" data-id="' + (s.id || i) + '">' +
        '<div class="panel-list-item-header">' +
          '<span class="panel-list-item-title">' + sanitize(s.title || "Sin título") + '</span>' +
          '<div class="panel-list-item-actions">' +
            '<button class="btn-danger" onclick="deleteService(' + i + ')">Eliminar</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel-list-item-fields">' +
          '<div class="panel-field"><label class="field-label">Título</label><input class="field-input" value="' + sanitize(s.title || "") + '" onchange="updateService(' + i + ', \'title\', this.value)"></div>' +
          '<div class="panel-field"><label class="field-label">Icono</label><input class="field-input" value="' + sanitize(s.icon || "") + '" onchange="updateService(' + i + ', \'icon\', this.value)"></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Descripción</label><textarea class="field-input field-textarea" rows="2" onchange="updateService(' + i + ', \'description\', this.value)">' + sanitize(s.description || "") + '</textarea></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  window.updateService = function (idx, key, value) {
    if (services[idx]) { services[idx][key] = value; markDirty(); }
  };

  window.deleteService = function (idx) {
    if (confirm("¿Eliminar este servicio?")) {
      services.splice(idx, 1);
      renderServices();
      markDirty();
    }
  };

  var addServiceBtn = $("#btn-add-service");
  if (addServiceBtn) {
    addServiceBtn.addEventListener("click", function () {
      services.push({ id: Date.now(), title: "Nuevo Servicio", description: "Descripción del servicio", icon: "settings" });
      renderServices();
      markDirty();
    });
  }

  /* ============================================
     Testimonials CRUD
     ============================================ */
  var testimonials = [];

  function loadTestimonials() {
    if (sb) {
      sb.from("testimonials").select("*").then(function (res) {
        if (res.data) { testimonials = res.data; renderTestimonials(); }
      }).catch(function () {
        testimonials = window.__BRAND__ ? window.__BRAND__.testimonials : [];
        renderTestimonials();
      });
    } else {
      testimonials = window.__BRAND__ ? window.__BRAND__.testimonials : [];
      renderTestimonials();
    }
  }

  function renderTestimonials() {
    var list = $("#testimonials-list");
    if (!list) return;
    list.innerHTML = testimonials.map(function (t, i) {
      return '<div class="panel-list-item" data-id="' + (t.id || i) + '">' +
        '<div class="panel-list-item-header">' +
          '<span class="panel-list-item-title">' + sanitize(t.name || "Sin nombre") + '</span>' +
          '<div class="panel-list-item-actions">' +
            '<button class="btn-danger" onclick="deleteTestimonial(' + i + ')">Eliminar</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel-list-item-fields">' +
          '<div class="panel-field"><label class="field-label">Nombre</label><input class="field-input" value="' + sanitize(t.name || "") + '" onchange="updateTestimonial(' + i + ', \'name\', this.value)"></div>' +
          '<div class="panel-field"><label class="field-label">Rol</label><input class="field-input" value="' + sanitize(t.role || "") + '" onchange="updateTestimonial(' + i + ', \'role\', this.value)"></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Comentario</label><textarea class="field-input field-textarea" rows="2" onchange="updateTestimonial(' + i + ', \'comment\', this.value)">' + sanitize(t.comment || "") + '</textarea></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  window.updateTestimonial = function (idx, key, value) {
    if (testimonials[idx]) { testimonials[idx][key] = value; markDirty(); }
  };

  window.deleteTestimonial = function (idx) {
    if (confirm("¿Eliminar este testimonio?")) {
      testimonials.splice(idx, 1);
      renderTestimonials();
      markDirty();
    }
  };

  var addTestimonialBtn = $("#btn-add-testimonial");
  if (addTestimonialBtn) {
    addTestimonialBtn.addEventListener("click", function () {
      testimonials.push({ id: Date.now(), name: "Nuevo Cliente", role: "Empresa", comment: "Excelente servicio.", rating: 5 });
      renderTestimonials();
      markDirty();
    });
  }

  /* ============================================
     FAQ CRUD
     ============================================ */
  var faqs = [];

  function loadFAQs() {
    if (sb) {
      sb.from("faqs").select("*").order("sort_order").then(function (res) {
        if (res.data) { faqs = res.data; renderFAQs(); }
      }).catch(function () {
        faqs = window.__BRAND__ ? window.__BRAND__.faqs : [];
        renderFAQs();
      });
    } else {
      faqs = window.__BRAND__ ? window.__BRAND__.faqs : [];
      renderFAQs();
    }
  }

  function renderFAQs() {
    var list = $("#faq-list");
    if (!list) return;
    list.innerHTML = faqs.map(function (f, i) {
      return '<div class="panel-list-item" data-id="' + (f.id || i) + '">' +
        '<div class="panel-list-item-header">' +
          '<span class="panel-list-item-title">' + sanitize(f.question || "Sin pregunta") + '</span>' +
          '<div class="panel-list-item-actions">' +
            '<button class="btn-danger" onclick="deleteFAQ(' + i + ')">Eliminar</button>' +
          '</div>' +
        '</div>' +
        '<div class="panel-list-item-fields">' +
          '<div class="panel-field panel-field-full"><label class="field-label">Pregunta</label><input class="field-input" value="' + sanitize(f.question || "") + '" onchange="updateFAQ(' + i + ', \'question\', this.value)"></div>' +
          '<div class="panel-field panel-field-full"><label class="field-label">Respuesta</label><textarea class="field-input field-textarea" rows="2" onchange="updateFAQ(' + i + ', \'answer\', this.value)">' + sanitize(f.answer || "") + '</textarea></div>' +
        '</div>' +
      '</div>";
    }).join("");
  }

  window.updateFAQ = function (idx, key, value) {
    if (faqs[idx]) { faqs[idx][key] = value; markDirty(); }
  };

  window.deleteFAQ = function (idx) {
    if (confirm("¿Eliminar esta pregunta?")) {
      faqs.splice(idx, 1);
      renderFAQs();
      markDirty();
    }
  };

  var addFAQBtn = $("#btn-add-faq");
  if (addFAQBtn) {
    addFAQBtn.addEventListener("click", function () {
      faqs.push({ id: Date.now(), question: "Nueva pregunta", answer: "Respuesta aquí." });
      renderFAQs();
      markDirty();
    });
  }

  /* ============================================
     Gallery Upload
     ============================================ */
  function initGallery() {
    var uploadInput = $("#gallery-upload");
    var uploadArea = $("#upload-area");
    var grid = $("#gallery-grid");
    if (!uploadInput || !grid) return;

    // Load existing images from localStorage
    var galleryImages = [];
    var savedGallery = localStorage.getItem("soportemax-gallery");
    if (savedGallery) {
      try { galleryImages = JSON.parse(savedGallery); } catch (e) {}
    }
    renderGallery();

    uploadInput.addEventListener("change", function (e) {
      Array.from(e.target.files).forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          var imgData = { id: Date.now() + Math.random(), src: ev.target.result, name: file.name };
          galleryImages.push(imgData);
          localStorage.setItem("soportemax-gallery", JSON.stringify(galleryImages));
          renderGallery();
        };
        reader.readAsDataURL(file);
      });
    });

    // Drag and drop
    if (uploadArea) {
      uploadArea.addEventListener("dragover", function (e) { e.preventDefault(); uploadArea.style.borderColor = "var(--accent)"; });
      uploadArea.addEventListener("dragleave", function () { uploadArea.style.borderColor = ""; });
      uploadArea.addEventListener("drop", function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = "";
        if (e.dataTransfer.files.length) {
          uploadInput.files = e.dataTransfer.files;
          uploadInput.dispatchEvent(new Event("change"));
        }
      });
    }

    function renderGallery() {
      grid.innerHTML = galleryImages.map(function (img) {
        return '<div class="gallery-item-admin" data-id="' + img.id + '">' +
          '<img src="' + img.src + '" alt="' + sanitize(img.name) + '" loading="lazy">' +
          '<button class="gallery-item-admin-delete" onclick="deleteGalleryItem(' + img.id + ')">✕</button>' +
        '</div>';
      }).join("");
    }

    window.deleteGalleryItem = function (id) {
      if (confirm("¿Eliminar esta imagen?")) {
        galleryImages = galleryImages.filter(function (img) { return img.id !== id; });
        localStorage.setItem("soportemax-gallery", JSON.stringify(galleryImages));
        renderGallery();
      }
    };
  }

  /* ============================================
     Messages
     ============================================ */
  function loadMessages() {
    var list = $("#messages-list");
    if (!list) return;

    if (sb) {
      sb.from("contact_messages").select("*").order("created_at", { ascending: false }).then(function (res) {
        if (res.data && res.data.length) {
          renderMessages(res.data);
        } else {
          list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">No hay mensajes aún.</p>';
        }
      }).catch(function () {
        list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">Conecta Supabase para ver mensajes.</p>';
      });
    } else {
      list.innerHTML = '<p style="color:var(--text-4);text-align:center;padding:40px;">Conecta Supabase para ver mensajes de contacto.</p>';
    }
  }

  function renderMessages(messages) {
    var list = $("#messages-list");
    if (!list) return;
    list.innerHTML = messages.map(function (m) {
      var date = m.created_at ? new Date(m.created_at).toLocaleDateString("es-CL") : "";
      return '<div class="message-item">' +
        '<div class="message-item-header">' +
          '<span class="message-item-name">' + sanitize(m.name || "") + '</span>' +
          '<span class="message-item-date">' + date + '</span>' +
        '</div>' +
        '<div class="message-item-email">' + sanitize(m.email || "") + (m.phone ? ' · ' + sanitize(m.phone) : '') + '</div>' +
        '<div class="message-item-text">' + sanitize(m.message || "") + '</div>' +
      '</div>';
    }).join("");
  }

  /* ============================================
     Init
     ============================================ */
  initSupabase();
  loadConfig();
  loadServices();
  loadTestimonials();
  loadFAQs();
  initGallery();
  loadMessages();
})();
