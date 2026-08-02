// Countdown to 6 March 2027 14:00 (church ceremony)
(function () {
  const target = new Date('2027-03-06T14:00:00');

  function update() {
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      document.getElementById('countdown').innerHTML =
        '<p style="font-family:var(--font-serif);font-size:1.6rem;color:#fff;letter-spacing:.08em">C\'est le grand jour ! 🎉</p>';
      return;
    }

    const days    = Math.floor(diff / 864e5);
    const hours   = Math.floor((diff % 864e5) / 36e5);
    const minutes = Math.floor((diff % 36e5) / 6e4);
    const seconds = Math.floor((diff % 6e4) / 1e3);

    document.getElementById('cd-days').textContent    = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent   = String(hours).padStart(2, '0');
    document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
})();

// Lightbox
(function () {
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lightbox-img');
  const lbClose  = document.getElementById('lightbox-close');

  document.querySelectorAll('.album-item img').forEach(function (img) {
    img.addEventListener('click', function () {
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  lbClose.addEventListener('click', close);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();

// Enveloppe scellée : animation pilotée par le défilement
(function () {
  const scene = document.querySelector('.envelope-scene');
  const stage = document.querySelector('.envelope-stage');
  if (!scene || !stage) return;

  // Respect de prefers-reduced-motion : la lettre reste ouverte, sans scrollytelling
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) {
    stage.classList.add('is-open', 'is-free', 'is-revealed');
    return;
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  // Progression normalisée sur un segment [a, b] de la timeline
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  let ticking = false;

  function render() {
    ticking = false;

    const travel = scene.offsetHeight - window.innerHeight;
    const p = travel > 0 ? clamp01(-scene.getBoundingClientRect().top / travel) : 0;

    // Timeline : sceau → rabat → lettre qui monte → mise en place
    const sealRaw = seg(p, 0.06, 0.26);
    const seal    = easeOut(sealRaw);
    const flap    = easeInOut(seg(p, 0.26, 0.50));
    const rise    = easeInOut(seg(p, 0.48, 0.76));
    const settle  = easeInOut(seg(p, 0.74, 0.95));

    stage.style.setProperty('--seal', seal.toFixed(4));
    stage.style.setProperty('--seal-fall', (sealRaw * sealRaw).toFixed(4));   // chute accélérée
    stage.style.setProperty('--seal-fade', seg(sealRaw, 0.45, 1).toFixed(4));
    stage.style.setProperty('--flap', flap.toFixed(4));
    stage.style.setProperty('--rise', rise.toFixed(4));
    stage.style.setProperty('--settle', settle.toFixed(4));
    stage.style.setProperty('--hide', seg(p, 0.02, 0.12).toFixed(4));

    stage.classList.toggle('is-cracked', p > 0.05);
    stage.classList.toggle('is-open', flap > 0.5);      // le rabat passe derrière l'enveloppe
    stage.classList.toggle('is-free', rise > 0.98);     // la lettre n'est plus rognée
    stage.classList.toggle('is-revealed', p > 0.72);    // l'encre apparaît
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
})();
