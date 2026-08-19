import { Zap, FileText } from 'lucide-react';
import type { Lang } from '@/i18n';
import { t } from '@/i18n';
import type { DeployMethod } from '@/types';

interface MethodStepProps {
  lang: Lang;
  method: DeployMethod;
  sourceUrl: string;
  onMethodChange: (m: DeployMethod) => void;
  onSourceChange: (url: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function MethodStep({ lang, method, sourceUrl, onMethodChange, onSourceChange, onBack, onNext }: MethodStepProps) {
  return (
    <div className="mc-sec on">
      <span className="mc-eyebrow">{t(lang, 'ey_runtime')}</span>
      <h2>{t(lang, 'h_method')}</h2>
      <p className="lede">{t(lang, 'lede_method')}</p>

      <div className="mc-seg" role="radiogroup">
        <button
          type="button"
          role="radio"
          aria-checked={method === 'workers'}
          onClick={() => onMethodChange('workers')}
        >
          <b>
            <Zap size={16} />
            <span>{t(lang, 'method_workers')}</span>
          </b>
          <small>{t(lang, 'method_workers_d')}</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={method === 'pages'}
          onClick={() => onMethodChange('pages')}
        >
          <b>
            <FileText size={16} />
            <span>{t(lang, 'method_pages')}</span>
            <span className="beta">beta</span>
          </b>
          <small>{t(lang, 'method_pages_d')}</small>
        </button>
      </div>

      <div className="mc-field" style={{ marginTop: 16 }}>
        <label>{t(lang, 'f_source_select_label')}</label>
        <select className="mc-input" value={sourceUrl} onChange={(e) => onSourceChange(e.target.value)}>
          <option value="./worker-source.js">{t(lang, 'source_worker')}</option>
          <option value="./Source.js">{t(lang, 'source_alt')}</option>
        </select>
        <div className="hint">{t(lang, 'f_source_select_help')}</div>
      </div>

      <div className="mc-actions">
        <button className="mc-btn mc-btn-ghost" onClick={onBack}>
          {t(lang, 'btn_back')}
        </button>
        <span className="spacer" />
        <button className="mc-btn mc-btn-primary" onClick={onNext}>
          {t(lang, 'btn_continue')}
        </button>
      </div>
    </div>
  );
}
