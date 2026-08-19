import type { Lang } from '@/i18n';
import { t } from '@/i18n';
import type { CfAccount } from '@/types';

interface AccountStepProps {
  lang: Lang;
  accounts: CfAccount[];
  accountId: string;
  onAccountChange: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AccountStep({ lang, accounts, accountId, onAccountChange, onBack, onNext }: AccountStepProps) {
  return (
    <div className="mc-sec on">
      <span className="mc-eyebrow">{t(lang, 'ey_target')}</span>
      <h2>{t(lang, 'h_account')}</h2>
      <p className="lede">{t(lang, 'lede_account')}</p>
      <div className="mc-field">
        <label>{t(lang, 'f_account_label')}</label>
        <select
          className="mc-input"
          value={accountId}
          onChange={(e) => onAccountChange(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.id.slice(0, 8)}…)
            </option>
          ))}
        </select>
      </div>
      <div className="mc-actions">
        <button className="mc-btn mc-btn-ghost" onClick={onBack}>
          {t(lang, 'btn_back')}
        </button>
        <span className="spacer" />
        <button className="mc-btn mc-btn-primary" onClick={onNext} disabled={!accountId}>
          {t(lang, 'btn_continue')}
        </button>
      </div>
    </div>
  );
}
