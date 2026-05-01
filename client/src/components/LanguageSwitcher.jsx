import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'mr', label: 'म' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginRight: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Lang
      </span>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => change(code)}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: i18n.language === code ? '#1b6ca8' : '#e2e8f0',
            background: i18n.language === code ? '#eff6ff' : 'white',
            color: i18n.language === code ? '#1b6ca8' : '#64748b',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: i18n.language === code ? 700 : 500,
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
