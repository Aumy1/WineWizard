import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function sqliteStore(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS bottles (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ); CREATE INDEX IF NOT EXISTS bottles_owner ON bottles(owner_id, created_at);`);
  return {
    async list(owner) {
      return db.prepare('SELECT id, payload, created_at FROM bottles WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 100')
        .all(owner).map(row => ({ ...JSON.parse(row.payload), id: row.id, createdAt: row.created_at }));
    },
    async save(owner, bottle) {
      const id = randomUUID();
      db.prepare('INSERT INTO bottles (id, owner_id, payload) VALUES (?, ?, ?)').run(id, owner, JSON.stringify(bottle));
      return this.list(owner);
    },
    async remove(owner, id) {
      db.prepare('DELETE FROM bottles WHERE id = ? AND owner_id = ?').run(id, owner);
      return this.list(owner);
    },
    close() { db.close(); },
    provider: 'sqlite',
  };
}

// Supabase service credentials stay on the server. Every query includes its owner.
export function supabaseStore(url, serviceKey, request = fetch) {
  const endpoint = new URL('/rest/v1/bottles', url);
  if (endpoint.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
  async function query(method, owner, { id, body } = {}) {
    const target = new URL(endpoint);
    target.searchParams.set('owner_id', `eq.${owner}`);
    if (id) target.searchParams.set('id', `eq.${id}`);
    if (method === 'GET') {
      target.searchParams.set('select', 'id,payload,created_at');
      target.searchParams.set('order', 'created_at.desc,id.desc');
      target.searchParams.set('limit', '100');
    }
    const response = await request(target, {
      method, signal: AbortSignal.timeout(10000),
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error('The bottle database is unavailable.');
    return method === 'GET' ? (await response.json()).map(row => ({ ...row.payload, id: row.id, createdAt: row.created_at })) : null;
  }
  return {
    list(owner) { return query('GET', owner); },
    async save(owner, bottle) { await query('POST', owner, { body: { id: randomUUID(), owner_id: owner, payload: bottle } }); return this.list(owner); },
    async remove(owner, id) { await query('DELETE', owner, { id }); return this.list(owner); },
    close() {}, provider: 'supabase',
  };
}
