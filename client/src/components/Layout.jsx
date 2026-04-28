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

  const link = (to) => ({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ');

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🏥</span>
          <span className={styles.brandText}>RuralHealth</span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/households"     className={link('/households')}>
            <span className={styles.icon}>🏠</span> {t('nav.households')}
          </NavLink>
          <NavLink to="/search"         className={link('/search')}>
            <span className={styles.icon}>🔍</span> {t('nav.search')}
          </NavLink>
          <NavLink to="/notifications"  className={link('/notifications')}>
            <span className={styles.icon}>🔔</span> {t('nav.notifications')}
          </NavLink>
          <NavLink to="/field-visits"   className={link('/field-visits')}>
            <span className={styles.icon}>📍</span> {t('nav.fieldVisits')}
          </NavLink>

          {(isDoctor || isAdmin) && (
            <NavLink to="/my-pregnancies" className={link('/my-pregnancies')}>
              <span className={styles.icon}>🤰</span> My Pregnancies
            </NavLink>
          )}

          {isAdmin && (
            <>
              <div className={styles.navDivider} />
              <NavLink to="/admin/users"          className={link('/admin/users')}>
                <span className={styles.icon}>👥</span> {t('nav.users')}
              </NavLink>
              <NavLink to="/admin/locations"      className={link('/admin/locations')}>
                <span className={styles.icon}>🗾</span> Locations
              </NavLink>
              <NavLink to="/admin/reports"        className={link('/admin/reports')}>
                <span className={styles.icon}>📊</span> {t('nav.reports')}
              </NavLink>
              <NavLink to="/admin/outbreaks"      className={link('/admin/outbreaks')}>
                <span className={styles.icon}>⚠️</span> Outbreaks
              </NavLink>
              <NavLink to="/admin/households/map" className={link('/admin/households/map')}>
                <span className={styles.icon}>🗺️</span> {t('nav.householdMap')}
              </NavLink>
              <NavLink to="/admin/import"         className={link('/admin/import')}>
                <span className={styles.icon}>📥</span> CSV Import
              </NavLink>
              <NavLink to="/audit-logs"           className={link('/audit-logs')}>
                <span className={styles.icon}>📋</span> {t('nav.auditLogs')}
              </NavLink>
            </>
          )}
        </nav>
      </aside>

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
            <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}


Layout.propTypes = { children: PropTypes.node };
