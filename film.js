/* =============================================================
   FILM — moteur de mise en scène au défilement
   Le JS ne touche jamais au style : il n'écrit que des scalaires
   dans des variables CSS, et le rendu appartient à film.css.
   ============================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyMotionPreference() {
    root.dataset.motion = mqReduce.matches ? 'reduced' : 'full';
  }
  applyMotionPreference();
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', applyMotionPreference);

  /* ---------- Petites maths ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mixHex(a, b, t) {
    var x = hex(a), y = hex(b);
    return 'rgb(' + Math.round(lerp(x[0], y[0], t)) + ',' +
                    Math.round(lerp(x[1], y[1], t)) + ',' +
                    Math.round(lerp(x[2], y[2], t)) + ')';
  }

  /* ---------- Indices en cascade pour les révélations ---------- */
  function indexChildren(nodes) {
    for (var i = 0; i < nodes.length; i++) nodes[i].style.setProperty('--i', i);
  }
  var letter = document.querySelector('.letter');
  if (letter) indexChildren(letter.children);
  var groups = document.querySelectorAll('[data-reveal-group]');
  for (var g = 0; g < groups.length; g++) {
    indexChildren(groups[g].querySelectorAll('[data-reveal]'));
  }

  /* ---------- Révélation à l'entrée dans le cadre ---------- */
  var revealables = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || mqReduce.matches) {
    for (var r = 0; r < revealables.length; r++) revealables[r].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-in');
          io.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    for (var k = 0; k < revealables.length; k++) io.observe(revealables[k]);
  }

  /* ---------- Cartes Google chargées seulement au clic ---------- */
  var facades = document.querySelectorAll('.map-facade');
  for (var f = 0; f < facades.length; f++) {
    facades[f].addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.src = this.dataset.map;
      frame.title = this.dataset.title || 'Carte';
      frame.height = this.offsetHeight;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.setAttribute('allowfullscreen', '');
      this.replaceWith(frame);
    });
  }

  /* Le mouvement réduit s'arrête ici : plus rien n'est piloté au défilement. */
  if (mqReduce.matches) return;

  /* ---------- Ambiances : le ciel traverse la journée ---------- */
  var MOODS = {
    envelope:  { top: '#fdf8f4', mid: '#f8eeea', bot: '#f0e2e3', vig: 0.00, snow: 0.45 },
    kiosque:   { top: '#b3cfe8', mid: '#dcebf4', bot: '#f7f3ef', vig: 0.00, snow: 1.00 },
    route:     { top: '#a6c7e4', mid: '#d3e5f2', bot: '#f3f7f9', vig: 0.00, snow: 0.70 },
    eglise:    { top: '#241d2b', mid: '#2b2430', bot: '#191420', vig: 0.55, snow: 0.00 },
    orangerie: { top: '#f2dab4', mid: '#f8e9d0', bot: '#eee0cc', vig: 0.04, snow: 0.00 },
    soiree:    { top: '#0c1230', mid: '#151b3c', bot: '#241f48', vig: 0.62, snow: 0.00 },
    album:     { top: '#fdf8f4', mid: '#f9f1ee', bot: '#f4ebe9', vig: 0.00, snow: 0.00 }
  };

  var acts = Array.prototype.slice.call(document.querySelectorAll('.act'));
  var snowLevel = 0;

  function renderAtmosphere(vh) {
    var mid = window.pageYOffset + vh * 0.5;
    var i = 0;
    for (var n = 0; n < acts.length; n++) {
      if (mid >= acts[n].offsetTop) i = n;
    }
    var el = acts[i];
    var t = clamp01((mid - el.offsetTop) / Math.max(1, el.offsetHeight));
    var a = MOODS[el.dataset.scene] || MOODS.album;
    var next = acts[i + 1];
    var b = next ? (MOODS[next.dataset.scene] || a) : a;
    var m = easeInOut(seg(t, 0.68, 1));   // fondu enchaîné vers l'ambiance suivante

    root.style.setProperty('--sky-top', mixHex(a.top, b.top, m));
    root.style.setProperty('--sky-mid', mixHex(a.mid, b.mid, m));
    root.style.setProperty('--sky-bot', mixHex(a.bot, b.bot, m));
    root.style.setProperty('--vignette', lerp(a.vig, b.vig, m).toFixed(3));

    snowLevel = lerp(a.snow, b.snow, m);
    root.style.setProperty('--snow-opacity', snowLevel.toFixed(3));
  }

  /* ---------- Registre des scènes ---------- */
  var scenes = [];
  function scene(selector, render) {
    var el = document.querySelector(selector);
    if (el) scenes.push({ el: el, render: render, idle: false });
  }
  function set(el, name, value) { el.style.setProperty(name, value); }

  /* Acte I — l'enveloppe scellée */
  scene('.act-envelope', function (p, el) {
    var stage = el.querySelector('.envelope-stage');
    if (!stage) return;
    var sealRaw = seg(p, 0.06, 0.26);
    var flap = easeInOut(seg(p, 0.26, 0.50));
    var rise = easeInOut(seg(p, 0.48, 0.76));
    var settle = easeInOut(seg(p, 0.74, 0.95));

    set(stage, '--seal', easeOut(sealRaw).toFixed(4));
    set(stage, '--seal-fall', (sealRaw * sealRaw).toFixed(4));
    set(stage, '--seal-fade', seg(sealRaw, 0.45, 1).toFixed(4));
    set(stage, '--flap', flap.toFixed(4));
    set(stage, '--rise', rise.toFixed(4));
    set(stage, '--settle', settle.toFixed(4));
    set(stage, '--hide', seg(p, 0.02, 0.12).toFixed(4));

    stage.classList.toggle('is-cracked', p > 0.05);
    stage.classList.toggle('is-open', flap > 0.5);
    stage.classList.toggle('is-free', rise > 0.98);
    stage.classList.toggle('is-revealed', p > 0.72);

    /* Fondu au blanc vers l'acte II */
    set(el, '--act1-fade', (1 - seg(p, 0.94, 1)).toFixed(3));
  });

  /* Acte II — le kiosque sous la neige */
  scene('.act-kiosque', function (p, el) {
    var intro = easeOut(seg(p, 0.00, 0.16));
    var out = seg(p, 0.90, 1);

    set(el, '--push', (1 + easeInOut(seg(p, 0.12, 0.88)) * 0.22).toFixed(4));
    set(el, '--par-far', (-26 * p).toFixed(1));
    set(el, '--par-mid', (-48 * p).toFixed(1));
    set(el, '--par-kio', (-74 * p).toFixed(1));
    set(el, '--par-cpl', (-104 * p).toFixed(1));
    set(el, '--par-drift', (46 * p).toFixed(1));

    var titleOut = easeInOut(seg(p, 0.32, 0.56));
    set(el, '--title-o', (intro * (1 - titleOut)).toFixed(3));
    set(el, '--title-y', (24 * (1 - intro) - 46 * titleOut).toFixed(1));

    var cd = easeOut(seg(p, 0.54, 0.74));
    set(el, '--cd-o', (cd * (1 - out)).toFixed(3));
    set(el, '--cd-y', (30 * (1 - cd)).toFixed(1));

    set(el, '--bg-fade', (1 - out * 0.85).toFixed(3));
  });

  /* Acte III — la route vers l'église */
  scene('.act-route', function (p, el) {
    set(el, '--par-hills', (-34 * p).toFixed(1));
    set(el, '--par-road', (54 * p).toFixed(1));
    set(el, '--par-poles', (140 * p).toFixed(1));

    /* L'église grandit depuis l'horizon : l'échelle part de la base, fixée au sol */
    var approach = easeInOut(seg(p, 0.04, 0.94));
    set(el, '--spire-o', easeOut(seg(p, 0.03, 0.26)).toFixed(3));
    set(el, '--spire-s', (0.8 + approach * 1.25).toFixed(3));
    set(el, '--spire-y', (8 - approach * 14).toFixed(1));
  });

  /* Acte IV — l'église, les vitraux s'allument */
  scene('.act-eglise', function (p, el) {
    set(el, '--nave-s', (1.16 - easeInOut(p) * 0.16).toFixed(4));
    set(el, '--win-o', (0.26 + easeOut(seg(p, 0.08, 0.55)) * 0.74).toFixed(3));
    set(el, '--beam-o', (easeOut(seg(p, 0.16, 0.58)) * (1 - seg(p, 0.86, 1))).toFixed(3));
  });

  /* Acte V — l'orangerie */
  scene('.act-orangerie', function (p, el) {
    set(el, '--og-s', (1.04 + p * 0.12).toFixed(4));
    set(el, '--par-glass', (-46 * p).toFixed(1));
    set(el, '--par-plants', (64 * p).toFixed(1));
  });

  /* Acte VI — la soirée */
  scene('.act-soiree', function (p, el) {
    set(el, '--stars-o', easeOut(seg(p, 0.03, 0.32)).toFixed(3));
    set(el, '--win-lit', easeOut(seg(p, 0.06, 0.40)).toFixed(3));
    set(el, '--lights-o', easeOut(seg(p, 0.08, 0.40)).toFixed(3));
    set(el, '--par-ch', (-36 * p).toFixed(1));
    set(el, '--par-moon', (-64 * p).toFixed(1));
    set(el, '--par-li', (54 * p).toFixed(1));
  });

  /* Acte VII — travelling horizontal sur l'album */
  var rail = document.querySelector('.album-rail');
  scene('.album-rail-wrap', function (p, el) {
    if (!rail) return;
    var max = Math.max(0, rail.scrollWidth - window.innerWidth);
    set(el, '--rail-x', (max * p).toFixed(1));
  });

  /* ---------- Boucle ---------- */
  function sceneProgress(el, vh) {
    var r = el.getBoundingClientRect();
    var travel = r.height - vh;
    if (travel > 0) return clamp01(-r.top / travel);
    return clamp01((vh - r.top) / (vh + r.height));
  }

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;

    renderAtmosphere(vh);

    var doc = document.documentElement;
    var span = doc.scrollHeight - vh;
    root.style.setProperty('--film-p', span > 0 ? (window.pageYOffset / span).toFixed(4) : '0');

    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      var r = s.el.getBoundingClientRect();
      var near = r.bottom > -vh * 0.4 && r.top < vh * 1.4;
      if (!near) {
        /* Un dernier rendu en sortie de cadre, puis on laisse la scène dormir */
        if (s.idle) continue;
        s.idle = true;
      } else {
        s.idle = false;
      }
      s.render(sceneProgress(s.el, vh), s.el);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('orientationchange', onScroll);


  /* =============================================================
     Neige — un seul canvas, en plein écran, pour tout le film
     ============================================================= */
  (function snowfall() {
    var canvas = document.getElementById('film-snow');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var flakes = [];
    var w = 0, h = 0;

    function build() {
      var count = Math.round(Math.min(160, (w * h) / 9500));
      flakes.length = 0;
      for (var i = 0; i < count; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.7 + Math.random() * 2.4,
          vy: 0.22 + Math.random() * 0.85,
          phase: Math.random() * Math.PI * 2,
          sway: 0.3 + Math.random() * 0.9,
          alpha: 0.35 + Math.random() * 0.55
        });
      }
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    var t = 0;
    function tick() {
      requestAnimationFrame(tick);
      if (snowLevel < 0.02) return;   // rien à dessiner tant qu'il ne neige pas

      t += 0.01;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < flakes.length; i++) {
        var fl = flakes[i];
        fl.y += fl.vy;
        fl.phase += 0.012;
        var x = fl.x + Math.sin(fl.phase) * fl.sway * 14;
        if (fl.y - fl.r > h) { fl.y = -fl.r; fl.x = Math.random() * w; }
        ctx.globalAlpha = fl.alpha;
        ctx.beginPath();
        ctx.arc(x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    window.addEventListener('resize', resize);
    resize();
    tick();
  })();


  /* =============================================================
     Ciel étoilé de l'acte VI — dessiné une fois par redimensionnement
     ============================================================= */
  (function starfield() {
    var canvas = document.getElementById('film-stars');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function draw() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      var count = Math.round(Math.min(220, (w * h) / 6500));
      for (var i = 0; i < count; i++) {
        var x = Math.random() * w;
        var y = Math.random() * h * 0.78;
        var r = Math.random() < 0.88 ? Math.random() * 1.1 + 0.3 : Math.random() * 1.8 + 1.1;
        ctx.globalAlpha = 0.25 + Math.random() * 0.7;
        ctx.fillStyle = Math.random() < 0.15 ? '#ffe9c4' : '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    var re;
    window.addEventListener('resize', function () {
      clearTimeout(re);
      re = setTimeout(draw, 200);
    });
    draw();
  })();


  /* Premier rendu, puis un second une fois les polices chargées
     (leur arrivée change la hauteur des sections). */
  frame();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onScroll);
  window.addEventListener('load', onScroll);
})();
