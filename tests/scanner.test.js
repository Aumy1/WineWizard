import test from 'node:test';
import assert from 'node:assert/strict';
import { labelFields, parseLabelText, validateImageFile } from '../frontend/label-parser.js';

test('extracts editable bottle candidates without inventing price or style', () => {
  const result = parseLabelText('Example Estate\nCabernet Sauvignon 2023\nNiagara Peninsula, Ontario, Canada\n13.5% alc/vol\n750 mL');
  assert.deepEqual(result.bottle, {
    name: 'Example Estate', grape: 'Cabernet Sauvignon', region: 'Niagara Peninsula, Ontario, Canada',
    vintage: '2023', type: '', colour: '', abv: '13.5', sweetness: '', price: '', currency: 'CAD', size: '750',
  });
  assert.match(result.warnings.join(' '), /not a verified product match/);
});

test('recognizes decimal commas, alc/vol prefixes and 75 cL units', () => {
  const result = parseLabelText('Domaine Test\nVin Blanc\nMillésime: 2021\nAlc/Vol: 12,5%\n75 cl');
  assert.equal(result.bottle.abv, '12.5');
  assert.equal(result.bottle.size, '750');
  assert.equal(result.bottle.vintage, '2021');
  assert.equal(result.bottle.colour, 'White');
});

test('recognizes litres and repeated identical measurements', () => {
  const result = parseLabelText('1.5 litres\n1500 ml\nABV 14%\n14% vol');
  assert.equal(result.bottle.size, '1500');
  assert.equal(result.bottle.abv, '14');
  assert.doesNotMatch(result.warnings.join(' '), /Conflicting|Multiple container/);
});

test('founding, bottling, copyright and date years do not become a vintage', () => {
  const result = parseLabelText('Founded 1968\nEstablished 1974\nSince 1980\nBottled 2024\nCopyright 2025\nPrinted 12/10/2023\n1500 Road\nChardonnay');
  assert.equal(result.bottle.vintage, '');
  assert.equal(result.bottle.grape, 'Chardonnay');
});

test('an explicit vintage and a standalone year are accepted but future years stay unknown', () => {
  assert.equal(parseLabelText('Vintage: 1899', { currentYear: 2026 }).bottle.vintage, '1899');
  assert.equal(parseLabelText('2022', { currentYear: 2026 }).bottle.vintage, '2022');
  assert.equal(parseLabelText('Vintage 2099', { currentYear: 2026 }).bottle.vintage, '');
});

test('multiple vintage, alcohol or bottle size candidates require manual correction', () => {
  const result = parseLabelText('Vintage 2020\n2021\n12% ABV\n13% ABV\n750 ml\n1 L');
  assert.equal(result.bottle.vintage, '');
  assert.equal(result.bottle.abv, '');
  assert.equal(result.bottle.size, '');
  assert.equal(result.warnings.filter(value => /Multiple|Conflicting/.test(value)).length, 3);
});

test('grape blend percentages and serving volumes do not become ABV or bottle volume', () => {
  const result = parseLabelText('85% Merlot\n15% Cabernet Sauvignon\nPer 100 ml\nServing size 150 mL\n750 mL');
  assert.equal(result.bottle.abv, '');
  assert.equal(result.bottle.size, '750');
  assert.equal(result.bottle.grape, 'Cabernet Sauvignon / Merlot');
});

test('colour and sweetness are only read when stated, not inferred from grapes', () => {
  const unknown = parseLabelText('Riesling\n13% ABV');
  assert.equal(unknown.bottle.colour, '');
  assert.equal(unknown.bottle.sweetness, '');
  assert.equal(parseLabelText('Off-dry white wine').bottle.sweetness, 'Off-dry');
  assert.equal(parseLabelText('Sparkling Rosé').bottle.type, 'Sparkling');
  assert.equal(parseLabelText('Sparkling Rosé').bottle.colour, 'Rosé');
});

test('nonsense, null and malformed OCR return unknown fields rather than fabricated values', () => {
  for (const input of [null, '', '\u0000\u0001', '12,S% ALV\n75c1\nnot-readable']) {
    const result = parseLabelText(input);
    assert.equal(result.bottle.abv, '');
    assert.equal(result.bottle.size, '');
    assert.equal(result.bottle.vintage, '');
    assert.equal(result.bottle.price, '');
    assert.deepEqual(Object.keys(result.bottle), labelFields);
  }
});

test('negative and implausible numeric values are not extracted as valid measurements', () => {
  const result = parseLabelText('-12.5% alc/vol\nABV -13%\n120% ABV\n-750 ml\n0 ml');
  assert.equal(result.bottle.abv, '');
  assert.equal(result.bottle.size, '');
});

test('malformed decimals and scientific notation are not silently truncated into candidates', () => {
  for (const input of ['ABV 1e309', 'ABV 12,5.3%', '1e50 ml', 'ABV 13,S%']) {
    const result = parseLabelText(input);
    assert.equal(result.bottle.abv, '');
    assert.equal(result.bottle.size, '');
  }
});

test('user markup remains a plain string and is bounded for safe React rendering', () => {
  const input = '<img src=x onerror="globalThis.compromised=true">\nCabernet Sauvignon\n13.5% ABV';
  const result = parseLabelText(input);
  assert.equal(globalThis.compromised, undefined);
  assert.equal(result.bottle.name, input.split('\n')[0]);
  assert.equal(result.bottle.grape, 'Cabernet Sauvignon');
  assert.equal(parseLabelText('x'.repeat(50000)).bottle.name.length, 120);
});

test('photo validation rejects unsupported, empty and oversized files with usable errors', () => {
  assert.equal(validateImageFile({ name: 'photo.jpg', type: 'image/jpeg', size: 1000 }), '');
  assert.equal(validateImageFile({ name: 'photo.PNG', type: '', size: 1000 }), '');
  assert.match(validateImageFile({ name: 'photo.heic', type: 'image/heic', size: 1000 }), /JPEG, PNG or WebP/);
  assert.match(validateImageFile({ name: 'photo.svg', type: 'image/svg+xml', size: 1000 }), /JPEG, PNG or WebP/);
  assert.match(validateImageFile({ name: 'photo.png', type: 'image/png', size: 11 * 1024 * 1024 }), /10 MB/);
  assert.match(validateImageFile({ name: 'photo.png', type: 'image/png', size: 0 }), /not empty/);
  assert.match(validateImageFile(null), /Choose a label photo/);
});
