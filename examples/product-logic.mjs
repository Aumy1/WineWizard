// Shared between React web, React Native mobile, and the recommendation API.
// A match percentage is taste similarity, not a probability of enjoying a bottle.
const TRAITS = { body: 0.25, sweetness: 0.2, acidity: 0.2, tannin: 0.15 };
const unit = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const clamp = x => Math.max(0, Math.min(1, x));
const words = values => [...new Set((values || []).map(v => String(v).trim().toLowerCase()).filter(Boolean))];

export function learnedTasteProfile(quiz, history = []) {
  const liked = history.filter(item => item.rating >= 4 && item.rating <= 5);
  const taste = { ...quiz };
  for (const trait of Object.keys(TRAITS)) {
    let total = unit(quiz[trait]) ? 4 * quiz[trait] : 0;
    let weight = unit(quiz[trait]) ? 4 : 0;
    // Moderate history influence; drinking more never earns a higher score.
    for (const item of liked.slice(-20)) {
      const value = item.wine?.[trait];
      if (!unit(value)) continue;
      const importance = (item.rating - 3) / 2;
      total += value * importance; weight += importance;
    }
    taste[trait] = weight ? total / weight : undefined;
  }
  return taste;
}

function similarity(taste, wine) {
  let earned = 0, compared = 0, desired = 0;
  const reasons = [];
  for (const [trait, weight] of Object.entries(TRAITS)) {
    if (!unit(taste[trait])) continue;
    desired += weight;
    if (!unit(wine[trait])) continue; // Missing descriptors stay unknown.
    const score = 1 - Math.abs(taste[trait] - wine[trait]);
    earned += score * weight; compared += weight;
    reasons.push({ trait, similarity: score });
  }
  if (taste.colour) {
    desired += 0.1;
    if (wine.colour) { compared += 0.1; earned += taste.colour === wine.colour ? 0.1 : 0; }
  }
  const wanted = words(taste.aromas), aromas = words(wine.aromas);
  if (wanted.length) {
    desired += 0.1;
    if (aromas.length) {
      compared += 0.1;
      earned += wanted.filter(v => aromas.includes(v)).length / wanted.length * 0.1;
    }
  }
  return { score: compared ? earned / compared : null, coverage: desired ? compared / desired : 0, reasons };
}

export function tasteMatch(quiz, wine, history = []) {
  const taste = learnedTasteProfile(quiz, history);
  const result = similarity(taste, wine);
  // No percentage when too little of the desired profile can be compared.
  if (result.score === null || result.coverage < 0.6) return {
    matchPercentage: null, descriptorCoverage: Math.round(result.coverage * 100),
    explanation: 'Not enough wine descriptors to calculate a useful match.',
  };
  // Similarity to strongly disliked styles lowers the score slightly.
  const dislikes = history.filter(item => item.rating >= 1 && item.rating <= 2 && item.wine);
  const penalties = dislikes.map(item => similarity(item.wine, wine))
    .filter(item => item.score !== null && item.coverage >= 0.6)
    .map(item => item.score > 0.8 ? (item.score - 0.8) / 0.2 * 0.12 : 0);
  const penalty = penalties.length ? penalties.reduce((a, b) => a + b, 0) / penalties.length : 0;
  return {
    matchPercentage: Math.round(clamp(result.score - penalty) * 100),
    descriptorCoverage: Math.round(result.coverage * 100),
    basis: history.length ? 'Quiz and ratings' : 'Quiz preferences',
    reasons: result.reasons.sort((a, b) => b.similarity - a.similarity).slice(0, 2).map(item => item.trait),
  };
}

// Canada: 17.05 mL pure alcohol per standard drink (CCSA guidance).
export const CANADIAN_STANDARD = Object.freeze({ id: 'CA-2023', pureAlcoholMl: 17.05 });
export function intakeForServing(volumeMl, abvPercent, definition = CANADIAN_STANDARD) {
  if (typeof volumeMl !== 'number' || !Number.isFinite(volumeMl) || volumeMl <= 0) throw Error('Enter a positive serving volume in mL.');
  if (typeof abvPercent !== 'number' || !Number.isFinite(abvPercent) || abvPercent < 0 || abvPercent > 100) throw Error('Confirm ABV between 0 and 100.');
  if (!Number.isFinite(definition.pureAlcoholMl) || definition.pureAlcoholMl <= 0) throw Error('Invalid standard-drink definition.');
  const pureAlcoholMl = volumeMl * abvPercent / 100;
  return { pureAlcoholMl, standardDrinks: pureAlcoholMl / definition.pureAlcoholMl, standardDefinition: definition.id };
}

function localDay(timestamp, timeZone) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw Error('Invalid consumption timestamp.');
  const values = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone, calendar: 'iso8601', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function calendarDate(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('Use an ISO calendar date.');
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw Error('Invalid calendar date.');
  return date;
}
function shift(day, delta) {
  const date = calendarDate(day); date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function weekStart(day) {
  const date = calendarDate(day);
  return shift(day, -((date.getUTCDay() + 6) % 7)); // Monday, using calendar days.
}

export function weeklyIntake(entries, { weekOf, timeZone = 'America/Toronto', definition = CANADIAN_STANDARD }) {
  const start = weekStart(weekOf);
  const days = Array.from({ length: 7 }, (_, index) => ({ day: shift(start, index), standardDrinks: 0, unknownEntries: 0 }));
  const byDay = new Map(days.map(day => [day.day, day]));
  for (const entry of entries) {
    // A saved/liked/scanned bottle is never a consumption event.
    if (entry.kind !== 'consumption') continue;
    const bucket = byDay.get(localDay(entry.consumedAt, timeZone));
    if (!bucket) continue;
    if (entry.volumeMl == null || entry.abvPercent == null) { bucket.unknownEntries++; continue; }
    // Normalize the whole chart to one definition, even after a country change.
    const intake = intakeForServing(entry.volumeMl, entry.abvPercent, definition);
    bucket.standardDrinks += intake.standardDrinks; // Keep precision; round only for display.
  }
  return {
    weekStart: start, timeZone, standardDefinition: definition.id, days,
    knownStandardDrinks: days.reduce((sum, day) => sum + day.standardDrinks, 0),
    unknownEntries: days.reduce((sum, day) => sum + day.unknownEntries, 0),
  };
}
