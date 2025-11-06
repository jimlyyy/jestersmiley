/**
 * script.js — responsive placement + parallax + interactive control panel
 */
(function () {
  'use strict';

  // IDs / selectors
  const SVG_ID = 'svg-root';
  const PATH_BOTTOM_ID = 'curve-bottom';
  const ON_SEL = '.on';
  const AFTER_SEL = '.after';
  const IMG_ID = 'x-img';

  // tunables
  let PADDING = 8, MIN_SCALE = 0.22, SAMPLES = 360, FINE_TUNE_Y = -5;

  // state
  const state = { offsetX: 0, offsetY: 0, userScale: 1, manualMode: false, manualX: null, manualY: null };

  // helpers
  function whenFontsReady(cb) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(cb).catch(cb);
    } else setTimeout(cb, 120);
  }
  function adaptTunables() {
    const w = Math.max(window.innerWidth || 360, document.documentElement.clientWidth || 360);
    if (w <= 360) { PADDING = 5; MIN_SCALE = 0.18; SAMPLES = 180; FINE_TUNE_Y = -8; }
    else if (w <= 420) { PADDING = 6; MIN_SCALE = 0.22; SAMPLES = 220; FINE_TUNE_Y = -7; }
    else if (w <= 900) { PADDING = 7; MIN_SCALE = 0.26; SAMPLES = 300; FINE_TUNE_Y = -6; }
    else { PADDING = 8; MIN_SCALE = 0.30; SAMPLES = 360; FINE_TUNE_Y = -5; }
  }

  function findClosestPoint(path, targetX) {
    const total = path.getTotalLength();
    let best = { d: Infinity, t: 0, pt: path.getPointAtLength(0) };
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * total;
      const pt = path.getPointAtLength(t);
      const d = Math.abs(pt.x - targetX);
      if (d < best.d) best = { d, t, pt };
    }
    return best;
  }

  function placeIcon() {
    try {
      const svg = document.getElementById(SVG_ID);
      if (!svg) return;
      const path = svg.querySelector('#' + PATH_BOTTOM_ID);
      const onT = svg.querySelector(ON_SEL);
      const afterT = svg.querySelector(AFTER_SEL);
      const img = svg.querySelector('#' + IMG_ID);
      if (!path || !onT || !afterT || !img) return;

      // manual mode:
      if (state.manualMode && Number.isFinite(state.manualX) && Number.isFinite(state.manualY)) {
        const iw0 = Number(img.getAttribute('width')) || img.getBBox().width;
        const ih0 = Number(img.getAttribute('height')) || img.getBBox().height;
        const iw = Math.round(iw0 * state.userScale);
        const ih = Math.round(ih0 * state.userScale);
        const mx = state.manualX + (state.offsetX || 0);
        const my = state.manualY + (state.offsetY || 0);
        img.setAttribute('width', iw);
        img.setAttribute('height', ih);
        img.setAttribute('x', mx - iw / 2);
        img.setAttribute('y', my - ih / 2);
        img.setAttribute('transform', `rotate(0, ${mx}, ${my})`);
        return;
      }

      // auto mode:
      let onBox = { x: 0, width: 0 }, afterBox = { x: 0 };
      try { onBox = onT.getBBox(); afterBox = afterT.getBBox(); } catch (e) {}
      let onWidth = onBox.width || 0;
      try { if (typeof onT.getComputedTextLength === 'function') onWidth = onT.getComputedTextLength(); } catch (e) {}

      const onEndX = onBox.x + (onWidth || onBox.width) + PADDING;
      const afterStartX = afterBox.x - PADDING;
      const available = Math.max(6, afterStartX - onEndX);
      const centerX = (onEndX + afterStartX) / 2;

      const best = findClosestPoint(path, centerX);
      const target = best.pt;
      const tAt = best.t;

      // tangent for rotation
      const totalLen = path.getTotalLength();
      const delta = Math.max(0.5, totalLen / Math.max(80, SAMPLES));
      const p1 = path.getPointAtLength(Math.max(0, tAt - delta));
      const p2 = path.getPointAtLength(Math.min(totalLen, tAt + delta));
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      // image size
      let iw = Number(img.getAttribute('width')) || img.getBBox().width || 44;
      let ih = Number(img.getAttribute('height')) || img.getBBox().height || 44;
      iw = iw * (state.userScale || 1);
      ih = ih * (state.userScale || 1);

      if (iw > available) {
        const s = Math.max(MIN_SCALE, (available - 4) / iw);
        iw = Math.max(8, Math.round(iw * s));
        ih = Math.max(8, Math.round(ih * s));
      }

      let imgX = target.x - iw / 2 + (state.offsetX || 0);
      const imgY = target.y - ih / 2 + (state.offsetY || FINE_TUNE_Y);

      const leftLimit = onEndX + 2;
      const rightLimit = afterStartX - 2 - iw;
      if (imgX < leftLimit) imgX = leftLimit;
      if (imgX > rightLimit) imgX = rightLimit;

      img.setAttribute('width', Math.round(iw));
      img.setAttribute('height', Math.round(ih));
      img.setAttribute('x', imgX);
      img.setAttribute('y', imgY);
      // tambahkan rotasi tambahan dari CSS variable
const cssRotate = getComputedStyle(document.documentElement).getPropertyValue('--x-rotate').trim() || '0deg';
const extraDeg = parseFloat(cssRotate) || 0;
const totalAngle = angle + extraDeg;
img.setAttribute('transform', `rotate(${totalAngle}, ${imgX + iw/2}, ${imgY + ih/2})`);

    } catch (err) {
      console.warn('placeIcon error', err);
    }
  }

  // API
  window.JesterControl = window.JesterControl || {};
  window.JesterControl.recalc = function () {
    adaptTunables();
    whenFontsReady(() => {
      placeIcon(); setTimeout(placeIcon, 120); setTimeout(placeIcon, 320);
    });
  };
  window.JesterControl.setOffset = function (dx = 0, dy = 0) { state.offsetX = Number(dx) || 0; state.offsetY = Number(dy) || 0; state.manualMode = false; window.JesterControl.recalc(); };
  window.JesterControl.setScale = function (s = 1) { state.userScale = Number(s) || 1; state.manualMode = false; window.JesterControl.recalc(); };
  window.JesterControl.setManual = function (x, y) { state.manualMode = true; state.manualX = Number(x); state.manualY = Number(y); window.JesterControl.recalc(); };
  window.JesterControl.reset = function () { state.manualMode = false; state.manualX = state.manualY = null; state.offsetX = state.offsetY = 0; state.userScale = 1; window.JesterControl.recalc(); };
  window.JesterControl.nudge = function (dx = 0, dy = 0) { state.offsetX += Number(dx) || 0; state.offsetY += Number(dy) || 0; window.JesterControl.recalc(); };
  window.JesterControl.getState = function () { return JSON.parse(JSON.stringify(state)); };

  // panel wiring (defensive)
  function wirePanel() {
    const panel = document.getElementById('jester-panel');
    // jika panel tidak ditemukan — skip seluruh wiring panel
    if (!panel) {
      // console message supaya mudah debug
      // eslint-disable-next-line no-console
      console.log('jester-panel not found — skipping control panel wiring');
      return;
    }

    // jika ada panel, lanjutkan seperti semula (safe-select setiap elemen)
    const toggle = document.getElementById('panel-toggle');
    const close = document.getElementById('panel-close');
    const rX = document.getElementById('ctrl-offset-x');
    const rY = document.getElementById('ctrl-offset-y');
    const rS = document.getElementById('ctrl-scale');
    const vX = document.getElementById('val-offset-x');
    const vY = document.getElementById('val-offset-y');
    const vS = document.getElementById('val-scale');
    const chkManual = document.getElementById('ctrl-manual-mode');
    const inManualX = document.getElementById('ctrl-manual-x');
    const inManualY = document.getElementById('ctrl-manual-y');
    const btnManual = document.getElementById('btn-set-manual');
    const btnReset = document.getElementById('btn-reset');
    const btnCenter = document.getElementById('btn-center');
    const btnConsole = document.getElementById('btn-open-console');

    // default panel visible
    panel.classList.remove('hidden');

    if (toggle) toggle.addEventListener('click', () => panel.classList.toggle('hidden'));
    if (close) close.addEventListener('click', () => panel.classList.add('hidden'));

    // sliders (safely attach if exist)
    if (rX) rX.addEventListener('input', (e) => { const val = Number(e.target.value); if (vX) vX.textContent = val; window.JesterControl.setOffset(val, state.offsetY); });
    if (rY) rY.addEventListener('input', (e) => { const val = Number(e.target.value); if (vY) vY.textContent = val; window.JesterControl.setOffset(state.offsetX, val); });
    if (rS) rS.addEventListener('input', (e) => { const val = Number(e.target.value); if (vS) vS.textContent = val.toFixed(2); window.JesterControl.setScale(val); });

    if (chkManual) {
      chkManual.addEventListener('change', (e) => {
        const on = e.target.checked;
        state.manualMode = !!on;
        if (!on) {
          if (inManualX) inManualX.value = '';
          if (inManualY) inManualY.value = '';
          window.JesterControl.reset();
          if (rX) rX.value = 0; if (rY) rY.value = 0; if (rS) rS.value = 1;
          if (vX) vX.textContent = '0'; if (vY) vY.textContent = '0'; if (vS) vS.textContent = '1.00';
        }
      });
    }

    if (btnManual) btnManual.addEventListener('click', () => {
      const mx = inManualX ? Number(inManualX.value) : NaN;
      const my = inManualY ? Number(inManualY.value) : NaN;
      if (!Number.isFinite(mx) || !Number.isFinite(my)) return alert('Masukkan koordinat valid (viewBox: 860 x 300).');
      window.JesterControl.setManual(mx, my);
    });

    if (btnReset) btnReset.addEventListener('click', () => {
      window.JesterControl.reset();
      if (rX) rX.value = 0; if (rY) rY.value = 0; if (rS) rS.value = 1;
      if (vX) vX.textContent = '0'; if (vY) vY.textContent = '0'; if (vS) vS.textContent = '1.00';
      if (chkManual) chkManual.checked = false;
    });

    if (btnCenter) btnCenter.addEventListener('click', () => {
      window.JesterControl.setManual(860 / 2, 300 / 2);
      if (chkManual) chkManual.checked = true;
    });

    if (btnConsole) btnConsole.addEventListener('click', () => {
      console.log('JesterControl available:', window.JesterControl);
      alert('Lihat console devtools. API: JesterControl (recalc, setOffset, setScale, setManual, reset, nudge).');
    });
  }

  // parallax (lightweight)
  function initParallax() {
    const layer = document.querySelector('.bg-layer');
    if (!layer) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let enabled = !reduce && (window.innerWidth > 420);
    function update() {
      if (!enabled) { layer.style.transform = 'translate3d(0,0,0)'; return; }
      const speed = window.innerWidth <= 900 ? 0.12 : 0.22;
      const y = Math.max(-120, Math.min(120, -window.scrollY * speed));
      layer.style.transform = `translate3d(0, ${y}px, 0)`;
    }
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }
    if (enabled) {
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
    }
    window.addEventListener('resize', () => {
      enabled = !reduce && (window.innerWidth > 420);
      update();
    });
  }

  // menu wiring is inside init
  function initMenu() {
    const toggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!toggle || !mobileMenu) return;
    function open() { toggle.classList.add('active'); mobileMenu.classList.add('show'); toggle.setAttribute('aria-expanded', 'true'); mobileMenu.setAttribute('aria-hidden', 'false'); setTimeout(window.JesterControl.recalc, 220); }
    function close() { toggle.classList.remove('active'); mobileMenu.classList.remove('show'); toggle.setAttribute('aria-expanded', 'false'); mobileMenu.setAttribute('aria-hidden', 'true'); setTimeout(window.JesterControl.recalc, 120); }
    toggle.addEventListener('click', (e) => { e.stopPropagation(); (toggle.classList.contains('active') ? close() : open()); });
    document.addEventListener('click', (e) => { if (!mobileMenu.contains(e.target) && !toggle.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // startup
  window.addEventListener('load', () => {
    // Always start at the top (home/hero). Remove hash and reset scroll.
    try {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (_) {}
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 0);
    adaptTunables();
    whenFontsReady(() => {
      window.JesterControl.recalc();
      wirePanel();
      initParallax();
      initMenu();
    });
  });


  window.addEventListener('resize', () => {
    clearTimeout(window._jrTd);
    window._jrTd = setTimeout(() => window.JesterControl.recalc(), 160);
  });
document.documentElement.style.setProperty('--x-offset', '40px');
document.documentElement.style.setProperty('--x-rotate', '12');
  // === Pantau perubahan variabel CSS agar rotasi langsung update ===
  const observer = new MutationObserver(() => {
    window.JesterControl.recalc();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'] // hanya pantau perubahan style (var CSS)
  });
  document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector('.meme-track');
  if (track && !track.dataset.duplicated) {
    track.innerHTML += track.innerHTML; // gandakan isi agar bisa looping
    track.dataset.duplicated = "true";
  }
});


})();
