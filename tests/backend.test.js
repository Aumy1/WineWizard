import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../backend/server.js';
import { sqliteStore, supabaseStore } from '../backend/storage.js';

async function app(options = {}) {
  const service = createApp(options);
  await new Promise(resolve => service.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${service.server.address().port}`;
  return { ...service, url, async close() { await new Promise(resolve => service.server.close(resolve)); service.store.close(); } };
}

test('SQL bottle persistence, user isolation, owner-only deletion and validation', async () => {
  const service = await app();
  try {
    const first = await fetch(`${service.url}/api/bottles`);
    const a = first.headers.get('set-cookie').split(';')[0];
    const second = await fetch(`${service.url}/api/bottles`);
    const b = second.headers.get('set-cookie').split(';')[0];
    const post = await fetch(`${service.url}/api/bottles`, { method: 'POST', headers: { Cookie: a, 'Content-Type': 'application/json' }, body: JSON.stringify({ bottle: { name: "O'Connor <script> · test", grape: 'Riesling', abv: '12', size: '750' } }) });
    assert.equal(post.status, 201);
    const saved = await post.json(); assert.equal(saved.mode, 'database'); assert.equal(saved.bottles.length, 1);
    const id = saved.bottles[0].id;
    assert.equal((await (await fetch(`${service.url}/api/bottles`, { headers: { Cookie: b } })).json()).bottles.length, 0);
    await fetch(`${service.url}/api/bottles/${id}`, { method: 'DELETE', headers: { Cookie: b } });
    assert.equal((await (await fetch(`${service.url}/api/bottles`, { headers: { Cookie: a } })).json()).bottles.length, 1);
    const invalid = await fetch(`${service.url}/api/bottles`, { method: 'POST', headers: { Cookie: a, 'Content-Type': 'application/json' }, body: JSON.stringify({ bottle: { name: 'Bad', abv: '-1' } }) });
    assert.equal(invalid.status, 400);
    const nullBody = await fetch(`${service.url}/api/chat`, { method: 'POST', body: 'null' });
    assert.equal(nullBody.status, 400);
    await fetch(`${service.url}/api/bottles/${id}`, { method: 'DELETE', headers: { Cookie: a } });
    assert.equal((await (await fetch(`${service.url}/api/bottles`, { headers: { Cookie: a } })).json()).bottles.length, 0);
  } finally { await service.close(); }
});

test('reference chat answers calculations without persisting chat messages', async () => {
  const service = await app();
  try {
    const response = await fetch(`${service.url}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'What does ABV mean?' }] }) });
    assert.equal(response.status, 200); const value = await response.json();
    assert.equal(value.mode, 'reference'); assert.match(value.answer, /alcohol by volume/i); assert.ok(value.sources.length > 0);
    const invalid = await fetch(`${service.url}/api/chat`, { method: 'POST', body: JSON.stringify({ messages: [{ role: 'assistant', content: 'No user question' }] }) });
    assert.equal(invalid.status, 400);
    const large = await fetch(`${service.url}/api/chat`, { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(17000) }] }) });
    assert.equal(large.status, 413);
  } finally { await service.close(); }
});

test('configured authentication rejects missing and invalid tokens', async () => {
  const service = await app({ verifyToken: async token => { if (token === 'valid-test-token') return 'user-1'; throw Error(); } });
  try {
    assert.equal((await fetch(`${service.url}/api/bottles`)).status, 401);
    assert.equal((await fetch(`${service.url}/api/bottles`, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
    assert.equal((await fetch(`${service.url}/api/bottles`, { headers: { Authorization: 'Bearer valid-test-token' } })).status, 200);
  } finally { await service.close(); }
});

test('cross-origin writes are rejected unless explicitly allowed', async () => {
  const service = await app();
  try {
    assert.equal((await fetch(`${service.url}/api/bottles`, { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{}' })).status, 403);
  } finally { await service.close(); }
});

test('Supabase adapter scopes every read and deletion to the signed-in owner', async () => {
  const calls = [];
  const store = supabaseStore('https://example.supabase.co', 'test-server-secret', async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => [{ id: 'test', payload: { name: 'Example' }, created_at: 'today' }] };
  });
  const items = await store.list('firebase-user'); assert.equal(items[0].name, 'Example');
  await store.remove('firebase-user', 'test');
  await store.save('firebase-user', { name: 'Example' });
  for (const call of calls) {
    assert.equal(call.url.searchParams.get('owner_id'), 'eq.firebase-user');
    assert.equal(call.options.headers.Authorization, 'Bearer test-server-secret');
  }
  assert.ok(calls.some(call => call.options.method === 'POST' && JSON.parse(call.options.body).owner_id === 'firebase-user'));
});

test('SQLite records survive reopening the same database', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs'); const { tmpdir } = await import('node:os');
  const directory = mkdtempSync(`${tmpdir()}/winewizard-test-`), path = `${directory}/test.sqlite`;
  const first = sqliteStore(path); await first.save('owner', { name: 'Persistent bottle' }); first.close();
  const second = sqliteStore(path);
  try { assert.equal((await second.list('owner'))[0].name, 'Persistent bottle'); } finally { second.close(); rmSync(directory, { recursive: true }); }
});
