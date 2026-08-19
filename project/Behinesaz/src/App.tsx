import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import type { Lang } from '@/i18n';
import { detectLang, t, SCOPES } from '@/i18n';
import type { CfAccount, CfZone, DeployMethod, DeployResult, SigState } from '@/types';
import {
  genUuid,
  genName,
  validName,
  validPath,
  validHost,
  verifyToken,
  listAccounts,
  listZones,
  fetchWorkerSource,
  createKvNamespace,
  createD1Database,
  deployWorkers,
  deployPages,
  attachCustomDomain,
  hydrateScopeIds,
  api,
} from '@/cf-api';
import { TokenStep, useAutoCatchToken } from '@/components/TokenStep';
import { AccountStep } from '@/components/AccountStep';
import { MethodStep } from '@/components/MethodStep';
import { ConfigStep } from '@/components/ConfigStep';
import { DeployStep } from '@/components/DeployStep';
import { TokenModal } from '@/components/TokenModal';
import { useLog } from '@/components/DeployLog';
import { DashboardStep } from '@/components/DashboardStep';

const TOTAL_STEPS = 6;
const STEP_CRUMBS = ['', 'dashboard_t', 'step_token_t', 'step_account_t', 'step_method_t', 'step_config_t', 'step_deploy_t'];

function App() {
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('ef_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [step, setStep] = useState(1);
  const [sig, setSig] = useState<SigState>('idle');

  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [accounts, setAccounts] = useState<CfAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');

  const [method, setMethod] = useState<DeployMethod>('workers');
  const [sourceUrl, setSourceUrl] = useState('./worker-source.js');

  const [scriptName, setScriptName] = useState(() => genName());
  const [uuid, setUuid] = useState(() => genUuid());
  const [customPath, setCustomPath] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zones, setZones] = useState<CfZone[]>([]);

  const [result, setResult] = useState<DeployResult | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [tokenBuilderOpened, setTokenBuilderOpened] = useState(false);

  const logCtl = useLog();
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- toast ---- */
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  /* ---- copy ---- */
  const copy = useCallback(
    (text: string) => {
      navigator.clipboard?.writeText(text).then(() => toast(t(lang, 'misc_copied')));
    },
    [lang, toast]
  );

  /* ---- apply theme & lang to document ---- */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ef_theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('lang-fa', lang === 'fa');
  }, [lang]);

  /* ---- load stored config ---- */
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem('ef_cfg') || '{}');
      if (c.scriptName) setScriptName(c.scriptName);
      if (c.uuid) setUuid(c.uuid);
      if (c.customPath) setCustomPath(c.customPath);
      if (c.customDomain) setCustomDomain(c.customDomain);
      if (c.sourceUrl) setSourceUrl(c.sourceUrl);
      if (c.method) setMethod(c.method);
    } catch {}

    try {
      const stored = localStorage.getItem('ef_token');
      if (stored) {
        setToken(stored);
        setRemember(true);
        toast(t(detectLang(), 'misc_stored'));
      }
    } catch {}
  }, [toast]);

  /* ---- save config ---- */
  const saveCfg = useCallback(() => {
    try {
      localStorage.setItem(
        'ef_cfg',
        JSON.stringify({ scriptName, uuid, customPath, customDomain, sourceUrl, method })
      );
    } catch {}
  }, [scriptName, uuid, customPath, customDomain, sourceUrl, method]);

  /* ---- step navigation ---- */
  const gotoStep = useCallback(
    (n: number) => {
      setStep(n);
    },
    []
  );

  /* ---- auto-catch token from clipboard ---- */
  const handleAutoCatch = useCallback(
    (val: string) => {
      if (val === token) return;
      setToken(val);
      setTokenBuilderOpened(false);
      setShowModal(false);
      toast(t(lang, 'misc_autocaught'));
      doVerify(val);
    },
    [token, lang, toast]
  );
  useAutoCatchToken(tokenBuilderOpened, handleAutoCatch);

  /* ---- step 1: verify ---- */
  async function doVerify(tok?: string) {
    const tk = (tok || token).trim();
    if (!tk) {
      setTokenError(t(lang, 'err_token_empty'));
      return;
    }
    setTokenError('');
    setVerifying(true);
    setSig('verify');

    try {
      const active = await verifyToken(tk);
      if (!active) throw new Error(t(lang, 'err_token_invalid'));

      const accs = await listAccounts(tk);
      if (!accs.length) throw new Error(t(lang, 'err_no_accounts'));

      setAccounts(accs);
      if (accs.length === 1) {
        setAccountId(accs[0].id);
        setAccountName(accs[0].name);
      }
      setSig('online');

      if (remember) {
        try {
          localStorage.setItem('ef_token', tk);
        } catch {}
      } else {
        try {
          localStorage.removeItem('ef_token');
        } catch {}
      }

      // hydrate scope IDs in background
      api('GET', '/user/tokens/permission_groups', undefined, tk)
        .then((r) => hydrateScopeIds(r.result))
        .catch(() => {});

      setTimeout(() => gotoStep(2), 350);
    } catch (e: any) {
      setSig('error');
      const msg = e.message || '';
      if (msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setTokenError(t(lang, 'err_cors'));
      } else {
        setTokenError(msg || t(lang, 'err_token_invalid'));
      }
    } finally {
      setVerifying(false);
    }
  }

  /* ---- step 2: account ---- */
  function onAccountNext() {
    if (!accountId) return;
    const a = accounts.find((x) => x.id === accountId);
    if (a) setAccountName(a.name);
    gotoStep(3);
  }

  /* ---- step 3: method ---- */
  function onMethodNext() {
    gotoStep(4);
    loadZones();
  }

  async function loadZones() {
    try {
      const z = await listZones(token);
      setZones(z);
    } catch {
      setZones([]);
    }
  }

  /* ---- step 4: deploy ---- */
  async function deploy() {
    logCtl.clear();
    setResult(null);
    setShowRetry(false);
    setSig('verify');

    const panelKey = customPath || uuid;

    try {
      const d0 = logCtl.timed(t(lang, 'l_source'));
      const code = await fetchWorkerSource(sourceUrl);
      d0.done();
      logCtl.logOk(`${code.length} bytes · module worker`);

      const d1 = logCtl.timed(t(lang, 'l_kv'));
      const kvId = await createKvNamespace(token, accountId, scriptName);
      d1.done();

      const d2 = logCtl.timed(t(lang, 'l_d1'));
      const d1Id = await createD1Database(token, accountId, scriptName);
      d2.done();

      let baseUrl: string;
      if (method === 'workers') {
        const d3 = logCtl.timed(t(lang, 'l_upload'));
        baseUrl = await deployWorkers(token, accountId, scriptName, code, kvId, d1Id, uuid, customPath);
        d3.done();
      } else {
        const d3 = logCtl.timed(t(lang, 'l_proj'));
        baseUrl = await deployPages(token, accountId, scriptName, code, kvId, d1Id, uuid, customPath);
        d3.done();
      }

      if (customDomain) {
        try {
          const d4 = logCtl.timed(t(lang, 'l_cdom'));
          await attachCustomDomain(token, accountId, method, scriptName, customDomain, zoneId);
          d4.done();
        } catch (e: any) {
          logCtl.logWarn(`custom domain: ${e.message}`);
        }
      }

      logCtl.logOk(t(lang, 'l_done'));
      setSig('online');

      const finalBase = customDomain ? `https://${customDomain}` : baseUrl;
      const panelUrl = `${finalBase}/${panelKey}`;
      setResult({ baseUrl: finalBase, panelUrl, kvId, method, scriptName });
      gotoStep(5);
    } catch (e: any) {
      logCtl.logErr(e.message);
      setSig('error');
      setShowRetry(true);
    }
  }

  function onDeploy() {
    if (!validName(scriptName)) return;
    if (!validPath(customPath)) return;
    if (customDomain) {
      if (!validHost(customDomain)) return;
      if (!zoneId) return;
    }
    saveCfg();
    gotoStep(5);
    deploy();
  }

  /* ---- step rail ---- */
  const stepRail = useMemo(
    () => [
      { n: 1, titleKey: 'step_token_t', descKey: 'step_token_d' },
      { n: 2, titleKey: 'step_account_t', descKey: 'step_account_d' },
      { n: 3, titleKey: 'step_method_t', descKey: 'step_method_d' },
      { n: 4, titleKey: 'step_config_t', descKey: 'step_config_d' },
      { n: 5, titleKey: 'step_deploy_t', descKey: 'step_deploy_d' },
    ],
    []
  );

  return (
    <>
      <div className="mc-glow a" />
      <div className="mc-glow b" />

      <header className="mc-bar">
        <div className="mc-brand">
          <span className="mk" />
          <span>
            <b>Deploy Panel</b>
            <small>{t(lang, 'brand_sub')}</small>
          </span>
        </div>
        <span className="mc-crumb">
          ~/deploy › <b>{t(lang, STEP_CRUMBS[step])}</b>
        </span>
        <span className="spacer" />
        <span className="mc-sig" data-s={sig}>
          <span className="d" />
          <span>{t(lang, `sig_${sig}`)}</span>
        </span>
        <div className="mc-sel">
          <select value={lang} onChange={(e) => {
            const l = e.target.value as Lang;
            setLang(l);
            try {
              localStorage.setItem('preferredLanguage', l);
              const d = new Date();
              d.setFullYear(d.getFullYear() + 1);
              document.cookie = `preferredLanguage=${l}; path=/; expires=${d.toUTCString()}; SameSite=Lax`;
            } catch {}
          }}>
            <option value="en">EN</option>
            <option value="fa">FA</option>
          </select>
        </div>
        <button
          className="mc-ib"
          aria-label="theme"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      <div className="mc-prog">
        <i style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }} />
      </div>

      <main className="mc-wrap">
        <aside className="mc-rail">
          <h4>{t(lang, 'rail_title')}</h4>
          <div className="mc-steps">
            {stepRail.map((s) => (
              <div
                key={s.n}
                className={`mc-step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}
              >
                <span className="n">{s.n}</span>
                <div className="st">
                  <b>{t(lang, s.titleKey)}</b>
                  <div className="sd">{t(lang, s.descKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="mc-panel">
          <div className="mc-pad">
            {step === 1 && (
              <TokenStep
                lang={lang}
                token={token}
                remember={remember}
                tokenError={tokenError}
                verifying={verifying}
                onTokenChange={(v) => {
                  setToken(v);
                  setTokenError('');
                }}
                onRememberChange={setRemember}
                onVerify={() => doVerify()}
                onOpenTokenModal={() => setShowModal(true)}
              />
            )}

            {step === 2 && (
              <AccountStep
                lang={lang}
                accounts={accounts}
                accountId={accountId}
                onAccountChange={setAccountId}
                onBack={() => gotoStep(1)}
                onNext={onAccountNext}
              />
            )}

            {step === 3 && (
              <MethodStep
                lang={lang}
                method={method}
                sourceUrl={sourceUrl}
                onMethodChange={setMethod}
                onSourceChange={setSourceUrl}
                onBack={() => gotoStep(2)}
                onNext={onMethodNext}
              />
            )}

            {step === 4 && (
              <ConfigStep
                lang={lang}
                scriptName={scriptName}
                uuid={uuid}
                customPath={customPath}
                customDomain={customDomain}
                zoneId={zoneId}
                sourceUrl={sourceUrl}
                zones={zones}
                onScriptNameChange={setScriptName}
                onUuidChange={setUuid}
                onCustomPathChange={setCustomPath}
                onCustomDomainChange={setCustomDomain}
                onZoneChange={setZoneId}
                onSourceUrlChange={setSourceUrl}
                onRerollName={() => setScriptName(genName())}
                onRerollUuid={() => setUuid(genUuid())}
                onBack={() => gotoStep(3)}
                onDeploy={onDeploy}
              />
            )}

            {step === 5 && (
              <DeployStep
                lang={lang}
                logEntries={logCtl.entries}
                result={result}
                showRetry={showRetry}
                onRetry={deploy}
                onBack={() => gotoStep(4)}
                onCopy={copy}
              />
            )}
          </div>
        </section>
      </main>

      <footer className="mc-foot">
        <span>{t(lang, 'foot_note')}</span>{' '}
        <a href="https://github.com/deploy-panel/wizard" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </footer>

      {showModal && (
        <TokenModal
          lang={lang}
          accountId={accountId}
          onClose={() => setShowModal(false)}
          onToast={toast}
        />
      )}

      <div className={`mc-toast ${toastMsg ? 'on' : ''}`}>{toastMsg}</div>
    </>
  );
}

export default App;
