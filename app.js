(() => {
  'use strict';
  const I18N = window.SCROLLOFF_I18N;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Si GSAP no arriba (xarxa del cole, bloquejador…), la web funciona igual, sense moviment.
  const motion = !reduce && !!(window.gsap && window.ScrollTrigger);
  document.documentElement.classList.remove('no-js');

  // ---------- El logo es forma dins del hero (CSS, 4 s). No es pot saltar: la pàgina queda quieta fins que acaba ----------
  let introOn = document.documentElement.classList.contains('has-intro');
  const afterIntro = [];
  const whenIntroEnds = (fn) => (introOn ? afterIntro.push(fn) : fn());
  if (introOn) {
    setTimeout(() => {
      introOn = false;
      clearTimeout(window.__introEnd);
      document.documentElement.classList.remove('has-intro');
      afterIntro.splice(0).forEach((fn) => fn());
    }, 4600);
  }

  // ---------- Idioma ----------
  const LANGS = ['ca', 'es', 'en'];
  function pickLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    try { const saved = localStorage.getItem('scrolloff.lang'); if (LANGS.includes(saved)) return saved; } catch (_) {}
    for (const l of navigator.languages || [navigator.language]) {
      const code = (l || '').slice(0, 2).toLowerCase();
      if (LANGS.includes(code)) return code;
    }
    return 'ca';
  }
  let lang = pickLang();
  const t = (key) => (I18N[lang] && I18N[lang][key] !== undefined ? I18N[lang][key] : I18N.ca[key]);
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const listeners = [];
  const onLang = (fn) => { listeners.push(fn); fn(); };

  // Parteix un text en paraules (cada una dins d'una màscara) per animar-les.
  function split(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w"><span class="wi">${esc(w)}</span></span>`).join(' ');
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => {
      const v = t(el.dataset.i18n);
      if (typeof v === 'string') el.textContent = v;
    });
    $$('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        const v = t(key);
        if (typeof v === 'string') el.setAttribute(attr, v);
      });
    });
    $$('[data-i18n-alt]').forEach((el) => {
      const v = t(el.dataset.i18nAlt);
      if (typeof v === 'string') el.alt = v;
    });
    $$('[data-split], [data-scrub]').forEach(split);
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    listeners.forEach((fn) => fn());
  }
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    try { localStorage.setItem('scrolloff.lang', lang); } catch (_) {}
    applyLang();
    if (motion) { buildScrub(); ScrollTrigger.refresh(); }
  }));

  // ---------- Vídeos reals de l'app: s'ajusten sols quan es veuen ----------
  $$('video[data-video="loop"]').forEach((v) => {
    v.muted = true;
    if (reduce) { v.pause(); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.25 }).observe(v);
    } else v.play().catch(() => {});
  });

  // ---------- Dades: els números pugen quan es veuen ----------
  function countUp(el) {
    if (reduce || el.dataset.counted) return;
    el.dataset.counted = '1';
    const txt = el.textContent, m = txt.match(/\d+/);
    if (!m) return;
    const target = Number(m[0]), t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1300), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = txt.replace(m[0], String(v));
      if (p < 1) requestAnimationFrame(step); else el.textContent = t(el.dataset.i18n);
    };
    requestAnimationFrame(step);
  }

  // ---------- Paraules en moviment ----------
  const rows = $$('[data-marquee]');
  onLang(() => {
    const words = t('out.words');
    rows.forEach((r, i) => {
      const list = i ? [...words].reverse() : words;
      const chunk = list.map((w) => `<span>${esc(w)}</span>`).join('');
      r.innerHTML = chunk + chunk; // dues còpies: quan una surt, l'altra entra
      r._x = i ? -r.scrollWidth / 2 : 0;
    });
  });

  // ---------- Formulari: s'envia de veritat (Supabase), sense dependre del correu ----------
  // Clau pública (la mateixa que porta l'app): només pot inserir; les regles de la base
  // de dades no deixen llegir res i limiten els enviaments.
  const SB_URL = 'https://qaijwaowtenjuuxqabtq.supabase.co/rest/v1/feedback';
  const SB_KEY = 'sb_publishable_awxkvjC9sHhdO739ash_Sw_CfmD8nmB';
  const form = $('[data-join]'), segOs = $('[data-seg-os]'), msg = $('[data-join-msg]'), sendBtn = $('[data-join-btn]');
  let os = 'Android';
  const radio = (group, val) => $$('button', group).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === String(val))));
  $$('button', segOs).forEach((b) => b.addEventListener('click', () => { os = b.dataset.v; radio(segOs, os); }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#join-email');
    const email = input.value.trim();
    if (!input.checkValidity() || !email) { input.reportValidity(); input.focus(); return; }
    const showDone = () => {
      $('[data-join-ok-sub]').textContent = fill(t('form.okSub'), { email });
      $('[data-join-body]').hidden = true; $('[data-join-done]').hidden = false;
    };
    if (form.website.value) { showDone(); return; } // camp trampa per a robots
    sendBtn.disabled = true; msg.className = 'form-msg sending'; msg.textContent = t('form.sending');
    try {
      const res = await fetch(SB_URL, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ category: 'other', message: fill(t('form.msg'), { os }), contact_email: email, platform: 'web', locale: lang }),
      });
      if (!res.ok) throw new Error(String(res.status));
      msg.textContent = '';
      showDone();
    } catch (_) {
      msg.className = 'form-msg'; msg.textContent = t('form.err');
    } finally {
      sendBtn.disabled = false;
    }
  });

  // ---------- Funcions: títols en llista; en clicar-ne un s'obre el detall i el seu vídeo ----------
  const fxRows = $$('.fx-row'), fxMedia = $$('[data-fxv]'), fxStage = $('.fx-stage');
  let fxVisible = false;
  function fxSelect(i) {
    fxRows.forEach((r, k) => { r.classList.toggle('open', k === i); $('.fx-item', r).setAttribute('aria-expanded', String(k === i)); });
    fxMedia.forEach((v, k) => {
      v.classList.toggle('on', k === i);
      if (!(v instanceof HTMLVideoElement)) return;
      if (k === i) { v.currentTime = 0; if (fxVisible && !reduce) v.play().catch(() => {}); } else v.pause();
    });
    if (motion) setTimeout(() => ScrollTrigger.refresh(), 650);
  }
  $$('.fx-item').forEach((b) => b.addEventListener('click', () => { if (!b.closest('.fx-row').classList.contains('open')) fxSelect(Number(b.dataset.fx)); }));
  if (fxStage && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => {
      fxVisible = e.isIntersecting;
      const v = $('[data-fxv].on');
      if (v && !reduce && v instanceof HTMLVideoElement) { if (fxVisible) v.play().catch(() => {}); else v.pause(); }
    }), { threshold: 0.25 }).observe(fxStage);
  }

  // Mentre es forma, el logo està al centre de la pantalla; quan surt el text, puja al seu lloc.
  const mark = $('.hero-mark'), heroCopy = $('[data-hero-copy]');
  const setShift = () => {
    if (!mark || !heroCopy) return;
    mark.style.setProperty('--shift', Math.max(0, (heroCopy.offsetHeight - parseFloat(getComputedStyle(mark).height)) / 2) + 'px');
  };
  listeners.push(setShift);
  addEventListener('resize', setShift);
  document.fonts && document.fonts.ready.then(setShift);

  applyLang();

  // ====================================================================
  //  Moviment (només si GSAP ha carregat i el visitant no demana menys moviment)
  // ====================================================================
  const top = $('[data-top]');
  addEventListener('scroll', () => top.classList.toggle('scrolled', scrollY > 30), { passive: true });

  if (!motion) {
    $$('.tl').forEach((li) => li.classList.add('on'));
    $('[data-timeline]').style.setProperty('--p', '1');
    if ('IntersectionObserver' in window) {
      const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) countUp(e.target); }), { threshold: 0.4 });
      $$('[data-count]').forEach((el) => ob.observe(el));
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Scroll suau (Lenis), sincronitzat amb ScrollTrigger
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add('lenis');
    if (introOn) { lenis.stop(); whenIntroEnds(() => lenis.start()); }
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id.length > 1 ? $(id) : null;
    if (!target || !lenis) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70, duration: 1.4 });
  }));

  // Barra de progrés
  gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  // --- 1. Hero: l'entrada és CSS (logo + titular); en fer scroll, el text puja i es difumina ---
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
    .to('[data-hero-copy]', { yPercent: -25, opacity: 0, filter: 'blur(10px)', ease: 'none' }, 0);

  // --- 2. La frase s'il·lumina paraula a paraula (secció fixada) ---
  // Un sol ScrollTrigger fix per a tota la vida de la pàgina: si es tornés a crear en
  // canviar d'idioma, les seccions fixades de després calcularien malament on comencen
  // i es trepitjarien. En canviar d'idioma només es tornen a agafar les paraules.
  let sayWords = [];
  const sayTarget = { p: 0 };
  const paintSay = () => {
    const n = sayWords.length;
    sayWords.forEach((w, i) => { w.style.opacity = String(0.12 + 0.88 * Math.min(1, Math.max(0, sayTarget.p * (n + 2) - i))); });
  };
  function buildScrub() { sayWords = $$('.say-text .wi'); paintSay(); }
  buildScrub();
  ScrollTrigger.create({
    trigger: '.say', start: 'top top', end: '+=150%', pin: true,
    onUpdate: (self) => gsap.to(sayTarget, { p: self.progress, duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: paintSay }),
  });

  // --- Titulars de secció: les paraules pugen quan arriben ---
  $$('section [data-split]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from($$('.wi', el), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  // --- Entrades genèriques ---
  const reveals = $$('[data-reveal]');
  gsap.set(reveals, { y: 50, opacity: 0 });
  ScrollTrigger.batch(reveals, { start: 'top 90%', onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08 }) });

  // --- 3. Dades: la línia s'omple mentre baixes i cada cercle s'encén amb la seva dada ---
  const tlEl = $('[data-timeline]'), dots = $$('.tl', tlEl);
  ScrollTrigger.create({
    trigger: tlEl, start: 'top 78%', end: 'bottom 62%', scrub: 0.5,
    onUpdate: (self) => {
      tlEl.style.setProperty('--p', self.progress.toFixed(3));
      dots.forEach((li, i) => {
        const on = self.progress >= i / dots.length + 0.02;
        if (on && !li.classList.contains('on')) { li.classList.add('on'); countUp($('[data-count]', li)); }
        else if (!on && li.classList.contains('on')) li.classList.remove('on');
      });
    },
  });

  // --- 5. Paraules en moviment: més ràpid com més ràpid fas scroll ---
  let vel = 0;
  ScrollTrigger.create({ onUpdate: (self) => { vel = self.getVelocity(); } });
  gsap.ticker.add((_, dt) => {
    vel *= 0.92;
    const boost = 1 + Math.min(8, Math.abs(vel) / 400);
    rows.forEach((r, i) => {
      const half = r.scrollWidth / 2;
      if (!half) return;
      r._x = (r._x || 0) + (i ? 1 : -1) * 0.9 * boost * (dt / 16.7);
      if (r._x <= -half) r._x += half;
      if (r._x > 0) r._x -= half;
      r.style.transform = `translate3d(${r._x.toFixed(1)}px,0,0)`;
    });
  });

  // Botons magnètics
  if (fine) $$('[data-magnetic]').forEach((b) => {
    const qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.3); qy((e.clientY - r.top - r.height / 2) * 0.4); });
    b.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });

  // Quan carreguen les lletres, les mides canvien: recalcula
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
