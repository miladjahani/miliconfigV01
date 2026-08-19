import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LogOut, RefreshCw, Search, Server, Trash2, Users, Globe2, LayoutGrid } from 'lucide-react';
import type { Lang } from '@/i18n';
import { t } from '@/i18n';
import type { AdminStats, DeploymentRow } from '@/cf-api';
import { clearAllDeployments, deleteDeploymentRow, fetchAdminStats, getAdminKey, setAdminKey } from '@/cf-api';

interface AdminPanelProps {
  lang: Lang;
  onExit: () => void;
}

const PAGE_SIZE = 25;

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('fa-IR');
  } catch {
    return String(ts);
  }
}

export function AdminPanel({ lang, onExit }: AdminPanelProps) {
  const [key, setKey] = useState(() => getAdminKey());
  const [authed, setAuthed] = useState(false);
  const [authing, setAuthing] = useState(false);
  const [authErr, setAuthErr] = useState('');

  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (k: string, p: number, query: string) => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetchAdminStats(k, { limit: PAGE_SIZE, offset: p * PAGE_SIZE, q: query });
        setData(res);
        setAuthed(true);
        setAdminKey(k);
      } catch (e: any) {
        setErr(e.message || 'error');
        if (e.status === 401) {
          setAuthed(false);
          setAdminKey('');
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (key) {
      setAuthing(true);
      load(key, 0, '').finally(() => setAuthing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitKey() {
    if (!key.trim()) return;
    setAuthErr('');
    setAuthing(true);
    load(key.trim(), 0, '').catch(() => {}).finally(() => setAuthing(false));
  }

  function logout() {
    setAdminKey('');
    setAuthed(false);
    setKey('');
    setData(null);
  }

  async function onDelete(id: number) {
    try {
      await deleteDeploymentRow(key, id);
      load(key, page, q);
    } catch (e: any) {
      setErr(e.message || 'error');
    }
  }

  async function onClearAll() {
    if (!confirm(lang === 'fa' ? 'همهٔ رکوردها حذف شوند؟ این عمل قابل بازگشت نیست.' : 'Delete ALL records? This cannot be undone.')) return;
    try {
      await clearAllDeployments(key);
      load(key, 0, q);
      setPage(0);
    } catch (e: any) {
      setErr(e.message || 'error');
    }
  }

  const maxDay = data?.byDay?.length ? Math.max(...data.byDay.map((d) => d.c)) : 0;

  if (!authed) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <span className="mc-eyebrow">{t(lang, 'admin_title')}</span>
          <h2>{t(lang, 'admin_login_h')}</h2>
          <p className="mc-lede">{t(lang, 'admin_login_lede')}</p>
          <div className="admin-key-row">
            <KeyRound size={16} />
            <input
              className="mc-input mono"
              type="password"
              placeholder={t(lang, 'admin_key_ph')}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitKey()}
            />
          </div>
          {(authErr || err) && <div className="admin-err">{err || authErr}</div>}
          <button className="mc-btn mc-btn-primary" disabled={authing} onClick={submitKey}>
            {authing ? t(lang, 'admin_checking') : t(lang, 'admin_enter')}
          </button>
          <button className="mc-btn mc-btn-ghost" onClick={onExit}>
            {t(lang, 'admin_back')}
          </button>
        </div>
        <style>{adminStyles}</style>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-head">
        <div>
          <span className="mc-eyebrow">{t(lang, 'admin_title')}</span>
          <h2>{t(lang, 'admin_h')}</h2>
        </div>
        <div className="admin-head-actions">
          <button className="mc-btn mc-btn-ghost" onClick={() => load(key, page, q)}>
            <RefreshCw size={15} /> {t(lang, 'admin_refresh')}
          </button>
          <button className="mc-btn mc-btn-ghost" onClick={logout}>
            <LogOut size={15} /> {t(lang, 'admin_logout')}
          </button>
        </div>
      </div>

      {err && <div className="admin-err">{err}</div>}

      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-icon" style={{ background: 'var(--g-lime)', color: 'var(--lime)' }}>
            <Server size={22} />
          </div>
          <div className="dash-info">
            <span className="dash-value">{data?.total ?? '—'}</span>
            <span className="dash-label">{t(lang, 'admin_stat_total')}</span>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-icon" style={{ background: 'var(--g-blue)', color: 'var(--blue)' }}>
            <Users size={22} />
          </div>
          <div className="dash-info">
            <span className="dash-value">{data?.uniqueAccounts ?? '—'}</span>
            <span className="dash-label">{t(lang, 'admin_stat_accounts')}</span>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-icon" style={{ background: 'rgba(255,180,84,.15)', color: 'var(--amber)' }}>
            <LayoutGrid size={22} />
          </div>
          <div className="dash-info">
            <span className="dash-value">{data?.byMethod?.find((m) => m.method === 'workers')?.c ?? 0}</span>
            <span className="dash-label">Workers</span>
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-icon" style={{ background: 'rgba(61,220,132,.15)', color: 'var(--green)' }}>
            <Globe2 size={22} />
          </div>
          <div className="dash-info">
            <span className="dash-value">{data?.byMethod?.find((m) => m.method === 'pages')?.c ?? 0}</span>
            <span className="dash-label">Pages</span>
          </div>
        </div>
      </div>

      {!!data?.byDay?.length && (
        <div className="admin-chart">
          <h3>{t(lang, 'admin_chart_14d')}</h3>
          <div className="admin-bars">
            {data.byDay.map((d) => (
              <div key={d.day} className="admin-bar-col" title={`${d.c}`}>
                <div className="admin-bar" style={{ height: `${maxDay ? (d.c / maxDay) * 100 : 0}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={15} />
          <input
            className="mc-input"
            placeholder={t(lang, 'admin_search_ph')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(0);
                load(key, 0, q);
              }
            }}
          />
        </div>
        <button className="mc-btn mc-btn-ghost admin-danger" onClick={onClearAll}>
          <Trash2 size={15} /> {t(lang, 'admin_clear_all')}
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t(lang, 'admin_col_time')}</th>
              <th>{t(lang, 'admin_col_account')}</th>
              <th>{t(lang, 'admin_col_worker')}</th>
              <th>{t(lang, 'admin_col_method')}</th>
              <th>{t(lang, 'admin_col_domain')}</th>
              <th>{t(lang, 'admin_col_country')}</th>
              <th>{t(lang, 'admin_col_status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="admin-empty">
                  {t(lang, 'admin_loading')}
                </td>
              </tr>
            )}
            {!loading && !data?.rows?.length && (
              <tr>
                <td colSpan={8} className="admin-empty">
                  {t(lang, 'admin_empty')}
                </td>
              </tr>
            )}
            {!loading &&
              data?.rows?.map((r: DeploymentRow) => (
                <tr key={r.id}>
                  <td className="mono">{fmtTime(r.ts)}</td>
                  <td>{r.account_name || r.account_id || '—'}</td>
                  <td className="mono">{r.worker_name}</td>
                  <td>
                    <span className={`admin-pill ${r.method}`}>{r.method}</span>
                  </td>
                  <td className="mono">{r.custom_domain || '—'}</td>
                  <td>{r.country || '—'}</td>
                  <td>
                    <span className={`admin-pill ${r.status === 'error' ? 'err' : 'ok'}`}>{r.status}</span>
                  </td>
                  <td>
                    <button className="admin-icon-btn" onClick={() => onDelete(r.id)} aria-label="delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pager">
        <button
          className="mc-btn mc-btn-ghost"
          disabled={page === 0 || loading}
          onClick={() => {
            const p = page - 1;
            setPage(p);
            load(key, p, q);
          }}
        >
          {t(lang, 'admin_prev')}
        </button>
        <span className="mono">
          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.total || 0)} / {data?.total ?? 0}
        </span>
        <button
          className="mc-btn mc-btn-ghost"
          disabled={loading || (data ? (page + 1) * PAGE_SIZE >= data.total : true)}
          onClick={() => {
            const p = page + 1;
            setPage(p);
            load(key, p, q);
          }}
        >
          {t(lang, 'admin_next')}
        </button>
      </div>

      <style>{adminStyles}</style>
    </div>
  );
}

const adminStyles = `
.admin-gate { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.admin-gate-card { max-width: 420px; width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 28px; box-shadow: var(--shadow); }
.admin-gate-card h2 { margin: 8px 0 6px; }
.admin-key-row { display: flex; align-items: center; gap: 10px; margin: 16px 0 10px; color: var(--t1); }
.admin-key-row .mc-input { flex: 1; }
.admin-err { background: rgba(255,93,115,.12); border: 1px solid rgba(255,93,115,.3); color: var(--rose); padding: 10px 12px; border-radius: 10px; font-size: 13px; margin: 10px 0; }
.admin-gate-card .mc-btn { width: 100%; margin-top: 8px; justify-content: center; }

.admin-wrap { max-width: 1080px; margin: 0 auto; padding: 28px 20px 60px; }
.admin-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.admin-head h2 { margin: 4px 0 0; }
.admin-head-actions { display: flex; gap: 8px; }
.admin-head-actions .mc-btn { display: inline-flex; align-items: center; gap: 6px; }

.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 22px 0; }
.dash-card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; display: flex; align-items: center; gap: 14px; }
.dash-icon { width: 46px; height: 46px; border-radius: 10px; display: grid; place-items: center; flex: none; }
.dash-info { display: flex; flex-direction: column; }
.dash-value { font-size: 22px; font-weight: 700; font-family: var(--disp); }
.dash-label { font-size: 12px; color: var(--t1); }

.admin-chart { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; margin-bottom: 18px; }
.admin-chart h3 { margin: 0 0 14px; font-size: 13px; color: var(--t1); font-weight: 600; }
.admin-bars { display: flex; align-items: flex-end; gap: 4px; height: 90px; }
.admin-bar-col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.admin-bar { width: 100%; min-height: 2px; background: linear-gradient(180deg, var(--lime), var(--lime-d)); border-radius: 3px 3px 0 0; }

.admin-toolbar { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; }
.admin-search { display: flex; align-items: center; gap: 8px; color: var(--t1); flex: 1; min-width: 220px; }
.admin-search .mc-input { flex: 1; }
.admin-danger { color: var(--rose); display: inline-flex; align-items: center; gap: 6px; }

.admin-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.admin-table th, .admin-table td { padding: 10px 12px; text-align: start; border-bottom: 1px solid var(--line); white-space: nowrap; }
.admin-table th { color: var(--t1); font-weight: 600; background: var(--surface2); font-size: 12px; }
.admin-table tr:last-child td { border-bottom: none; }
.admin-empty { text-align: center !important; color: var(--t2); padding: 28px !important; }
.admin-pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; border: 1px solid var(--line2); }
.admin-pill.workers { color: var(--blue); border-color: var(--blue); }
.admin-pill.pages { color: var(--green); border-color: var(--green); }
.admin-pill.ok { color: var(--green); border-color: var(--green); }
.admin-pill.err { color: var(--rose); border-color: var(--rose); }
.admin-icon-btn { background: none; border: 1px solid var(--line); color: var(--t1); border-radius: 8px; padding: 5px 7px; cursor: pointer; }
.admin-icon-btn:hover { color: var(--rose); border-color: var(--rose); }

.admin-pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; color: var(--t1); }
`;
