import { OFFICES, SECOND_ROUND_OFFICES, START, SECOND_ROUND_START, INTERVAL, fetchResult, normalize, resultUrl, resultWindowOpen, retryDelay } from './tse.js';
import { initCats, refreshCardCats, reactCats } from './cats.js';
import { observe, decorate, initAlerts, alertsEnabled } from './extras.js';
import { initMap } from './map.js';
import { initBrazil } from './brasil.js';
import { renderHistory } from './history.js';

const $ = id => document.getElementById(id);
const int = new Intl.NumberFormat('pt-BR');
const dec = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clock = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Araguaina' });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const count = value => value == null ? '—' : int.format(value);
const pct = value => value == null ? '—' : dec.format(value) + '%';
const memory = {
  get(key) { try { return JSON.parse(localStorage.getItem('apuracao2026:' + key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem('apuracao2026:' + key, JSON.stringify(value)); } catch { /* O painel funciona sem armazenamento. */ } },
};
let region = memory.get('region') === 'to' ? 'to' : 'br';
let round = memory.get('round') === 1 ? 1 : 2;
let auto = memory.get('auto') !== false;
let busy = false;
let blockedUntil = Math.min(Number(memory.get('blockedUntil')) || 0, Date.now() + 600_000);
const states = new Map();
const activeOffices = () => round === 2 ? SECOND_ROUND_OFFICES : OFFICES;

function stateFor(office, areaOverride = null) {
  const area = areaOverride || (office.code === 1 ? region : office.region);
  const key = (office.turn === 2 ? '2:' : '') + office.id + ':' + area;
  if (!states.has(key)) {
    const saved = memory.get(key);
    const state = { key, office, area, data: null, cached: false, checked: 0, next: 0, failures: 0, error: null };
    if (saved?.raw) {
      try { state.data = normalize(saved.raw, office, area); state.cached = true; } catch { /* Recusar arquivos incompatíveis. */ }
    }
    const scheduled = memory.get(key + ':retry');
    if (scheduled && Number.isFinite(scheduled.next) && scheduled.next > Date.now()) {
      state.next = Math.min(scheduled.next, Date.now() + 600_000);
      state.error = scheduled.error; state.failures = scheduled.failures || 1;
    }
    states.set(key, state);
  }
  return states.get(key);
}

const radar = '<div class="radar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2M12 2a10 10 0 1 0 10 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></div>';
const runoff = {
  presidente: { names: 'Flávio Bolsonaro (PL) × Lula (PT)', source: 'https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/flavio-bolsonaro-e-lula-vao-disputar-o-2o-turno-para-a-presidencia-da-republica' },
  governador: { names: 'Professora Dorinha (União) × Vicentinho Júnior (PSDB)', source: 'https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/no-tocantins-disputa-pelo-governo-do-estado-sera-decidida-no-2o-turno' },
};

function makeCard(office) {
  const article = document.createElement('article');
  article.className = 'race-card';
  article.setAttribute('aria-labelledby', 'title-' + office.id);
  article.innerHTML = '<div class="race-head"><div class="race-kicker"><span>' + office.label + '</span><span class="seats">' + office.seats + (office.seats === 1 ? ' vaga' : ' vagas') + '</span></div>' +
    '<h3 class="race-title" id="title-' + office.id + '">' + office.name + '<span aria-hidden="true">↗</span></h3>' +
    '<div class="scope-row"><span class="scope-label" id="area-' + office.id + '"></span>' +
    (office.code === 1 ? '<div class="scope-toggle" role="group" aria-label="Abrangência da votação para presidente"><button type="button" data-region="br" aria-pressed="true">Brasil</button><button type="button" data-region="to" aria-pressed="false">Tocantins</button></div>' : '<span class="scope-label">TO</span>') +
    '</div></div><div class="race-body" id="body-' + office.id + '"></div><div class="race-footer" id="footer-' + office.id + '"></div>';
  $('race-grid').append(article);
}

function emptyContent(state) {
  let title = 'Aguardando os primeiros dados';
  let message = 'Os candidatos e os votos aparecerão aqui assim que os resultados forem recebidos.';
  if (state.office.turn === 2 && Date.now() < SECOND_ROUND_START) { title = '2º turno em 25 de outubro'; message = 'Os votos serão divulgados após o encerramento da votação, às 17h no horário de Brasília. Os números do 1º turno estão na aba ao lado.'; }
  else if (state.error === 404) { title = 'Arquivo ainda indisponível'; message = 'O arquivo deste cargo ainda não está disponível no endereço do TSE. O painel tentará novamente.'; }
  else if (state.error === 403 || state.error === 429 || Date.now() < blockedUntil) { title = 'Consulta temporariamente pausada'; message = 'O acesso à fonte foi limitado. O painel respeitará a pausa antes de tentar novamente.'; }
  else if (state.error === 422) { title = 'Não foi possível validar os dados'; message = 'O arquivo recebido não corresponde ao formato ou à eleição esperada. Consulte o TSE enquanto isso.'; }
  else if (state.error) { title = 'Não foi possível consultar o TSE'; message = 'Pode haver uma falha de rede, indisponibilidade da fonte ou bloqueio de acesso pelo navegador.'; }
  else if (state.data && !state.data.disclosed) { title = 'Aguardando a divulgação'; message = 'O arquivo oficial foi recebido, mas ainda não apresenta uma totalização liberada para este cargo.'; }
  else if (state.office.proportional && state.data?.candidates.length && !state.data.candidates.some(candidate => candidate.votes > 0)) { title = 'Aguardando votos'; message = 'As candidaturas foram recebidas, mas ainda não há votos publicados para este cargo.'; }
  else if (state.data) { title = 'Nenhum candidato no arquivo'; message = 'O TSE ainda não informou candidaturas neste arquivo. O painel continua verificando.'; }
  else if (Date.now() < START) { title = 'A apuração vem a seguir'; message = 'A divulgação está prevista a partir das 17h de 4 de outubro, no horário de Brasília.'; }
  const candidates = state.office.turn === 2 && !state.data?.disclosed ? runoff[state.office.id] : null;
  return '<div class="empty-state">' + radar + '<h3>' + title + '</h3><p>' + message + '</p>' +
    (candidates ? '<div class="runoff-matchup"><strong>Candidaturas do 2º turno</strong><span>' + esc(candidates.names) + '</span><a href="' + candidates.source + '" target="_blank" rel="noopener noreferrer">Confirmadas pelo TSE ↗</a></div>' : '') +
    (state.error ? '<a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer">Acompanhar no TSE ↗</a>' : '') + '</div>';
}

function candidateContent(candidate) {
  return '<li class="candidate"><div class="candidate-main"><div class="candidate-number" title="Número de urna">' + esc(candidate.number) +
    '</div><div class="candidate-info"><h4 class="candidate-name">' + esc(candidate.name) + '</h4><div class="candidate-meta">' + esc(candidate.party) +
    '</div></div><div class="candidate-score"><strong>' + pct(candidate.percent) + '</strong><small>' + count(candidate.votes) + ' votos</small></div></div>' +
    '<div class="candidate-bar" aria-hidden="true"><span style="width:' + (candidate.percent ?? 0) + '%"></span></div>' +
    (candidate.status ? '<span class="candidate-state">' + esc(candidate.status) + '</span>' : '') +
    (candidate.destination && candidate.destination !== 'Válido' ? '<div class="candidate-destination">Destinação: ' + esc(candidate.destination) + '</div>' : '') + '</li>';
}

function candidateResults(data, office, area) {
  if (!data?.candidates.length) return '';
  if (!office.proportional) return '<ol class="candidate-list">' + data.candidates.map(candidateContent).join('') + '</ol><p class="results-caption">Votos computados e percentuais publicados pelo TSE.' + (office.code === 1 && area === 'to' ? ' Recorte estadual; a decisão é nacional.' : '') + '</p>';
  const elected = data.candidates.filter(candidate => /^eleit[oa](?:\s|$)/i.test(candidate.status));
  const featured = elected.length ? elected : data.candidates.slice(0, 12);
  const remaining = elected.length ? data.candidates.filter(candidate => !elected.includes(candidate)) : data.candidates.slice(12);
  const heading = elected.length ? 'Eleitos conforme o TSE (' + elected.length + ')' : 'Mais votados até agora';
  const note = elected.length ? 'A situação de eleito é a informada pelo TSE.' : 'A votação é proporcional: estar entre os mais votados não garante uma vaga. Os eleitos aparecerão quando o TSE informar a situação das candidaturas.';
  return '<h4 class="candidate-group-title">' + heading + '</h4><ol class="candidate-list">' + featured.map(candidateContent).join('') + '</ol>' +
    (remaining.length ? '<details class="candidate-more"><summary>Ver ' + count(remaining.length) + ' ' + (elected.length ? 'demais candidaturas' : 'outras candidaturas') + '</summary><ol class="candidate-list">' + remaining.map(candidateContent).join('') + '</ol></details>' : '') +
    '<p class="results-caption">' + note + ' Votos e percentuais publicados pelo TSE.</p>';
}

function renderCard(office) {
  const state = stateFor(office), data = state.data;
  const stale = state.cached || Boolean(state.error);
  const moreOpen = $('body-' + office.id).querySelector('.candidate-more')?.open || false;
  $('area-' + office.id).textContent = state.area === 'br' ? '⌖ Votação nacional' : '⌖ Tocantins';
  if (office.code === 1) document.querySelectorAll('[data-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === region)));
  const status = data ? stale ? 'Consulta anterior · sem atualização' : data.disclosed ? data.completed ? 'Totalização final · TSE' : 'Resultado parcial · TSE' : 'Aguardando divulgação' : state.error ? 'Dados indisponíveis' : 'Aguardando dados';
  const progress = data?.progress ?? null;
  const sectionText = data?.sections != null ? count(data.sections) + ' de ' + count(data.totalSections) + ' seções totalizadas' : 'Aguardando informação da fonte';
  $('body-' + office.id).innerHTML = '<div class="progress-label"><span>Seções totalizadas</span><strong>' + pct(progress) + '</strong></div>' +
    '<div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:' + (progress ?? 0) + '%"></div></div><p class="section-count">' + sectionText + '</p>' +
    '<div class="race-status ' + (data && !stale && data.disclosed ? 'current' : '') + '">' + status + '</div>' +
    (data?.disclosed && data.candidates.length && (!office.proportional || data.candidates.some(candidate => candidate.votes > 0)) ? candidateResults(data, office, state.area) : emptyContent(state)) +
    (data?.noWinner ? '<p class="race-note">O TSE informa totalização sem atribuição de eleitos. ' + esc(data.reasons.join(' · ')) + '</p>' : '') +
    (data && stale ? '<p class="race-note">Exibindo a última consulta recebida. Esses dados podem estar desatualizados.</p>' : '') +
    '<dl class="race-totals"><div><dt>Válidos</dt><dd>' + count(data?.valid) + '</dd></div><div><dt>Brancos</dt><dd>' + count(data?.blank) + '</dd></div><div><dt>Nulos</dt><dd>' + count(data?.nullVotes) + '</dd></div></dl>';
  const more = $('body-' + office.id).querySelector('.candidate-more');
  if (more) more.open = moreOpen;
  decorate(state, $('body-' + office.id));
  const sourceTime = data?.updated ? 'Totalização: ' + data.updated : data?.generated ? 'Arquivo: ' + data.generated : 'Horário do TSE ainda não recebido';
  $('footer-' + office.id).innerHTML = '<span class="timestamp">' + esc(sourceTime) + (data?.updated || data?.generated ? ' (Brasília)' : '') +
    '</span><a href="' + resultUrl(office, state.area) + '" target="_blank" rel="noopener noreferrer" aria-label="Arquivo oficial de ' + office.name + '">Fonte ↗</a>';
}

function connection() {
  const active = activeOffices().map(stateFor);
  const fresh = active.filter(state => state.data && !state.cached && !state.error);
  const withVotes = fresh.filter(state => state.data.disclosed);
  const recent = Math.max(0, ...active.map(state => state.checked));
  let title, detail;
  if (round === 2 && Date.now() < SECOND_ROUND_START) { title = '2º turno em 25 de outubro'; detail = 'Presidente e Governador do Tocantins. A divulgação dos votos começa após as 17h, no horário de Brasília.'; }
  else if (!navigator.onLine) { title = 'Você está sem conexão'; detail = 'Os dados recebidos continuam visíveis. A consulta será retomada quando a conexão voltar.'; }
  else if (Date.now() < blockedUntil) { title = 'A fonte limitou as consultas'; detail = 'O painel aguarda pelo menos dez minutos antes de tentar novamente.'; }
  else if (fresh.length === active.length) { title = withVotes.length ? 'Resultados recebidos do TSE' : 'Aguardando a divulgação dos votos'; detail = 'Última consulta bem-sucedida às ' + clock.format(recent) + '. Horário de Brasília.'; }
  else if (fresh.length) { title = 'Parte dos dados foi recebida'; detail = 'Alguns cargos estão temporariamente sem atualização. Confira o aviso em cada painel.'; }
  else if (active.some(state => state.error)) { title = 'Os resultados estão indisponíveis neste momento'; detail = 'O painel tentará novamente com um intervalo maior. Você também pode acompanhar pelo site do TSE.'; }
  else if (busy) { title = 'Consultando os resultados'; detail = 'Buscando os arquivos oficiais do TSE para os ' + active.length + ' cargos.'; }
  else { title = 'Aguardando os primeiros resultados'; detail = 'A divulgação está prevista a partir das 17h de ' + (round === 2 ? '25' : '4') + ' de outubro, no horário de Brasília.'; }
  $('connection-title').textContent = title;
  $('connection-detail').textContent = detail;
  $('connection-dot').classList.toggle('live', fresh.length === active.length && navigator.onLine && Date.now() >= blockedUntil);
}

function tick() {
  const beforeVote = !resultWindowOpen(activeOffices()[0]);
  const next = Math.max(blockedUntil, Math.min(...activeOffices().map(office => stateFor(office).next)));
  const remaining = Number.isFinite(next) ? Math.max(0, Math.ceil((next - Date.now()) / 1000)) : 0;
  $('refresh-button').disabled = busy || !navigator.onLine || beforeVote || remaining > 0;
  $('refresh-button').setAttribute('aria-busy', String(busy));
  document.querySelectorAll('[data-region]').forEach(button => { button.disabled = busy; });
  document.querySelectorAll('[data-round]').forEach(button => { button.disabled = busy; });
  $('poll-note').textContent = beforeVote ? 'Resultados do 2º turno a partir das 17h de 25 de outubro, no horário de Brasília.' : !navigator.onLine ? 'Sem conexão. Os horários exibidos pertencem à última consulta recebida.' : busy ? 'Consultando a fonte…' : !auto ? 'Atualização automática pausada. Use Atualizar para consultar novamente.' : document.hidden && !alertsEnabled() ? 'Consultas pausadas enquanto a aba está em segundo plano.' : activeOffices().every(office => stateFor(office).next === Infinity) ? 'Totalização final recebida para todos os cargos deste turno.' : remaining > 60 ? 'Nova tentativa em ' + Math.ceil(remaining / 60) + ' min. Intervalo ampliado por indisponibilidade da fonte.' : 'Próxima consulta em ' + remaining + ' s · atualização automática a cada 30 s.';
  const history = stateFor(OFFICES[0], 'to');
  const historyDue = !history.data?.completed && history.next <= Date.now();
  const spotlightDue = round === 2 && !beforeVote && stateFor(SECOND_ROUND_OFFICES[0], 'to').next <= Date.now();
  if (auto && !busy && (!document.hidden || alertsEnabled()) && navigator.onLine && Date.now() >= blockedUntil && (historyDue || spotlightDue || (!beforeVote && remaining === 0 && activeOffices().some(office => stateFor(office).next <= Date.now())))) void refresh();
}

async function fetchRegion(code, force = false) {
  const state = stateFor(SECOND_ROUND_OFFICES[0], code);
  if (Date.now() < blockedUntil) return { fetched: false, status: 429 };
  if (!navigator.onLine || (!force && state.next > Date.now())) return { fetched: false, status: null };
  try {
    const { raw, data } = await fetchResult(state.office, code);
    state.data = data; state.cached = false; state.error = null; state.failures = 0;
    state.checked = Date.now(); state.next = data.completed ? Infinity : state.checked + 5 * 60_000;
    memory.set(state.key, { raw }); memory.set(state.key + ':retry', null);
    return { fetched: true, status: null };
  } catch (error) {
    state.failures += 1; state.error = error.status || 'network'; state.cached = Boolean(state.data);
    state.next = Date.now() + retryDelay(error.status, state.failures);
    memory.set(state.key + ':retry', { next: state.next, error: state.error, failures: state.failures });
    if (error.status === 403 || error.status === 429) { blockedUntil = state.next; memory.set('blockedUntil', blockedUntil); }
    return { fetched: true, status: error.status || 'network' };
  }
}

async function refresh(force = false) {
  if (busy || !navigator.onLine || Date.now() < blockedUntil) return;
  const active = resultWindowOpen(activeOffices()[0]) ? activeOffices().map(office => stateFor(office)) : [];
  const spotlight = round === 2 && resultWindowOpen(SECOND_ROUND_OFFICES[0]) ? stateFor(SECOND_ROUND_OFFICES[0], 'to') : null;
  const history = stateFor(OFFICES[0], 'to');
  const pending = [...new Map([...active, spotlight, history].filter(Boolean).map(state => [state.key, state])).values()].filter(state =>
    ((active.includes(state) || state === spotlight) && (force || state.next <= Date.now())) || (state === history && !state.data?.completed && state.next <= Date.now()));
  if (!pending.length) return;
  busy = true; connection(); tick();
  for (const state of pending) {
    if (Date.now() < blockedUntil) break;
    try {
      const { raw, data } = await fetchResult(state.office, state.area);
      state.data = data; state.cached = false; state.error = null; state.failures = 0;
      state.checked = Date.now(); state.next = data.completed ? Infinity : state.checked + INTERVAL;
      memory.set(state.key, { raw }); memory.set(state.key + ':retry', null);
      const events = observe(state);
      if (activeOffices().includes(state.office) && state.area === (state.office.code === 1 ? region : state.office.region)) reactCats(state.office, events);
    } catch (error) {
      state.failures += 1; state.error = error.status || 'network'; state.cached = Boolean(state.data);
      state.next = Date.now() + retryDelay(error.status, state.failures);
      memory.set(state.key + ':retry', { next: state.next, error: state.error, failures: state.failures });
      if (error.status === 403 || error.status === 429) {
        blockedUntil = state.next; memory.set('blockedUntil', blockedUntil);
        activeOffices().forEach(office => { const paused = stateFor(office); if (paused.data) paused.cached = true; renderCard(office); });
      }
    }
    if (activeOffices().includes(state.office) && state.area === (state.office.code === 1 ? region : state.office.region)) renderCard(state.office);
    if (state.office === OFFICES[0] && state.area === 'to') renderHistory(state.data, state.cached);
    mapUpdated.updated(state.office);
    brazil.updated(state);
    connection();
  }
  busy = false; connection(); tick();
  $('announcer').textContent = $('connection-title').textContent;
}

function showRound() {
  const offices = activeOffices();
  $('race-grid').replaceChildren();
  $('race-grid').classList.toggle('two-offices', offices.length === 2);
  offices.forEach(makeCard);
  refreshCardCats();
  offices.forEach(renderCard);
  $('office-count').textContent = offices.length + ' cargos';
  $('office-jump').innerHTML = offices.map(office => '<a href="#title-' + office.id + '">' + esc(office.name) + '</a>').join('');
  $('intro-description').innerHTML = round === 2 ? 'Presidente e governador no 2º turno.<br>Uma apuração sob a supervisão de muitos bigodes.' : 'Presidente, governador, senador e deputado estadual.<br>Veja o resultado do 1º turno.';
  $('date-day').innerHTML = (round === 2 ? '25' : '04') + '<span>/10</span>';
  $('date-round').textContent = round + 'º turno';
  $('map-round-label').textContent = round + 'º turno · quem tem mais votos em cada cidade';
  $('tocantins-spotlight').hidden = round !== 2;
  $('brasil-states').hidden = round !== 2;
  if (round !== 2) $('brasil-states').open = false;
  document.querySelectorAll('[data-round]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.round) === round)));
}

showRound();
initCats();
const mapUpdated = initMap(stateFor, activeOffices);
const brazil = initBrazil(stateFor, fetchRegion, () => auto);
const historyState = stateFor(OFFICES[0], 'to');
renderHistory(historyState.data, historyState.cached);
$('auto-refresh').checked = auto;
initAlerts();
$('auto-refresh').addEventListener('change', event => { auto = event.target.checked; memory.set('auto', auto); tick(); });
$('refresh-button').addEventListener('click', () => void refresh(true));
$('race-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-region]');
  if (!button || busy || button.dataset.region === region) return;
  region = button.dataset.region; memory.set('region', region);
  renderCard(activeOffices()[0]); connection(); tick(); void refresh();
});
document.querySelectorAll('[data-round]').forEach(button => button.addEventListener('click', () => {
  if (busy || Number(button.dataset.round) === round) return;
  round = Number(button.dataset.round); memory.set('round', round);
  showRound(); mapUpdated.setOffices(activeOffices()); connection(); tick(); void refresh();
}));
window.addEventListener('offline', () => { activeOffices().forEach(office => { const state = stateFor(office); if (state.data) state.cached = true; renderCard(office); }); connection(); tick(); });
window.addEventListener('online', () => { connection(); tick(); });
document.addEventListener('visibilitychange', () => tick());
connection(); tick(); void refresh();
setInterval(tick, 1000);
