import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { sqliteStore, supabaseStore } from './storage.js';
import { answerWineQuestion } from '../frontend/src/wine-assistant.js';
import { createOnlineAssistant } from './ai-assistant.js';

const allowedFields = ['name', 'grape', 'region', 'vintage', 'type', 'colour', 'abv', 'sweetness', 'price', 'currency', 'size', 'notes'];
const numericLimits = { vintage: [1800, 2100], abv: [0, 100], price: [0, 1000000], size: [1, 1000000] };
export function validateBottle(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('Enter bottle details.');
  const result = {};
  for (const field of allowedFields) {
    if (value[field] === undefined || value[field] === null) continue;
    if (!['string', 'number'].includes(typeof value[field])) throw Error(`Invalid ${field}.`);
    const text = String(value[field]).trim();
    if (text.length > (field === 'notes' ? 1000 : 120)) throw Error(`${field} is too long.`);
    if (text !== '' && numericLimits[field]) {
      const number = Number(text), [min, max] = numericLimits[field];
      if (!Number.isFinite(number) || number < min || number > max || ((field === 'size' || field === 'vintage') && !Number.isInteger(number))) throw Error(`Invalid ${field}.`);
    }
    result[field] = text;
  }
  if (!result.name && !result.grape) throw Error('Enter a bottle name or grape to save.');
  return result;
}

export function firebaseVerifier(projectId) {
  const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
  return async token => {
    const { payload } = await jwtVerify(token, jwks, { audience: projectId, issuer: `https://securetoken.google.com/${projectId}`, algorithms: ['RS256'] });
    if (!payload.sub || payload.sub.length > 128 || !payload.exp || !payload.iat || typeof payload.auth_time !== 'number' || payload.auth_time > Date.now() / 1000) throw Error('Invalid sign-in token.');
    return payload.sub;
  };
}

async function readJson(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (Buffer.byteLength(text) > 16000) { const error = Error('Request is too large.'); error.status = 413; throw error; }
  }
  try { return JSON.parse(text); } catch { const error = Error('Use a valid JSON request.'); error.status = 400; throw error; }
}

