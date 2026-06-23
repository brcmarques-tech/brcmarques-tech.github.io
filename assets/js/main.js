/* =========================================================
   brcmarques.dev — interaction engine (vanilla, no deps)
   ========================================================= */
(() => {
  "use strict";
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE = window.matchMedia("(pointer: coarse)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, n) => (1 - n) * a + n * b;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let lenis = null; // smooth-scroll instance (Lenis)

  /* ---------- PRELOADER ---------- */
  const preloader = $(".preloader");
  function runPreloader(done) {
    if (!preloader) return done();
    const countEl = $(".pl-count", preloader);
    const bar = $(".pl-bar", preloader);
    let n = 0;
    const tick = () => {
      n += Math.max(1, Math.round((100 - n) * 0.08));
      if (n >= 100) n = 100;
      if (countEl) countEl.textContent = String(n).padStart(3, "0");
      if (bar) bar.style.width = n + "%";
      if (n < 100) { setTimeout(tick, REDUCED ? 4 : 26); }
      else { setTimeout(() => { preloader.classList.add("done"); document.body.classList.remove("no-scroll"); done(); }, 350); }
    };
    document.body.classList.add("no-scroll");
    tick();
  }

  /* ---------- CUSTOM CURSOR ---------- */
  function initCursor() {
    if (COARSE) return;
    const dot = $(".cursor-dot"), ring = $(".cursor-ring");
    if (!dot || !ring) return;
    document.body.classList.add("has-cursor"); // hide native cursor (CSS)
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    addEventListener("mousedown", () => ring.classList.add("down"));
    addEventListener("mouseup", () => ring.classList.remove("down"));
    const loop = () => { rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); };
    loop();
    const hov = "a, button, .proj, .featured, .skill, .cap, [data-magnetic]";
    $$(hov).forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
    });
  }

  /* ---------- MAGNETIC BUTTONS ---------- */
  function initMagnetic() {
    if (COARSE || REDUCED) return;
    $$("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = `translate(${x}px,${y}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = "translate(0,0)"; });
    });
  }

  /* ---------- SMOOTH SCROLL (Lenis) ---------- */
  function initSmoothScroll() {
    // native scroll when reduced-motion or when Lenis failed to load
    if (REDUCED || typeof window.Lenis !== "function") return;
    lenis = new window.Lenis({
      lerp: 0.1,            // catch-up speed — snappy yet smooth
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,     // leave touch to native momentum (feels better on mobile)
      touchMultiplier: 1.6,
    });
    let rafId;
    function raf(time) { lenis.raf(time); rafId = requestAnimationFrame(raf); }
    rafId = requestAnimationFrame(raf);
    // pause the rAF loop when tab is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(raf);
    });
  }

  /* ---------- ANCHOR SMOOTH ---------- */
  function initAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const t = $(id);
        if (!t) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: -70, duration: 1.1 });
        else t.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", id);
      });
    });
  }

  /* ---------- SCROLL REVEALS ---------- */
  function initReveals() {
    const targets = $$(".r, .clip, [data-split]");
    if (!("IntersectionObserver" in window) || REDUCED) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((t) => io.observe(t));
    // safety net via rAF — revela qualquer alvo que entre na viewport, mesmo se o IO não disparar
    let live = targets.slice();
    const sweep = () => {
      live = live.filter((t) => {
        if (t.classList.contains("in")) { io.unobserve(t); return false; }
        const r = t.getBoundingClientRect();
        if (r.top < innerHeight * 0.94 && r.bottom > 0) { t.classList.add("in"); io.unobserve(t); return false; }
        return true;
      });
      if (live.length) requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  }

  /* ---------- SPLIT TEXT (wrap words in lines for reveal) ---------- */
  function initSplit() {
    $$("[data-split]").forEach((el) => {
      const lines = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = lines.map((l) => `<span class="reveal-line"><span>${l.trim()}</span></span>`).join("");
    });
  }

  /* ---------- COUNT UP ---------- */
  function initCounters() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target; io.unobserve(el);
        const to = parseFloat(el.dataset.count);
        const dur = 1400, t0 = performance.now();
        const fmt = el.dataset.suffix || "";
        const step = (t) => {
          const p = clamp((t - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.firstChild ? null : null;
          el.childNodes[0].nodeValue = Math.round(to * eased).toString();
          if (p < 1) requestAnimationFrame(step);
        };
        // ensure a text node exists before any <span class="suf">
        if (!el.childNodes.length || el.childNodes[0].nodeType !== 3) {
          el.insertBefore(document.createTextNode("0"), el.firstChild);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- NAV (hide on scroll-down, progress bar) ---------- */
  function initNav() {
    const nav = $(".nav"), prog = $(".scroll-progress");
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (nav) {
        nav.classList.toggle("scrolled", y > 30);
        if (y > last && y > 300) nav.classList.add("hidden");
        else nav.classList.remove("hidden");
      }
      if (prog) {
        const max = document.documentElement.scrollHeight - innerHeight;
        prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      }
      last = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- HERO PARTICLE / CONSTELLATION CANVAS ---------- */
  function initHeroCanvas() {
    const canvas = $("#hero-canvas");
    if (!canvas || REDUCED) return;
    const ctx = canvas.getContext("2d");
    let w, h, dpr, pts = [], mouse = { x: -999, y: -999 }, raf;
    const COUNT = () => Math.min(90, Math.floor((w * h) / 16000));
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = COUNT();
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.4,
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        // mouse repel
        const dxm = p.x - mouse.x, dym = p.y - mouse.y, dm = Math.hypot(dxm, dym);
        if (dm < 120) { p.x += (dxm / dm) * 0.8; p.y += (dym / dm) * 0.8; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,180,210,0.55)"; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            const a = (1 - d / 130) * 0.18;
            ctx.strokeStyle = `rgba(59,162,255,${a})`; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    resize(); draw();
    addEventListener("resize", resize);
    canvas.addEventListener("mousemove", (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    canvas.addEventListener("mouseleave", () => { mouse.x = -999; mouse.y = -999; });
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(raf); else draw(); });
  }

  /* ---------- PARALLAX ON [data-parallax] ---------- */
  function initParallax() {
    if (REDUCED) return;
    const els = $$("[data-parallax]");
    if (!els.length) return;
    const onScroll = () => {
      const vh = innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.12;
        const off = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translateY(${off.toFixed(1)}px)`;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- YEAR ---------- */
  function initYear() { $$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear())); }

  /* ---------- BOOT ---------- */
  function boot() {
    initSplit();
    runPreloader(() => {
      document.body.classList.add("loaded");
      // trigger hero reveals
      $$(".hero [data-split], .hero .r").forEach((e) => e.classList.add("in"));
    });
    initCursor();
    initMagnetic();
    initSmoothScroll();
    initAnchors();
    initReveals();
    initCounters();
    initNav();
    initHeroCanvas();
    initParallax();
    initYear();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
