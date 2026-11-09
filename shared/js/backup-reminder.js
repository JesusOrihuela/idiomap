/* ============================================================
   backup-reminder.js — Inline backup reminder inside Mi Perfil.
   Reuses the section status line (DP-04 rev. 25): one message, no second
   surface competing with the export action. Styles in progress.css.
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

  /** Reuse the status line: one message, no second surface competing with the action. */
  function show() {
    const status = document.getElementById('backup-status');
    if (!status) return;

    const t = (typeof AppLang !== 'undefined')
      ? function (k, fb) { var v = AppLang.t(k); return v !== k ? v : (fb || k); }
      : function (k, fb) { return fb || k; };

    status.textContent = t('backup_reminder_body', 'Han pasado más de 30 días. Exporta tu progreso para no perderlo.');
    status.className = 'backup-status backup-status--warn';
  }

  return { shouldShow, show };
})();
