import test from 'node:test';
import assert from 'node:assert/strict';
import { tasteMatch, learnedTasteProfile, intakeForServing, weeklyIntake, weekStart } from '../examples/product-logic.mjs';

test('same descriptors match and missing data is not fabricated', () => {
  const taste = { body: 0.3, sweetness: 0.1, acidity: 0.7, tannin: 0.2, colour: 'red', aromas: ['cherry'] };
  assert.equal(tasteMatch(taste, taste).matchPercentage, 100);
  assert.equal(tasteMatch(taste, { colour: 'red' }).matchPercentage, null);
  assert.equal(tasteMatch({}, taste).matchPercentage, null);
});
test('likes update preferences and strongly disliked styles reduce similarity', () => {
  const quiz = { body: 0.2, sweetness: 0.1 }, rich = { body: 0.8, sweetness: 0.1 };
  assert.ok(learnedTasteProfile(quiz, [{ rating: 5, wine: rich }]).body > quiz.body);
  assert.ok(tasteMatch(rich, rich, [{ rating: 1, wine: rich }]).matchPercentage < tasteMatch(rich, rich).matchPercentage);
});
test('Canadian serving counts use ABV and actual volume', () => {
  assert.ok(Math.abs(intakeForServing(150, 13.5).standardDrinks - 1.187683284457478) < 1e-10);
  assert.equal(intakeForServing(150, 0).standardDrinks, 0);
  assert.throws(() => intakeForServing(150, undefined));
  assert.throws(() => intakeForServing(-1, 12));
});
test('weeks use local days and never turn saved bottles into consumption', () => {
  const result = weeklyIntake([
    { kind: 'consumption', consumedAt: '2026-10-12T03:30:00Z', volumeMl: 150, abvPercent: 12 }, // Sunday in Toronto.
    { kind: 'consumption', consumedAt: '2026-10-12T16:00:00Z', volumeMl: 150, abvPercent: 12 },
    { kind: 'consumption', consumedAt: '2026-10-13T16:00:00Z', volumeMl: 150, abvPercent: null },
    { kind: 'saved', consumedAt: '2026-10-14T16:00:00Z', volumeMl: 750, abvPercent: 12 },
  ], { weekOf: '2026-10-12' });
  assert.equal(result.days.length, 7); assert.equal(result.unknownEntries, 1);
  assert.ok(Math.abs(result.knownStandardDrinks - 18 / 17.05) < 1e-10);
  assert.equal(weekStart('2026-10-18'), '2026-10-12');
});
test('calendar weeks survive daylight-saving changes', () => {
  const result = weeklyIntake([{ kind: 'consumption', consumedAt: '2026-11-01T06:30:00Z', volumeMl: 150, abvPercent: 12 }], { weekOf: '2026-11-01' });
  assert.equal(result.days[6].day, '2026-11-01'); assert.ok(result.days[6].standardDrinks > 1);
  assert.throws(() => weekStart('2026-02-30'));
});
