import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnlineAssistant, publicBottleContext, parseModelResponse } from '../backend/ai-assistant.js';

const payload = ({ searched = true, citations = true } = {}) => ({ status: 'completed', output: [
  ...(searched ? [{ type: 'web_search_call', status: 'completed' }] : []),
  { type: 'message', content: [{ type: 'output_text', text: 'A checked explanation. Source.', annotations: citations ? [{ type: 'url_citation', start_index: 23, end_index: 30, url: 'https://www.inao.gouv.fr/aop-appellation-origine-protegee', title: 'INAO' }] : [] }] },
] });

test('online assistant is disabled without both server key and model', () => {
  assert.equal(createOnlineAssistant(), null);
  assert.equal(createOnlineAssistant({ apiKey: 'test-server-key' }), null);
});
test('bottle context excludes health history, account details and arbitrary fields', () => {
  const result = publicBottleContext({ bottle: { name: 'Example', notes: 'Private', email: 'secret@example.test', abv: 12 }, preferences: { colour: 'red', email: 'private' }, intake: [{ private: true }] });
  assert.deepEqual(result, { bottle: { name: 'Example', abv: '12' }, preferences: { colour: 'red' } });
});
test('law questions force live web search, use persona and keep secrets in the server header', async () => {
  let submitted;
  const assistant = createOnlineAssistant({ apiKey: 'test-server-key', model: 'test-compatible-model', request: async (url, options) => { submitted = { url, options, body: JSON.parse(options.body) }; return { ok: true, json: async () => payload() }; } });
  const response = await assistant([{ role: 'user', content: 'What grapes are legally allowed in Bordeaux AOC?' }], {});
  assert.equal(submitted.body.tool_choice, 'required'); assert.equal(submitted.body.tools[0].type, 'web_search'); assert.equal(submitted.body.tools[0].external_web_access, true);
  assert.match(submitted.body.instructions, /approachable/i); assert.match(submitted.body.instructions, /real-time store inventory/i);
  assert.equal(submitted.body.store, false); assert.equal(submitted.options.headers.Authorization, 'Bearer test-server-key');
  assert.ok(!JSON.stringify(submitted.body).includes('test-server-key')); assert.equal(response.webVerified, true); assert.ok(response.citations.length);
});
test('unknown grape in bottle context also forces verification', async () => {
  let body;
  const assistant = createOnlineAssistant({ apiKey: 'test-key', model: 'test-model', request: async (_, options) => { body = JSON.parse(options.body); return { ok: true, json: async () => payload() }; } });
  await assistant([{ role: 'user', content: 'Tell me about my grape variety' }], { bottle: { grape: 'Susumaniello' } });
  assert.equal(body.tool_choice, 'required');
});
test('an answer cannot be called verified without a completed search and citations', () => {
  assert.throws(() => parseModelResponse(payload({ searched: false }), true), /verification/i);
  assert.throws(() => parseModelResponse(payload({ citations: false }), true), /verification/i);
  assert.throws(() => parseModelResponse({ status: 'incomplete', output: [] }, false));
});
test('unsafe source URLs are excluded from replies', () => {
  const value = payload(); value.output[1].content[0].annotations[0].url = 'javascript:alert(1)';
  assert.throws(() => parseModelResponse(value, true));
  const fallback = parseModelResponse(value, false); assert.equal(fallback.sources.length, 0);
});
test('upstream errors are generic and never disclose credentials', async () => {
  const assistant = createOnlineAssistant({ apiKey: 'test-secret', model: 'test-model', request: async () => ({ ok: false }) });
  await assert.rejects(assistant([{ role: 'user', content: 'What is wine body?' }], {}), error => error.status === 503 && !error.message.includes('test-secret'));
});
