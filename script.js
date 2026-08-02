/* Compte à rebours jusqu'au 6 mars 2027, 14h00 (cérémonie) */
(function () {
  var target = new Date('2027-03-06T14:00:00');
  var box = document.getElementById('countdown');
  if (!box) return;

  var out = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds')
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  function update() {
    var diff = target - new Date();

    if (diff <= 0) {
      box.innerHTML = '<p class="cd-done">C\'est le grand jour ! 🎉</p>';
      clearInterval(timer);
      return;
    }

    out.days.textContent = pad(Math.floor(diff / 864e5));
    out.hours.textContent = pad(Math.floor((diff % 864e5) / 36e5));
    out.minutes.textContent = pad(Math.floor((diff % 36e5) / 6e4));
    out.seconds.textContent = pad(Math.floor((diff % 6e4) / 1e3));
  }

  update();
  var timer = setInterval(update, 1000);
})();


/* Lightbox de l'album */
(function () {
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbClose = document.getElementById('lightbox-close');
  if (!lightbox) return;

  var lastFocus = null;

  document.querySelectorAll('.album-item img').forEach(function (img) {
    img.addEventListener('click', function () {
      lastFocus = document.activeElement;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    });
  });

  function close() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
    if (lastFocus) lastFocus.focus();
  }

  lbClose.addEventListener('click', close);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
