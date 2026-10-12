import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { winePredict, estimateMissing, bottleCalculations } from '../frontend/model-utils.js';
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('React browser predictor agrees with Python on all 178 dataset rows', () => {
  const model = json('../frontend/public/model.json'), expected = json('./fixtures/model-parity.json');
  assert.equal(expected.samples.length, 178);
  expected.samples.forEach((sample, row) => winePredict(model, sample).forEach((probability, i) => assert.ok(Math.abs(probability - expected.probabilities[row][i]) < 1e-10, `row ${row}, class ${i}`)));
});

test('three known values are preserved while estimates match independent Python results', () => {
  const reference = json('../frontend/public/reference.json');
  const values = [13.2, 1.78, null, null, null, null, null, null, null, 4.38, null, null, null];
  const result = estimateMissing(reference, values);
  assert.equal(result.filter(value => value.estimated).length, 10);
  [0, 1, 9].forEach(i => { assert.equal(result[i].value, values[i]); assert.equal(result[i].estimated, false); });
  const indices = [2,3,4,5,6,7,8,10,11,12], expected = [2.48,17.5,100,2.615,2.68,.285,1.445,1.045,3.035,985];
  indices.forEach((i, j) => { assert.ok(Math.abs(result[i].value - expected[j]) < 1e-10); assert.ok(result[i].value >= result[i].min && result[i].value <= result[i].max); });
  assert.throws(() => estimateMissing(reference, Array(13).fill(null)), /at least one/i);
});

test('bottle calculations preserve unknowns and reject invalid sizes and ABV', () => {
  const result = bottleCalculations({ price: '20', size: '750', abv: '13.5' });
  assert.ok(Math.abs(result.pricePer100 - 2.6666666667) < 1e-9); assert.equal(result.alcoholVolume, 101.25);
  assert.deepEqual(bottleCalculations({ price: '', size: '750', abv: '' }), { pricePer100: null, alcoholVolume: null });
  assert.deepEqual(bottleCalculations({ price: '20', size: '0', abv: '13.5' }), { pricePer100: null, alcoholVolume: null });
  assert.equal(bottleCalculations({ price: '20', size: '750', abv: '101' }).alcoholVolume, null);
});
