const palettes = {
  ginger: { fur: '#efa45e', stripe: '#c47439', ear: '#efb5a5', patch: '#ffe2b7' },
  tuxedo: { fur: '#55545f', stripe: '#393945', ear: '#d69dab', patch: '#fff5e4' },
  cream: { fur: '#f4e8cd', stripe: '#cfb99c', ear: '#e8b5ac', patch: '#fff9ef' },
  gray: { fur: '#a7b5c2', stripe: '#758899', ear: '#dcb6bf', patch: '#e9edf0' },
  calico: { fur: '#f4ddbd', stripe: '#c07e52', ear: '#ebb5a6', patch: '#fff5e4' },
};

function catSvg(kind) {
  const palette = palettes[kind] || palettes.ginger;
  const mask = kind === 'tuxedo' ? '<path d="M80 55Q72 68 64 84Q49 99 59 108Q80 121 101 108Q111 99 96 84Q88 68 80 55" fill="' + palette.patch + '" stroke="none"/>' : '';
  const spot = kind === 'calico' ? '<path d="M98 36Q131 21 135 56Q130 74 110 67Q95 61 98 36" fill="#b6764f" stroke="none"/>' : '';
  const eye = x => '<g class="cat-eye" data-eye-x="' + x + '" data-eye-y="68"><ellipse cx="' + x + '" cy="68" rx="17" ry="20" fill="#fffdf1" stroke="#44362f" stroke-width="2.5"/><g class="cat-pupil" transform="translate(' + x + ' 68)"><ellipse rx="6" ry="11" fill="#342d30" stroke="none"/><circle cx="2" cy="-4" r="2.1" fill="white" stroke="none"/></g></g>';
  return '<svg class="cat-art" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g stroke="#44362f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M24 54L20 15Q20 6 30 13L54 34Q80 25 106 34L131 13Q141 6 140 17L136 54C153 83 134 115 80 116C26 115 7 83 24 54Z" fill="' + palette.fur + '"/>' +
    '<path d="M30 24L34 48L47 38Z M130 24L126 48L113 38Z" fill="' + palette.ear + '" stroke="none"/>' + spot + mask +
    '<path d="M70 34L73 45M80 32V44M90 34L87 45" stroke="' + palette.stripe + '" stroke-width="4"/>' +
    '<ellipse cx="37" cy="87" rx="10" ry="5" fill="' + palette.ear + '" stroke="none" opacity=".65"/><ellipse cx="123" cy="87" rx="10" ry="5" fill="' + palette.ear + '" stroke="none" opacity=".65"/>' +
    eye(57) + eye(103) +
    '<path d="M75 88Q80 85 85 88L80 93Z" fill="#b77779" stroke-width="1.7"/><path d="M80 94Q72 104 66 97M80 94Q88 104 94 97" stroke-width="2"/>' +
    '<path d="M13 75L35 80M10 87L34 88M17 100L36 95M147 75L125 80M150 87L126 88M143 100L124 95" stroke-width="2"/>' +
    '<ellipse cx="47" cy="118" rx="17" ry="12" fill="' + palette.fur + '"/><ellipse cx="113" cy="118" rx="17" ry="12" fill="' + palette.fur + '"/>' +
    '<path d="M42 120V126M49 120V127M108 120V127M115 120V126" stroke-width="1.7"/></g></svg>';
}

let reactionTimer;
let rescanCats = null;

export function refreshCardCats() {
  document.querySelectorAll('.race-card').forEach((card, index) => {
    if (card.querySelector('.card-cat')) return;
    const kitten = document.createElement('span');
    kitten.className = 'card-cat';
    kitten.dataset.cat = ['ginger', 'tuxedo', 'gray'][index % 3];
    kitten.setAttribute('aria-hidden', 'true');
    card.prepend(kitten);
  });
  document.querySelectorAll('[data-cat]').forEach(host => { if (!host.querySelector('.cat-art')) host.innerHTML = catSvg(host.dataset.cat); });
  rescanCats?.();
}

