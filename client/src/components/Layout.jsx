import { NavLink, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import { fmtRole } from '../utils/format.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import styles from './layout.module.css';

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const { isAdmin, isDoctor } = useRole();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const link = (to) => ({ isActive }) =>
    [styles.link, isActive ? styles.active : ''].join(' ');

  // Generate initials for avatar
  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={styles.shell}>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>🏥</div>
          <span className={styles.brandText}>RuralHealth</span>
        </div>

        <nav className={styles.nav}>

          {/* Core */}
          <span className={styles.navSection}>Core</span>
          <NavLink to="/households" className={link('/households')}>
            <span className={styles.icon}>🏠</span>
            <span>{t('nav.households')}</span>
          </NavLink>
          <NavLink to="/search" className={link('/search')}>
            <span className={styles.icon}>🔍</span>
            <span>{t('nav.search')}</span>
          </NavLink>
          <NavLink to="/field-visits" className={link('/field-visits')}>
            <span className={styles.icon}>📍</span>
            <span>{t('nav.fieldVisits')}</span>
          </NavLink>

          {/* Clinical */}
          {(isDoctor || isAdmin) && (
            <>
              <span className={styles.navSection}>Clinical</span>
              <NavLink to="/my-pregnancies" className={link('/my-pregnancies')}>
                <span className={styles.icon}>🤰</span>
                <span>Pregnancies</span>
              </NavLink>
              <NavLink to="/notifications" className={link('/notifications')}>
                <span className={styles.icon}>🔔</span>
                <span>{t('nav.notifications')}</span>
              </NavLink>
            </>
          )}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <span className={styles.navSection}>Administration</span>
              <NavLink to="/admin/users" className={link('/admin/users')}>
                <span className={styles.icon}>👥</span>
                <span>{t('nav.users')}</span>
              </NavLink>
              <NavLink to="/admin/locations" className={link('/admin/locations')}>
                <span className={styles.icon}>🗾</span>
                <span>Locations</span>
              </NavLink>
              <NavLink to="/admin/reports" className={link('/admin/reports')}>
                <span className={styles.icon}>📊</span>
                <span>{t('nav.reports')}</span>
              </NavLink>
              <NavLink to="/admin/outbreaks" className={link('/admin/outbreaks')}>
                <span className={styles.icon}>⚠️</span>
                <span>Outbreaks</span>
              </NavLink>
              <NavLink to="/admin/households/map" className={link('/admin/households/map')}>
                <span className={styles.icon}>🗺️</span>
                <span>{t('nav.householdMap')}</span>
              </NavLink>
              <NavLink to="/admin/import" className={link('/admin/import')}>
                <span className={styles.icon}>📥</span>
                <span>CSV Import</span>
              </NavLink>
              <NavLink to="/audit-logs" className={link('/audit-logs')}>
                <span className={styles.icon}>📋</span>
                <span>{t('nav.auditLogs')}</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar Footer — user + sign out */}
        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarUser}>
            <div className={styles.sidebarAvatar}>{initials}</div>
            <div className={styles.sidebarUserInfo}>
              <div className={styles.sidebarUserName}>{profile?.full_name ?? '…'}</div>
              <div className={styles.sidebarUserRole}>{fmtRole(profile?.role)}</div>
            </div>
            <button
              className={styles.sidebarSignOut}
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className={styles.container}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <LanguageSwitcher />
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{profile?.full_name ?? '…'}</div>
              <div className={styles.userRole}>{fmtRole(profile?.role)}</div>
            </div>
            <button className={styles.signOut} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

    </div>
  );
}

Layout.propTypes = { children: PropTypes.node };
