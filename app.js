(() => {
  'use strict';
  const I18N = window.SCROLLOFF_I18N;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.remove('no-js');
  // Amb "reduir moviment" el vídeo de fons queda aturat al pòster.
  if (reduce) document.querySelectorAll('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });

  // ---------- Idioma ----------
  const LANGS = ['ca', 'es', 'en'];
  function pickLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    try { const saved = localStorage.getItem('scrolloff.lang'); if (LANGS.includes(saved)) return saved; } catch (_) {}
    for (const l of navigator.languages || [navigator.language]) {
      const code = (l || '').slice(0, 2).toLowerCase();
      if (code === 'ca' || code === 'es') return code;
      if (code === 'en') return 'en';
    }
    return 'ca';
  }
  let lang = pickLang();
  const t = (key) => (I18N[lang] && I18N[lang][key] !== undefined ? I18N[lang][key] : I18N.ca[key]);
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
  const listeners = [];
  const onLang = (fn) => { listeners.push(fn); fn(); };

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
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    listeners.forEach((fn) => fn());
  }
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('scrolloff.lang', lang); } catch (_) {}
    applyLang();
  }));

  const numFmt = () => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'ca-ES', { maximumFractionDigits: 1 });
  const hm = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    if (lang === 'en') return h ? `${h} h ${m} min` : `${m} min`;
    return h ? `${h} h ${m} min` : `${m} min`;
  };

  // ---------- Entrades en fer scroll ----------
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }) : null;
  $$('section').forEach((sec) => $$('[data-reveal]', sec).forEach((el, i) => el.style.setProperty('--i', i)));
  $$('[data-reveal]').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

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
  function openX(app) {
    currentApp = app;
    phraseIdx = Math.floor(Math.random() * 10);
    $('[data-x-before]').textContent = fill(t('x.before'), { app });
    setPhrase();
    $('[data-x-actions]').hidden = false; $('[data-x-pick]').hidden = true; $('[data-x-done]').hidden = true;
    x.classList.remove('out'); x.hidden = false; apps.setAttribute('aria-hidden', 'true');
    startCountdown();
    $('[data-x-close]').focus({ preventScroll: true });
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
  // Una sola vegada, si el visitant encara no ha tocat res: el botó de TikTok
  // batega i l'Xcape s'obre sol, perquè es vegi què fa l'app.
  if (!reduce) {
    setTimeout(() => {
      if (touched || !x.hidden) return;
      const first = $('[data-open="TikTok"]');
      first.classList.add('pulse');
      setTimeout(() => { first.classList.remove('pulse'); if (!touched && x.hidden) openX('TikTok'); }, 2200);
    }, 2400);
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
  // Mentre l'Xcape és obert, la frase canvia sola cada pocs segons, com a l'app.
  if (!reduce) setInterval(() => { if (!x.hidden && !$('[data-x-actions]').hidden) { phraseIdx += 1; setPhrase(); } }, 5500);

  // ---------- Calculadora ----------
  const range = $('#hours'), out = $('#hours-out'), days = $('[data-days]'), how = $('[data-calc-how]');
  let shown = 53;
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
  function calc(animate) {
    const h = Number(range.value), d = Math.round((h * 365) / 24);
    const hs = numFmt().format(h);
    out.textContent = `${hs} h`;
    how.textContent = fill(t('calc.how'), { h: hs, d });
    if (animate) animateNumber(days, shown, d, 450); else days.textContent = d;
    shown = d;
  }
  range.addEventListener('input', () => calc(true));
  onLang(() => calc(false));
  // La xifra compta des de 0 la primera vegada que es veu.
  if (io) {
    const once = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { animateNumber(days, 0, shown, 1400); once.disconnect(); } }), { threshold: 0.5 });
    once.observe(days);
  }

  // ---------- Dades: els números pugen ----------
  $$('[data-count]').forEach((el) => {
    if (!io || reduce) return;
    const ob = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      const txt = el.textContent, m = txt.match(/\d+/);
      if (!m) return;
      const target = Number(m[0]), t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1200), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        el.textContent = txt.replace(m[0], String(v));
        if (p < 1) requestAnimationFrame(step); else el.textContent = t(el.dataset.i18n);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    ob.observe(el);
  });

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
  // Rellotge de la pantalla de bloqueig
  const lockTime = $('[data-lock-time]');
  const clockStr = (tz) => new Intl.DateTimeFormat('ca-ES', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());
  const tickClock = () => {
    lockTime.textContent = clockStr(undefined);
    const dc = $('[data-demo-clock]'); if (dc) dc.textContent = clockStr(undefined);
    const c = $('[data-clock]'); if (c) c.textContent = clockStr('Europe/Madrid');
  };
  tickClock(); setInterval(tickClock, 15000);
  // L'avís "arriba" quan el panell entra a la pantalla
  if (io) { const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { renderNudge(true); ob.disconnect(); } }), { threshold: 0.5 }); ob.observe(notif); }

  // ---------- Llista de funcions ----------
  const list = $('[data-feat-list]'), search = $('[data-feat-search]');
  const items = $$('li', list);
  const shots = $$('[data-shot]');
  function select(li) {
    items.forEach((x) => x.setAttribute('aria-selected', String(x === li)));
    if (!li) return;
    const key = li.dataset.img;
    shots.forEach((img) => img.classList.toggle('on', img.dataset.shot === key));
  }
  items.forEach((li) => {
    li.tabIndex = 0;
    li.addEventListener('click', () => select(li));
    li.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) select(li); });
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(li); } });
  });
  function visible() { return items.filter((li) => !li.hidden); }
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    items.forEach((li) => {
      const text = (li.textContent || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      li.hidden = q !== '' && !text.includes(q);
    });
    const v = visible();
    $('[data-feat-empty]').hidden = v.length > 0;
    if (v.length && !v.some((li) => li.getAttribute('aria-selected') === 'true')) select(v[0]);
  });
  search.addEventListener('keydown', (e) => {
    const v = visible(); if (!v.length) return;
    let i = v.findIndex((li) => li.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowDown') { e.preventDefault(); select(v[Math.min(v.length - 1, i + 1)]); }
    if (e.key === 'ArrowUp') { e.preventDefault(); select(v[Math.max(0, i - 1)]); }
  });
  select(items[0]);

  // ---------- Formulari: obre el correu amb el missatge escrit ----------
  const form = $('[data-join]'), segOs = $('[data-seg-os]');
  let os = 'Android';
  $$('button', segOs).forEach((b) => b.addEventListener('click', () => { os = b.dataset.v; radio(segOs, os); }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#join-email').value.trim();
    if (!$('#join-email').checkValidity()) { $('#join-email').reportValidity(); return; }
    const subject = encodeURIComponent(fill(t('mail.subject'), { os }));
    const body = encodeURIComponent(fill(t('mail.body'), { os, email }));
    location.href = `mailto:danielmeller@gmail.com,david.meller.e@gmail.com?subject=${subject}&body=${body}`;
  });

  // ---------- La demo puja una mica en fer scroll ----------
  const demo = $('#demo');
  if (!reduce && demo && matchMedia('(min-width: 861px)').matches) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { const y = Math.min(scrollY, innerHeight); demo.style.setProperty('--demo-y', `${-y * 0.18}px`); ticking = false; });
    }, { passive: true });
  }

  // ---------- La foto de Barcelona s'apropa lentament en fer scroll ----------
  const outMedia = $('.out-media');
  if (!reduce && outMedia) {
    let busy = false;
    const update = () => {
      const r = outMedia.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (r.top + r.height) / (innerHeight + r.height)));
      outMedia.style.setProperty('--out-s', String(1.18 - p * 0.18));
      busy = false;
    };
    addEventListener('scroll', () => { if (!busy) { busy = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  applyLang();
})();
