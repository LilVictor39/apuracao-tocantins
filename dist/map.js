import { OFFICES, SECOND_ROUND_OFFICES, municipalUrl, normalize } from './tse.js';

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const colors = ['#b95735', '#397a9d', '#70934a', '#9670a9', '#b48642', '#9b6f68'];
const number = new Intl.NumberFormat('pt-BR');

export function municipalityResult(data) {
  if (!data?.disclosed || !data.candidates?.length || data.candidates[0].votes == null || data.candidates[0].votes === 0) return null;
  const first = data.candidates[0], second = data.candidates[1];
  if (second?.votes === first.votes) return { tie: true };
  return { id: first.id, name: first.name, votes: first.votes, percent: first.percent, progress: data.progress, updated: data.updated };
}

function geometryPath(geometry, project) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.flatMap(polygon => polygon.map(ring => ring.map(([lon, lat], index) => {
    const [x, y] = project(lon, lat);
    return (index ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join('') + 'Z')).join('');
}

export function mapPaths(features, width = 360, height = 600) {
  const points = features.flatMap(feature => {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    return polygons.flatMap(polygon => polygon.flatMap(ring => ring));
  });
  const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((width - 16) / (maxX - minX), (height - 16) / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  const project = (lon, lat) => [offsetX + (lon - minX) * scale, height - offsetY - (lat - minY) * scale];
  return features.map(feature => ({ ibge: String(feature.properties.codarea), d: geometryPath(feature.geometry, project) }));
}

export function initMap(getState, getOffices = () => OFFICES) {
  const section = $('municipal-map');
  if (!section) return { updated() {}, setOffices() {}, setVisible() {} };
  const officeKey = office => (office.turn || 1) + ':' + office.id;
  let municipalities = [], shapes = [], selectedOffice = getOffices()[1] || getOffices()[0], selectedCode = null, runId = 0, busy = false, cooldown = 0, visible = true;
  const results = new Map([...OFFICES, ...SECOND_ROUND_OFFICES].map(office => [officeKey(office), new Map()]));
  const loaded = new Set(), lastLoad = new Map();
  const selector = $('map-office'), search = $('map-search'), note = $('map-note'), detail = $('map-detail');
  const svg = $('map-svg'), list = $('map-list'), legend = $('map-legend');

  function tone(result) {
    if (!result) return 'var(--map-empty)';
    if (result.tie) return 'var(--map-tie)';
    const candidates = getState(selectedOffice)?.data?.candidates || [];
    const index = candidates.findIndex(candidate => candidate.id === result.id);
    return colors[index < 0 ? 5 : index % colors.length];
  }

  function paint() {
    const current = results.get(officeKey(selectedOffice));
    const byIbge = new Map(municipalities.map(m => [m.ibge, m]));
    svg.innerHTML = shapes.map(shape => {
      const city = byIbge.get(shape.ibge);
      if (!city) return '';
      const result = current.get(city.code);
      const title = city.name + ': ' + (result?.name || (result?.tie ? 'empate' : 'sem votos divulgados'));
      return `<path d="${shape.d}" data-code="${city.code}" fill="${tone(result)}" class="map-city${city.code === selectedCode ? ' selected' : ''}" tabindex="0" role="button" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title></path>`;
    }).join('');
    const query = search.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filtered = municipalities.filter(city => city.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
    list.innerHTML = filtered.map(city => {
      const result = current.get(city.code);
      return `<li><button type="button" data-code="${city.code}" class="${city.code === selectedCode ? 'selected' : ''}"><i style="background:${tone(result)}"></i><span>${escapeHtml(city.name)}</span><small>${result?.name ? escapeHtml(result.name) : result?.tie ? 'Empate' : 'Sem votos'}</small></button></li>`;
    }).join('') || '<li class="map-empty-list">Nenhum município encontrado.</li>';
    const tally = new Map();
    for (const result of current.values()) if (result?.name) tally.set(result.name, { count: (tally.get(result.name)?.count || 0) + 1, color: tone(result) });
    legend.innerHTML = [...tally].sort((a, b) => b[1].count - a[1].count).map(([name, item]) => `<span><i style="background:${item.color}"></i>${escapeHtml(name)} · ${item.count}</span>`).join('') || 'Aguardando votos municipais.';
    if (selectedCode) {
      const city = municipalities.find(item => item.code === selectedCode), result = current.get(selectedCode);
      detail.innerHTML = `<strong>${escapeHtml(city?.name || '')}</strong><span>${result?.name ? escapeHtml(result.name) + ' lidera com ' + number.format(result.votes) + ' votos' + (result.percent == null ? '' : ' (' + number.format(result.percent) + '%)') : result?.tie ? 'Empate na primeira posição.' : 'Votos ainda não divulgados para este município.'}</span>${result?.progress != null ? `<small>${number.format(result.progress)}% das seções totalizadas · parcial</small>` : ''}`;
    } else detail.textContent = 'Selecione um município no mapa ou na lista.';
  }

  function select(code) { if (!municipalities.some(city => city.code === code)) return; selectedCode = code; paint(); }
  svg.addEventListener('click', event => { if (event.target.dataset.code) select(event.target.dataset.code); });
  svg.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.dataset.code) { event.preventDefault(); select(event.target.dataset.code); } });
  list.addEventListener('click', event => { const button = event.target.closest('button[data-code]'); if (button) select(button.dataset.code); });
  search.addEventListener('input', paint);
  selector.addEventListener('change', () => {
    runId += 1; busy = false;
    selectedOffice = getOffices().find(office => office.id === selector.value) || getOffices()[0];
    selectedCode = null; note.textContent = 'Carregando os dados de ' + selectedOffice.name + ' · ' + (selectedOffice.turn || 1) + 'º turno.'; paint(); maybeLoad();
  });

  function setOffices(offices) {
    runId += 1; busy = false;
    selectedOffice = offices.find(office => office.id === 'governador') || offices[0];
    selector.innerHTML = offices.filter(office => !office.proportional).map(office => `<option value="${office.id}">${escapeHtml(office.name)}</option>`).join('');
    selector.value = selectedOffice.id;
    selectedCode = null;
    note.textContent = 'Mapa do ' + (selectedOffice.turn || 1) + 'º turno. Abra para consultar os municípios.';
    if (municipalities.length) { paint(); maybeLoad(); }
  }
  setOffices(getOffices());

  async function prepare() {
    try {
      const [citiesResponse, shapeResponse] = await Promise.all([fetch('./to-municipios.json'), fetch('./to-malha.geojson')]);
      if (!citiesResponse.ok || !shapeResponse.ok) throw new Error('Base cartográfica indisponível.');
      const cities = await citiesResponse.json(), geo = await shapeResponse.json();
      if (cities.municipalities?.length !== 139 || geo.features?.length !== 139) throw new Error('Base cartográfica incompleta.');
      municipalities = cities.municipalities;
      shapes = mapPaths(geo.features);
      paint(); maybeLoad();
    } catch { note.textContent = 'Não foi possível carregar a malha municipal. Consulte o TSE pelo link abaixo.'; }
  }

  async function loadVotes(force = false) {
    if (!visible || !section.open || busy || !municipalities.length || Date.now() < cooldown) return;
    if (!getState(selectedOffice)?.data?.disclosed) { note.textContent = 'Aguardando a divulgação dos votos deste cargo pelo TSE.'; return; }
    if (!force && loaded.has(officeKey(selectedOffice)) && Date.now() - (lastLoad.get(officeKey(selectedOffice)) || 0) < 300_000) { note.textContent = 'Mapa atualizado anteriormente. Use Atualizar mapa para uma nova consulta.'; return; }
    busy = true;
    const office = selectedOffice, id = ++runId, current = results.get(officeKey(office));
    let done = 0;
    note.textContent = 'Consultando municípios no TSE: 0 de ' + municipalities.length + '.';
    for (const city of municipalities) {
      if (id !== runId) return;
      if (!visible || !section.open) { busy = false; return; }
      try {
        const response = await fetch(municipalUrl(office, city.code), { cache: 'no-cache', credentials: 'omit', signal: AbortSignal.timeout(12_000) });
        if (!response.ok) {
          if ([403, 404, 429].includes(response.status)) cooldown = Date.now() + (response.status === 404 ? 300_000 : 600_000);
          throw new Error('HTTP ' + response.status);
        }
        const data = normalize(await response.json(), office, 'to', city.code);
        if (id !== runId) return;
        current.set(city.code, municipalityResult(data));
      } catch {
        if (id !== runId) return;
        busy = false;
        note.textContent = 'Consulta interrompida após ' + done + ' municípios. O TSE pode estar indisponível; tente atualizar mais tarde.';
        paint(); return;
      }
      done += 1;
      if (done % 5 === 0 || done === municipalities.length) { note.textContent = 'Consultando municípios no TSE: ' + done + ' de ' + municipalities.length + '.'; paint(); }
      if (done < municipalities.length) await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (id !== runId) return;
    busy = false; loaded.add(officeKey(office)); lastLoad.set(officeKey(office), Date.now());
    note.textContent = 'Mapa atualizado com ' + done + ' municípios. Cores indicam quem tem mais votos em cada cidade; os resultados podem ser parciais.';
  }

  function maybeLoad() {
    const state = getState(selectedOffice);
    if (!visible || !section.open || busy) return;
    if (state?.error || state?.cached) { note.textContent = 'A consulta principal está indisponível; o mapa conserva os dados já recebidos.'; return; }
    void loadVotes();
  }
  section.addEventListener('toggle', () => { if (visible && section.open && !municipalities.length) void prepare(); else maybeLoad(); });
  $('map-refresh').addEventListener('click', () => { if (Date.now() < cooldown) { note.textContent = 'A fonte pediu uma pausa. Tente novamente em alguns minutos.'; return; } void loadVotes(true); });
  return {
    updated: office => { if (visible && section.open && officeKey(office) === officeKey(selectedOffice)) maybeLoad(); },
    setOffices,
    setVisible(value) { visible = value; if (!visible) { runId += 1; busy = false; } else if (section.open) { if (!municipalities.length) void prepare(); else maybeLoad(); } },
  };
}
