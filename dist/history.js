// Primeiro turno de 2022, Presidente no Tocantins. Votos e percentuais
// conferidos na tabela histórica publicada no Senado Federal; o conjunto
// original de resultados está no portal de Dados Abertos do TSE.
export const PRESIDENT_TO_2022 = {
  candidates: [
    { name: 'Lula', party: 'PT', votes: 434303, percent: 50.40 },
    { name: 'Jair Bolsonaro', party: 'PL', votes: 379194, percent: 44.00 },
  ],
  source: 'https://dadosabertos.tse.jus.br/dataset/resultados-2022',
};

const nf = new Intl.NumberFormat('pt-BR');
const pf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function comparison(data) {
  const oldMargin = PRESIDENT_TO_2022.candidates[0].votes - PRESIDENT_TO_2022.candidates[1].votes;
  const current = data?.disclosed && data.candidates?.length >= 2 && data.candidates[0].votes != null && data.candidates[1].votes != null && data.candidates[0].votes > 0
    ? data.candidates.slice(0, 2) : null;
  return { oldMargin, current, currentMargin: current ? current[0].votes - current[1].votes : null };
}

export function renderHistory(data, cached = false) {
  const host = document.getElementById('history-content');
  if (!host) return;
  const { oldMargin, current, currentMargin } = comparison(data);
  const old = PRESIDENT_TO_2022.candidates;
  const rows = candidates => candidates.map((candidate, i) => `<div class="history-row"><span>${i + 1}º ${esc(candidate.name)}${candidate.party ? ' · ' + esc(candidate.party) : ''}</span><strong>${nf.format(candidate.votes)} votos</strong><small>${candidate.percent == null ? '' : pf.format(candidate.percent) + '%'}</small></div>`).join('');
  host.innerHTML = `<div class="history-columns"><article><h3>2022 · resultado final</h3>${rows(old)}<p>Diferença entre 1º e 2º: <b>${nf.format(oldMargin)} votos</b>.</p></article><article><h3>2026 · ${current ? cached ? 'última consulta' : data.completed ? 'totalização final' : 'parcial' : 'aguardando votos'}</h3>${current ? rows(current) + `<p>Diferença entre 1º e 2º: <b>${nf.format(currentMargin)} votos</b>.</p>` : '<p>O comparativo atual aparece quando o TSE divulgar votos para Presidente no Tocantins.</p>'}</article></div><p class="history-note">Mesmo cargo, mesmo recorte estadual e 1º turno. As candidaturas podem mudar entre eleições; a parcial de 2026 ainda pode mudar. Percentuais são os publicados pelo TSE.</p>`;
}
