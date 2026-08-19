import { useState, useEffect } from 'react';
import { Mail, Cloud, KeyRound, Eye, ExternalLink, Globe } from 'lucide-react';
import type { Lang } from '@/i18n';
import { t, SCOPES } from '@/i18n';
import { getProxy, setProxy } from '@/cf-api';

interface TokenStepProps {
  lang: Lang;
  token: string;
  remember: boolean;
  tokenError: string;
  verifying: boolean;
  onTokenChange: (v: string) => void;
  onRememberChange: (v: boolean) => void;
  onVerify: () => void;
  onOpenTokenModal: () => void;
}

const QS_LINKS = {
  email: 'https://tempmail.ing/',
  signup: 'https://dash.cloudflare.com/sign-up',
};

export function TokenStep(props: TokenStepProps) {
  const { lang } = props;
  const [showToken, setShowToken] = useState(false);
  const [proxyInput, setProxyInput] = useState(() => getProxy());

  return (
    <div className="mc-sec on">
      <span className="mc-eyebrow">{t(lang, 'ey_auth')}</span>
      <h2>{t(lang, 'h_token')}</h2>
      <p className="lede">{t(lang, 'lede_token')}</p>

      <div className="mc-field">
        <label>{t(lang, 'f_token_label')}</label>
        <div className="mc-with-btn">
          <input
            className={`mc-input mono ${props.tokenError ? 'bad' : ''}`}
            type={showToken ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder={t(lang, 'f_token_ph')}
            value={props.token}
            onChange={(e) => props.onTokenChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && props.onVerify()}
          />
          <button type="button" aria-label="show" onClick={() => setShowToken(!showToken)}>
            <Eye size={14} />
          </button>
        </div>
        {props.tokenError && <div className="mc-errline on">{props.tokenError}</div>}
        <label className="mc-check">
          <input
            type="checkbox"
            checked={props.remember}
            onChange={(e) => props.onRememberChange(e.target.checked)}
          />
          <span className="bx">✓</span>
          <span className="lb">{t(lang, 'f_remember')}</span>
        </label>
        <div className="hint">{t(lang, 'f_remember_help')}</div>
      </div>

      {/* Advanced: CORS proxy */}
      <details style={{ marginTop: 14 }}>
        <summary
          style={{
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--t2)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Globe size={12} />
          {t(lang, 'adv_conn')}
        </summary>
        <div className="mc-field">
          <label>{t(lang, 'f_proxy_label')}</label>
          <input
            className="mc-input mono"
            value={proxyInput}
            spellCheck={false}
            placeholder={t(lang, 'f_proxy_ph')}
            onChange={(e) => {
              setProxyInput(e.target.value);
              setProxy(e.target.value.trim());
            }}
          />
          <div className="hint">
            {t(lang, 'f_proxy_help')}
          </div>
        </div>
      </details>

      {/* Quick Start */}
      <div className="mc-qs">
        <div className="mc-qs-h">{t(lang, 'qs_title')}</div>
        <div className="mc-qs-track">
          <div className="mc-qs-card">
            <div className="top">
              <span className="num">1</span>
              <Mail size={17} />
            </div>
            <b>{t(lang, 'qs_step1_t')}</b>
            <small>{t(lang, 'qs_step1_d')}</small>
            <a className="go" href={QS_LINKS.email} target="_blank" rel="noopener noreferrer">
              <span>{t(lang, 'qs_step1_btn')}</span>
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mc-qs-card">
            <div className="top">
              <span className="num">2</span>
              <Cloud size={17} />
            </div>
            <b>{t(lang, 'qs_step2_t')}</b>
            <small>{t(lang, 'qs_step2_d')}</small>
            <a className="go" href={QS_LINKS.signup} target="_blank" rel="noopener noreferrer">
              <span>{t(lang, 'qs_step2_btn')}</span>
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mc-qs-card primary">
            <div className="top">
              <span className="num">3</span>
              <KeyRound size={17} />
            </div>
            <b>{t(lang, 'qs_step3_t')}</b>
            <small>{t(lang, 'qs_step3_d')}</small>
            <button className="go" type="button" onClick={props.onOpenTokenModal}>
              <span>{t(lang, 'qs_step3_btn')}</span>
              <span>⇢</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scopes */}
      <div className="mc-scopes">
        <div className="hd">
          <span>{t(lang, 'scopes_title')}</span>
        </div>
        <ul>
          {SCOPES.map((s) => (
            <li key={s.key}>
              <span className={`tag ${s.req ? 'req' : 'opt'}`}>
                {s.req ? t(lang, 'req') : t(lang, 'opt')}
              </span>
              <span className="nm">{lang === 'fa' ? s.fa : s.en}</span>
            </li>
          ))}
        </ul>
        <div className="hint" style={{ marginTop: 10 }}>
          <a
            href="https://dash.cloudflare.com/profile/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}
          >
            {t(lang, 'open_dash')}
          </a>{' '}
          <span>{t(lang, 'scopes_hint')}</span>
        </div>
      </div>

      <div className="mc-actions">
        <span className="spacer" />
        <button
          className="mc-btn mc-btn-primary"
          onClick={props.onVerify}
          disabled={props.verifying}
        >
          {props.verifying ? '...' : t(lang, 'f_verify_btn')}
        </button>
      </div>
    </div>
  );
}

const TOKEN_LOOK_RE = /^[A-Za-z0-9_-]{30,60}$/;

export function useAutoCatchToken(
  enabled: boolean,
  onCatch: (token: string) => void
) {
  useEffect(() => {
    if (!enabled) return;

    function tryCatch() {
      if (!navigator.clipboard?.readText) return;
      navigator.clipboard.readText().then((text) => {
        const val = String(text || '').trim();
        if (!TOKEN_LOOK_RE.test(val)) return;
        onCatch(val);
      }).catch(() => {});
    }

    const onVis = () => document.visibilityState === 'visible' && tryCatch();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', tryCatch);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', tryCatch);
    };
  }, [enabled, onCatch]);
}
