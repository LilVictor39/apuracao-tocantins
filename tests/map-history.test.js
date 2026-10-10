import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { municipalityResult, mapPaths } from '../dist/map.js';
import { comparison } from '../dist/history.js';
import { IBGE_CODES, regionSummary } from '../dist/brasil.js';
import { STATES } from '../dist/tse.js';

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
