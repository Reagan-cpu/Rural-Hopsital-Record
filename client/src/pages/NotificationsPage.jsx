import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { notificationsApi } from '../api/notifications.js';
import Spinner from '../components/Spinner.jsx';
import Badge from '../components/Badge.jsx';
import { fmtDateTime } from '../utils/date.js';
import { fmtStatus } from '../utils/format.js';
import styles from './simple-page.module.css';

export default function NotificationsPage() {
  const { session } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 50, offset: 0 }),
    enabled: !!session,
  });

  const items = data?.items ?? [];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Notifications</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 24 }}>
        Alert center for health monitoring, scheduled reminders, and system events.
      </p>
      {isLoading && <Spinner center />}
      {!isLoading && items.length === 0 && <p className={styles.empty}>No notifications available.</p>}
      <div className={styles.list}>
        {items.map((n) => (
          <div key={n.id} className={[styles.item, n.read_at ? styles.read : ''].join(' ')}>
            <div className={styles.itemTop}>
              <Badge color="blue">{fmtStatus(n.type)}</Badge>
              <span className={styles.time}>{fmtDateTime(n.scheduled_for)}</span>
            </div>
            <p className={styles.message}>{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
