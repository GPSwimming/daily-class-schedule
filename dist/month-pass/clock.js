'use strict';
(() => {
  const clocks = document.querySelectorAll('[data-live-time]');
  let timer;
  function updateClock() {
    const now = new Date();
    const hour = now.getHours() % 12 || 12;
    const value = hour + ':' + String(now.getMinutes()).padStart(2, '0');
    clocks.forEach((clock) => {
      clock.textContent = value;
      clock.setAttribute('aria-label', '現在時間 ' + value);
    });
    clearTimeout(timer);
    timer = setTimeout(updateClock, 60000 - Date.now() % 60000 + 50);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateClock(); });
  window.addEventListener('focus', updateClock);
  window.addEventListener('pageshow', updateClock);
  updateClock();
})();
