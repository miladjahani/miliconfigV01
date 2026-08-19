import { LayoutDashboard, Activity, Server, Database, ExternalLink } from 'lucide-react';
import type { Lang } from '@/i18n';
import { t } from '@/i18n';

interface DashboardStepProps {
  lang: Lang;
  onContinue: () => void;
}

export function DashboardStep({ lang, onContinue }: DashboardStepProps) {
  const stats = [
    { icon: Server, label: 'Workers', value: '0', color: 'var(--blue)' },
    { icon: Database, label: 'KV Namespaces', value: '0', color: 'var(--lime)' },
    { icon: Activity, label: 'D1 Databases', value: '0', color: 'var(--amber)' },
    { icon: LayoutDashboard, label: 'Pages Projects', value: '0', color: 'var(--green)' },
  ];

  return (
    <div className="mc-sec on">
      <span className="mc-eyebrow">{t(lang, 'dashboard_title')}</span>
      <h2>{t(lang, 'dashboard_welcome')}</h2>
      <p className="mc-lede">{t(lang, 'dashboard_lede')}</p>

      <div className="dash-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="dash-card">
            <div className="dash-icon" style={{ background: stat.color + '20', color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="dash-info">
              <span className="dash-value">{stat.value}</span>
              <span className="dash-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-quickstart">
        <h3>{t(lang, 'qs_title')}</h3>
        <div className="qs-track">
          <div className="qs-card">
            <div className="top"><span className="num">1</span><span className="ic">✉</span></div>
            <b>{t(lang, 'qs_step1_t')}</b>
            <small>{t(lang, 'qs_step1_d')}</small>
            <a href="https://temp-mail.org" target="_blank" rel="noopener noreferrer" className="mc-btn mc-btn-ghost">
              {t(lang, 'qs_step1_btn')} ↗
            </a>
          </div>
          <div className="qs-card">
            <div className="top"><span className="num">2</span><span className="ic">☁</span></div>
            <b>{t(lang, 'qs_step2_t')}</b>
            <small>{t(lang, 'qs_step2_d')}</small>
            <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" className="mc-btn mc-btn-ghost">
              {t(lang, 'qs_step2_btn')} ↗
            </a>
          </div>
          <div className="qs-card">
            <div className="top"><span className="num">3</span><span className="ic">🔑</span></div>
            <b>{t(lang, 'qs_step3_t')}</b>
            <small>{t(lang, 'qs_step3_d')}</small>
            <button className="mc-btn mc-btn-primary" onClick={onContinue}>
              {t(lang, 'qs_step3_btn')} →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin: 24px 0;
        }
        .dash-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: transform 0.2s, border-color 0.2s;
        }
        .dash-card:hover {
          transform: translateY(-2px);
          border-color: var(--lime);
        }
        .dash-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex: none;
        }
        .dash-info {
          display: flex;
          flex-direction: column;
        }
        .dash-value {
          font-family: var(--disp);
          font-size: 24px;
          font-weight: 800;
          color: var(--t0);
        }
        .dash-label {
          font-size: 12px;
          color: var(--t2);
          margin-top: 2px;
        }
        .dash-quickstart {
          margin-top: 32px;
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
        }
        .dash-quickstart h3 {
          font-family: var(--disp);
          font-size: 16px;
          font-weight: 700;
          color: var(--t1);
          margin-bottom: 16px;
        }
        .qs-track {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .qs-card {
          background: var(--ink2);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .qs-card .top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .qs-card .num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--g-lime);
          color: var(--lime);
          display: grid;
          place-items: center;
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 800;
        }
        .qs-card .ic {
          font-size: 18px;
        }
        .qs-card b {
          font-family: var(--disp);
          font-size: 14px;
          font-weight: 700;
          color: var(--t0);
        }
        .qs-card small {
          font-size: 11px;
          color: var(--t2);
          line-height: 1.5;
        }
        .qs-card .mc-btn {
          margin-top: 8px;
          font-size: 12px;
          padding: 8px 12px;
        }
      `}</style>
    </div>
  );
}
