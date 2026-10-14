import { answerWineQuestion } from './wine-assistant.js';

const api = (import.meta.env.VITE_API_URL || window.WINEWIZARD_API_URL || (import.meta.env.DEV ? '/api' : '')).replace(/\/$/, '');
const apiRoot = api.endsWith('/api') ? api : api ? `${api}/api` : '';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const authEnabled = Boolean(apiRoot && Object.values(firebaseConfig).every(Boolean));
let authPromise;
async function firebaseAuth() {
  if (!authEnabled) throw Error('Cloud sign-in is not configured.');
  if (!authPromise) authPromise = Promise.all([import('firebase/app'), import('firebase/auth')]).then(async ([app, auth]) => {
    const instance = auth.getAuth(app.getApps().length ? app.getApp() : app.initializeApp(firebaseConfig));
    await instance.authStateReady();
    return { instance, auth };
  });
  return authPromise;
}
export async function getSession() {
  const { instance } = authEnabled ? await firebaseAuth() : {};
  return { enabled: authEnabled, user: instance?.currentUser ? { displayName: instance.currentUser.displayName, email: instance.currentUser.email } : null, mode: apiRoot ? 'database' : 'local' };
}
export async function signIn() {
  const { instance, auth } = await firebaseAuth();
  await auth.signInWithPopup(instance, new auth.GoogleAuthProvider());
  return getSession();
}
export async function signOut() {
  const { instance, auth } = await firebaseAuth();
  await auth.signOut(instance);
  return getSession();
}
async function request(path, options = {}) {
  const { timeoutMs = 12000, ...fetchOptions } = options;
  const headers = { 'Content-Type': 'application/json' };
  if (authEnabled) {
    const { instance } = await firebaseAuth();
    if (instance.currentUser) headers.Authorization = `Bearer ${await instance.currentUser.getIdToken()}`;
  }
  const response = await fetch(`${apiRoot}${path}`, { ...fetchOptions, headers, credentials: 'include', signal: AbortSignal.timeout(timeoutMs) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'The service is unavailable. Try again.');
  return data;
}
export async function askAssistant(messages, context = {}) {
  const recent = messages.slice(-20);
  if (!apiRoot) return answerWineQuestion(recent.at(-1)?.content || '', context);
  return request('/chat', { method: 'POST', timeoutMs: 55000, body: JSON.stringify({ messages: recent, context }) });
}
const storageKey = 'winewizard-bottles-v2';
function localBottles() {
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? value.filter(b => b && typeof b === 'object' && typeof b.id === 'string').slice(0, 100) : []; } catch { return []; }
}
function saveLocal(bottles) {
  try { localStorage.setItem(storageKey, JSON.stringify(bottles)); } catch { throw Error('This browser cannot save bottles. Enable browser storage or try another browser.'); }
  return { bottles, mode: 'local' };
}
export async function getSavedBottles() {
  if (authEnabled && !(await firebaseAuth()).instance.currentUser) return { bottles: [], mode: 'database' };
  return apiRoot ? request('/bottles') : { bottles: localBottles(), mode: 'local' };
}
export async function saveBottle(bottle) {
  if (apiRoot) return request('/bottles', { method: 'POST', body: JSON.stringify({ bottle }) });
  const bottles = localBottles();
  if (bottles.length >= 100) throw Error('Your notebook holds up to 100 bottles. Remove one first.');
  return saveLocal([{ ...bottle, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...bottles]);
}
export async function deleteBottle(id) {
  return apiRoot ? request(`/bottles/${encodeURIComponent(id)}`, { method: 'DELETE' }) : saveLocal(localBottles().filter(bottle => bottle.id !== id));
}
