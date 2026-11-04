/* ============================================================
   backup-reminder.js — Inline backup reminder inside Mi Perfil.
   Lives in the "Respaldo" section (DP-05): it is a banner in the
   flow, not a floating toast, so it never covers the summary.
   Marcado y estilos en progress.css (.backup-banner).
   ============================================================ */

const AppBackupReminder = (() => {

  const _LAST_EXPORT_KEY = 'pe_last_export';
  const _DAYS_THRESHOLD  = 30;

  function _daysSinceLast() {
    const ts = parseInt(localStorage.getItem(_LAST_EXPORT_KEY) || '0', 10);
    if (!ts) return Infinity;
    return (Date.now() - ts) / (1000 * 60 * 60 * 24);
  }

  /** Returns true when the user should be nudged to export. */
  function shouldShow() {
    return _daysSinceLast() >= _DAYS_THRESHOLD;
  }

  /** Insert the reminder banner at the top of the backup section. */
  function show() {
    const block = document.getElementById('backup-block');
    if (!block || block.querySelector('.backup-banner')) return;

    const t = (typeof AppLang !== 'undefined')
      ? function (k, fb) { var v = AppLang.t(k); return v !== k ? v : (fb || k); }
      : function (k, fb) { return fb || k; };

    const banner = document.createElement('div');
    banner.className = 'backup-banner';
    banner.setAttribute('role', 'status');

    const text = document.createElement('div');
    text.className = 'backup-banner__text';
    const title = document.createElement('strong');
    title.textContent = t('backup_reminder_title', '¿Cuándo fue tu último respaldo?');
    const body = document.createElement('span');
    body.textContent = t('backup_reminder_body', 'Han pasado más de 30 días. Exporta tu progreso para no perderlo.');
    text.append(title, body);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'icon-btn backup-banner__close';
    closeBtn.setAttribute('aria-label', t('backup_reminder_close', 'Cerrar'));
    closeBtn.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>';
    closeBtn.addEventListener('click', function () { banner.remove(); });

    banner.append(text, closeBtn);
    const actions = block.querySelector('.backup-actions');
    block.insertBefore(banner, actions || null);
  }

  return { shouldShow, show };
})();
