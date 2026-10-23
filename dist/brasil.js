import { OFFICES, SECOND_ROUND_OFFICES, STATES, resultWindowOpen } from './tse.js';
import { mapPaths } from './map.js';

const nf = new Intl.NumberFormat('pt-BR');
const pf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ordered = [STATES.find(([code]) => code === 'to'), ...STATES.filter(([code]) => code !== 'to').sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))];
export const IBGE_CODES = { ac: '12', al: '27', ap: '16', am: '13', ba: '29', ce: '23', df: '53', es: '32', go: '52', ma: '21', mt: '51', ms: '50', mg: '31', pa: '15', pb: '25', pr: '41', pe: '26', pi: '22', rj: '33', rn: '24', rs: '43', ro: '11', rr: '14', sc: '42', sp: '35', se: '28', to: '17' };
const ufByIbge = new Map(Object.entries(IBGE_CODES).map(([uf, ibge]) => [ibge, uf]));
const stateNames = new Map(STATES);
const palette = ['#b95735', '#397a9d', '#70934a', '#9670a9', '#b48642', '#9b6f68'];
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
    progress: data?.disclosed ? data.progress ?? null : null,
    completed: Boolean(data?.completed),
    updated: data?.updated || data?.generated || null,
    stale: Boolean(state?.cached || state?.error),
  };
}

