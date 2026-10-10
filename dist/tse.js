// Fonte: documentação EA20 e códigos oficiais publicados pelo TSE para 04/10/2026.
export const OFFICES = [
  { id: 'presidente', name: 'Presidente', code: 1, election: 6257, region: 'br', seats: 1, label: 'EXECUTIVO FEDERAL' },
  { id: 'governador', name: 'Governador', code: 3, election: 6259, region: 'to', seats: 1, label: 'EXECUTIVO ESTADUAL' },
  { id: 'senador', name: 'Senador', code: 5, election: 6259, region: 'to', seats: 2, label: 'SENADO FEDERAL' },
  { id: 'deputado-estadual', name: 'Deputado estadual', code: 7, election: 6259, region: 'to', seats: 24, proportional: true, label: 'ASSEMBLEIA LEGISLATIVA' },
];
export const SECOND_ROUND_OFFICES = [
  { id: 'presidente', name: 'Presidente', code: 1, election: 6258, region: 'br', seats: 1, turn: 2, label: 'EXECUTIVO FEDERAL' },
  { id: 'governador', name: 'Governador', code: 3, election: 6260, region: 'to', seats: 1, turn: 2, label: 'EXECUTIVO ESTADUAL' },
];
export const SOURCE = 'https://resultados.tse.jus.br';
export const START = Date.parse('2026-10-04T17:00:00-03:00');
export const SECOND_ROUND_START = Date.parse('2026-10-25T17:00:00-03:00');
export const INTERVAL = 30_000;
export const STATES = [
  ['ac', 'Acre'], ['al', 'Alagoas'], ['ap', 'Amapá'], ['am', 'Amazonas'], ['ba', 'Bahia'],
  ['ce', 'Ceará'], ['df', 'Distrito Federal'], ['es', 'Espírito Santo'], ['go', 'Goiás'],
  ['ma', 'Maranhão'], ['mt', 'Mato Grosso'], ['ms', 'Mato Grosso do Sul'], ['mg', 'Minas Gerais'],
  ['pa', 'Pará'], ['pb', 'Paraíba'], ['pr', 'Paraná'], ['pe', 'Pernambuco'], ['pi', 'Piauí'],
  ['rj', 'Rio de Janeiro'], ['rn', 'Rio Grande do Norte'], ['rs', 'Rio Grande do Sul'],
  ['ro', 'Rondônia'], ['rr', 'Roraima'], ['sc', 'Santa Catarina'], ['sp', 'São Paulo'],
  ['se', 'Sergipe'], ['to', 'Tocantins'],
];
const REGIONS = new Set(['br', ...STATES.map(([code]) => code)]);

export const resultWindowOpen = (office, now = Date.now()) => now >= (office.turn === 2 ? SECOND_ROUND_START : START);

export function resultUrl(office, region = office.region) {
  if (!REGIONS.has(region) || (office.code !== 1 && region !== 'to')) throw new Error('Abrangência inválida.');
  return `${SOURCE}/oficial/ele2026/${office.election}/dados/${region}/${region}-c${String(office.code).padStart(4, '0')}-e${String(office.election).padStart(6, '0')}-u.json`;
}

export function municipalUrl(office, code) {
  if (![...OFFICES, ...SECOND_ROUND_OFFICES].includes(office) || !/^\d{5}$/.test(String(code))) throw new Error('Município ou cargo inválido.');
  return `${SOURCE}/oficial/ele2026/${office.election}/dados/to/to${code}-c${String(office.code).padStart(4, '0')}-e${String(office.election).padStart(6, '0')}-u.json`;
}

export function number(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const converted = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
  return Number.isFinite(converted) && converted >= 0 ? converted : null;
}

function percent(value) {
  const parsed = number(value);
  return parsed !== null && parsed <= 100 ? parsed : null;
}

