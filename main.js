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

      // Try Supabase if available
      if (window.__supabase && window.__supabase.insert) {
        window.__supabase.insert("contact_messages", data)
          .then(function () {
            form.style.display = "none";
            if (success) { success.classList.add("is-visible"); success.setAttribute("aria-hidden", "false"); }
            showToast("Mensaje enviado correctamente", "is-success");
          })
          .catch(function () {
            form.classList.remove("is-sending");
            submitBtn.disabled = false;
            showToast("Error al enviar. Intenta de nuevo.", "is-error");
          });
      } else {
        // Fallback: simulate success
        setTimeout(function () {
          form.style.display = "none";
          if (success) { success.classList.add("is-visible"); success.setAttribute("aria-hidden", "false"); }
          showToast("Mensaje enviado correctamente", "is-success");
        }, 1000);
      }
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
