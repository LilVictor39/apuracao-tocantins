(() => {
  const key = 'apuracao2026:theme';
  let mode = 'light';
  try { if (localStorage.getItem(key) === 'dark') mode = 'dark'; } catch { /* armazenamento opcional */ }

  function apply() {
    const dark = mode === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#151a18' : '#fff8ed';
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
    document.getElementById('theme-toggle-label').textContent = dark ? 'Tema escuro' : 'Tema claro';
  }

  apply();
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    mode = event.newValue === 'dark' ? 'dark' : 'light';
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      mode = mode === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, mode); } catch { /* escolha vale nesta página */ }
      apply();
    });
  });
})();
