import type { Lang } from '@/i18n';
import { t } from '@/i18n';
import type { CfZone } from '@/types';
import { validName, validPath, validHost } from '@/cf-api';

interface ConfigStepProps {
  lang: Lang;
  scriptName: string;
  uuid: string;
  customPath: string;
  customDomain: string;
  zoneId: string;
  sourceUrl: string;
  zones: CfZone[];
  onScriptNameChange: (v: string) => void;
  onUuidChange: (v: string) => void;
  onCustomPathChange: (v: string) => void;
  onCustomDomainChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  onSourceUrlChange: (v: string) => void;
  onRerollName: () => void;
  onRerollUuid: () => void;
  onBack: () => void;
  onDeploy: () => void;
}

export function ConfigStep(props: ConfigStepProps) {
  const { lang } = props;

  return (
    <div className="mc-sec on">
      <span className="mc-eyebrow">{t(lang, 'ey_build')}</span>
      <h2>{t(lang, 'h_config')}</h2>
      <p className="lede">{t(lang, 'lede_config')}</p>

      <div className="mc-field">
        <label>{t(lang, 'f_name_label')}</label>
        <div className="mc-with-btn">
          <input
            className="mc-input mono"
            value={props.scriptName}
            spellCheck={false}
            onChange={(e) => props.onScriptNameChange(e.target.value.trim().toLowerCase())}
          />
          <button type="button" title="regenerate" onClick={props.onRerollName}>
            ⟳
          </button>
        </div>
        <div className="hint">{t(lang, 'f_name_help')}</div>
      </div>

      <div className="mc-field">
        <label>{t(lang, 'f_uuid_label')}</label>
        <div className="mc-with-btn">
          <input
            className="mc-input mono"
            value={props.uuid}
            spellCheck={false}
            onChange={(e) => props.onUuidChange(e.target.value.trim())}
          />
          <button type="button" title="regenerate" onClick={props.onRerollUuid}>
            ⟳
          </button>
        </div>
        <div className="hint">{t(lang, 'f_uuid_help')}</div>
      </div>

      <div className="mc-field">
        <label>{t(lang, 'f_path_label')}</label>
        <input
          className="mc-input mono"
          value={props.customPath}
          spellCheck={false}
          placeholder={t(lang, 'f_path_ph')}
          onChange={(e) => props.onCustomPathChange(e.target.value.trim())}
        />
        <div className="hint">{t(lang, 'f_path_help')}</div>
      </div>

      <div className="mc-field">
        <label>{t(lang, 'f_domain_label')}</label>
        <input
          className="mc-input mono"
          value={props.customDomain}
          spellCheck={false}
          placeholder={t(lang, 'f_domain_ph')}
          onChange={(e) => props.onCustomDomainChange(e.target.value.trim())}
        />
        <div className="hint">{t(lang, 'f_domain_help')}</div>
      </div>

      {props.customDomain && (
        <div className="mc-field">
          <label>{t(lang, 'f_zone_label')}</label>
          <select
            className="mc-input"
            value={props.zoneId}
            onChange={(e) => props.onZoneChange(e.target.value)}
          >
            <option value="">—</option>
            {props.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <details style={{ marginTop: 14 }}>
        <summary
          style={{
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--t2)',
          }}
        >
          {t(lang, 'adv_src')}
        </summary>
        <div className="mc-field">
          <label>{t(lang, 'f_source_label')}</label>
          <input
            className="mc-input mono"
            value={props.sourceUrl}
            spellCheck={false}
            onChange={(e) => props.onSourceUrlChange(e.target.value.trim())}
          />
          <div className="hint">{t(lang, 'f_source_help')}</div>
        </div>
      </details>

      <div className="mc-actions">
        <button className="mc-btn mc-btn-ghost" onClick={props.onBack}>
          {t(lang, 'btn_back')}
        </button>
        <span className="spacer" />
        <button
          className="mc-btn mc-btn-primary"
          onClick={() => {
            if (!validName(props.scriptName)) return;
            if (!validPath(props.customPath)) return;
            if (props.customDomain) {
              if (!validHost(props.customDomain)) return;
              if (!props.zoneId) return;
            }
            props.onDeploy();
          }}
        >
          {t(lang, 'btn_deploy')}
        </button>
      </div>
    </div>
  );
}
