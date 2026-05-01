import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useRole } from '../hooks/useRole.js';
import { apiFetch } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import { fmtDate } from '../utils/date.js';
import styles from './page.module.css';

const RISK_COLOR = { low: 'green', medium: 'yellow', high: 'red' };

function fetchPregnancies(params = {}) {
  const searchParams = new URLSearchParams({
    status: 'active',
    limit: '100',
    offset: '0',
    ...params
  });
  return apiFetch(`/pregnancies?${searchParams.toString()}`);
}

export default function MyPregnanciesPage() {
  const { session } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['pregnancies'],
    queryFn: () => fetchPregnancies(),
    enabled: !!session,
    staleTime: 0,
    gcTime: 0,
  });

  if (isLoading) return <Spinner center />;

  const items = (data?.items ?? []).sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    const riskDiff = (riskOrder[a.risk_level] ?? 2) - (riskOrder[b.risk_level] ?? 2);
    if (riskDiff !== 0) return riskDiff;
    return (a.expected_due_date ?? '').localeCompare(b.expected_due_date ?? '');
  });

  const riskRowBg = { high: '#fff1f2', medium: '#fffbeb', low: '#f0fdf4' };
  const riskBorder = { high: '#fca5a5', medium: '#fbbf24', low: '#86efac' };

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ marginBottom: 24 }}>
        <div>
          <h1 className={styles.heading}>Pregnancy Registry</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>
            Active pregnancies within your assigned monitoring area.
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <p style={{ color: 'var(--color-muted)', marginTop: 24 }}>No active pregnancies found in your area.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((p) => (
          <div
            key={p.id}
            style={{
              background: riskRowBg[p.risk_level] ?? 'var(--color-surface)',
              border: `1px solid ${riskBorder[p.risk_level] ?? '#e5e7eb'}`,
              borderRadius: 8,
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{p.member_name}</span>
                <Badge color={RISK_COLOR[p.risk_level] ?? 'gray'}>{p.risk_level} risk</Badge>
                {p.trimester && <Badge color="gray">Trimester {p.trimester}</Badge>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {p.lmp_date && <span>LMP: {fmtDate(p.lmp_date)}</span>}
                {p.expected_due_date && <span>EDD: <strong>{fmtDate(p.expected_due_date)}</strong></span>}
                {p.member_contact && <span>📞 {p.member_contact}</span>}
                {p.missed_checkup_count > 0 && (
                  <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{p.missed_checkup_count} missed checkup{p.missed_checkup_count !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
            <Link
              to={`/members/${p.member_id}`}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: 'white',
                border: '1px solid #e5e7eb',
                fontSize: 13,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                fontWeight: 500
              }}
            >
              View patient →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
