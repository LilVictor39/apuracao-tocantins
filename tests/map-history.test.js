import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { municipalityResult, mapPaths } from '../dist/map.js';
import { comparison } from '../dist/history.js';
import { IBGE_CODES, initBrazil, regionSummary } from '../dist/brasil.js';
import { OFFICES, SECOND_ROUND_OFFICES, STATES } from '../dist/tse.js';

test('mapa oficial associa as 139 áreas do IBGE aos municípios do TSE', () => {
  const cities = JSON.parse(readFileSync(new URL('../dist/to-municipios.json', import.meta.url))).municipalities;
  const geo = JSON.parse(readFileSync(new URL('../dist/to-malha.geojson', import.meta.url)));
  const paths = mapPaths(geo.features);
  assert.equal(cities.length, 139);
  assert.equal(paths.length, 139);
  assert.ok(paths.every(path => path.d.startsWith('M')));
  assert.deepEqual(new Set(paths.map(path => path.ibge)), new Set(cities.map(city => city.ibge)));
});

test('mapa nacional contém as 27 unidades da federação, incluindo Tocantins', () => {
  const geo = JSON.parse(readFileSync(new URL('../dist/br-malha.geojson', import.meta.url)));
  const paths = mapPaths(geo.features, 520, 540);
  assert.equal(geo.type, 'FeatureCollection');
  assert.equal(paths.length, 27);
  assert.equal(new Set(paths.map(path => path.ibge)).size, 27);
  assert.ok(paths.some(path => path.ibge === '17'));
  assert.deepEqual(new Set(paths.map(path => path.ibge)), new Set(Object.values(IBGE_CODES)));
  assert.deepEqual(new Set(Object.keys(IBGE_CODES)), new Set(STATES.map(([code]) => code)));
  assert.ok(paths.every(path => path.d.startsWith('M')));
});

test('mapa só nomeia líder com votos divulgados e trata empate', () => {
  const a = { id: 'a', name: 'A', votes: 12, percent: 60 }, b = { id: 'b', name: 'B', votes: 8, percent: 40 };
  assert.equal(municipalityResult({ disclosed: false, candidates: [a, b] }), null);
  assert.equal(municipalityResult({ disclosed: true, candidates: [{ ...a, votes: 0 }, { ...b, votes: 0 }] }), null);
  assert.deepEqual(municipalityResult({ disclosed: true, candidates: [a, { ...b, votes: 12 }] }), { tie: true });
  assert.equal(municipalityResult({ disclosed: true, candidates: [a, b] }).id, 'a');
});

test('comparativo usa só Presidente no Tocantins e não inventa parcial', () => {
  assert.equal(comparison(null).oldMargin, 55109);
  assert.equal(comparison({ disclosed: false }).current, null);
  const current = comparison({ disclosed: true, candidates: [{ votes: 100 }, { votes: 90 }] });
  assert.equal(current.currentMargin, 10);
});

test('resumo estadual não inventa líder sem votos e sinaliza empate ou consulta anterior', () => {
  assert.equal(regionSummary(null).hasVotes, false);
  const base = { disclosed: true, progress: 50, candidates: [{ name: 'A', votes: 60, percent: 60 }, { name: 'B', votes: 40, percent: 40 }] };
  assert.equal(regionSummary({ data: { ...base, disclosed: false } }).hasVotes, false);
  assert.equal(regionSummary({ data: base }).leader, 'A');
  assert.equal(regionSummary({ data: base, cached: true }).stale, true);
  assert.equal(regionSummary({ data: { ...base, candidates: [{ name: 'A', votes: 50 }, { name: 'B', votes: 50 }] } }).tie, true);
});

test('mapa e lista do Brasil acompanham o turno selecionado', () => {
  const ids = ['brasil-states', 'tocantins-spotlight', 'states-grid', 'states-note', 'states-refresh', 'municipal-map', 'br-map-svg', 'br-map-list', 'br-map-detail', 'br-map-legend', 'br-map-note', 'br-map-refresh', 'states-description', 'br-map-description'];
  const elements = Object.fromEntries(ids.map(id => [id, { open: false, innerHTML: '', textContent: '', addEventListener() {} }]));
  const originalDocument = globalThis.document;
  const originalSetInterval = globalThis.setInterval;
  globalThis.document = { getElementById: id => elements[id] };
  globalThis.setInterval = () => 0;
  let round = 2;
  const queried = [];
  try {
    const brazil = initBrazil((office, area) => {
      queried.push([office.election, area]);
      const name = office.turn === 2 ? 'Candidato do segundo turno' : 'Candidato do primeiro turno';
      return { data: { disclosed: true, candidates: [{ id: String(office.election), name, votes: 100, percent: 60 }] } };
    }, () => {}, () => round);
    assert.match(elements['tocantins-spotlight'].innerHTML, /Resultado estadual do 2º turno/);
    assert.match(elements['br-map-list'].innerHTML, /Candidato do segundo turno/);
    round = 1;
    brazil.setRound();
    assert.match(elements['tocantins-spotlight'].innerHTML, /Resultado estadual do 1º turno/);
    assert.doesNotMatch(elements['tocantins-spotlight'].innerHTML, /2º turno/);
    assert.match(elements['states-description'].textContent, /1º turno/);
    assert.match(elements['br-map-description'].textContent, /1º turno/);
    assert.match(elements['br-map-list'].innerHTML, /Candidato do primeiro turno/);
    assert.doesNotMatch(elements['br-map-list'].innerHTML, /Candidato do segundo turno/);
    assert.ok(queried.some(([election, area]) => election === SECOND_ROUND_OFFICES[0].election && area === 'to'));
    assert.ok(queried.some(([election, area]) => election === OFFICES[0].election && area === 'to'));
  } finally {
    globalThis.document = originalDocument;
    globalThis.setInterval = originalSetInterval;
  }
});
