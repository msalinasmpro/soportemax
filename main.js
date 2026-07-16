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
    // Update about check texts
    if (cfg.text_about_check1) {
      var ch1 = document.querySelector(".about-features .about-feature:nth-child(1) span");
      if (ch1) ch1.textContent = cfg.text_about_check1;
    }
    if (cfg.text_about_check2) {
      var ch2 = document.querySelector(".about-features .about-feature:nth-child(2) span");
      if (ch2) ch2.textContent = cfg.text_about_check2;
    }
    if (cfg.text_about_check3) {
      var ch3 = document.querySelector(".about-features .about-feature:nth-child(3) span");
      if (ch3) ch3.textContent = cfg.text_about_check3;
    }
    // Update CTA support button links
    if (cfg.cta_support_url) {
      var ctaLinks = document.querySelectorAll("#cta-support-nav, #cta-support-hero, #cta-support-cameras");
      ctaLinks.forEach(function (link) { link.href = cfg.cta_support_url; });
    }
    // Update hero video (direct MP4 from Supabase Storage)
    if (cfg.hero_video_url) {
      var heroVideo = document.getElementById("hero-video");
      var heroVideoSrc = document.getElementById("hero-video-src");
      if (heroVideo && heroVideoSrc) {
        heroVideoSrc.src = cfg.hero_video_url;
        heroVideo.load();
        heroVideo.play().catch(function(){});
      }
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
      "text_feat1_title": "#por-que .feature-card:nth-child(1) .feature-title",
      "text_feat1_desc": "#por-que .feature-card:nth-child(1) .feature-desc",
      "text_feat2_title": "#por-que .feature-card:nth-child(2) .feature-title",
      "text_feat2_desc": "#por-que .feature-card:nth-child(2) .feature-desc",
      "text_feat3_title": "#por-que .feature-card:nth-child(3) .feature-title",
      "text_feat3_desc": "#por-que .feature-card:nth-child(3) .feature-desc",
      "text_feat4_title": "#por-que .feature-card:nth-child(4) .feature-title",
      "text_feat4_desc": "#por-que .feature-card:nth-child(4) .feature-desc",
      "text_process_title": "#proceso .section-title",
      "text_proc1_name": "#proceso .process-step:nth-child(1) .process-title",
      "text_proc1_desc": "#proceso .process-step:nth-child(1) .process-desc",
      "text_proc2_name": "#proceso .process-step:nth-child(2) .process-title",
      "text_proc2_desc": "#proceso .process-step:nth-child(2) .process-desc",
      "text_proc3_name": "#proceso .process-step:nth-child(3) .process-title",
      "text_proc3_desc": "#proceso .process-step:nth-child(3) .process-desc",
      "text_proc4_name": "#proceso .process-step:nth-child(4) .process-title",
      "text_proc4_desc": "#proceso .process-step:nth-child(4) .process-desc",
      "text_testimonials_title": "#testimonios .section-title",
      "text_clients_title": "#clientes .section-title",
      "text_clients_tag": "#clientes .section-tag",
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
           if (key === "text_hero_title" || key === "text_about_title" || key === "text_services_title" || key === "text_features_title" || key === "text_process_title" || key === "text_testimonials_title" || key === "text_clients_title" || key === "text_faq_title" || key === "text_contact_title") {
            // Headlines with <em> — preserve the gradient emphasis
            el.innerHTML = cfg[key];
          } else {
            el.textContent = cfg[key];
          }
        }
      }
    });
    // Update logo based on current theme
    var logoEl = document.querySelector(".nav-logo-icon");
    if (logoEl) {
      var currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      var logoUrl = currentTheme === "light" ? (cfg.logo_url_light || cfg.logo_url_dark || cfg.logo_url) : (cfg.logo_url_dark || cfg.logo_url);
      if (logoUrl) {
        logoEl.innerHTML = '<img src="' + logoUrl + '" alt="Logo" style="height:75px;width:auto;object-fit:contain;">';
      }
      // Store config for theme toggle
      window._siteConfig = cfg;
    }
    // Update contact info block
    var contactPhone = document.getElementById("contact-phone-display");
    var contactEmail = document.getElementById("contact-email");
    var contactAddress = document.getElementById("contact-address");
    var contactHours = document.getElementById("contact-hours");
    if (contactPhone && cfg.phone) contactPhone.textContent = cfg.phone;
    if (contactEmail && cfg.email) contactEmail.textContent = cfg.email;
    if (contactAddress && cfg.address) contactAddress.textContent = cfg.address;
    if (contactHours && cfg.hours) contactHours.textContent = cfg.hours;
    // Update form placeholder
    var phoneInput = document.querySelector('input[name="phone"]');
    if (phoneInput && cfg.phone) phoneInput.placeholder = cfg.phone;
    // Update Schema.org structured data
    var schemaScript = document.querySelector('script[type="application/ld+json"]');
    if (schemaScript && cfg.phone) {
      try {
        var schema = JSON.parse(schemaScript.textContent);
        schema.telephone = cfg.phone;
        if (cfg.email) schema.email = cfg.email;
        if (cfg.address) schema.address.streetAddress = cfg.address;
        schemaScript.textContent = JSON.stringify(schema);
      } catch(e) {}
    }
    // Update footer logo
    var footerLogoEl = document.querySelector(".footer-logo .nav-logo-icon");
    if (footerLogoEl) {
      var currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
      var footerLogoUrl = currentTheme === "light" ? (cfg.logo_url_light || cfg.logo_url_dark || cfg.logo_url) : (cfg.logo_url_dark || cfg.logo_url);
      if (footerLogoUrl) {
        footerLogoEl.innerHTML = '<img src="' + footerLogoUrl + '" alt="Logo" style="height:60px;width:auto;object-fit:contain;">';
      }
    }
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

    // Scroll state — hide nav when scrolling down, show on hero
    var lastScroll = 0;
    var heroHeight = document.getElementById("inicio") ? document.getElementById("inicio").offsetHeight : 600;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 50);
      // Hide nav when scrolling down past hero, show when scrolling up or on hero
      if (y > heroHeight) {
        if (y > lastScroll + 5) {
          nav.classList.add("is-hidden");
        } else if (y < lastScroll - 5) {
          nav.classList.remove("is-hidden");
        }
      } else {
        nav.classList.remove("is-hidden");
      }
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
      // Switch logo based on theme
      var cfg = window._siteConfig;
      if (cfg) {
        var logoUrl = next === "light" ? (cfg.logo_url_light || cfg.logo_url_dark || cfg.logo_url) : (cfg.logo_url_dark || cfg.logo_url);
        if (logoUrl) {
          // Nav logo
          var logoEl = document.querySelector(".nav-logo-icon");
          if (logoEl) {
            logoEl.innerHTML = '<img src="' + logoUrl + '" alt="Logo" style="height:75px;width:auto;object-fit:contain;">';
          }
          // Footer logo
          var footerLogoEl = document.querySelector(".footer-logo .nav-logo-icon");
          if (footerLogoEl) {
            footerLogoEl.innerHTML = '<img src="' + logoUrl + '" alt="Logo" style="height:60px;width:auto;object-fit:contain;">';
          }
        }
      }
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

    // Reduced motion: reveal immediately
    if (reduced) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

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
        behavior: "smooth"
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
    $$("a, button, .service-card, .faq-question").forEach(function (el) {
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
     Clients Marquee
     ============================================ */
  function initClientsMarquee() {
    var marquee = document.getElementById("clients-marquee");
    if (!marquee) return;

    fetch("/api/clients?" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.length) {
          marquee.parentElement.style.display = "none";
          return;
        }

        // Create cards HTML
        var cardsHTML = data.map(function (client) {
          var logoSrc = client.logo_url || "";
          var name = client.name || "Cliente";
          
          if (logoSrc) {
            return '<div class="client-card">' +
              '<img src="' + escHTML(logoSrc) + '" alt="' + escHTML(name) + '" loading="lazy">' +
            '</div>';
          } else {
            return '<div class="client-card">' +
              '<div class="client-card-placeholder">' +
                '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                '<span>' + escHTML(name) + '</span>' +
              '</div>' +
            '</div>';
          }
        }).join("");

        // Duplicate for seamless loop
        marquee.innerHTML = cardsHTML + cardsHTML;

        // Add is-visible to all cards immediately
        marquee.querySelectorAll('.client-card').forEach(function(card) {
          card.classList.add('is-visible');
        });

        // Update animation duration based on content width
        var totalWidth = marquee.scrollWidth / 2;
        var duration = Math.max(20, totalWidth / 50); // 50px per second
        marquee.style.animationDuration = duration + "s";
      })
      .catch(function (e) {
        console.log("[Isinet] Clients load error:", e);
        marquee.parentElement.style.display = "none";
      });
  }

  /* ============================================
     Dynamic Services
     ============================================ */
  var serviceImageMap = {
    "monitor": "assets/img/repair-1.webp",
    "laptop": "assets/img/notebook-clean.jpg",
    "gamepad": "assets/img/pc-gamer.jpg",
    "gamepad-2": "assets/img/pc-gamer.jpg",
    "building": "assets/img/office-tech.webp",
    "wifi": "assets/img/remote-support.jpg",
    "database": "assets/img/data-backup.jpg",
    "shield": "assets/img/cybersecurity.jpg",
    "zap": "assets/img/repaired-pc.jpg",
    "download": "assets/img/windows-install.jpg",
    "server": "assets/img/server-rack.jpg",
    "network": "assets/img/network-router.webp",
    "tool": "assets/img/microchip.webp",
    "settings": "assets/img/repair-1.webp",
    "box": "assets/img/data-backup.jpg",
    "cpu": "assets/img/microchip.webp",
    "globe": "assets/img/office-tech.webp"
  };

  var serviceImageFallback = [
    "assets/img/repair-1.webp",
    "assets/img/pc-gamer.jpg",
    "assets/img/office-tech.webp",
    "assets/img/server-rack.jpg",
    "assets/img/microchip.webp"
  ];

  var serviceIcons = {
    "monitor": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    "laptop": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>',
    "gamepad": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>',
    "building": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>',
    "wifi": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
    "database": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    "shield": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    "zap": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    "download": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    "server": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    "settings": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    "tool": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    "box": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>',
    "cpu": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
    "globe": '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };

  function initServices() {
    var grid = document.getElementById("services-grid");
    if (!grid) return;

    fetch("/api/services?" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.length) return;
        grid.innerHTML = data.map(function (s, i) {
          var imgSrc = serviceImageMap[s.icon] || serviceImageFallback[i % serviceImageFallback.length];
          var iconSvg = serviceIcons[s.icon] || serviceIcons.settings;
          return '<article class="service-card reveal" data-service>' +
            '<div class="service-card-image">' +
              '<img src="' + imgSrc + '" alt="' + escHTML(s.title) + '" loading="lazy">' +
              '<div class="service-card-overlay"></div>' +
            '</div>' +
            '<div class="service-card-content">' +
              '<div class="service-card-icon">' + iconSvg + '</div>' +
              '<h3 class="service-card-title">' + escHTML(s.title) + '</h3>' +
              '<p class="service-card-desc">' + escHTML(s.description || '') + '</p>' +
            '</div>' +
          '</article>';
        }).join("");

        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              io.unobserve(e.target);
            }
          });
        }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
        grid.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
      })
      .catch(function () {});
  }

  function initClients() {
    var marquee = document.getElementById("clients-marquee");
    if (!marquee) return;

    fetch("/api/clients?" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.length) return;
        
        function renderClient(c) {
          if (c.logo_url) {
            return '<div class="client-card"><img src="' + escHTML(c.logo_url) + '" alt="' + escHTML(c.name) + '" loading="lazy"></div>';
          }
          return '<div class="client-card"><div class="client-card-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>' + escHTML(c.name) + '</span></div></div>';
        }
        
        // Render original + duplicate for seamless loop (CSS animates -50%)
        var cardsHtml = data.map(renderClient).join("");
        marquee.innerHTML = cardsHtml + cardsHtml;
      })
      .catch(function () {});
  }

  /* ============================================
     Wave Background Animation
     ============================================ */
  function initWaveBg() {
    var c = document.getElementById("bg-wave");
    if (!c) return;
    var ctx, w, h;

    function resize() {
      var rect = c.parentElement.getBoundingClientRect();
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * devicePixelRatio;
      c.height = h * devicePixelRatio;
      c.style.width = w + "px";
      c.style.height = h + "px";
      ctx = c.getContext("2d");
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      var t = Date.now() / 2000;

      for (var line = 0; line < 5; line++) {
        var baseY = h * (0.12 + line * 0.17);
        var amp = 12 + line * 6;
        var freq = 0.015 + line * 0.004;

        ctx.beginPath();
        for (var x = 0; x < w; x += 2) {
          var y = baseY
            + Math.sin(x * freq + t * 2 + line * 1.5) * amp
            + Math.sin(x * freq * 2.5 + t * 1.3 + line) * amp * 0.3;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        var color = line % 2 === 0 ? "6, 182, 212" : "34, 211, 238";
        var alpha = 0.12 + line * 0.06;
        ctx.strokeStyle = "rgba(" + color + "," + alpha + ")";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fill below
        ctx.lineTo(w, baseY + amp + 10);
        ctx.lineTo(0, baseY + amp + 10);
        ctx.closePath();
        ctx.fillStyle = "rgba(" + color + ",0.015)";
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  /* ============================================
     WhatsApp Button
     ============================================ */
  function initWhatsApp() {
    var btn = document.getElementById("whatsapp-btn");
    var contactSection = document.getElementById("contacto");
    if (!btn || !contactSection) return;

    // Set link from config
    function updateLink(phone) {
      if (!phone) return;
      var clean = phone.replace(/[^0-9+]/g, "");
      btn.href = "https://wa.me/" + clean.replace(/^\+/, "");
    }

    // Load from config
    fetch("/api/config?" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg.whatsapp) updateLink(cfg.whatsapp);
        window._siteConfig = window._siteConfig || {};
        window._siteConfig.whatsapp = cfg.whatsapp;
      })
      .catch(function () {});

    // Show/hide based on contact section visibility
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        btn.classList.toggle("is-visible", e.isIntersecting);
      });
    }, { threshold: 0.1 });

    io.observe(contactSection);
  }

  /* ============================================
     Chat Widget
     ============================================ */
  function initChat() {
    var toggle = document.getElementById("chat-toggle");
    var window_ = document.getElementById("chat-window");
    var closeBtn = document.getElementById("chat-close");
    var messages = document.getElementById("chat-messages");
    var input = document.getElementById("chat-input");
    var sendBtn = document.getElementById("chat-send");
    var quickActions = document.getElementById("chat-quick-actions");
    var whatsappLink = document.getElementById("chat-whatsapp-link");
    if (!toggle || !window_) return;

    var isOpen = false;
    var whatsappNumber = "";
    var questionCount = 0;

    // FAQ responses
    var faq = {
      reparacion: "¡Sí! Reparamos todo tipo de computadores: desktops, laptops, workstations y más. Contamos con técnicos certificados y garantía de 3 meses en todas las reparaciones.",
      domicilio: "Sí, contamos con servicio on-site para empresas y clientes premium. También ofrecemos soporte remoto para resolver problemas sin traslado.",
      diagnostico: "El diagnóstico es gratuito para reparaciones que se aprueben. Para diagnósticos sin reparación, el costo es de $15.000 CLP.",
      garantia: "Todas nuestras reparaciones incluyen 3 meses de garantía. Para repuestos, la garantía del fabricante se mantiene intacta.",
      datos: "¡Sí! Contamos con herramientas especializadas de recuperación de datos. Tenemos un 95% de éxito en recuperación de discos duros y SSD.",
      horario: "Nuestro horario es: Lunes a Viernes de 9:00 a 18:00 y Sábados de 9:00 a 14:00.",
      reparacion2: "La mayoría de las reparaciones se completan en 24-48 horas. Problemas más complejos pueden tomar hasta 3-5 días hábiles.",
      empresas: "¡Por supuesto! Atendemos desde emprendedores y pymes hasta empresas grandes con infraestructura compleja. Adaptamos nuestros servicios a cada necesidad."
    };

    var greetings = [
      "¡Hola! 👋 Soy el asistente de Isinet. ¿En qué puedo ayudarte?",
      "Puedes escribir tu pregunta o elegir una de las opciones de abajo."
    ];

    var fallback = "No encontré una respuesta exacta para eso. Pero puedo ayudarte con:\n\n• Reparación de computadores\n• Servicio a domicilio\n• Diagnóstico y presupuesto\n• Garantía\n• Recuperación de datos\n• Horarios\n\nO puedes hablar directamente con un asesor por WhatsApp.";

    // Load whatsapp number
    fetch("/api/config?" + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        if (cfg.whatsapp) {
          whatsappNumber = cfg.whatsapp.replace(/[^0-9+]/g, "").replace(/^\+/, "");
          whatsappLink.href = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent("Hola, necesito ayuda con...");
        }
      })
      .catch(function() {});

    function addMessage(text, type) {
      var msg = document.createElement("div");
      msg.className = "chat-msg " + type;
      msg.innerHTML = text.replace(/\n/g, "<br>");
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
      var typing = document.createElement("div");
      typing.className = "chat-msg bot";
      typing.id = "chat-typing";
      typing.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;
    }

    function removeTyping() {
      var t = document.getElementById("chat-typing");
      if (t) t.remove();
    }

    function findAnswer(input) {
      var lower = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      var keywords = {
        reparacion: ["repara", "reparar", "arreglar", "arreglo", "computador", "pc", "notebook", "laptop", "desktop", "equipo"],
        domicilio: ["domicilio", "casa", "on-site", "sitio", "visita", "van", "iran"],
        diagnostico: ["diagnostico", "diagnóstico", "costo", "precio", "cuanto cuesta", "presupuesto"],
        garantia: ["garantia", "garantía", "aseguran", "garantizan"],
        datos: ["datos", "recuperar", "recuperacion", "disco", "informacion", "archivos", "perdí", "perdidos"],
        horario: ["horario", "hora", "abren", "cierran", "atencion", "atención"],
        empresas: ["empresa", "empresas", "pyme", "pymes", "corporativo", "negocio"]
      };

      for (var key in keywords) {
        for (var i = 0; i < keywords[key].length; i++) {
          if (lower.indexOf(keywords[key][i]) !== -1) return faq[key];
        }
      }
      return null;
    }

    function handleSend() {
      var text = input.value.trim();
      if (!text) return;

      addMessage(text, "user");
      input.value = "";
      questionCount++;

      showTyping();

      setTimeout(function() {
        removeTyping();
        var answer = findAnswer(text);
        if (answer) {
          addMessage(answer, "bot");
        } else {
          addMessage(fallback, "bot");
        }
        // After 2 questions, show WhatsApp CTA
        if (questionCount >= 2) {
          setTimeout(function() {
            var waMsg = "Hola, necesito ayuda con un problema técnico.";
            var waUrl = whatsappNumber
              ? "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(waMsg)
              : "#";
            addMessage('¿Necesitas más ayuda? <a href="' + waUrl + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:6px 14px;border-radius:16px;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.25);color:#25D366;font-weight:600;text-decoration:none;font-size:0.85rem;">💬 Hablar con asesor</a>', "bot");
          }, 500);
        }
      }, 800 + Math.random() * 600);
    }

    // Toggle chat
    toggle.addEventListener("click", function() {
      isOpen = !isOpen;
      window_.classList.toggle("is-open", isOpen);
      toggle.classList.toggle("is-open", isOpen);

      if (isOpen && messages.children.length === 0) {
        greetings.forEach(function(g, i) {
          setTimeout(function() { addMessage(g, "bot"); }, i * 400);
        });
      }
    });

    closeBtn.addEventListener("click", function() {
      isOpen = false;
      window_.classList.remove("is-open");
      toggle.classList.remove("is-open");
    });

    // Quick actions
    quickActions.addEventListener("click", function(e) {
      var btn = e.target.closest(".chat-quick-btn");
      if (!btn) return;
      var q = btn.getAttribute("data-question");
      var answer = faq[q];
      if (answer) {
        addMessage(btn.textContent, "user");
        questionCount++;
        showTyping();
        setTimeout(function() {
          removeTyping();
          addMessage(answer, "bot");
          // After 2 questions, show WhatsApp CTA
          if (questionCount >= 2) {
            setTimeout(function() {
              var waMsg = "Hola, necesito ayuda con un problema técnico.";
              var waUrl = whatsappNumber
                ? "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(waMsg)
                : "#";
              addMessage('¿Necesitas más ayuda? <a href="' + waUrl + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;padding:6px 14px;border-radius:16px;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.25);color:#25D366;font-weight:600;text-decoration:none;font-size:0.85rem;">💬 Hablar con asesor</a>', "bot");
            }, 500);
          }
        }, 600);
      }
    });

    // Send on click
    sendBtn.addEventListener("click", handleSend);

    // Send on enter
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") handleSend();
    });
  }

  /* ============================================
     Boot
     ============================================ */
  function boot() {
    console.log("[Isinet] boot called, DOM ready:", document.readyState);
    safe(initWaveBg, "initWaveBg");
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
    safe(initServices, "initServices");
    safe(initClientsMarquee, "initClientsMarquee");
    safe(initWhatsApp, "initWhatsApp");
    safe(initChat, "initChat");
    safe(loadSiteConfig, "loadSiteConfig");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
