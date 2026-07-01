(function () {
  "use strict";

  /* ============================================
     Helpers
     ============================================ */
  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.from((p || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  function escHTML(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function showToast(msg, type) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast is-visible " + (type || "");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("is-visible"); }, 4000);
  }

  /* ============================================
     Load Config from API & Update Logo
     ============================================ */
  function loadSiteConfig() {
    // Config API now includes image_replaces and image_hidden
    fetch("/api/config?" + Date.now())
      .then(function (res) { return res.json(); })
      .then(function (cfg) {
        applyConfig(cfg);
        console.log("[Isinet] Config loaded, replacements:", cfg.image_replaces ? Object.keys(JSON.parse(typeof cfg.image_replaces === 'string' ? cfg.image_replaces : '{}')).length : 0);
      })
      .catch(function (e) { console.log("[Isinet] Config load error:", e); });
  }

  function loadReplacements() {
    console.log("[Isinet] loadReplacements called");
    fetch("/api/images?" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.replaces) return;
        var count = 0;
        Object.keys(data.replaces).forEach(function(key) {
          var url = data.replaces[key];
          if (!url) return;
          document.querySelectorAll('img').forEach(function (img) {
            var src = img.getAttribute("src") || "";
            var filename = src.split('/').pop().replace(/\.\w+$/, '');
            if (filename === key && !img.dataset.replaced) {
              // FORCE reload: create new img, copy attributes, swap
              var newImg = document.createElement("img");
              newImg.src = url + "?v=" + Date.now();
              newImg.alt = img.alt;
              newImg.className = img.className;
              newImg.style.cssText = img.style.cssText;
              if (img.parentNode) {
                img.parentNode.replaceChild(newImg, img);
              }
              newImg.dataset.replaced = "1";
              count++;
            }
          });
        });
        // Hidden images
        if (data.hidden && data.hidden.length) {
          data.hidden.forEach(function (fname) {
            document.querySelectorAll('img').forEach(function (img) {
              var src = img.getAttribute("src") || "";
              var filename = src.split('/').pop().replace(/\.\w+$/, '');
              if (filename === fname) img.style.display = "none";
            });
          });
        }
        console.log("[Isinet] Applied " + count + " replacements");
      })
      .catch(function (e) { console.log("[Isinet] Error:", e); });
  }

  function applyConfig(cfg) {
    // Apply image replacements from config (keys starting with replace_)
    Object.keys(cfg).forEach(function(key) {
      if (key.indexOf("replace_") === 0) {
        var filename = key.replace("replace_", "");
        var url = cfg[key];
        if (!url) return;
        document.querySelectorAll('img').forEach(function (img) {
          var src = img.getAttribute("src") || "";
          var imgFilename = src.split('/').pop().replace(/\.\w+$/, '');
          if (imgFilename === filename && !img.dataset.replaced) {
            var newImg = document.createElement("img");
            newImg.src = url + "?v=" + Date.now();
            newImg.alt = img.alt;
            newImg.className = img.className;
            newImg.style.cssText = img.style.cssText;
            if (img.parentNode) img.parentNode.replaceChild(newImg, img);
            newImg.dataset.replaced = "1";
          }
        });
      }
    });
    // Apply hidden images (keys starting with hidden_)
    Object.keys(cfg).forEach(function(key) {
      if (key.indexOf("hidden_") === 0) {
        var filename = key.replace("hidden_", "");
        document.querySelectorAll('img').forEach(function (img) {
          var src = img.getAttribute("src") || "";
          var imgFilename = src.split('/').pop().replace(/\.\w+$/, '');
          if (imgFilename === filename) img.style.display = "none";
        });
      }
    });
    // Update hero image
    if (cfg.hero_image_url) {
      var heroImg = document.querySelector(".hero-bg img");
      if (heroImg) heroImg.src = cfg.hero_image_url;
    }
    // Update texts
    var textMap = {
      "text_hero_badge": ".hero-badge",
      "text_hero_title": ".hero-title",
      "text_hero_sub": ".hero-sub",
      "text_about_title": "#quienes-somos .section-title",
      "text_about_p1": "#quienes-somos .about-text:first-of-type",
      "text_about_p2": "#quienes-somos .about-text:last-of-type",
      "text_services_title": "#servicios .section-title",
      "text_services_sub": "#servicios .section-subtitle",
      "text_features_title": "#por-que .section-title",
      "text_process_title": "#proceso .section-title",
      "text_gallery_title": "#galeria .section-title",
      "text_testimonials_title": "#testimonios .section-title",
      "text_faq_title": "#faq .section-title",
      "text_contact_title": "#contacto .section-title",
      "text_contact_sub": "#contacto .section-subtitle",
      "text_footer_desc": ".footer-desc",
      "text_footer_copy": ".footer-bottom p"
    };
    Object.keys(textMap).forEach(function (key) {
      if (cfg[key]) {
        var el = document.querySelector(textMap[key]);
        if (el) {
          if (key === "text_hero_title" || key === "text_about_title" || key === "text_services_title" || key === "text_features_title" || key === "text_process_title" || key === "text_gallery_title" || key === "text_testimonials_title" || key === "text_faq_title" || key === "text_contact_title") {
            // Headlines with <em> — preserve the gradient emphasis
            el.innerHTML = cfg[key];
          } else {
            el.textContent = cfg[key];
          }
        }
      }
    });
    // Update logo
    var logoEl = document.querySelector(".nav-logo-icon");
    if (cfg.logo_url && logoEl) {
      logoEl.innerHTML = '<img src="' + cfg.logo_url + '" alt="Logo" style="height:32px;width:auto;object-fit:contain;">';
    }
    // Update contact info block
    var contactPhone = document.getElementById("contact-phone");
    var contactEmail = document.getElementById("contact-email");
    var contactAddress = document.getElementById("contact-address");
    var contactHours = document.getElementById("contact-hours");
    if (contactPhone && cfg.phone) contactPhone.textContent = cfg.phone;
    if (contactEmail && cfg.email) contactEmail.textContent = cfg.email;
    if (contactAddress && cfg.address) contactAddress.textContent = cfg.address;
    if (contactHours && cfg.hours) contactHours.textContent = cfg.hours;
    // Update footer
    var footerBrand = document.querySelector(".footer-logo span:last-child");
    if (cfg.company_name && footerBrand) footerBrand.textContent = cfg.company_name;
    var footerContact = document.querySelector(".footer-contact ul");
    if (footerContact && cfg.phone) {
      var items = footerContact.querySelectorAll("li");
      if (items[0]) items[0].textContent = cfg.phone;
      if (items[1]) items[1].textContent = cfg.email || "";
      if (items[2]) items[2].textContent = cfg.address || "";
      if (items[3]) items[3].textContent = cfg.hours || "";
    }
    // Init Leaflet map
    if (typeof L !== "undefined") {
      var mapContainer = document.getElementById("site-map");
      if (mapContainer && !mapContainer._leaflet_id) {
        var lat = parseFloat(cfg.map_lat) || -33.4489;
        var lng = parseFloat(cfg.map_lng) || -70.6693;
        var siteMap = L.map("site-map").setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19
        }).addTo(siteMap);
        L.marker([lat, lng]).addTo(siteMap);
        setTimeout(function () { siteMap.invalidateSize(); }, 300);
      }
    }
    // Update social links
    var socialLinks = document.querySelectorAll(".footer-social-link");
    if (socialLinks[0] && cfg.social_facebook) socialLinks[0].href = cfg.social_facebook;
    if (socialLinks[1] && cfg.social_instagram) socialLinks[1].href = cfg.social_instagram;
    if (socialLinks[2] && cfg.social_linkedin) socialLinks[2].href = cfg.social_linkedin;
  }

  /* ============================================
     Splash
     ============================================ */
  function initSplash() {
    var splash = $("[data-splash]");
    if (!splash) return;
    var hide = function () { splash.classList.add("is-out"); };
    if (document.readyState === "complete") setTimeout(hide, 600);
    else window.addEventListener("load", function () { setTimeout(hide, 400); });
    setTimeout(hide, 4000);
  }

  /* ============================================
     Navigation
     ============================================ */
  function initNav() {
    var nav = $("#nav");
    var hamburger = $("#nav-hamburger");
    var mobileMenu = $("#mobile-menu");
    var links = $$(".nav-link");
    var mobileLinks = $$(".mobile-link");

    // Scroll state
    var lastScroll = 0;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (nav) nav.classList.toggle("is-scrolled", y > 50);
      lastScroll = y;
    }, { passive: true });

    // Active link on scroll
    var sections = $$("section[id]");
    function updateActiveLink() {
      var y = window.scrollY + 120;
      var current = "";
      sections.forEach(function (s) {
        if (s.offsetTop <= y) current = s.id;
      });
      links.forEach(function (l) {
        l.classList.toggle("active", l.getAttribute("href") === "#" + current);
      });
    }
    window.addEventListener("scroll", updateActiveLink, { passive: true });

    // Hamburger
    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function () {
        var isOpen = mobileMenu.classList.contains("is-open");
        mobileMenu.classList.toggle("is-open");
        hamburger.classList.toggle("is-active");
        hamburger.setAttribute("aria-expanded", !isOpen);
        mobileMenu.setAttribute("aria-hidden", isOpen);
        document.body.style.overflow = isOpen ? "" : "hidden";
      });

      // Close on link click
      mobileLinks.forEach(function (l) {
        l.addEventListener("click", function () {
          mobileMenu.classList.remove("is-open");
          hamburger.classList.remove("is-active");
          hamburger.setAttribute("aria-expanded", "false");
          mobileMenu.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "";
        });
      });
    }
  }

  /* ============================================
     Theme Toggle
     ============================================ */
  function initThemeToggle() {
    var btn = $("#theme-toggle");
    var html = document.documentElement;
    if (!btn) return;

    var saved = localStorage.getItem("soportemax-theme");
    if (saved) html.setAttribute("data-theme", saved);

    btn.addEventListener("click", function () {
      var current = html.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("soportemax-theme", next);
    });
  }

  /* ============================================
     Hero Mesh Gradient (mouse reactive)
     ============================================ */
  function initHeroMesh() {
    var mesh = $("[data-mouse-gradient]");
    if (!mesh || !fineHover) return;
    document.addEventListener("mousemove", function (e) {
      var x = (e.clientX / window.innerWidth) * 100;
      var y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--mx", x + "%");
      document.documentElement.style.setProperty("--my", y + "%");
    });
  }

  /* ============================================
     Reveal on Scroll (IntersectionObserver)
     ============================================ */
  function initReveals() {
    var targets = $$(".reveal:not([data-split])");
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    // Safety: force reveal after 6s
    setTimeout(function () {
      $$(".reveal:not(.is-visible):not([data-split])").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ============================================
     Animated Counters
     ============================================ */
  function initCounters() {
    var counters = $$("[data-count-to]");
    if (!counters.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          animateCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01 });

    counters.forEach(function (el) { io.observe(el); });
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute("data-count-to"), 10);
    var duration = 2000;
    var start = 0;
    var startTime = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }

    if (reduced) {
      el.textContent = target;
    } else {
      requestAnimationFrame(step);
    }
  }

  /* ============================================
     FAQ Accordion
     ============================================ */
  function initFAQ() {
    var items = $$(".faq-item");
    items.forEach(function (item) {
      var btn = item.querySelector(".faq-question");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");
        // Close all
        items.forEach(function (i) {
          i.classList.remove("is-open");
          var b = i.querySelector(".faq-question");
          if (b) b.setAttribute("aria-expanded", "false");
        });
        // Toggle current
        if (!isOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ============================================
     Contact Form
     ============================================ */
  function initContactForm() {
    var form = $("#contact-form");
    var success = $("#form-success");
    var submitBtn = $("#contact-submit");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Basic validation
      var name = form.querySelector('[name="name"]');
      var email = form.querySelector('[name="email"]');
      var message = form.querySelector('[name="message"]');

      if (!name || !name.value.trim()) { showToast("Por favor ingresa tu nombre", "is-error"); return; }
      if (!email || !email.value.trim() || !email.value.includes("@")) { showToast("Por favor ingresa un email válido", "is-error"); return; }
      if (!message || !message.value.trim()) { showToast("Por favor ingresa un mensaje", "is-error"); return; }

      // Sanitize
      function sanitize(str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
      }

      var data = {
        name: sanitize(name.value.trim()),
        email: sanitize(email.value.trim()),
        phone: sanitize((form.querySelector('[name="phone"]') || {}).value || ""),
        message: sanitize(message.value.trim()),
        created_at: new Date().toISOString()
      };

      // Show sending state
      form.classList.add("is-sending");
      submitBtn.disabled = true;

      // Send via API
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.error) throw new Error(result.error);
        form.style.display = "none";
        if (success) { success.classList.add("is-visible"); success.setAttribute("aria-hidden", "false"); }
        showToast("Mensaje enviado correctamente", "is-success");
      })
      .catch(function () {
        form.classList.remove("is-sending");
        submitBtn.disabled = false;
        showToast("Error al enviar. Intenta de nuevo.", "is-error");
      });
    });
  }

  /* ============================================
     Smooth Scroll for Anchors
     ============================================ */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navOffset = 80;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ============================================
     Cursor
     ============================================ */
  function initCursor() {
    if (!fineHover) return;
    var dot = $(".cursor-dot");
    var ring = $(".cursor-ring");
    if (!dot || !ring) return;

    var mx = 0, my = 0, rx = 0, ry = 0;
    var firstMove = false;

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px, " + my + "px, 0)";
      if (!firstMove) {
        firstMove = true;
        rx = mx;
        ry = my;
        ring.style.transform = "translate3d(" + rx + "px, " + ry + "px, 0)";
        dot.classList.add("is-ready");
        ring.classList.add("is-ready");
      }
    });

    function tick() {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.transform = "translate3d(" + rx + "px, " + ry + "px, 0)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Hover states on interactive elements
    $$("a, button, .service-card, .gallery-item, .faq-question").forEach(function (el) {
      el.addEventListener("mouseover", function () { ring.classList.add("is-hover"); });
      el.addEventListener("mouseout", function () { ring.classList.remove("is-hover"); });
    });
  }

  /* ============================================
     Magnetic Buttons
     ============================================ */
  function initMagnetic() {
    if (!fineHover || reduced) return;
    $$(".btn-glow").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x * 0.15) + "px, " + (y * 0.15) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ============================================
     GSAP ScrollTrigger (if available)
     ============================================ */
  function initGSAP() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero parallax
    var heroBg = $(".hero-bg img");
    if (heroBg) {
      gsap.to(heroBg, {
        y: 100,
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1
        }
      });
    }

    // Service cards stagger
    var serviceCards = $$(".service-card");
    if (serviceCards.length) {
      gsap.from(serviceCards, {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".services-grid",
          start: "top 80%"
        }
      });
    }
  }

  /* ============================================
     Gallery Lightbox
     ============================================ */
  function initGallery() {
    $$(".gallery-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var img = item.querySelector("img");
        if (!img) return;
        var overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.3s;";
        var bigImg = document.createElement("img");
        bigImg.src = img.src;
        bigImg.alt = img.alt;
        bigImg.style.cssText = "max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;";
        overlay.appendChild(bigImg);
        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.style.opacity = "1"; });
        overlay.addEventListener("click", function () {
          overlay.style.opacity = "0";
          setTimeout(function () { overlay.remove(); }, 300);
        });
      });
    });
  }

  /* ============================================
     Boot
     ============================================ */
  function boot() {
    console.log("[Isinet] boot called, DOM ready:", document.readyState);
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initThemeToggle, "initThemeToggle");
    safe(initHeroMesh, "initHeroMesh");
    safe(initReveals, "initReveals");
    safe(initCounters, "initCounters");
    safe(initFAQ, "initFAQ");
    safe(initContactForm, "initContactForm");
    safe(initSmoothScroll, "initSmoothScroll");
    safe(initCursor, "initCursor");
    safe(initMagnetic, "initMagnetic");
    safe(initGSAP, "initGSAP");
    safe(initGallery, "initGallery");
    safe(loadSiteConfig, "loadSiteConfig");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
