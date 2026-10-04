// Extras do painel: margem, maioria absoluta, evolução e alertas.
// Tudo é calculado a partir dos números já publicados pelo TSE; não há projeções.
const PREFIX = 'apuracao2026:';
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(PREFIX + key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* funciona sem armazenamento */ } },
};
const nf = new Intl.NumberFormat('pt-BR');
const df = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const MARKS = [50, 90, 100];
export const MIN_PROGRESS_FOR_LEAD_ALERT = 10;
const COLORS = ['#bc542d', '#2b6f8f', '#6a8f2f', '#8a5aa8'];

// ---------- Funções puras (testáveis) ----------
export function stampToMs(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) às (\d{2}):(\d{2}):(\d{2})$/.exec(text || '');
  return m ? Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-03:00`) : null;
}

// Diferença entre quem ocupa a última vaga e o primeiro fora dela (1º x 2º; no Senado, 2º x 3º).
export function margin(data, office) {
  if (!data?.disclosed || office.proportional) return null;
  const seats = data.seats || office.seats || 1;
  const list = data.candidates;
  if (list.length <= seats) return null;
  const inside = list[seats - 1], outside = list[seats];
  if (inside.votes == null || outside.votes == null) return null;
  const pp = inside.percent != null && outside.percent != null ? inside.percent - outside.percent : null;
  return { seats, inside, outside, votes: inside.votes - outside.votes, pp };
}

// Maioria absoluta só faz sentido em disputas de uma vaga e, para presidente, na votação nacional.
export function majority(data, office, area) {
  if (!data?.disclosed || office.proportional || (data.seats || office.seats) !== 1) return null;
  if (office.code === 1 && area !== 'br') return null;
  const lead = data.candidates[0];
  if (!lead || lead.percent == null) return null;
  return { lead, reached: lead.percent > 50, missing: Math.max(0, 50 - lead.percent) };
}

export function newMarks(already, progress, completed) {
  const hit = MARKS.filter(mark => (mark === 100 ? completed || progress >= 100 : progress >= mark));
  return { all: [...new Set([...already, ...hit])], fresh: hit.filter(mark => !already.includes(mark)) };
}

export function topSignature(data) {
  const seats = data.seats || 1;
  const top = data.candidates.slice(0, seats);
  return top.some(c => c.votes == null) ? '' : top.map(c => c.id).sort().join('|');
}

export function addPoint(history, data, now = Date.now()) {
  const hist = { names: { ...(history?.names || {}) }, points: [...(history?.points || [])] };
  const stamp = data.updated || data.generated;
  if (!stamp || hist.points.at(-1)?.stamp === stamp) return hist;
  const v = {};
  for (const c of data.candidates) if (c.percent != null) { v[c.id] = c.percent; hist.names[c.id] = c.name; }
  if (!Object.keys(v).length) return hist;
  hist.points.push({ stamp, t: stampToMs(stamp) ?? now, p: data.progress, v });
  hist.points = hist.points.slice(-240);
  return hist;
}

export function chartSvg(hist, maxSeries = 4) {
  const points = hist?.points || [];
  if (points.length < 2) return '';
  const latest = points.at(-1).v;
  const ids = Object.keys(latest).sort((a, b) => latest[b] - latest[a]).slice(0, maxSeries);
  const values = points.flatMap(p => ids.map(id => p.v[id]).filter(v => v != null));
  let lo = Math.max(0, Math.floor(Math.min(...values) - 2)), hi = Math.min(100, Math.ceil(Math.max(...values) + 2));
  if (hi - lo < 6) { hi = Math.min(100, lo + 6); lo = Math.max(0, hi - 6); }
  const W = 320, H = 150, L = 36, R = 10, T = 10, B = 22;
  const t0 = points[0].t, t1 = points.at(-1).t;
  const x = (p, i) => L + (t1 > t0 ? (p.t - t0) / (t1 - t0) : i / (points.length - 1)) * (W - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  let svg = `<svg class="evo-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução dos percentuais de ${esc(ids.map(id => hist.names[id]).join(', '))}">`;
  for (const tick of ticks) svg += `<line x1="${L}" x2="${W - R}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" class="evo-grid"/><text x="${L - 5}" y="${(y(tick) + 3).toFixed(1)}" text-anchor="end" class="evo-tick">${Math.round(tick)}%</text>`;
  const clock = p => (p.stamp.split(' às ')[1] || '').slice(0, 5);
  svg += `<text x="${L}" y="${H - 6}" class="evo-tick">${esc(clock(points[0]))}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="evo-tick">${esc(clock(points.at(-1)))}</text>`;
  ids.forEach((id, index) => {
    const color = COLORS[index % COLORS.length];
    const line = points.map((p, i) => p.v[id] == null ? null : `${x(p, i).toFixed(1)},${y(p.v[id]).toFixed(1)}`).filter(Boolean);
    if (!line.length) return;
    const [lx, ly] = line.at(-1).split(',');
    svg += `<polyline points="${line.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="3" fill="${color}"/>`;
  });
  return { svg: svg + '</svg>', ids, colors: COLORS };
}

// ---------- Interface ----------
const labelOf = state => state.office.name + (state.office.code === 1 ? (state.area === 'br' ? ' · Brasil' : ' · Tocantins') : '');
let alertsOn = false, audio = null, wake = null;
export const alertsEnabled = () => alertsOn;

function toast(title, body) {
  let area = document.getElementById('toasts');
  if (!area) { area = document.createElement('div'); area.id = 'toasts'; area.className = 'toasts'; area.setAttribute('aria-live', 'assertive'); document.body.append(area); }
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = '<div><strong>' + esc(title) + '</strong><span>' + esc(body) + '</span></div><button type="button" aria-label="Fechar aviso">×</button>';
  el.querySelector('button').addEventListener('click', () => el.remove());
  area.append(el); setTimeout(() => el.remove(), 20_000);
  while (area.children.length > 4) area.firstChild.remove();
}

