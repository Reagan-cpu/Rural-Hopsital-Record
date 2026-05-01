import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import styles from './login-page.module.css';

const DEMO_ACCOUNTS = [
  { email: 'admin@demo.health',   label: 'Admin',        role: 'Full access' },
  { email: 'doctor@demo.health',  label: 'Doctor',       role: 'Clinical view' },
  { email: 'doctor2@demo.health', label: 'Doctor 2',     role: 'Clinical view' },
  { email: 'staff@demo.health',   label: 'Ground Staff', role: 'Field worker' },
];

const FEATURES = [
  { icon: '🏠', text: 'Household & member registration' },
  { icon: '🤰', text: 'Pregnancy monitoring & checkups' },
  { icon: '💉', text: 'Vaccination tracking' },
  { icon: '📊', text: 'Health analytics & reports' },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/households', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>

      {/* ── Left Brand Panel ── */}
      <div className={styles.brand}>
        <div className={styles.brandBlob + ' ' + styles.brandBlob1} />
        <div className={styles.brandBlob + ' ' + styles.brandBlob2} />
        <div className={styles.brandBlob + ' ' + styles.brandBlob3} />

        <div className={styles.brandContent}>
          <div className={styles.brandLogo}>
            <div className={styles.brandLogoIcon}>🏥</div>
            <span className={styles.brandLogoName}>RuralHealth</span>
          </div>

          <h1 className={styles.brandHeading}>
            Digital health<br />records for{' '}
            <span className={styles.brandHeadingAccent}>rural India</span>
          </h1>

          <p className={styles.brandSub}>
            A unified platform for community health workers, doctors, and administrators to track household health across villages.
          </p>

          <div className={styles.brandFeatures}>
            {FEATURES.map(f => (
              <div key={f.text} className={styles.brandFeature}>
                <div className={styles.brandFeatureDot}>{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.formWrap}>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSub}>Sign in to access your health records dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="email" className={styles.fieldLabel}>Email address</label>
              <input
                id="email"
                className={styles.fieldInput}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password" className={styles.fieldLabel}>Password</label>
              <input
                id="password"
                className={styles.fieldInput}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className={styles.error}>
                ⚠️ {error}
              </p>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className={styles.demoBox}>
            <p className={styles.demoTitle}>Quick demo access · password: Demo@2026</p>
            <div className={styles.demoBtns}>
              {DEMO_ACCOUNTS.map(({ email: em, label, role }) => (
                <button
                  key={em}
                  type="button"
                  className={styles.demoBtn}
                  onClick={() => { setEmail(em); setPassword('Demo@2026'); }}
                >
                  {label}
                  <span className={styles.demoBtnRole}>{role}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
