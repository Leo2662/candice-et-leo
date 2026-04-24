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

// Navbar scroll shadow
window.addEventListener('scroll', function () {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 40) {
    nav.style.boxShadow = '0 2px 20px rgba(74,15,28,0.35)';
  } else {
    nav.style.boxShadow = 'none';
  }
});
