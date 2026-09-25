import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker(fetch = vi.fn()) {
  const listeners = {};
  const cache = { put: vi.fn(), addAll: vi.fn(), match: vi.fn(async () => new Response('saved shell')) };
  const caches = {
    keys: async () => ['bolsita-shell-v1', 'another-app-cache'],
    delete: vi.fn(),
    open: async () => cache,
    match: cache.match,
  };
  const self = {
    location: new URL('https://example.com/bolsita/sw.js'),
    addEventListener: (type, handler) => { listeners[type] = handler; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  runInNewContext(source, { self, caches, fetch, URL });
  return { listeners, caches, cache, self };
}

describe('PWA upgrades', () => {
  it('cleans only outdated Bolsita shell caches', async () => {
    const { listeners, caches, self } = worker();
    let activation;
    listeners.activate({ waitUntil: (promise) => { activation = promise; } });
    await activation;
    expect(caches.delete.mock.calls).toEqual([['bolsita-shell-v1']]);
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it('does not replace the saved app shell with a server error', async () => {
    const { listeners, cache } = worker(async () => new Response('unavailable', { status: 503 }));
    let response;
    listeners.fetch({
      request: { url: 'https://example.com/bolsita/', method: 'GET', mode: 'navigate' },
      respondWith: (promise) => { response = promise; },
      waitUntil: () => {},
    });
    expect(await (await response).text()).toBe('saved shell');
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('rejects a failed installation without activating the broken release', async () => {
    const { listeners, self } = worker(async () => new Response('unavailable', { status: 503 }));
    let installation;
    listeners.install({ waitUntil: (promise) => { installation = promise; } });
    await expect(installation).rejects.toThrow();
    expect(self.skipWaiting).not.toHaveBeenCalled();
  });

  it('versions the worker from build contents and preserves app identity', () => {
    const directory = mkdtempSync(join(tmpdir(), 'bolsita-build-'));
    const script = new URL('./version-service-worker.mjs', import.meta.url);
    try {
      mkdirSync(join(directory, 'assets'));
      writeFileSync(join(directory, 'index.html'), '<html>shell</html>');
      writeFileSync(join(directory, 'assets/app.js'), 'release one');
      const build = () => {
        execFileSync(process.execPath, [script.pathname, directory]);
        return readFileSync(join(directory, 'sw.js'), 'utf8');
      };
      const first = build();
      expect(first).not.toContain('__BOLSITA_BUILD_VERSION__');
      expect(build()).toBe(first);
      writeFileSync(join(directory, 'assets/app.js'), 'release two');
      expect(build()).not.toBe(first);
      const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
      expect(manifest.start_url).toBe('/bolsita/');
      expect(manifest.id).toBe('/bolsita/');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