export function createApp({ store = sqliteStore(), verifyToken, origins = [], staticDir = 'dist', rateLimit = 60, onlineAssistant = null } = {}) {
  const root = resolve(staticDir), buckets = new Map();
  function json(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(body));
  }
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname === '/runtime-config.js' && request.method === 'GET') {
        response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end('window.WINEWIZARD_API_URL = "/api";'); return;
      }
      if (!url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method)) return json(response, 405, { error: 'Method not allowed.' });
        const relative = url.pathname === '/' ? '/index.html' : url.pathname;
        const file = resolve(root, `.${decodeURIComponent(relative)}`);
        if (!file.startsWith(root + sep)) return json(response, 404, { error: 'Not found.' });
        try {
          const data = await readFile(file);
          const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream';
          response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); response.end(request.method === 'HEAD' ? undefined : data);
        } catch { json(response, 404, { error: 'Not found.' }); }
        return;
      }
      const origin = request.headers.origin;
      const sameOrigin = origin === `http://${request.headers.host}` || origin === `https://${request.headers.host}`;
      if (origin && !sameOrigin && !origins.includes(origin)) return json(response, 403, { error: 'This origin is not allowed.' });
      if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); response.setHeader('Access-Control-Allow-Credentials', 'true'); }
      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS'); response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization'); response.writeHead(204); response.end(); return;
      }
      const ip = request.socket.remoteAddress, now = Date.now();
      if (buckets.size > 1000) for (const [key, entry] of buckets) if (now - entry.start > 60000) buckets.delete(key);
      let bucket = buckets.get(ip);
      if (!bucket || now - bucket.start > 60000) { bucket = { start: now, count: 0 }; buckets.set(ip, bucket); }
      if (++bucket.count > rateLimit) return json(response, 429, { error: 'Too many requests. Try again in a minute.' });
      if (url.pathname === '/api/health' && request.method === 'GET') return json(response, 200, { ok: true, database: store.provider, chatbot: onlineAssistant ? 'ai' : 'reference', webSearchConfigured: Boolean(onlineAssistant), authentication: verifyToken ? 'firebase' : 'browser-session' });
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const body = await readJson(request);
        if (!body || Array.isArray(body) || typeof body !== 'object') return json(response, 400, { error: 'Send a question object.' });
        const { messages, context } = body;
        if (!Array.isArray(messages) || !messages.length || messages.length > 20 || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 2000)) return json(response, 400, { error: 'Send up to 20 messages of 2,000 characters.' });
        const last = messages.at(-1);
        if (last.role !== 'user' || !last.content.trim()) return json(response, 400, { error: 'Enter a question.' });
        // Conversations are not stored. Stock questions always use the explicit boundary.
        const safeContext = context && typeof context === 'object' && !Array.isArray(context) ? context : {};
        if (onlineAssistant && !/\b(inventory|in[ -]stock|retail\s+stock|availability|store\s+stock|buy\s+(?:it\s+)?(?:near|nearby))\b/i.test(last.content)) {
          if (bucket.aiCount >= 10) return json(response, 429, { error: 'Live answer limit reached. Try again in a minute.' });
          bucket.aiCount = (bucket.aiCount || 0) + 1;
          return json(response, 200, await onlineAssistant(messages, safeContext));
        }
        return json(response, 200, answerWineQuestion(last.content, safeContext));
      }
      if (url.pathname !== '/api/bottles' && !/^\/api\/bottles\/[\da-f-]{36}$/i.test(url.pathname)) return json(response, 404, { error: 'Not found.' });
      let owner;
      if (!verifyToken && origin && new URL(origin).hostname !== url.hostname) return json(response, 409, { error: 'Cross-site notebooks require configured sign-in. Use the same-site demo or sign in.' });
      if (verifyToken) {
        const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
        if (!token) return json(response, 401, { error: 'Sign in to access saved bottles.' });
        try { owner = await verifyToken(token); } catch { return json(response, 401, { error: 'Your sign-in expired. Sign in again.' }); }
      } else {
        owner = request.headers.cookie?.match(/(?:^|;\s*)winewizard_session=([\da-f]{64})(?:;|$)/)?.[1];
        if (!owner) {
          owner = randomBytes(32).toString('hex');
          response.setHeader('Set-Cookie', `winewizard_session=${owner}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
        }
      }
      if (request.method === 'GET' && url.pathname === '/api/bottles') return json(response, 200, { bottles: await store.list(owner), mode: 'database' });
      if (request.method === 'POST' && url.pathname === '/api/bottles') {
        const raw = await readJson(request); let bottle;
        try { bottle = validateBottle(raw?.bottle); } catch (error) { return json(response, 400, { error: error.message }); }
        if ((await store.list(owner)).length >= 100) return json(response, 409, { error: 'Your notebook holds up to 100 bottles. Remove one first.' });
        return json(response, 201, { bottles: await store.save(owner, bottle), mode: 'database' });
      }
      if (request.method === 'DELETE' && url.pathname !== '/api/bottles') return json(response, 200, { bottles: await store.remove(owner, url.pathname.split('/').at(-1)), mode: 'database' });
      return json(response, 405, { error: 'Method not allowed.' });
    } catch (error) { json(response, error.status || 500, { error: error.status ? error.message : 'The service is unavailable. Try again later.' }); }
  });
  return { server, store };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIREBASE_PROJECT_ID } = process.env;
  if (Boolean(SUPABASE_URL) !== Boolean(SUPABASE_SERVICE_ROLE_KEY)) throw Error('Set both Supabase server environment variables.');
  const store = SUPABASE_URL ? supabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : sqliteStore(process.env.DATABASE_PATH || 'data/winewizard.sqlite');
  if (Boolean(process.env.OPENAI_API_KEY) !== Boolean(process.env.OPENAI_MODEL)) throw Error('Set both OPENAI_API_KEY and OPENAI_MODEL to enable online answers.');
  const onlineAssistant = createOnlineAssistant({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL });
  const { server } = createApp({ store, onlineAssistant, verifyToken: FIREBASE_PROJECT_ID ? firebaseVerifier(FIREBASE_PROJECT_ID) : undefined, origins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) });
  const port = Number(process.env.PORT || 8787);
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`WineWizard backend: http://127.0.0.1:${port} (${store.provider})`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
}
