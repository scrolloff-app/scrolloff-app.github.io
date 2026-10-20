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

  // ---------- Intro del logo (CSS); es pot saltar amb un clic, una tecla o fent scroll ----------
  const introEl = $('[data-intro]');
  let introOn = document.documentElement.classList.contains('has-intro');
  const afterIntro = [];
  const whenIntroEnds = (fn) => (introOn ? afterIntro.push(fn) : fn());
  function endIntro(skipped) {
    if (!introOn) return;
    introOn = false;
    clearTimeout(window.__introEnd);
    const finish = () => { document.documentElement.classList.remove('has-intro'); afterIntro.splice(0).forEach((fn) => fn(skipped)); };
    if (skipped) { introEl.classList.add('skipped'); setTimeout(finish, 350); } else finish();
  }
  if (introOn) {
    setTimeout(() => endIntro(false), 2850);
    const skip = () => endIntro(true);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, skip, { once: true, passive: true }));
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

  const numFmt = () => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES', { maximumFractionDigits: 1 });
  const hm = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${m} min` : `${m} min`; };

  // ---------- Hero: comptadors que pugen sols ----------
  const ticks = $$('[data-tick]').map((el) => ({ el, min: Number(el.dataset.tick) }));
  const renderTicks = () => {
    ticks.forEach((k) => (k.el.textContent = hm(k.min)));
    const w = $('[data-widget-total]'); if (w) w.textContent = hm(ticks.reduce((sum, k) => sum + k.min, 0));
  };
  onLang(renderTicks);
  if (!reduce) setInterval(() => { const k = ticks[Math.floor(Math.random() * ticks.length)]; k.min += 1; renderTicks(); }, 2600);

  // ---------- L'Xcape que funciona ----------
  const x = $('[data-xcape]');
  const apps = $('[data-demo-apps]');
  let phraseIdx = 0, timer = null, currentApp = 'TikTok';
  const phrases = () => t('x.phrases');
  function setPhrase() { const p = $('[data-x-phrase]'); p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; p.textContent = phrases()[phraseIdx % phrases().length]; }
  function startCountdown() {
    const btn = $('[data-x-enter]'), label = $('[data-x-enter-label]');
    let s = 5;
    btn.disabled = true; btn.classList.remove('counting'); void btn.offsetWidth; btn.classList.add('counting');
    label.textContent = fill(t('x.wait'), { s });
    clearInterval(timer);
    timer = setInterval(() => {
      s -= 1;
      if (s <= 0) { clearInterval(timer); btn.disabled = false; label.textContent = t('x.enter'); btn.classList.remove('counting'); }
      else label.textContent = fill(t('x.wait'), { s });
    }, 1000);
  }
  function openX(app, focus = true) {
    currentApp = app;
    phraseIdx = Math.floor(Math.random() * 10);
    $('[data-x-before]').textContent = fill(t('x.before'), { app });
    setPhrase();
    $('[data-x-actions]').hidden = false; $('[data-x-pick]').hidden = true; $('[data-x-done]').hidden = true;
    x.classList.remove('out'); x.hidden = false; apps.setAttribute('aria-hidden', 'true');
    startCountdown();
    if (focus) $('[data-x-close]').focus({ preventScroll: true });
  }
  function closeX() {
    clearInterval(timer);
    x.classList.add('out');
    setTimeout(() => { x.hidden = true; x.classList.remove('out'); apps.removeAttribute('aria-hidden'); }, reduce ? 0 : 340);
  }
  function done(text, win) {
    clearInterval(timer);
    $('[data-x-actions]').hidden = true; $('[data-x-pick]').hidden = true;
    const d = $('[data-x-done-text]'); d.textContent = text; d.classList.toggle('win', !!win);
    $('[data-x-done]').hidden = false;
  }
  let touched = false;
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => { touched = true; openX(b.dataset.open); }));
  // Una sola vegada, si el visitant encara no ha tocat res: TikTok batega i l'Xcape s'obre sol.
  if (!reduce) {
    setTimeout(() => {
      if (touched || !x.hidden || scrollY > innerHeight * 0.5) return;
      const first = $('[data-open="TikTok"]');
      first.classList.add('pulse');
      setTimeout(() => { first.classList.remove('pulse'); if (!touched && x.hidden) openX('TikTok', false); }, 2200);
    }, introOn ? 6000 : 3600);
  }
  $('[data-x-close]').addEventListener('click', () => done(t('x.resisted'), true));
  $('[data-x-enter]').addEventListener('click', () => { $('[data-x-actions]').hidden = true; $('[data-x-pick]').hidden = false; });
  $$('[data-min]').forEach((b) => b.addEventListener('click', () => done(fill(t('x.entered'), { m: b.dataset.min }))));
  $('[data-x-again]').addEventListener('click', closeX);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !x.hidden) closeX(); });
  onLang(() => {
    if (!x.hidden) { $('[data-x-before]').textContent = fill(t('x.before'), { app: currentApp }); $('[data-x-phrase]').textContent = phrases()[phraseIdx % phrases().length]; }
    const sb = $('[data-x-static-before]'); if (sb) sb.textContent = fill(t('x.before'), { app: 'TikTok' });
    const sp = $('[data-x-static-phrase]'); if (sp) sp.textContent = phrases()[7];
  });
  if (!reduce) setInterval(() => { if (!x.hidden && !$('[data-x-actions]').hidden) { phraseIdx += 1; setPhrase(); } }, 5500);

  // ---------- Calculadora i l'any en quadrats ----------
  const range = $('#hours'), out = $('#hours-out'), days = $('[data-days]'), how = $('[data-calc-how]');
  const year = $('[data-year]');
  year.innerHTML = Array.from({ length: 365 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
  const cells = $$('i', year);
  let shown = 53, yearSeen = false;
  function animateNumber(el, from, to, ms = 600) {
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const paintYear = (d) => cells.forEach((c, i) => c.classList.toggle('on', i < d));
  function calc(animate) {
    const h = Number(range.value), d = Math.round((h * 365) / 24);
    const hs = numFmt().format(h);
    out.textContent = `${hs} h`;
    how.textContent = fill(t('calc.how'), { h: hs, d });
    if (animate) animateNumber(days, shown, d, 450); else days.textContent = d;
    shown = d;
    if (yearSeen || reduce || !('IntersectionObserver' in window)) paintYear(d);
  }
  range.addEventListener('input', () => calc(true));
  onLang(() => calc(false));
  if ('IntersectionObserver' in window && !reduce) {
    const once = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      once.disconnect(); yearSeen = true;
      animateNumber(days, 0, shown, 1500);
      year.classList.add('intro'); paintYear(shown);
      setTimeout(() => year.classList.remove('intro'), 2200);
    }), { threshold: 0.35 });
    once.observe(year);
  } else { yearSeen = true; paintYear(shown); }

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

  // ---------- Simulador d'avisos ----------
  const nState = { app: 'Instagram', hours: 2, on: true, msg: 0 };
  const notif = $('[data-notif]');
  function radio(group, val) { $$('button', group).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === String(val)))); }
  function renderNudge(pop) {
    const time = `${nState.hours}h`;
    $('[data-notif-text]').textContent = fill(t('nudge.msgs')[nState.msg % 8], { app: nState.app, time });
    $('[data-usage-app]').textContent = nState.app;
    $('[data-usage-time]').textContent = time;
    $('[data-usage-fill]').style.width = `${(nState.hours / 3) * 100}%`;
    notif.hidden = !nState.on; $('[data-notif-off]').hidden = nState.on;
    if (pop && nState.on && !reduce) { notif.classList.remove('pop'); void notif.offsetWidth; notif.classList.add('pop'); }
  }
  const segApp = $('[data-seg-app]'), segHours = $('[data-seg-hours]');
  $$('button', segApp).forEach((b) => b.addEventListener('click', () => { nState.app = b.dataset.v; radio(segApp, nState.app); renderNudge(true); }));
  $$('button', segHours).forEach((b) => b.addEventListener('click', () => { nState.hours = Number(b.dataset.v); radio(segHours, nState.hours); renderNudge(true); }));
  const tog = $('[data-nudge-toggle]');
  tog.addEventListener('click', () => { nState.on = !nState.on; tog.setAttribute('aria-checked', String(nState.on)); renderNudge(true); });
  const next = $('[data-nudge-next]');
  next.addEventListener('click', () => { nState.msg += 1; next.classList.toggle('spin'); renderNudge(true); });
  onLang(() => { next.setAttribute('aria-label', t('nudge.next')); renderNudge(false); });
  const clockStr = (tz) => new Intl.DateTimeFormat('ca-ES', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());
  const tickClock = () => {
    $('[data-lock-time]').textContent = clockStr(undefined);
    $('[data-demo-clock]').textContent = clockStr(undefined);
    $('[data-clock]').textContent = clockStr('Europe/Madrid');
  };
  tickClock(); setInterval(tickClock, 15000);
  if ('IntersectionObserver' in window) { const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { renderNudge(true); ob.disconnect(); } }), { threshold: 0.5 }); ob.observe(notif); }

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

  applyLang();

  // ====================================================================
  //  Moviment (només si GSAP ha carregat i el visitant no demana menys moviment)
  // ====================================================================
  const top = $('[data-top]');
  addEventListener('scroll', () => top.classList.toggle('scrolled', scrollY > 30), { passive: true });

  if (!motion) {
    if ('IntersectionObserver' in window) {
      const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); e.target.closest('[data-card]')?.classList.add('play'); } }), { threshold: 0.4 });
      $$('[data-count]').forEach((el) => ob.observe(el));
    }
    $$('[data-card]').forEach((c) => c.classList.add('play'));
    // Com funciona sense GSAP: el pas actiu segons el que es veu
    stepsWithObserver();
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

  // --- 1. Entrada del hero ---
  // Amb la intro, el hero comença just quan puja la persiana (o de seguida si se la salten).
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: introOn ? 2.2 : 0 });
  whenIntroEnds((skipped) => { if (skipped) intro.delay(0.1); });
  intro
    .from('.hero .kicker', { y: 20, opacity: 0, duration: 1 })
    .from('.hero-title .wi', { yPercent: 115, duration: 1.3, stagger: 0.08 }, 0.1)
    .from('.hero-p, .hero-actions', { y: 30, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.5)
    .from('.stage', { y: 260, opacity: 0, duration: 1.8 }, 0.25)
    .from('.hero-phone', { '--rx': '48deg', duration: 1.8 }, 0.25)
    .from('.float-n', { scale: 0.5, opacity: 0, y: 30, duration: 0.9, stagger: 0.18, ease: 'back.out(1.8)' }, 1.1)
    .from('.scroll-cue', { opacity: 0, duration: 1 }, 1.4);
  // Les notificacions suren
  $$('.float-n').forEach((n, i) => gsap.to(n, { y: i % 2 ? 14 : -14, rotate: i % 2 ? 1.5 : -1.5, duration: 2.4 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 + i * 0.2 }));
  // En fer scroll: el text puja i es difumina, les notificacions surten volant
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
    .to('[data-hero-copy]', { yPercent: -25, opacity: 0, filter: 'blur(10px)', ease: 'none' }, 0)
    .to('.float-n', { x: (i) => (i % 2 ? 260 : -260), y: (i) => -160 - i * 60, opacity: 0, scale: 0.8, ease: 'power1.in' }, 0)
    .to('.hero-phone', { '--rx': '0deg', '--ry': '0deg', ease: 'none' }, 0)
    .to('.stage', { scale: 0.92, ease: 'none' }, 0);
  // El mòbil segueix el ratolí
  const phone = $('[data-tilt]');
  if (fine && phone) {
    const qx = gsap.quickTo(phone, '--ry', { duration: 0.8, ease: 'power3.out', unit: 'deg' });
    const qy = gsap.quickTo(phone, '--rx', { duration: 0.8, ease: 'power3.out', unit: 'deg' });
    $('.hero').addEventListener('pointermove', (e) => {
      if (scrollY > innerHeight * 0.3) return;
      const r = innerWidth, h = innerHeight;
      qx(-16 + ((e.clientX / r) - 0.5) * 22);
      qy(8 - ((e.clientY / h) - 0.5) * 16);
    });
  }

  // --- 2. La frase s'il·lumina paraula a paraula (secció fixada) ---
  let scrubTween = null;
  function buildScrub() {
    if (scrubTween) { scrubTween.scrollTrigger && scrubTween.scrollTrigger.kill(); scrubTween.kill(); }
    const words = $$('.say-text .wi');
    gsap.set(words, { opacity: 0.12 });
    scrubTween = gsap.to(words, {
      opacity: 1, stagger: 0.12, ease: 'none',
      scrollTrigger: { trigger: '.say', start: 'top top', end: '+=150%', pin: true, scrub: 0.5 },
    });
  }
  buildScrub();

  // --- Titulars de secció: les paraules pugen quan arriben ---
  $$('section [data-split]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from($$('.wi', el), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  // --- Entrades genèriques ---
  const reveals = $$('[data-reveal]');
  gsap.set(reveals, { y: 50, opacity: 0 });
  ScrollTrigger.batch(reveals, { start: 'top 90%', onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08 }) });
  // La xifra gran s'apropa mentre passa
  gsap.fromTo('.figure', { scale: 0.85 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.calc', start: 'top bottom', end: 'center center', scrub: 0.6 } });

  // --- 4. Dades: pista horitzontal fixada (ordinador) o en columna (mòbil) ---
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    const track = $('[data-track]');
    const dist = () => track.scrollWidth - innerWidth;
    const h = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '[data-data-pin]', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
    });
    $$('.stat').forEach((card) => {
      gsap.from(card, { rotate: 4, y: 60, opacity: 0.3, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left 100%', end: 'left 55%', scrub: true } });
      ScrollTrigger.create({ trigger: card, containerAnimation: h, start: 'left 75%', onEnter: () => countUp($('[data-count]', card)) });
    });
  });
  mm.add('(max-width: 860px)', () => {
    $$('.stat').forEach((card) => {
      gsap.from(card, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 88%' } });
      ScrollTrigger.create({ trigger: card, start: 'top 75%', onEnter: () => countUp($('[data-count]', card)) });
    });
  });

  // --- 5. Com funciona: el pas actiu canvia la pantalla del mòbil ---
  const howGrid = $('.how-grid'), howPhone = $('[data-how-phone]');
  const setStep = (n) => {
    howPhone.dataset.at = String(n); howGrid.dataset.at = String(n);
    $$('.step').forEach((s) => s.classList.toggle('active', s.dataset.step === String(n)));
  };
  setStep(1);
  mm.add('(min-width: 861px)', () => {
    $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 60%', end: 'bottom 40%', onToggle: (self) => { if (self.isActive) setStep(Number(s.dataset.step)); } }));
  });
  mm.add('(max-width: 860px)', () => {
    howGrid.classList.add('how-pinned');
    ScrollTrigger.create({ trigger: howGrid, start: 'top top', end: '+=220%', pin: true, onUpdate: (self) => setStep(1 + Math.min(2, Math.floor(self.progress * 3))) });
    return () => howGrid.classList.remove('how-pinned');
  });
  gsap.from('.how-phone', { y: 120, rotateX: 30, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.how-grid', start: 'top 80%' } });

  // --- 6. El panell d'avisos s'inclina en entrar ---
  gsap.fromTo('.nudge-panel', { rotateX: 18, transformPerspective: 1200 }, { rotateX: 0, ease: 'none', scrollTrigger: { trigger: '.nudge', start: 'top bottom', end: 'center center', scrub: 0.6 } });

  // --- 7. Graella: les peces entren en onada i s'inclinen amb el ratolí ---
  const cards = $$('[data-card]');
  gsap.set(cards, { y: 80, opacity: 0, rotateX: 12 });
  ScrollTrigger.batch(cards, { start: 'top 90%', onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, rotateX: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }) });
  cards.forEach((c) => ScrollTrigger.create({ trigger: c, start: 'top 95%', end: 'bottom 5%', toggleClass: 'play' }));
  if (fine) cards.forEach((c) => {
    const rx = gsap.quickTo(c, 'rotateX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(c, 'rotateY', { duration: 0.6, ease: 'power3.out' });
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
    });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  // --- 8. Paraules en moviment: més ràpid com més ràpid fas scroll ---
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

  // --- 10. Tancament: el títol creix i la paraula del peu s'obre ---
  gsap.from('.cta-title', { scale: 0.86, transformOrigin: '0% 100%', ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top 20%', scrub: 0.6 } });
  gsap.from('[data-foot-word]', { yPercent: 60, letterSpacing: '0.1em', opacity: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'top 40%', scrub: 0.6 } });

  // Botons magnètics
  if (fine) $$('[data-magnetic]').forEach((b) => {
    const qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.3); qy((e.clientY - r.top - r.height / 2) * 0.4); });
    b.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });

  // Quan carreguen les lletres, les mides canvien: recalcula
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());

  function stepsWithObserver() {
    const grid = $('.how-grid'), ph = $('[data-how-phone]');
    const set = (n) => { ph.dataset.at = String(n); grid.dataset.at = String(n); $$('.step').forEach((s) => s.classList.toggle('active', s.dataset.step === String(n))); };
    set(1);
    if (!('IntersectionObserver' in window)) return;
    const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) set(Number(e.target.dataset.step)); }), { rootMargin: '-45% 0px -45% 0px' });
    $$('.step').forEach((s) => ob.observe(s));
  }
})();
