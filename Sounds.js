// ═══════════════════════════════════════════════════
//  SHOPCOTTO — Sound Effects v2.0
//  Click-based: plays sound on EVERY interaction
//  No function hooking — much more reliable
// ═══════════════════════════════════════════════════
const SFX = (() => {
  let ctx         = null;
  let ready       = false;
  let muted       = localStorage.getItem('shopcotto_sfx') === 'off';

  // ── Bootstrap audio on first user gesture ──────
  function boot() {
    if (ready) return;
    try {
      ctx   = new (window.AudioContext || window.webkitAudioContext)();
      ready = true;
    } catch(e) {}
  }
  const BGM_SRC = 'audio/bgm.mp3';  // change to your filename
  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Oscillator tone ─────────────────────────────
  function tone(freq, type='sine', dur=0.15, vol=0.25, delay=0) {
    if (muted || !ready) return;
    try {
      resume();
      const t    = ctx.currentTime + delay;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch(e) {}
  }

  // ── Noise burst ─────────────────────────────────
  function noise(dur=0.05, vol=0.08, delay=0, hpFreq=800) {
    if (muted || !ready) return;
    try {
      resume();
      const t    = ctx.currentTime + delay;
      const buf  = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      const hp   = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buf;
      hp.type    = 'highpass'; hp.frequency.value = hpFreq;
      src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.start(t); src.stop(t + dur + 0.05);
    } catch(e) {}
  }

  // ══════════════════════════════
  //  SOUND PRESETS
  // ══════════════════════════════
  const S = {
    click:      () => { noise(0.025, 0.06); tone(600, 'sine', 0.06, 0.10); },
    softClick:  () => { noise(0.018, 0.04); tone(500, 'sine', 0.05, 0.08); },
    addCart:    () => { noise(0.03, 0.10); tone(440,'sine',0.08,0.20,0.02); tone(660,'sine',0.08,0.18,0.08); tone(880,'sine',0.10,0.14,0.14); },
    removeCart: () => { tone(300,'sine',0.10,0.18); tone(180,'sine',0.12,0.12,0.08); },
    wishOn:     () => { tone(500,'sine',0.08,0.20); tone(700,'sine',0.10,0.18,0.09); },
    wishOff:    () => { tone(300,'sine',0.08,0.15); },
    success:    () => { tone(523,'sine',0.16,0.30,0.00); tone(659,'sine',0.16,0.26,0.14); tone(784,'sine',0.16,0.22,0.26); tone(1047,'sine',0.28,0.30,0.38); },
    error:      () => { tone(220,'sawtooth',0.10,0.20); tone(160,'sawtooth',0.10,0.15,0.12); },
    modalOpen:  () => { noise(0.10,0.05); tone(350,'sine',0.14,0.10,0.02); tone(550,'sine',0.12,0.07,0.08); },
    modalClose: () => { noise(0.05,0.06); tone(260,'sine',0.08,0.09); },
    login:      () => { tone(523,'sine',0.14,0.22,0.00); tone(659,'sine',0.14,0.18,0.12); tone(784,'sine',0.18,0.22,0.22); },
    logout:     () => { tone(440,'sine',0.12,0.18); tone(330,'sine',0.14,0.14,0.10); },
    search:     () => { tone(440,'sine',0.07,0.12); tone(660,'sine',0.09,0.10,0.06); },
    star:       (n) => { const f=[392,440,494,523,587]; tone(f[n-1]||523,'sine',0.12,0.22); tone((f[n-1]||523)*1.5,'triangle',0.08,0.10,0.07); },
    proceed:    () => { tone(440,'sine',0.10,0.22); tone(550,'sine',0.10,0.18,0.08); tone(660,'sine',0.14,0.20,0.16); },
    pageLoad:   () => { tone(392,'sine',0.30,0.10,0.30); tone(523,'sine',0.30,0.08,0.34); tone(659,'sine',0.30,0.06,0.38); },
    hover:      () => { noise(0.015, 0.025, 0, 2000); },
    chip:       () => { noise(0.020, 0.05); tone(550,'sine',0.06,0.10,0.01); },
    scroll:     () => { noise(0.015, 0.03, 0, 1500); },
  };

  // ══════════════════════════════
  //  GLOBAL CLICK HANDLER
  //  Capture phase = catches everything
  // ══════════════════════════════
  function handleClick(e) {
    if (muted) return;
    boot();

    const el = e.target;

    // ── Star rating ──
    const starBtn = el.closest('.star-btn');
    if (starBtn) { S.star(parseInt(starBtn.dataset.v) || 3); return; }

    // ── Add to cart ──
    if (el.closest('.btn-add-cart, .btn-pd-cart')) { S.addCart(); return; }

    // ── Remove from cart ──
    if (el.closest('.ci-rm')) { S.removeCart(); return; }

    // ── Wishlist ──
    if (el.closest('.pc-fav')) {
      const btn = el.closest('.pc-fav');
      btn.textContent === '❤️' ? S.wishOff() : S.wishOn();
      return;
    }

    // ── Proceed / Place Order ──
    if (el.closest('.btn-proceed, .btn-place-order')) { S.proceed(); return; }

    // ── Auth submit ──
    if (el.closest('.btn-auth-submit')) { S.login(); return; }

    // ── Logout ──
    if (el.closest('.dd-item.danger, .btn-logout')) { S.logout(); return; }

    // ── Modal close ──
    if (el.closest('.modal-x, .search-close, #sfxToggle')) { S.modalClose(); return; }

    // ── Filter chips ──
    if (el.closest('.fchip, .opt-chip')) { S.chip(); return; }

    // ── Search open ──
    if (el.closest('#searchBtn')) { S.search(); return; }

    // ── Nav links ──
    if (el.closest('.nav-link, .nav-logo')) { S.softClick(); return; }

    // ── Cart open ──
    if (el.closest('#cartBtn')) { S.modalOpen(); return; }

    // ── Hero / theme cards ──
    if (el.closest('.hero-big-card, .theme-card')) { S.chip(); return; }

    // ── Sort select ──
    if (el.closest('.sort-sel')) { S.softClick(); return; }

    // ── Back to top ──
    if (el.closest('#backToTop')) { S.scroll(); return; }

    // ── Generic button/link ──
    if (el.closest('button, a')) { S.click(); return; }
  }

  // Hover sounds on key buttons
  function handleHover(e) {
    if (muted || !ready) return;
    if (e.target.closest('.btn-hero-main,.tc-btn,.btn-add-cart,.btn-proceed,.btn-place-order')) {
      S.hover();
    }
  }

  // ══════════════════════════════
  //  MUTE TOGGLE BUTTON
  // ══════════════════════════════
  function createToggle() {
    const btn        = document.createElement('button');
    btn.id           = 'sfxToggle';
    btn.title        = 'Toggle Sound Effects';
    btn.innerHTML    = muted ? '🔇' : '🔊';
    btn.style.cssText = `
      position:fixed; bottom:80px; right:24px;
      width:44px; height:44px; border-radius:50%;
      background:rgba(26,15,10,0.88);
      border:1.5px solid rgba(201,146,42,0.45);
      color:white; font-size:18px; cursor:pointer;
      z-index:9500; display:flex; align-items:center;
      justify-content:center; backdrop-filter:blur(14px);
      transition:all 0.2s; box-shadow:0 4px 18px rgba(0,0,0,0.35);
    `;
    btn.onmouseenter = () => { btn.style.transform='scale(1.12)'; btn.style.borderColor='rgba(201,146,42,0.9)'; };
    btn.onmouseleave = () => { btn.style.transform='scale(1)';    btn.style.borderColor='rgba(201,146,42,0.45)'; };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      muted = !muted;
      localStorage.setItem('shopcotto_sfx', muted ? 'off' : 'on');
      btn.innerHTML = muted ? '🔇' : '🔊';
      if (!muted) { boot(); S.login(); }
    });
    document.body.appendChild(btn);
  }

  // ══════════════════════════════
  //  INIT
  // ══════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    createToggle();

    // Capture phase — fires before any other handler
    document.addEventListener('click',     handleClick, true);
    document.addEventListener('mouseover', handleHover, { passive: true });

    // Page load sound (after loader hides)
    setTimeout(() => { if (!muted) { boot(); S.pageLoad(); } }, 1800);
  });

  return S;
})();