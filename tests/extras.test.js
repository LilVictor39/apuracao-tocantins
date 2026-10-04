import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICES } from '../dist/tse.js';
import { stampToMs, margin, majority, newMarks, topSignature, addPoint, chartSvg, observe } from '../dist/extras.js';

// Dados exclusivamente sintéticos.
const cand = (id, name, votes, percent) => ({ id, name, votes, percent });
const data = (candidates, extra = {}) => ({ disclosed: true, seats: 1, candidates, progress: 40, completed: false, updated: '04/10/2026 às 18:00:00', ...extra });

test('margem 1º x 2º e 2º x 3º no Senado', () => {
  const d = data([cand('a', 'A', 600, 60), cand('b', 'B', 300, 30), cand('c', 'C', 100, 10)]);
  const one = margin(d, OFFICES[1]);
  assert.equal(one.votes, 300); assert.equal(one.pp, 30); assert.equal(one.inside.name, 'A');
  const two = margin({ ...d, seats: 2 }, OFFICES[2]);
  assert.equal(two.votes, 200); assert.equal(two.inside.name, 'B'); assert.equal(two.outside.name, 'C');
  assert.equal(margin(data([cand('a', 'A', 1, 100)]), OFFICES[1]), null);
  assert.equal(margin({ ...d, disclosed: false }, OFFICES[1]), null);
});

test('maioria absoluta: só uma vaga, e presidente só no recorte nacional', () => {
  const d = data([cand('a', 'A', 475, 47.5), cand('b', 'B', 300, 30)]);
  const m = majority(d, OFFICES[1], 'to');
  assert.equal(m.reached, false); assert.equal(m.missing, 2.5);
  assert.equal(majority(data([cand('a', 'A', 600, 60)]), OFFICES[1], 'to').reached, true);
  assert.equal(majority(d, OFFICES[0], 'to'), null);
  assert.ok(majority(d, OFFICES[0], 'br'));
  assert.equal(majority({ ...d, seats: 2 }, OFFICES[2], 'to'), null);
});
test('deputado estadual não usa margem da última vaga nem alerta de troca entre mais votados', () => {
  const office = OFFICES[3];
  const sample = data([cand('a', 'A', 10, 55), cand('b', 'B', 8, 45)], { seats: 24 });
  assert.equal(margin(sample, office), null);
  assert.equal(majority(sample, office, 'to'), null);
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  try {
    const state = { key: 'deputado-estadual:to', office, area: 'to', data: sample };
    assert.deepEqual(observe(state), { leadChanged: false, completed: false });
    state.data = data([cand('b', 'B', 12, 55), cand('a', 'A', 10, 45)], { seats: 24, progress: 100, completed: true });
    assert.deepEqual(observe(state), { leadChanged: false, completed: true });
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test('marcos de 50%, 90% e 100% não repetem', () => {
  assert.deepEqual(newMarks([], 12, false), { all: [], fresh: [] });
  assert.deepEqual(newMarks([], 55, false).fresh, [50]);
  assert.deepEqual(newMarks([50], 91, false).fresh, [90]);
  assert.deepEqual(newMarks([50, 90], 91, false).fresh, []);
  assert.deepEqual(newMarks([50, 90], 99.9, true).fresh, [100]);
});

test('assinatura do topo detecta troca de liderança e ignora votos ausentes', () => {
  const a = data([cand('a', 'A', 10, 55), cand('b', 'B', 8, 45)]);
  const b = data([cand('b', 'B', 12, 55), cand('a', 'A', 10, 45)]);
  assert.notEqual(topSignature(a), topSignature(b));
  assert.equal(topSignature(data([cand('a', 'A', null, null)])), '');
  const senate = data([cand('a', 'A', 3, 1), cand('b', 'B', 2, 1), cand('c', 'C', 1, 1)], { seats: 2 });
  assert.equal(topSignature(senate), 'a|b');
});

test('gatinhos recebem troca de líder e 100% uma vez, mesmo sem alertas', () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const state = { key: 'cats:to', office: OFFICES[1], area: 'to', data: data([cand('a', 'A', 10, 55), cand('b', 'B', 8, 45)]) };
    assert.deepEqual(observe(state), { leadChanged: false, completed: false });
    state.data = data([cand('b', 'B', 12, 55), cand('a', 'A', 10, 45)], { updated: '04/10/2026 às 18:05:00' });
    assert.deepEqual(observe(state), { leadChanged: true, completed: false });
    assert.deepEqual(observe(state), { leadChanged: false, completed: false });
    state.data = data([cand('b', 'B', 20, 60), cand('a', 'A', 13, 40)], { progress: 100, completed: true, updated: '04/10/2026 às 18:10:00' });
    assert.deepEqual(observe(state), { leadChanged: false, completed: true });
    assert.deepEqual(observe(state), { leadChanged: false, completed: false });
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});

test('histórico: não duplica totalização, limita tamanho e converte horário de Brasília', () => {
  assert.equal(stampToMs('04/10/2026 às 18:00:00'), Date.parse('2026-10-04T21:00:00Z'));
  let h = addPoint(null, data([cand('a', 'A', 1, 50), cand('b', 'B', 1, 50)]));
  h = addPoint(h, data([cand('a', 'A', 1, 51), cand('b', 'B', 1, 49)]));
  assert.equal(h.points.length, 1);
  h = addPoint(h, data([cand('a', 'A', 1, 52), cand('b', 'B', 1, 48)], { updated: '04/10/2026 às 18:05:00' }));
  assert.equal(h.points.length, 2); assert.equal(h.names.a, 'A');
  for (let i = 0; i < 300; i += 1) h = addPoint(h, data([cand('a', 'A', 1, 50)], { updated: '05/10/2026 às 00:00:' + String(i).padStart(2, '0') }));
  assert.ok(h.points.length <= 240);
});

test('gráfico: exige dois pontos e ordena pelo último percentual', () => {
  assert.equal(chartSvg({ points: [{ stamp: 'x', t: 1, v: { a: 1 } }], names: {} }), '');
  let h = addPoint(null, data([cand('a', 'A', 1, 40), cand('b', 'B', 1, 60)]));
  h = addPoint(h, data([cand('a', 'A', 1, 45), cand('b', 'B', 1, 55)], { updated: '04/10/2026 às 18:10:00' }));
  const chart = chartSvg(h);
  assert.deepEqual(chart.ids, ['b', 'a']);
  assert.match(chart.svg, /<polyline/); assert.match(chart.svg, /18:10/);
});