function stamp(date, time) {
  return /^\d{2}\/\d{2}\/2026$/.test(date || '') && /^\d{2}:\d{2}:\d{2}$/.test(time || '') ? `${date} às ${time}` : null;
}

export function normalize(raw, office, region = office.region, municipality = null) {
  if (!raw || raw.f !== 'o' || Number(raw.ele) !== office.election || String(raw.t) !== String(office.turn || 1) || raw.sup !== 'n') {
    throw new Error('O arquivo não corresponde à eleição oficial de 2026 e ao turno selecionado.');
  }
  const expectedArea = municipality == null ? region : String(municipality);
  const expectedType = municipality == null ? (region === 'br' ? 'br' : 'uf') : 'mu';
  if (municipality != null && (region !== 'to' || !/^\d{5}$/.test(expectedArea))) throw new Error('Município inválido.');
  if (String(raw.cdabr).toLowerCase() !== expectedArea || raw.tpabr !== expectedType) {
    throw new Error('O arquivo recebido pertence a outra abrangência.');
  }
  const cargo = raw.carg?.find(item => Number(item.cd) === office.code);
  if (!cargo || !Array.isArray(cargo.agr) || !raw.s || !raw.v) throw new Error('O formato do resultado recebido não é o esperado.');
  if (!['n', 'p', 'f'].includes(raw.and)) throw new Error('O andamento da totalização não foi informado.');
  // dv aplica-se a Presidente; não confundir zeros ainda não divulgados com votos reais.
  const disclosed = (office.code !== 1 || raw.dv === 's') && raw.and !== 'n';
  const canShowOutcome = disclosed && raw.esae !== 's' && !(office.code === 1 && region !== 'br');
  const candidates = cargo.agr.flatMap(group => (group.par || []).flatMap(party => (party.cand || []).map(candidate => ({
    id: String(candidate.sqcand || candidate.n),
    name: String(candidate.nmu || candidate.nm || 'Nome não informado'),
    number: String(candidate.n || '—'),
    party: String(party.sg || '—'),
    votes: disclosed ? number(candidate.vap) : null,
    percent: disclosed ? percent(candidate.pvap) : null,
    order: number(candidate.seq),
    destination: disclosed ? String(candidate.dvt || '') : '',
    // e=s também indica ida ao 2º turno. Somente st pode nomear a situação.
    status: canShowOutcome ? String(candidate.st || '') : '',
  }))));
  candidates.sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1) || (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name, 'pt-BR'));
  return {
    candidates, disclosed,
    progress: disclosed ? percent(raw.s.pst) : null,
    sections: disclosed ? number(raw.s.st) : null,
    totalSections: number(raw.s.ts),
    valid: disclosed ? number(raw.v.vv) : null,
    blank: disclosed ? number(raw.v.vb) : null,
    nullVotes: disclosed ? number(raw.v.tvn) : null,
    updated: stamp(raw.dt, raw.ht),
    generated: stamp(raw.dg, raw.hg),
    seats: number(cargo.nv) || office.seats,
    completed: raw.tf === 's',
    noWinner: raw.esae === 's',
    reasons: Array.isArray(raw.mnae) ? raw.mnae.map(String) : [],
    generation: String(raw.idg || ''),
  };
}

export function retryDelay(status, failures) {
  if (status === 403 || status === 429) return 10 * 60_000;
  if (status === 404 || status === 422) return 5 * 60_000;
  return Math.min(5 * 60_000, 30_000 * 2 ** Math.min(failures, 4));
}

export async function fetchResult(office, region, fetcher = fetch) {
  const response = await fetcher(resultUrl(office, region), { cache: 'no-cache', credentials: 'omit', signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    const error = new Error(`O TSE respondeu com HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  let raw, data;
  try { raw = await response.json(); data = normalize(raw, office, region); }
  catch (cause) { const error = new Error('O arquivo recebido não pôde ser validado.', { cause }); error.status = 422; throw error; }
  return { raw, data };
}
