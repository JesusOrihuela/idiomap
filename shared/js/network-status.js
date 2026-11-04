/* ============================================================
   network-status.js — Offline / reconnect indicator
   Slides in from the top when the user loses connectivity;
   briefly shows "restored" on reconnect then hides itself.
   No dependencies. Self-initialising IIFE.
   ============================================================ */
(function () {
  let _banner    = null;
  let _hideTimer = null;

  function _ensureBanner() {
    if (_banner) return _banner;
    _banner = document.createElement('div');
    _banner.setAttribute('role', 'status');
    _banner.setAttribute('aria-live', 'assertive'); // interrupts — losing connection is urgent
    _banner.setAttribute('aria-atomic', 'true');
    _banner.className = 'network-banner';
    // Append after body is available
    (document.body || document.documentElement).appendChild(_banner);
    return _banner;
  }

  function _show(text, variant) {
    clearTimeout(_hideTimer);
    const b = _ensureBanner();
    b.textContent = text;
    b.classList.remove('network-banner--offline', 'network-banner--online');
    b.classList.add('network-banner--' + variant);
    // Force a reflow so the transition plays even if the element was just created
    b.getBoundingClientRect();
    b.classList.add('network-banner--visible');
  }

  function _hide(delayMs) {
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
      if (!_banner) return;
      _banner.classList.remove('network-banner--visible');
    }, delayMs);
  }

  function _onOffline() {
    _show((typeof AppLang !== 'undefined' ? AppLang.t('network_offline') : 'No connection'), 'offline');
  }

  function _onOnline() {
    _show((typeof AppLang !== 'undefined' ? AppLang.t('network_online') : '✓ Connection restored'), 'online');
    _hide(3000);
  }

  window.addEventListener('offline', _onOffline);
  window.addEventListener('online',  _onOnline);

  // Show immediately if already offline when the script runs
  if (!navigator.onLine) {
    if (document.body) {
      _onOffline();
    } else {
      document.addEventListener('DOMContentLoaded', _onOffline, { once: true });
    }
  }
}());
