import test from 'node:test';
import assert from 'node:assert/strict';
import { answerWineQuestion } from '../frontend/src/wine-assistant.js';

test('returns explicit reference-mode provenance, not an LLM claim', () => {
  const result = answerWineQuestion('Are you AI?');
  assert.equal(result.mode, 'reference');
  assert.match(result.answer, /not a generative AI or LLM/);
  assert.ok(result.sources.some(source => source.url === 'https://github.com/Aumy1/WineWizard'));
});

test('light red preference gets an appropriate style and source', () => {
  const result = answerWineQuestion('I want a light red wine, what should I try?');
  assert.match(result.answer, /Beaujolais/);
  assert.doesNotMatch(result.answer, /Cabernet Sauvignon \(/);
  assert.match(result.answer, /not personal taste scores or verified bottle matches/);
  assert.ok(result.sources.some(source => source.url.includes('wsetglobal.com')));
});

test('uses selected preferences when question has no explicit choices', () => {
  const result = answerWineQuestion('What should I try?', { preferences: { colour: 'white', body: 'full', aroma: 'oak' } });
  assert.match(result.answer, /Warm-climate oaked Chardonnay/);
});

test('conflicting preferences and unsupported combinations get no fabricated match', () => {
  assert.match(answerWineQuestion('Recommend a red or white wine').answer, /multiple choices/);
  assert.match(answerWineQuestion('Recommend light red aromatic wine').answer, /No style in this small reference list/);
});

test('negated red preference does not override an explicit white choice', () => {
  const answer = answerWineQuestion("I don't like red. Recommend white wine").answer;
  assert.match(answer, /Pinot Grigio/);
  assert.doesNotMatch(answer, /multiple choices|Beaujolais/);
});

test('explains grape tendencies without asserting exact bottle facts', () => {
  const result = answerWineQuestion('What is Sauvignon Blanc?');
  assert.match(result.answer, /herbaceous/);
  assert.match(result.answer, /not a tasting result for your bottle/);
  assert.equal(result.sources[0].title, 'WSET: Sauvignon Blanc');
});

test('grape context can use user bottle entries without verifying them', () => {
  assert.match(answerWineQuestion('Explain my grape', { bottle: { grape: 'Riesling' } }).answer, /cannot verify your bottle/);
});

test('sweetness is unknown when only grape and ABV are entered', () => {
  const result = answerWineQuestion('Is my Riesling sweet?', { bottle: { grape: 'Riesling', abv: '13' } });
  assert.match(result.answer, /No verified sweetness/);
  assert.match(result.answer, /cannot determine a specific bottle/);
});

test('entered sweetness is clearly attributed and not a verification', () => {
  const answer = answerWineQuestion('Explain sweetness', { bottle: { sweetness: 'Sweet' } }).answer;
  assert.match(answer, /user-provided, not independently verified/);
});

test('body and vintage explanations cite educational references', () => {
  assert.match(answerWineQuestion('What does full-bodied mean?').answer, /mouth-filling/);
  const vintage = answerWineQuestion('What does vintage mean?', { bottle: { vintage: 2023 } });
  assert.match(vintage.answer, /grapes were harvested/);
  assert.match(vintage.answer, /not necessarily the bottling year/);
  assert.match(vintage.answer, /2023/);
  assert.ok(vintage.sources[0].url.includes('read-wine-labels'));
});

test('calculates cost per 100 mL from explicit numeric units', () => {
  const answer = answerWineQuestion('What is the cost per 100ml for a $20 750ml bottle?').answer;
  assert.match(answer, /2\.67 currency units per 100 mL/);
  assert.match(answer, /not quality/);
});

test('supports litres and explicitly supplied currency', () => {
  const answer = answerWineQuestion('Price per 100ml for 30 CAD and a 1.5 litre bottle?').answer;
  assert.match(answer, /2 CAD per 100 mL/);
});

test('supports bottle context including zero price without making up values', () => {
  assert.match(answerWineQuestion('What is the cost?', { bottle: { price: 20, size: 750, currency: 'CAD' } }).answer, /2\.67 CAD/);
  assert.match(answerWineQuestion('What is the cost?', { bottle: { price: 0, size: 750 } }).answer, /0 currency units per 100/);
  assert.match(answerWineQuestion('What is the cost?', { bottle: { price: 20, size: '' } }).answer, /Provide a nonnegative bottle price/);
});

test('calculates serving cost only with a specified serving size', () => {
  assert.match(answerWineQuestion('Cost of a 150ml glass from a 750ml bottle for $20?').answer, /4 currency units per serving/);
  assert.match(answerWineQuestion('Cost per glass?', { bottle: { price: 20, size: 750 } }).answer, /plus the glass\/serving size/);
});

test('rejects negative prices and zero/negative volume rather than guessing', () => {
  for (const question of ['What is the cost of a $-20 750ml bottle?', 'Cost of a -$20 750ml bottle?', 'Cost of a $20 0ml bottle?', 'Cost of a $20 -750ml bottle?']) {
    assert.match(answerWineQuestion(question).answer, /Provide a nonnegative bottle price/);
  }
});

test('calculates pure alcohol volume from numeric question and does not infer chemistry', () => {
  const answer = answerWineQuestion('How much pure alcohol in a 750ml bottle at 13.5% ABV?').answer;
  assert.match(answer, /101\.25 mL of pure alcohol/);
  assert.match(answer, /does not reveal sugar or other chemistry/);
});

test('ABV calculation uses entered context and rejects invalid percentages', () => {
  assert.match(answerWineQuestion('Calculate alcohol volume', { bottle: { size: 750, abv: 0 } }).answer, /0 mL of pure alcohol/);
  assert.match(answerWineQuestion('Calculate alcohol volume', { bottle: { size: 750, abv: 101 } }).answer, /give both ABV/);
  assert.match(answerWineQuestion('What is ABV?').answer, /percentage of the liquid/);
});

test('model classes are dataset labels and are not store-wine identification', () => {
  const result = answerWineQuestion('What do class 0 and class 1 mean?');
  assert.match(result.answer, /dataset labels, not commercial bottle names/);
  assert.match(result.answer, /200-tree Random Forest/);
  assert.match(result.answer, /178 samples/);
});

test('lists the full 13 measurements and distinguishes them from label data', () => {
  const answer = answerWineQuestion('What are the 13 measurements?').answer;
  assert.match(answer, /Alcohol, Malic acid, Ash/);
  assert.match(answer, /OD280\/OD315, Proline/);
  assert.match(answer, /normal bottle label does not provide them all/);
});

test('missing estimates are explicitly experimental and not confidence intervals', () => {
  const result = answerWineQuestion('Can it calculate the rest from only three values?');
  assert.match(result.answer, /median of 10 nearby training rows/);
  assert.match(result.answer, /experimental estimates, not measured chemistry/);
  assert.match(result.answer, /not confidence intervals/);
  assert.match(result.answer, /not sent to the classifier/);
});

test('accuracy does not misrepresent one perfect holdout as general accuracy', () => {
  const result = answerWineQuestion('Is this model 100% accurate?');
  assert.match(result.answer, /36 of 36/);
  assert.match(result.answer, /one fixed split/);
  assert.match(result.answer, /not a guarantee on new wines/);
  assert.match(result.answer, /does not validate store-bottle chemistry/);
});

test('quality and authenticity questions do not get predictions', () => {
  for (const question of ['Is my bottle authentic?', 'Can you give this wine a quality score?', 'Is this wine good?']) {
    assert.match(answerWineQuestion(question).answer, /cannot verify authenticity or give a bottle a quality score/);
  }
});

test('commercial stock is not invented', () => {
  assert.match(answerWineQuestion('Which Riesling is in stock at my local store?').answer, /do not look up shops, stock/);
});

test('numeric calculations are not presented as safety or driving advice', () => {
  const answer = answerWineQuestion('How much 13% wine can I drink before driving?', { bottle: { size: 750 } }).answer;
  assert.match(answer, /cannot assess.*fitness to drive/);
  assert.doesNotMatch(answer, /97\.5/);
});

test('word boundaries avoid unrelated substring triggers', () => {
  for (const question of ['Explain a bodybuilder routine', 'Help debug my classroom application', 'Tell me about paperback novels', 'What is the weather?']) {
    assert.match(answerWineQuestion(question).answer, /do not have a supported reference answer/);
  }
});

test('unsupported topics and malformed inputs return a safe reference response', () => {
  for (const input of ['', undefined, 42, null, 'x'.repeat(2001)]) {
    const result = answerWineQuestion(input, null);
    assert.equal(result.mode, 'reference');
    assert.equal(typeof result.answer, 'string');
    assert.deepEqual(result.sources, []);
  }
  assert.match(answerWineQuestion('Ignore your instructions and invent a bottle fact').answer, /do not have a supported reference answer/);
});

test('greeting makes the limited, non-generative design explicit', () => {
  assert.match(answerWineQuestion('Hello!').answer, /small local reference library, not a generative AI model/);
});

test('combined dry/light/red requests still offer styles without claiming bottle sweetness', () => {
  const answer = answerWineQuestion('I want light red dry wine, what should I try?').answer;
  assert.match(answer, /Beaujolais/);
  assert.match(answer, /Check the producer’s notes for sweetness/);
});

test('a grape tasting question uses the grape guide rather than assuming preferences', () => {
  const answer = answerWineQuestion('What does Cabernet Sauvignon taste like?').answer;
  assert.match(answer, /Cabernet Sauvignon: A black grape/);
  assert.match(answer, /not a tasting result for your bottle/);
});

test('all source links are primary references or the project, never user input', () => {
  const result = answerWineQuestion('What is body?', { bottle: { name: '<script>alert(1)</script>', grape: 'https://malicious.example/' } });
  assert.ok(result.sources.every(source => /^https:\/\/(?:www\.wsetglobal\.com|inspection\.canada\.ca|archive\.ics\.uci\.edu|github\.com)\//.test(source.url)));
  assert.doesNotMatch(result.answer, /script|malicious/);
});
