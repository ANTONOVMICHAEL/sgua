import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve('dist');
await copyFile(resolve('offline/index.html'), join(root, 'offline.html'));
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name !== 'sw.js') files.push('./' + relative(root, path).replaceAll('\\', '/'));
  }
  return files;
}
const files = await walk(root);
const offlineHtml = await readFile(join(root, 'offline.html'), 'utf8');
if (/\b(?:src|href)=["'](?:https?:\/\/|\/)/i.test(offlineHtml)) throw new Error('Offline HTML contains an external or root-relative resource');
const source = `const CACHE = 'civilist-atlas-v3-20261107';\nconst FILES = ${JSON.stringify(files)};\nself.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())); });\nself.addEventListener('activate', event => { event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('civilist-atlas-') && k !== CACHE).map(k => caches.delete(k)))), self.clients.claim()])); });\nself.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; const url = new URL(event.request.url); if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return; event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { if (response.ok) { const clone = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, clone)); } return response; }).catch(() => event.request.mode === 'navigate' ? caches.match('./offline.html') : Response.error()))); });\n`;
await writeFile(join(root, 'sw.js'), source);
console.log(`Packaged ${files.length} local resources and a self-contained offline page.`);
