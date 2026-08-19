import { useState } from 'react';
import { X, ExternalLink, Check, Copy } from 'lucide-react';
import type { Lang } from '@/i18n';
import { t, SCOPES } from '@/i18n';
import { buildPrefillUrl } from '@/cf-api';

interface TokenModalProps {
  lang: Lang;
  accountId: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function TokenModal({ lang, accountId, onClose, onToast }: TokenModalProps) {
  const [copiedItems, setCopiedItems] = useState<Set<number>>(new Set());

  const total = SCOPES.length;
  const done = copiedItems.size;
  const allDone = done >= total && total > 0;

  function copyResource(resource: string, idx: number) {
    navigator.clipboard?.writeText(resource).then(() => {
      setCopiedItems((prev) => new Set(prev).add(idx));
      onToast(t(lang, 'modal_copied'));
    });
  }

  function copyAll() {
    const all = SCOPES.map((s) => s.resource).join('\n');
    navigator.clipboard?.writeText(all).then(() => onToast(t(lang, 'misc_copied')));
  }

  return (
    <div className="mc-modal on" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mc-modal-card">
        <button className="mc-modal-x" type="button" aria-label="close" onClick={onClose}>
          <X size={16} />
        </button>
        <span className="mc-eyebrow">{t(lang, 'modal_ey')}</span>
        <h3>{t(lang, 'modal_title')}</h3>
        <p className="lede">{t(lang, 'modal_lede')}</p>

        <a
          className="mc-btn mc-btn-primary mc-openbtn"
          href={buildPrefillUrl(accountId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={14} />
          <span>{t(lang, 'modal_open')}</span>
        </a>

        <div className="mc-steps-box">
          {t(lang, 'modal_steps').split('→').map((part, i, arr) => (
            <span key={i}>
              {part.trim()}
              {i < arr.length - 1 && <b> → </b>}
            </span>
          ))}
        </div>

        <div className="mc-progwrap">
          <div className="mc-progtop">
            <span>{t(lang, 'modal_progress')}</span>
            <span>
              <b>{done}</b> / {total}
            </span>
          </div>
          <div className="mc-progbar">
            <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>

        <ul className="mc-ck">
          {SCOPES.map((s, idx) => {
            const isRead = s.effect.toLowerCase() === 'read';
            const copied = copiedItems.has(idx);
            return (
              <li key={s.key} className={`mc-ck-item ${copied ? 'copied' : ''}`}>
                <span className={`badge ${s.scope === 'Zone' ? 'zon' : 'acc'}`}>{s.scope}</span>
                <span className="res">{s.resource}</span>
                <span className={`eff ${isRead ? 'read' : ''}`}>{s.effect}</span>
                <span className="tick">
                  <Check size={13} />
                </span>
                <button className="cp" type="button" aria-label="copy" onClick={() => copyResource(s.resource, idx)}>
                  <Copy size={13} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className={`mc-alldone ${allDone ? 'on' : ''}`}>
          <Check size={14} />
          <span>{t(lang, 'modal_alldone')}</span>
        </div>

        <div className="mc-note-box">
          <span>ℹ</span>
          <span>{t(lang, 'modal_note')}</span>
        </div>

        <div className="mc-modal-foot">
          <button className="mc-btn" type="button" onClick={copyAll}>
            {t(lang, 'modal_copyall')}
          </button>
          <span className="spacer" />
          <button className="mc-btn mc-btn-ghost" type="button" onClick={onClose}>
            {t(lang, 'modal_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
