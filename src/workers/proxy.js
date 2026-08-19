/* proxy.js — Worker entry point for MilliConfig Wizard
   1) Serves the built Vite app (dist/) as static assets.
   2) Proxies /__cf/* to api.cloudflare.com server-side, so the browser
      never calls api.cloudflare.com directly and never hits CORS.
   3) /__admin/* — wizard's own D1-backed admin dashboard API:
      logs every successful deployment made through this wizard, and lets
      the owner (via ADMIN_KEY secret) view/search/delete them at /#admin. */

const ADMIN_PREFIX = '/__admin/';
const CF_PREFIX = '/__cf/';

function cors(origin, extra) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'X-CF-Token, X-Admin-Key, Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    ...(extra || {}),
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json', ...cors(origin) },
  });
}

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      account_id TEXT,
      account_name TEXT,
      worker_name TEXT,
      method TEXT,
      deploy_url TEXT,
      custom_domain TEXT,
      panel_uuid TEXT,
      lang TEXT,
      country TEXT,
      status TEXT DEFAULT 'success',
      note TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_deployments_ts ON deployments(ts)`),
  ]);
  schemaReady = true;
}

async function handleAdmin(request, env, url) {
  const origin = url.origin;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) });
  }

  if (!env.WIZARD_DB) {
    return json({ success: false, error: 'WIZARD_DB بایند نشده — [[d1_databases]] را در wrangler.toml تنظیم کنید.' }, 500, origin);
  }

  const path = url.pathname.slice(ADMIN_PREFIX.length); // '', 'log', 'stats', 'log/123'
  const db = env.WIZARD_DB;

  // ---- POST /__admin/log — called automatically by the wizard right after
  //      a successful deploy. No admin key required (write-only, no PII). ----
  if (path === 'log' && request.method === 'POST') {
    try {
      await ensureSchema(db);
      const body = await request.json().catch(() => ({}));
      const country = request.headers.get('cf-ipcountry') || (request.cf && request.cf.country) || '';
      await db.prepare(
        `INSERT INTO deployments (ts, account_id, account_name, worker_name, method, deploy_url, custom_domain, panel_uuid, lang, country, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        Date.now(),
        String(body.accountId || '').slice(0, 64),
        String(body.accountName || '').slice(0, 128),
        String(body.workerName || '').slice(0, 128),
        String(body.method || '').slice(0, 16),
        String(body.deployUrl || '').slice(0, 256),
        String(body.customDomain || '').slice(0, 256),
        String(body.uuid || '').slice(0, 64),
        String(body.lang || '').slice(0, 8),
        String(country || '').slice(0, 8),
        String(body.status || 'success').slice(0, 16),
        String(body.note || '').slice(0, 256),
      ).run();
      return json({ success: true }, 200, origin);
    } catch (e) {
      return json({ success: false, error: String((e && e.message) || e) }, 500, origin);
    }
  }

  // ---- everything below requires the admin key ----
  if (!env.ADMIN_KEY) {
    return json({ success: false, error: 'ADMIN_KEY تنظیم نشده — با wrangler secret put ADMIN_KEY یک کلید بسازید.' }, 500, origin);
  }
  const key = request.headers.get('x-admin-key') || '';
  if (key !== env.ADMIN_KEY) {
    return json({ success: false, error: 'کلید ادمین نامعتبر است' }, 401, origin);
  }

  try {
    await ensureSchema(db);

    // ---- GET /__admin/stats?limit=&offset=&q= ----
    if (path === 'stats' && request.method === 'GET') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
      const q = (url.searchParams.get('q') || '').trim();

      const totalRow = await db.prepare('SELECT COUNT(*) AS c FROM deployments').first();
      const uniqAccRow = await db.prepare('SELECT COUNT(DISTINCT account_id) AS c FROM deployments WHERE account_id != \'\'').first();
      const byMethod = await db.prepare('SELECT method, COUNT(*) AS c FROM deployments GROUP BY method').all();

      const since = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const byDay = await db.prepare(
        `SELECT (ts / 86400000) AS day, COUNT(*) AS c FROM deployments WHERE ts >= ? GROUP BY day ORDER BY day ASC`
      ).bind(since).all();

      let rowsQuery, rowsBind;
      if (q) {
        rowsQuery = `SELECT * FROM deployments WHERE account_name LIKE ? OR worker_name LIKE ? OR custom_domain LIKE ? OR account_id LIKE ?
                     ORDER BY id DESC LIMIT ? OFFSET ?`;
        const like = `%${q}%`;
        rowsBind = [like, like, like, like, limit, offset];
      } else {
        rowsQuery = `SELECT * FROM deployments ORDER BY id DESC LIMIT ? OFFSET ?`;
        rowsBind = [limit, offset];
      }
      const rows = await db.prepare(rowsQuery).bind(...rowsBind).all();

      return json({
        success: true,
        total: totalRow?.c || 0,
        uniqueAccounts: uniqAccRow?.c || 0,
        byMethod: byMethod.results || [],
        byDay: byDay.results || [],
        rows: rows.results || [],
        limit, offset,
      }, 200, origin);
    }

    // ---- DELETE /__admin/log/123 ----
    if (path.startsWith('log/') && request.method === 'DELETE') {
      const id = parseInt(path.slice(4), 10);
      if (!id) return json({ success: false, error: 'invalid id' }, 400, origin);
      await db.prepare('DELETE FROM deployments WHERE id = ?').bind(id).run();
      return json({ success: true }, 200, origin);
    }

    // ---- DELETE /__admin/log — clear all (danger zone) ----
    if (path === 'log' && request.method === 'DELETE') {
      await db.prepare('DELETE FROM deployments').run();
      return json({ success: true }, 200, origin);
    }

    return json({ success: false, error: 'not found' }, 404, origin);
  } catch (e) {
    return json({ success: false, error: String((e && e.message) || e) }, 500, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(ADMIN_PREFIX)) {
      return handleAdmin(request, env, url);
    }

    // ---- same-origin proxy: browser -> this Worker -> api.cloudflare.com ----
    if (url.pathname.startsWith(CF_PREFIX)) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': url.origin,
          'Access-Control-Allow-Headers': 'X-CF-Token, Content-Type',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Max-Age': '86400'
        }});
      }
      try {
        const token = request.headers.get('X-CF-Token') || '';
        const rest = url.pathname.slice(CF_PREFIX.length);
        const target = 'https://api.cloudflare.com/client/v4/' + rest + url.search;

        const headers = new Headers();
        ['content-type', 'accept', 'if-none-match', 'if-modified-since'].forEach(k => {
          const v = request.headers.get(k); if (v) headers.set(k, v);
        });
        if (token) headers.set('Authorization', 'Bearer ' + token);

        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const resp = await fetch(target, {
          method: request.method, headers,
          body: hasBody ? request.body : undefined
        });

        const out = new Headers();
        const deny = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
        resp.headers.forEach((v, k) => { if (!deny.has(k.toLowerCase())) out.set(k, v); });
        out.set('Access-Control-Allow-Origin', url.origin);
        out.set('Vary', 'Origin');
        return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: out });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String((e && e.message) || e) }),
          { status: 502, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': url.origin } });
      }
    }

    // ---- everything else: serve the static wizard app from assets ----
    if (env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  }
};
