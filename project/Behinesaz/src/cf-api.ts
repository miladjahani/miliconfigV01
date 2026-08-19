import type { CfAccount, CfZone } from './types';

/**
 * The Cloudflare API does NOT send Access-Control-Allow-Origin headers for
 * cross-origin browser requests, so calling https://api.cloudflare.com
 * directly from the wizard always fails with a CORS error — regardless of
 * whether the token is valid.
 *
 * The fix is the same-origin proxy pattern already used by the Worker this
 * app is deployed on (see proxy.js): the browser calls a path on its OWN
 * origin, `/__cf/...`, and the Worker forwards that request server-side to
 * api.cloudflare.com (server-to-server calls are never subject to CORS).
 * Because the browser never leaves the current origin, no CORS preflight
 * is triggered at all.
 *
 * The token is sent via the `X-CF-Token` header (not `Authorization`) so
 * the Worker can read it and attach it server-side — this must match what
 * proxy.js expects.
 *
 * By default every request goes through `/__cf/` on the current origin,
 * which just works as long as this app and proxy.js are deployed together
 * on the same Worker. An optional override (localStorage key `ef_proxy`)
 * lets you point at a different Worker URL, e.g. for local `vite dev`
 * where there's no Worker on localhost to proxy through.
 */

const PROXY_PREFIX = '__cf/';

function proxyBase(): string {
  try {
    const p = localStorage.getItem('ef_proxy');
    if (p) return p.endsWith('/') ? p : p + '/';
  } catch {}
  return '/'; // same-origin: browser -> this Worker -> api.cloudflare.com
}

export function setProxy(url: string): void {
  try {
    if (url) localStorage.setItem('ef_proxy', url);
    else localStorage.removeItem('ef_proxy');
  } catch {}
}

export function getProxy(): string {
  try {
    return localStorage.getItem('ef_proxy') || '';
  } catch {
    return '';
  }
}

function baseUrl(): string {
  return proxyBase() + PROXY_PREFIX;
}

export async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) headers['X-CF-Token'] = token;
  let b: BodyInit | undefined;

  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      b = body;
    } else if (typeof body === 'string') {
      b = body;
    } else {
      headers['Content-Type'] = 'application/json';
      b = JSON.stringify(body);
    }
  }

  if (extraHeaders) {
    Object.keys(extraHeaders).forEach((k) => {
      if (k.toLowerCase() !== 'authorization') headers[k] = extraHeaders[k];
    });
  }

  const r = await fetch(baseUrl() + path.replace(/^\//, ''), { method, headers, body: b });
  const ct = r.headers.get('content-type') || '';
  const data = ct.indexOf('json') > -1 ? await r.json() : await r.text();

  if (!r.ok || (data && data.success === false)) {
    const msg =
      data?.errors?.map((e: any) => e.message).join('; ') ||
      (typeof data === 'string' ? data.slice(0, 180) : `HTTP ${r.status}`);
    const err = new Error(msg || `HTTP ${r.status}`);
    (err as any).status = r.status;
    throw err;
  }
  return data;
}

export function genUuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

export function genName(): string {
  return 'edge-relay-' + genUuid().slice(0, 4);
}

export function validName(n: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(n || '');
}

export function validPath(p: string): boolean {
  return !p || /^\/?[A-Za-z0-9_-]+$/.test(p);
}

export function validHost(h: string): boolean {
  return !h || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(h);
}

export async function verifyToken(token: string): Promise<boolean> {
  const res = await api('GET', '/user/tokens/verify', undefined, token);
  return res.result?.status === 'active';
}

export async function listAccounts(token: string): Promise<CfAccount[]> {
  const res = await api('GET', '/accounts?per_page=50', undefined, token);
  return res.result || [];
}

export async function listZones(token: string): Promise<CfZone[]> {
  const res = await api('GET', '/zones?per_page=50&status=active', undefined, token);
  return res.result || [];
}

export async function fetchWorkerSource(sourceUrl: string): Promise<string> {
  const urls = [sourceUrl, './worker-source.js', './Source.js'].filter(Boolean);
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const t = await r.text();
      if (t && t.indexOf('export default') > -1) return t;
    } catch {
      // try next
    }
  }
  throw new Error('worker source not found at ' + urls.join(' / '));
}

