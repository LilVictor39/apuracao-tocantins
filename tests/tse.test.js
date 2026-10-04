import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICES, resultUrl, normalize, number, retryDelay, fetchResult } from '../dist/tse.js';

// Dados exclusivamente sintéticos, fora dos arquivos publicados do site.
function fixture(office = OFFICES[0], region = office.region) {
  return {
    ele: String(office.election), t: '1', f: 'o', sup: 'n', tpabr: region === 'br' ? 'br' : 'uf', cdabr: region,
    dg: '04/10/2026', hg: '18:01:00', dt: '04/10/2026', ht: '18:00:00', idg: '100', and: 'p', tf: 'n', dv: 's',
    carg: [{ cd: String(office.code), nv: String(office.seats), agr: [{ par: [{ sg: 'TESTE', cand: [
      { n: '90', sqcand: '1', nmu: 'Teste A', vap: '750', pvap: '75,00', seq: '2', e: 's', st: '', dvt: 'Válido' },
      { n: '91', sqcand: '2', nmu: 'Teste B', vap: '250', pvap: '25,00', seq: '1', e: 'n', st: '', dvt: 'Anulado sub judice' },
    ] }] }] }],
    s: { pst: '12,34', st: '1234', ts: '10000' }, v: { vv: '1000', vb: '12', tvn: '24' },
  };
}
test('endereços oficiais dos três cargos e recorte estadual', () => {
  assert.equal(resultUrl(OFFICES[0]), 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json');
  assert.ok(resultUrl(OFFICES[0], 'to').endsWith('/to/to-c0001-e006257-u.json'));
  assert.ok(resultUrl(OFFICES[1]).endsWith('/to/to-c0003-e006259-u.json'));
  assert.ok(resultUrl(OFFICES[2]).endsWith('/to/to-c0005-e006259-u.json'));
  assert.throws(() => resultUrl(OFFICES[1], 'br'));
});
test('EA20, vírgula decimal, candidatos e totais', () => {
  const data = normalize(fixture(), OFFICES[0]);
  assert.equal(data.candidates.length, 2);
  assert.equal(data.candidates[0].votes, 750);
  assert.equal(data.candidates[0].percent, 75);
  assert.equal(data.candidates[1].destination, 'Anulado sub judice');
  assert.equal(data.progress, 12.34);
  assert.equal(data.nullVotes, 24);
  assert.equal(data.updated, '04/10/2026 às 18:00:00');
});
test('recusa simulados, outra eleição, turno, cargo ou abrangência', () => {
  for (const override of [{ f: 's' }, { t: '2' }, { sup: 's' }, { ele: '544' }, { cdabr: 'to' }, { tpabr: 'mu' }, { and: 'x' }, { carg: [] }]) {
    assert.throws(() => normalize({ ...fixture(), ...override }, OFFICES[0]));
  }
});
test('e=s não significa eleito; preserva a indicação de segundo turno', () => {
  const raw = fixture();
  assert.equal(normalize(raw, OFFICES[0]).candidates[0].status, '');
  raw.carg[0].agr[0].par[0].cand[0].st = '2º turno';
  assert.equal(normalize(raw, OFFICES[0]).candidates[0].status, '2º turno');
});
test('recorte estadual de presidente não declara resultado nacional', () => {
  const raw = fixture(OFFICES[0], 'to');
  raw.carg[0].agr[0].par[0].cand[0].st = 'Eleito';
  assert.equal(normalize(raw, OFFICES[0], 'to').candidates[0].status, '');
});
test('não mostra zeros como resultado quando a divulgação está bloqueada', () => {
  const data = normalize({ ...fixture(), dv: 'n' }, OFFICES[0]);
  assert.equal(data.disclosed, false);
  assert.equal(data.candidates[0].votes, null);
  assert.equal(data.valid, null);
  assert.equal(data.progress, null);
  assert.equal(normalize({ ...fixture(), and: 'n' }, OFFICES[0]).disclosed, false);
  assert.equal(normalize({ ...fixture(OFFICES[1]), dv: 'n' }, OFFICES[1]).disclosed, true);
});
test('dado ausente é diferente de zero; não calcula percentual ausente', () => {
  for (const value of [undefined, null, '', 'texto', -1, Infinity, true]) assert.equal(number(value), null);
  assert.equal(number('0'), 0);
  const raw = fixture(); delete raw.v.vv;
  raw.carg[0].agr[0].par[0].cand[0].pvap = '200';
  const data = normalize(raw, OFFICES[0]);
  assert.equal(data.valid, null);
  assert.equal(data.candidates[0].percent, null);
});
test('Senado tem duas vagas; respeita totalização sem atribuição de eleitos', () => {
  const raw = fixture(OFFICES[2]); raw.esae = 's'; raw.mnae = ['Motivo informado pelo TSE'];
  raw.carg[0].agr[0].par[0].cand[0].st = 'Eleito';
  const data = normalize(raw, OFFICES[2]);
  assert.equal(data.seats, 2);
  assert.equal(data.noWinner, true);
  assert.equal(data.candidates[0].status, '');
  assert.equal(data.reasons.length, 1);
});
test('bloqueios e arquivos ausentes reduzem a frequência de consultas', () => {
  assert.equal(retryDelay(403, 1), 600_000);
  assert.equal(retryDelay(429, 1), 600_000);
  assert.equal(retryDelay(404, 1), 300_000);
  assert.ok(retryDelay(500, 2) > retryDelay(500, 1));
  assert.equal(retryDelay(500, 100), 300_000);
});
test('falhas HTTP e formato inválido não se tornam resultados', async () => {
  await assert.rejects(fetchResult(OFFICES[0], 'br', async () => new Response('', { status: 404 })), error => error.status === 404);
  await assert.rejects(fetchResult(OFFICES[0], 'br', async () => new Response('<html>Falha</html>')), error => error.status === 422);
  await assert.rejects(fetchResult(OFFICES[0], 'br', async () => Response.json({ ...fixture(), f: 's' })), error => error.status === 422);
  const result = await fetchResult(OFFICES[0], 'br', async () => Response.json(fixture()));
  assert.equal(result.data.candidates[0].votes, 750);
});
