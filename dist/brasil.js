import { SECOND_ROUND_OFFICES, SECOND_ROUND_START, STATES } from './tse.js';

const president = SECOND_ROUND_OFFICES[0];
const nf = new Intl.NumberFormat('pt-BR');
const pf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ordered = [STATES.find(([code]) => code === 'to'), ...STATES.filter(([code]) => code !== 'to').sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function regionSummary(state) {
  const data = state?.data;
  const first = data?.candidates?.[0], second = data?.candidates?.[1];
  const hasVotes = Boolean(data?.disclosed && first?.votes > 0);
  return {
    hasVotes,
    leader: hasVotes && first.votes !== second?.votes ? first.name : null,
    tie: hasVotes && first.votes === second?.votes,
    candidates: hasVotes ? data.candidates.slice(0, 2) : [],
    progress: data?.progress ?? null,
    completed: Boolean(data?.completed),
    updated: data?.updated || data?.generated || null,
    stale: Boolean(state?.cached || state?.error),
  };
}

export function initBrazil(getState, fetchRegion, isAuto = () => true) {
  const section = document.getElementById('brasil-states');
  const spotlight = document.getElementById('tocantins-spotlight');
  const grid = document.getElementById('states-grid');
  const note = document.getElementById('states-note');
  const button = document.getElementById('states-refresh');
  if (!section || !spotlight || !grid || !note || !button) return { updated() {} };
  let busy = false, run = 0;

  function content(code) {
    const summary = regionSummary(getState(president, code));
    if (!summary.hasVotes) {
      const message = Date.now() < SECOND_ROUND_START ? 'Aguardando o 2º turno' : 'Votos ainda não divulgados';
      return '<p class="state-empty">' + message + (summary.stale ? ' · última consulta indisponível' : '') + '</p>';
    }
    return '<p class="state-leader">' + (summary.tie ? 'Empate na primeira posição' : esc(summary.leader) + ' lidera') + '</p>' +
      '<div class="state-candidates">' + summary.candidates.map(candidate => '<div><span>' + esc(candidate.name) + '</span><strong>' + (candidate.percent == null ? '—' : pf.format(candidate.percent) + '%') + '</strong><small>' + nf.format(candidate.votes) + ' votos</small></div>').join('') + '</div>' +
      '<p class="state-meta">' + (summary.completed ? 'Totalização final' : 'Parcial') +
      (summary.progress == null ? '' : ' · ' + pf.format(summary.progress) + '% das seções') +
      (summary.stale ? ' · consulta anterior' : '') +
      (summary.updated ? ' · ' + esc(summary.updated) + ' (Brasília)' : '') + '</p>';
  }

  function render() {
    spotlight.innerHTML = '<div><span class="state-eyebrow">NOSSO ESTADO EM DESTAQUE</span><h2>Tocantins na votação presidencial</h2><p>Resultado estadual do 2º turno. A eleição para Presidente é decidida pela votação nacional.</p></div><div class="state-highlight-result">' + content('to') + '</div>';
    grid.innerHTML = ordered.map(([code, name]) => '<li class="state-card' + (code === 'to' ? ' state-card-to' : '') + '"><div class="state-card-head"><strong>' + esc(name) + '</strong><span>' + code.toUpperCase() + '</span></div>' + content(code) + '</li>').join('');
  }

  async function load(force = false) {
    if (busy || !section.open) return;
    if (Date.now() < SECOND_ROUND_START) { note.textContent = 'Os votos dos estados serão divulgados após as 17h de 25 de outubro (Brasília).'; return; }
    if (document.hidden) return;
    if (!navigator.onLine) { note.textContent = 'Sem conexão. Os dados já recebidos continuam visíveis.'; return; }
    if (!force && !isAuto()) { note.textContent = 'Atualização automática pausada. Use Atualizar estados para consultar o TSE.'; return; }
    busy = true; button.disabled = true;
    const id = ++run;
    const queue = ordered.filter(([code]) => code !== 'to' && (force || getState(president, code).next <= Date.now()));
    if (!queue.length) {
      busy = false; button.disabled = false;
      note.textContent = 'Dados recentes preservados no navegador. Use Atualizar estados para consultar novamente.';
      return;
    }
    let consulted = 0, failures = 0;
    note.textContent = 'Consultando os estados no TSE, um de cada vez…';
    for (const [code] of queue) {
      if (id !== run || !section.open) break;
      const outcome = await fetchRegion(code, force);
      if (outcome.fetched) { consulted += 1; render(); }
      if ([403, 404, 422, 429].includes(outcome.status)) {
        note.textContent = 'A consulta foi pausada após resposta ' + outcome.status + ' do TSE. Os resultados já recebidos continuam visíveis.';
        busy = false; button.disabled = false; return;
      }
      if (outcome.status) failures += 1;
      if (failures >= 2) {
        note.textContent = 'A consulta parou após falhas de rede em dois estados. Os resultados já recebidos continuam visíveis.';
        busy = false; button.disabled = false; return;
      }
      if (outcome.fetched) {
        note.textContent = 'Estados consultados nesta atualização: ' + consulted + ' de ' + queue.length + '.';
        await wait(250);
      }
    }
    busy = false; button.disabled = false;
    if (section.open) note.textContent = consulted ? 'Atualização concluída. ' + consulted + ' estados consultados; Tocantins acompanha o painel principal.' : 'Dados recentes preservados no navegador. Use Atualizar estados para consultar novamente.';
  }

  section.addEventListener('toggle', () => {
    if (section.open) { render(); void load(); }
    else run += 1;
  });
  button.addEventListener('click', () => void load(true));
  setInterval(() => { if (section.open) void load(); }, 5 * 60_000);
  render();
  return { updated(state) { if (state.office === president && state.area === 'to') { render(); if (section.open) void load(); } } };
}
