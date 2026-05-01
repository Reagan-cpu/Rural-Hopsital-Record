import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { householdsApi } from '../api/households.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import HouseholdForm from '../features/households/HouseholdForm.jsx';
import { useRole } from '../hooks/useRole.js';
import { fmtStatus, statusColor } from '../utils/format.js';
import styles from './households-page.module.css';

export default function HouseholdsPage() {
  const { session } = useAuth();
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [village, setVillage] = useState('');
  const [status, setStatus] = useState('');
  const [showUnclassified, setShowUnclassified] = useState(false);
  const [page, setPage] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const limit = 20;
  const debouncedSearch = useDebounce(search);

  const params = showUnclassified
    ? { unclassified: 'true', limit, offset: page * limit }
    : {
        ...(debouncedSearch.length >= 2 ? { q: debouncedSearch } : {}),
        ...(village ? { village } : {}),
        ...(status ? { status } : {}),
        limit,
        offset: page * limit,
      };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['households', params],
    queryFn: () => householdsApi.list(params),
    enabled: !!session,
    staleTime: 0,
    gcTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => householdsApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['households'] }); setShowNew(false); },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Households</h1>
          {!isLoading && <p className={styles.count}>{total} total</p>}
        </div>
        <Button onClick={() => setShowNew(true)}>+ New Household</Button>
      </div>

      {isAdmin && (
        <div className={styles.tabBar}>
          <button
            className={[styles.tabBtn, !showUnclassified ? styles.tabBtnActive : ''].join(' ')}
            onClick={() => { setShowUnclassified(false); setPage(0); }}
          >
            All Households
          </button>
          <button
            className={[styles.tabBtn, showUnclassified ? styles.tabBtnActive : ''].join(' ')}
            onClick={() => { setShowUnclassified(true); setPage(0); }}
          >
            Unclassified {showUnclassified && total > 0 ? `(${total})` : ''}
          </button>
        </div>
      )}

      <div className={styles.filters} style={showUnclassified ? { display: 'none' } : {}}>
        <Input
          placeholder="Search by member name or malaria no…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 2 }}
        />
        <Input
          placeholder="Village"
          value={village}
          onChange={(e) => { setVillage(e.target.value); setPage(0); }}
          style={{ flex: 1 }}
        />
        <select
          className={styles.select}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="migrated">Migrated</option>
          <option value="dissolved">Dissolved</option>
        </select>
      </div>

      {isLoading && <Spinner center />}
      {isError  && <p className={styles.error}>Failed to load households.</p>}

      {!isLoading && items.length === 0 && (
        <div className={styles.empty}>No households found. Create one to get started.</div>
      )}

      {items.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Malaria No.</th>
                <th>Village</th>
                <th>District</th>
                <th>Family Head</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id}>
                  <td className={styles.malaria}>{h.malaria_number}</td>
                  <td>{h.village ?? '—'}</td>
                  <td>{h.district ?? '—'}</td>
                  <td>{h.head_member?.full_name ?? '—'}</td>
                  <td><Badge color={statusColor(h.status)}>{fmtStatus(h.status)}</Badge></td>
                  <td><Link to={`/households/${h.id}`} className={styles.viewLink}>View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Button>
          <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</Button>
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Household">
        <HouseholdForm
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
          error={createMutation.error?.message}
          onCancel={() => setShowNew(false)}
        />
      </Modal>
    </div>
  );
}