export function reactCats(office, events) {
  if (!events?.leadChanged && !events?.completed) return;
  const scene = document.querySelector('.cat-scene');
  const card = document.getElementById('title-' + office.id)?.closest('.race-card');
  const speech = scene?.querySelector('.cat-speech');
  if (!scene || !speech) return;
  const kind = events.completed ? 'complete' : 'leader';
  const message = events.completed ? '100% apurado! Miau!' : 'Opa! Mudou quem lidera!';
  clearTimeout(reactionTimer);
  document.querySelectorAll('.cat-react-leader, .cat-react-complete').forEach(el => el.classList.remove('cat-react-leader', 'cat-react-complete'));
  // Reinicia a animação quando duas totalizações chegam em sequência.
  void scene.offsetWidth;
  scene.classList.add('cat-react-' + kind);
  card?.classList.add('cat-react-' + kind);
  speech.textContent = message;
  const status = document.getElementById('cat-reaction-status');
  if (status) status.textContent = office.name + ': ' + message;
  reactionTimer = setTimeout(() => {
    scene.classList.remove('cat-react-' + kind);
    card?.classList.remove('cat-react-' + kind);
    speech.textContent = 'alguém disse mouse?';
  }, 4200);
}

export function initCats() {
  const button = document.getElementById('cat-toggle');
  if (!button || button.dataset.ready) return;
  button.dataset.ready = 'true';
  let cats = [];
  rescanCats = () => { cats = [...document.querySelectorAll('.cat-art')].map(svg => ({
    svg,
    eyes: [...svg.querySelectorAll('.cat-eye')].map(eye => ({ x: Number(eye.dataset.eyeX), y: Number(eye.dataset.eyeY), pupil: eye.querySelector('.cat-pupil') })),
  })); };
  refreshCardCats();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let preference = null;
  try { preference = JSON.parse(localStorage.getItem('apuracao2026:cat-eyes')); } catch { /* Preferências são opcionais. */ }
  let enabled = typeof preference === 'boolean' ? preference : !reducedMotion.matches;
  let pointer = null;
  let frame = 0;

  function paint() {
    frame = 0;
    for (const cat of cats) {
      let target = null;
      // A transformação inversa mantém a direção correta mesmo nos gatos inclinados.
      if (enabled && pointer && !document.hidden) {
        const bounds = cat.svg.getBoundingClientRect();
        if (bounds.width && bounds.height && bounds.bottom >= 0 && bounds.top <= innerHeight) {
          const matrix = cat.svg.getScreenCTM();
          if (matrix) target = new DOMPoint(pointer.x, pointer.y).matrixTransform(matrix.inverse());
        }
      }
      for (const eye of cat.eyes) {
        const dx = target ? target.x - eye.x : 0;
        const dy = target ? target.y - eye.y : 0;
        const length = Math.hypot(dx, dy, 38);
        const x = eye.x + dx / length * 8;
        const y = eye.y + dy / length * 7;
        eye.pupil.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
      }
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
  function look(event) {
    if (!enabled) return;
    pointer = { x: event.clientX, y: event.clientY };
    schedule();
  }
  function rest() { pointer = null; schedule(); }
  function updateButton() {
    button.setAttribute('aria-pressed', String(enabled));
    document.getElementById('cat-toggle-label').textContent = enabled ? 'Olhinhos curiosos' : 'Olhinhos em descanso';
    document.body.classList.toggle('cats-resting', !enabled);
    schedule();
  }
  button.addEventListener('click', () => {
    enabled = !enabled; preference = enabled;
    try { localStorage.setItem('apuracao2026:cat-eyes', JSON.stringify(enabled)); } catch { /* Sem armazenamento, o botão continua funcionando. */ }
    updateButton();
  });
  document.addEventListener('pointermove', look, { passive: true });
  document.addEventListener('pointerdown', look, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) rest(); }, { passive: true });
  document.addEventListener('pointercancel', rest, { passive: true });
  window.addEventListener('blur', rest);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  document.addEventListener('visibilitychange', rest);
  reducedMotion.addEventListener('change', () => { if (typeof preference !== 'boolean') { enabled = !reducedMotion.matches; updateButton(); } });
  updateButton();
}
