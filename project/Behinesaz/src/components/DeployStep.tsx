import { Mail, Cloud, KeyRound, ExternalLink, RefreshCw } from 'lucide-react';
import type { Lang } from '@/i18n';
import { t } from '@/i18n';
import type { LogEntry, DeployResult } from '@/types';
import { DeployLog } from './DeployLog';

interface DeployStepProps {
  lang: Lang;
  logEntries: LogEntry[];
  result: DeployResult | null;
  showRetry: boolean;
  onRetry: () => void;
  onBack: () => void;
  onCopy: (text: string) => void;
}

export function DeployStep(props: DeployStepProps) {
  const { lang, result } = props;

  return (
    <div className="mc-sec on">
      <span className="mc-eyebrow">{t(lang, 'ey_ship')}</span>
      <h2>{t(lang, 'h_deploy')}</h2>

      <DeployLog entries={props.logEntries} />

      {result && (
        <div className="mc-result">
          <span className="ring" />
          <div className="chk">
            <RefreshCw size={20} />
          </div>
          <h3>{t(lang, 'res_title')}</h3>
          <p>{t(lang, 'res_lede')}</p>

          <div className="mc-linkbox">
            <div className="k">{t(lang, 'res_panel')}</div>
            <div className="mc-linkrow">
              <div className="v">{result.panelUrl}</div>
              <button className="mc-btn" onClick={() => props.onCopy(result.panelUrl)}>
                {t(lang, 'copy')}
              </button>
              <a
                className="mc-btn mc-btn-primary"
                href={result.panelUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                {t(lang, 'open_panel')}
              </a>
            </div>
          </div>

          <div className="mc-linkbox">
            <div className="k">{t(lang, 'res_base')}</div>
            <div className="mc-linkrow">
              <div className="v">{result.baseUrl}</div>
              <button className="mc-btn" onClick={() => props.onCopy(result.baseUrl)}>
                {t(lang, 'copy')}
              </button>
            </div>
          </div>

          <div className="mc-meta">
            <span>{result.method}</span>
            <span>{result.scriptName}</span>
            <span>KV {result.kvId.slice(0, 8)}…</span>
          </div>

          <div className="mc-note">
            <span>🔒</span>
            <span>{t(lang, 'res_note')}</span>
          </div>
        </div>
      )}

      <div className="mc-actions">
        <button className="mc-btn mc-btn-ghost" onClick={props.onBack}>
          {t(lang, 'btn_back')}
        </button>
        <span className="spacer" />
        {props.showRetry && (
          <button className="mc-btn" onClick={props.onRetry}>
            <RefreshCw size={14} />
            {t(lang, 'btn_retry')}
          </button>
        )}
      </div>
    </div>
  );
}

export { Mail, Cloud, KeyRound };