export function initBrazil(getState, fetchRegion, getRound, isAuto = () => true) {
  const section = document.getElementById('brasil-states');
  const spotlight = document.getElementById('tocantins-spotlight');
  const grid = document.getElementById('states-grid');
  const note = document.getElementById('states-note');
  const button = document.getElementById('states-refresh');
  const mapSection = document.getElementById('municipal-map');
  const mapSvg = document.getElementById('br-map-svg');
  const mapList = document.getElementById('br-map-list');
  const mapDetail = document.getElementById('br-map-detail');
  const mapLegend = document.getElementById('br-map-legend');
  const mapNote = document.getElementById('br-map-note');
  const mapRefresh = document.getElementById('br-map-refresh');
  const statesDescription = document.getElementById('states-description');
  const mapDescription = document.getElementById('br-map-description');
  if (!section || !spotlight || !grid || !note || !button || !mapSection || !mapSvg || !mapList || !mapDetail || !mapLegend || !mapNote || !mapRefresh || !statesDescription || !mapDescription) return { updated() {}, setMapVisible() {}, setRound() {} };
  let busy = false, run = 0, mapVisible = false, mapReady = false, mapLoading = false, mapShapes = [], selectedUf = 'to';
  const candidateColors = new Map();
  const president = () => (getRound() === 2 ? SECOND_ROUND_OFFICES : OFFICES)[0];
  const active = () => section.open || (mapVisible && mapSection.open);
  const setNote = message => { note.textContent = message; mapNote.textContent = message; };

  function colorFor(candidate) {
    if (!candidateColors.has(candidate.id)) candidateColors.set(candidate.id, { name: candidate.name, color: palette[candidateColors.size % palette.length] });
    return candidateColors.get(candidate.id).color;
  }

  function mapResult(code) {
    const summary = regionSummary(getState(president(), code));
    summary.candidates.forEach(colorFor);
    return summary;
  }

  function mapColor(summary) {
    if (!summary.hasVotes) return 'var(--map-empty)';
    return summary.tie ? 'var(--map-tie)' : colorFor(summary.candidates[0]);
  }

  function renderMap() {
    const summaries = new Map(STATES.map(([code]) => [code, mapResult(code)]));
    if (mapReady) mapSvg.innerHTML = mapShapes.map(shape => {
      const code = ufByIbge.get(shape.ibge);
      const summary = summaries.get(code);
      const title = stateNames.get(code) + ': ' + (summary.hasVotes ? summary.tie ? 'empate' : summary.leader + ' lidera' : 'sem votos divulgados');
      return `<path d="${shape.d}" data-uf="${code}" fill="${mapColor(summary)}" class="map-state${code === 'to' ? ' tocantins' : ''}${code === selectedUf ? ' selected' : ''}" tabindex="0" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title></path>`;
    }).join('');
    mapList.innerHTML = ordered.map(([code, name]) => {
      const summary = summaries.get(code);
      const leader = summary.hasVotes ? summary.tie ? 'Empate' : summary.leader : 'Sem votos';
      return `<li><button type="button" data-uf="${code}" class="${code === selectedUf ? 'selected ' : ''}${code === 'to' ? 'tocantins' : ''}"><i style="background:${mapColor(summary)}"></i><span>${esc(name)}</span><small>${esc(leader)}</small></button></li>`;
    }).join('');
    const counts = new Map();
    for (const summary of summaries.values()) if (summary.hasVotes && !summary.tie) {
      const id = summary.candidates[0].id;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    mapLegend.innerHTML = [...candidateColors].map(([id, item]) => `<span><i style="background:${item.color}"></i>${esc(item.name)} · ${counts.get(id) || 0} estados</span>`).join('') || 'Aguardando votos estaduais.';
    const summary = summaries.get(selectedUf);
    const name = stateNames.get(selectedUf);
    mapDetail.innerHTML = `<strong>${selectedUf === 'to' ? '<img class="to-flag" src="./bandeira-tocantins.svg" alt="" width="28" height="20"> ' : ''}${esc(name)} · ${selectedUf.toUpperCase()}</strong><span>${summary.hasVotes ? summary.tie ? 'Empate na primeira posição.' : esc(summary.leader) + ' lidera com ' + nf.format(summary.candidates[0].votes) + ' votos' + (summary.candidates[0].percent == null ? '' : ' (' + pf.format(summary.candidates[0].percent) + '%).' ) : 'Votos ainda não divulgados para este estado.'}</span>${summary.progress == null ? '' : `<small>${pf.format(summary.progress)}% das seções · ${summary.completed ? 'totalização final' : 'parcial'}${summary.stale ? ' · consulta anterior' : ''}</small>`}`;
  }

  function selectUf(code) {
    if (!stateNames.has(code)) return;
    selectedUf = code;
    renderMap();
  }

  async function prepareMap() {
    if (mapReady || mapLoading) return;
    mapLoading = true;
    try {
      const response = await fetch('./br-malha.geojson');
      if (!response.ok) throw new Error('Malha nacional indisponível.');
      const geo = await response.json();
      if (geo.features?.length !== STATES.length || new Set(geo.features.map(feature => String(feature.properties?.codarea))).size !== STATES.length) throw new Error('Malha nacional incompleta.');
      mapShapes = mapPaths(geo.features, 520, 540);
      if (!mapShapes.every(shape => ufByIbge.has(shape.ibge))) throw new Error('Códigos dos estados não conferem.');
      mapReady = true;
      renderMap();
    } catch { mapNote.textContent = 'Não foi possível carregar a malha do Brasil. A lista dos estados continua disponível acima.'; }
    finally { mapLoading = false; }
  }

  mapSvg.addEventListener('click', event => { if (event.target.dataset.uf) selectUf(event.target.dataset.uf); });
  mapSvg.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.dataset.uf) { event.preventDefault(); selectUf(event.target.dataset.uf); } });
  mapList.addEventListener('click', event => { const target = event.target.closest('button[data-uf]'); if (target) selectUf(target.dataset.uf); });

  function content(code) {
    const office = president();
    const summary = regionSummary(getState(office, code));
    const progress = summary.progress;
    const progressText = progress == null ? '—' : pf.format(progress) + '%';
    const progressBar = progress == null
      ? '<div class="state-progress-track" aria-hidden="true"></div>'
      : '<div class="state-progress-track" role="progressbar" aria-label="Seções totalizadas em ' + esc(stateNames.get(code)) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progress + '"><span style="width:' + progress + '%"></span></div>';
    const progressContent = '<div class="state-progress"><span>Seções totalizadas</span><strong>' + progressText + '</strong></div>' + progressBar;
    if (!summary.hasVotes) {
      const message = !resultWindowOpen(office) ? 'Aguardando o ' + getRound() + 'º turno' : 'Votos ainda não divulgados';
      return progressContent + '<p class="state-empty">' + message + (summary.stale ? ' · última consulta indisponível' : '') + '</p>';
    }
    return progressContent + '<p class="state-leader">' + (summary.tie ? 'Empate na primeira posição' : esc(summary.leader) + ' lidera') + '</p>' +
      '<div class="state-candidates">' + summary.candidates.map(candidate => '<div><span>' + esc(candidate.name) + '</span><strong>' + (candidate.percent == null ? '—' : pf.format(candidate.percent) + '%') + '</strong><small>' + nf.format(candidate.votes) + ' votos</small></div>').join('') + '</div>' +
      '<p class="state-meta">' + (summary.completed ? 'Totalização final' : 'Parcial') +
      (summary.stale ? ' · consulta anterior' : '') +
      (summary.updated ? ' · ' + esc(summary.updated) + ' (Brasília)' : '') + '</p>';
  }

  function render() {
    const round = getRound();
    spotlight.innerHTML = '<div><span class="state-eyebrow">NOSSO ESTADO EM DESTAQUE</span><h2><img class="to-flag spotlight-flag" src="./bandeira-tocantins.svg" alt="Bandeira do Tocantins" width="39" height="28">Tocantins na votação presidencial</h2><p>Resultado estadual do ' + round + 'º turno. A eleição para Presidente é decidida pela votação nacional.</p></div><div class="state-highlight-result">' + content('to') + '</div>';
    statesDescription.textContent = 'Compare a votação presidencial do ' + round + 'º turno em cada estado e no Distrito Federal. Cada card mostra as seções totalizadas e os votos publicados pelo TSE; a decisão para Presidente é nacional.';
    mapDescription.textContent = 'Presidente no ' + round + 'º turno por estado. Cada cor mostra quem lidera naquela unidade da federação; a eleição presidencial é decidida pela soma nacional.';
    grid.innerHTML = ordered.map(([code, name]) => '<li class="state-card' + (code === 'to' ? ' state-card-to' : '') + '"><div class="state-card-head"><strong>' + esc(name) + '</strong><span>' + code.toUpperCase() + '</span></div>' + content(code) + '</li>').join('');
    renderMap();
  }

  async function load(force = false) {
    if (busy || !active()) return;
    const office = president();
    if (!resultWindowOpen(office)) { setNote('Os votos dos estados serão divulgados após as 17h de ' + (getRound() === 2 ? '25' : '4') + ' de outubro (Brasília).'); return; }
    if (document.hidden) return;
    if (!navigator.onLine) { setNote('Sem conexão. Os dados já recebidos continuam visíveis.'); return; }
    if (!force && !isAuto()) { setNote('Atualização automática pausada. Use Atualizar para consultar o TSE.'); return; }
    busy = true; button.disabled = true; mapRefresh.disabled = true;
    const id = ++run;
    const queue = ordered.filter(([code]) => code !== 'to' && (force || getState(office, code).next <= Date.now()));
    if (!queue.length) {
      busy = false; button.disabled = false; mapRefresh.disabled = false;
      setNote('Dados recentes preservados no navegador. Nova consulta automática em até 5 minutos; use Atualizar para consultar agora.');
      return;
    }
    let consulted = 0, failures = 0;
    setNote('Consultando os estados no TSE, um de cada vez…');
    for (const [code] of queue) {
      if (id !== run || !active()) break;
      const outcome = await fetchRegion(office, code, force);
      if (id !== run) return;
      if (outcome.fetched) { consulted += 1; render(); }
      if ([403, 404, 422, 429].includes(outcome.status)) {
        setNote('A consulta foi pausada após resposta ' + outcome.status + ' do TSE. Os resultados já recebidos continuam visíveis.');
        busy = false; button.disabled = false; mapRefresh.disabled = false; return;
      }
      if (outcome.status) failures += 1;
      if (failures >= 2) {
        setNote('A consulta parou após falhas de rede em dois estados. Os resultados já recebidos continuam visíveis.');
        busy = false; button.disabled = false; mapRefresh.disabled = false; return;
      }
      if (outcome.fetched) {
        setNote('Estados consultados nesta atualização: ' + consulted + ' de ' + queue.length + '.');
        await wait(250);
      }
    }
    if (id !== run) return;
    busy = false; button.disabled = false; mapRefresh.disabled = false;
    if (active()) setNote(consulted ? 'Atualização concluída. ' + consulted + ' estados consultados; Tocantins acompanha o painel principal. Nova consulta em até 5 minutos.' : 'Dados recentes preservados no navegador. Use Atualizar para consultar novamente.');
  }

  section.addEventListener('toggle', () => {
    if (section.open) { render(); void load(); }
    else if (!active()) run += 1;
  });
  mapSection.addEventListener('toggle', () => {
    if (mapSection.open && mapVisible) { void prepareMap(); renderMap(); void load(); }
    else if (!active()) run += 1;
  });
  button.addEventListener('click', () => void load(true));
  mapRefresh.addEventListener('click', () => void load(true));
  setInterval(() => { if (active()) void load(); }, 5 * 60_000);
  render();
  return {
    updated(state) { if (state.office === president() && state.area === 'to') { render(); if (active()) void load(); } },
    setRound() { run += 1; busy = false; button.disabled = false; mapRefresh.disabled = false; candidateColors.clear(); render(); if (active()) void load(); },
    setMapVisible(value) { mapVisible = value; if (mapVisible && mapSection.open) { void prepareMap(); renderMap(); void load(); } else if (!active()) run += 1; },
  };
}
