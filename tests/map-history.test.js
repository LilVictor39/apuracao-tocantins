import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { municipalityResult, mapPaths } from '../dist/map.js';
import { comparison } from '../dist/history.js';

test('mapa oficial associa as 139 áreas do IBGE aos municípios do TSE', () => {
  const cities = JSON.parse(readFileSync(new URL('../dist/to-municipios.json', import.meta.url))).municipalities;
  const geo = JSON.parse(readFileSync(new URL('../dist/to-malha.geojson', import.meta.url)));
  const paths = mapPaths(geo.features);
  assert.equal(cities.length, 139);
  assert.equal(paths.length, 139);
  assert.ok(paths.every(path => path.d.startsWith('M')));
  assert.deepEqual(new Set(paths.map(path => path.ibge)), new Set(cities.map(city => city.ibge)));
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