export function buildFormData(code: string, kvId: string, d1Id: string, uuid: string, customPath: string): FormData {
  const meta = {
    main_module: 'worker.js',
    compatibility_date: '2025-01-01',
    bindings: [
      { type: 'kv_namespace', name: 'C', namespace_id: kvId },
      { type: 'd1', name: 'DB', id: d1Id },
      { type: 'plain_text', name: 'u', text: uuid },
      { type: 'plain_text', name: 'd', text: customPath || '' },
      { type: 'plain_text', name: 'p', text: '' },
    ],
  };
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  fd.append('worker.js', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
  return fd;
}

export async function createKvNamespace(token: string, accountId: string, name: string): Promise<string> {
  const res = await api('POST', `/accounts/${accountId}/storage/kv/namespaces`, { title: name + '-kv' }, token);
  return res.result.id;
}

export async function createD1Database(token: string, accountId: string, name: string): Promise<string> {
  const res = await api('POST', `/accounts/${accountId}/d1/database`, { name: name + '-d1' }, token);
  const dbId = res.result.uuid;

  await api('POST', `/accounts/${accountId}/d1/database/${dbId}/query`, {
    sql: `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, event TEXT, path TEXT);`,
  }, token).catch(() => {});

  return dbId;
}

export async function deployWorkers(
  token: string,
  accountId: string,
  name: string,
  code: string,
  kvId: string,
  d1Id: string,
  uuid: string,
  customPath: string,
): Promise<string> {
  await api('PUT', `/accounts/${accountId}/workers/scripts/${name}`, buildFormData(code, kvId, d1Id, uuid, customPath), token);

  await api('PUT', `/accounts/${accountId}/workers/subdomain`, { enabled: true }, token).catch(() => {});

  await Promise.all([
    api('PUT', `/accounts/${accountId}/workers/scripts/${name}/subdomain`, { enabled: true }, token)
      .catch(() => api('POST', `/accounts/${accountId}/workers/scripts/${name}/subdomain`, { enabled: true }, token).catch(() => null)),
    api('PUT', `/accounts/${accountId}/workers/scripts/${name}/settings`, { workers_dev: true }, token).catch(() => null),
  ]);

  const subRes = await api('GET', `/accounts/${accountId}/workers/subdomain`, undefined, token);
  const sub = subRes.result?.subdomain;
  return sub ? `https://${name}.${sub}.workers.dev` : `https://${name}.workers.dev`;
}

export async function deployPages(
  token: string,
  accountId: string,
  name: string,
  code: string,
  kvId: string,
  d1Id: string,
  uuid: string,
  customPath: string,
): Promise<string> {
  await api('POST', `/accounts/${accountId}/pages/projects`, { name, production_branch: 'main' }, token).catch(() => {});

  const cfg = {
    deployment_configs: {
      production: {
        compatibility_date: '2025-01-01',
        kv_namespaces: { C: { namespace_id: kvId } },
        d1_databases: { DB: { id: d1Id } },
        environment_variables: {
          u: { value: uuid, type: 'plain_text' },
          d: { value: customPath || '', type: 'plain_text' },
          p: { value: '', type: 'plain_text' },
        },
      },
    },
  };
  await api('PATCH', `/accounts/${accountId}/pages/projects/${name}`, cfg, token).catch(() => {});

  const fd = new FormData();
  fd.append('manifest', JSON.stringify({}));
  fd.append('_worker.js', new Blob([code], { type: 'application/javascript' }), '_worker.js');
  fd.append('branch', 'main');
  const r = await api('POST', `/accounts/${accountId}/pages/projects/${name}/deployments`, fd, token);
  return r.result?.url || `https://${name}.pages.dev`;
}

export async function attachCustomDomain(
  token: string,
  accountId: string,
  method: 'workers' | 'pages',
  name: string,
  domain: string,
  zoneId: string,
): Promise<void> {
  if (method === 'workers') {
    await api('PUT', `/accounts/${accountId}/workers/domains`, {
      environment: 'production',
      hostname: domain,
      service: name,
      zone_id: zoneId,
    }, token);
  } else {
    await api('POST', `/accounts/${accountId}/pages/projects/${name}/domains`, { domain }, token);
  }
}

const SCOPE_MATCH: Record<string, { sig: string; eff: string; anti: string[] }> = {
  'account.workers_kv.edit': { sig: 'workerskvstorage', eff: 'edit', anti: [] },
  'account.workers_scripts.edit': { sig: 'workersscripts', eff: 'edit', anti: [] },
  'account.pages.edit': { sig: 'pages', eff: 'edit', anti: ['workers'] },
  'account.settings.read': { sig: 'settings', eff: 'read', anti: [] },
  'zone.zone.read': { sig: 'zone', eff: 'read', anti: ['workers', 'dns', 'settings'] },
  'account.d1.edit': { sig: 'd1', eff: 'edit', anti: [] },
  'zone.workers_routes.edit': { sig: 'workersroutes', eff: 'edit', anti: [] },
};

function norm(s: string): string {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hydrateScopeIds(groups: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  (groups || []).forEach((g) => {
    const n = norm(g.name);
    Object.keys(SCOPE_MATCH).forEach((key) => {
      const m = SCOPE_MATCH[key];
      if (n.indexOf(m.sig) > -1 && n.indexOf(m.eff) > -1 && m.anti.every((a) => n.indexOf(a) === -1)) {
        if (g.id && !map[key]) map[key] = g.id;
      }
    });
  });
  try {
    localStorage.setItem('ef_scope_ids', JSON.stringify(map));
  } catch {}
  return map;
}

export function buildPrefillUrl(accountId: string): string {
  const params = [
    'permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22pages%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22user_details%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%5D',
    'accountId=' + encodeURIComponent(accountId || '*'),
    'zoneId=all',
    'name=deploy_panel_wizard',
  ].join('&');
  return 'https://dash.cloudflare.com/profile/api-tokens?' + params;
}