function beep() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume?.();
    const now = audio.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audio.createOscillator(), gain = audio.createGain(), at = now + i * 0.18;
      osc.frequency.value = freq; osc.connect(gain); gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.start(at); osc.stop(at + 0.18);
    });
  } catch { /* sem áudio */ }
}

function notify(title, body) {
  toast(title, body); beep();
  try { navigator.vibrate?.([120, 60, 120]); } catch { /* ignorado */ }
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, tag: title + body }); } catch { /* ignorado */ }
}

async function holdScreen() {
  try { if (alertsOn && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock?.request('screen'); wake?.addEventListener('release', () => { wake = null; }); } } catch { /* ignorado */ }
}

export function observe(state) {
  try {
    const data = state.data;
    if (!data?.disclosed) return;
    if (!state.office.proportional) store.set('hist:' + state.key, addPoint(store.get('hist:' + state.key), data));
    const prev = store.get('alerts:' + state.key);
    const progress = data.progress ?? 0;
    const { all, fresh } = newMarks(prev?.marks || [], progress, data.completed);
    const sig = state.office.proportional ? '' : topSignature(data);
    const leadChanged = Boolean(prev?.sig && sig && sig !== prev.sig);
    const completed = Boolean(prev && fresh.includes(100));
    if (prev && alertsOn) {
      const label = labelOf(state);
      for (const mark of fresh) notify(label, mark === 100 ? 'Totalização concluída (100% das seções).' : mark + '% das seções totalizadas.');
      if (leadChanged && progress >= MIN_PROGRESS_FOR_LEAD_ALERT) {
        const names = data.candidates.slice(0, data.seats || 1).map(c => c.name);
        notify(label, (data.seats || 1) === 1 ? 'Mudou a liderança: agora ' + names[0] + ' está na frente.' : 'Mudança entre os mais votados: agora ' + names.join(' e ') + '.');
      }
    }
    store.set('alerts:' + state.key, { marks: all, sig: sig || prev?.sig || '' });
    return { leadChanged, completed };
  } catch { /* extras nunca devem quebrar o painel */ }
}

export function decorate(state, body) {
  try {
    const data = state.data;
    if (!data?.disclosed || !body || state.office.proportional) return;
    const list = body.querySelector('.candidate-list');
    if (!list) return;
    const m = margin(data, state.office), maj = majority(data, state.office, state.area);
    let html = '';
    if (m) html += '<p><b>' + (m.seats === 1 ? 'Diferença entre 1º e 2º' : 'Diferença na última vaga (' + m.seats + 'º e ' + (m.seats + 1) + 'º)') + ':</b> ' + nf.format(m.votes) + ' votos' + (m.pp != null ? ' · ' + df.format(m.pp) + ' p.p.' : '') + '<br><small>' + esc(m.inside.name) + ' à frente de ' + esc(m.outside.name) + '</small></p>';
    if (maj) html += '<p><b>Maioria absoluta:</b> ' + (maj.reached ? esc(maj.lead.name) + ' está acima de 50% dos votos válidos (' + df.format(maj.lead.percent) + '%).' : 'líder com ' + df.format(maj.lead.percent) + '%; faltam ' + df.format(maj.missing) + ' p.p. para passar de 50% dos votos válidos.') + '</p>';
    if (html) list.insertAdjacentHTML('beforebegin', '<div class="insight">' + html + '<small class="insight-note">Parcial: os números mudam conforme a apuração avança.</small></div>');
    if (maj) list.classList.add('has-majority');
    const chart = chartSvg(store.get('hist:' + state.key));
    const section = chart
      ? '<section class="evo"><h4>Evolução ao longo da noite</h4>' + chart.svg + '<ul class="evo-legend">' + chart.ids.map((id, i) => '<li><i style="background:' + chart.colors[i % chart.colors.length] + '"></i>' + esc(store.get('hist:' + state.key).names[id]) + '</li>').join('') + '</ul><p class="evo-note">Percentuais publicados pelo TSE a cada totalização, registrados por este navegador enquanto o painel esteve aberto. Não é uma série oficial.</p></section>'
      : '<section class="evo"><h4>Evolução ao longo da noite</h4><p class="evo-note">O gráfico aparece a partir da segunda totalização registrada por este navegador.</p></section>';
    (body.querySelector('.results-caption') || list).insertAdjacentHTML('afterend', section);
  } catch { /* extras nunca devem quebrar o painel */ }
}

export function initAlerts() {
  const button = document.getElementById('alert-button');
  if (!button) return;
  alertsOn = store.get('alerts') === true;
  const sync = () => { button.setAttribute('aria-pressed', String(alertsOn)); button.querySelector('span:last-child').textContent = alertsOn ? 'Alertas ligados' : 'Alertas'; };
  sync(); holdScreen();
  button.addEventListener('click', async () => {
    alertsOn = !alertsOn; store.set('alerts', alertsOn); sync();
    if (!alertsOn) { try { await wake?.release(); } catch { /* ignorado */ } wake = null; return; }
    beep();
    let permission = 'unsupported';
    try { if ('Notification' in window) permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission; } catch { /* ignorado */ }
    toast('Alertas ligados', 'Aviso sonoro e na tela nos marcos de 50%, 90% e 100% das seções e quando mudar quem lidera' + (permission === 'granted' ? ', também como notificação.' : '. Notificações do sistema não estão disponíveis neste navegador.'));
    holdScreen();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') holdScreen(); });
}
