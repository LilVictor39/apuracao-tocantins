(() => {
  const key = 'apuracao2026:theme';
  const allowed = new Set(['auto', 'light', 'dark']);
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'auto';
  try { const saved = localStorage.getItem(key); if (allowed.has(saved)) mode = saved; } catch { /* armazenamento opcional */ }

  function apply() {
    const dark = mode === 'dark' || (mode === 'auto' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#151a18' : '#fff8ed';
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === mode));
    });
  }

  apply();
  system.addEventListener('change', () => { if (mode === 'auto') apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    mode = allowed.has(event.newValue) ? event.newValue : 'auto';
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.themeChoice;
      try { localStorage.setItem(key, mode); } catch { /* escolha vale nesta página */ }
      apply();
    }));
  });
})();
