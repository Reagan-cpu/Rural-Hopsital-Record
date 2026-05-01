import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { searchApi } from '../api/search.js';
import { fmtGender, fmtStatus, statusColor } from '../utils/format.js';
import { fmtDate, calcAge } from '../utils/date.js';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import Input from '../components/Input.jsx';
import styles from './search-page.module.css';

export default function SearchPage() {
  const { session } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 20;
  const dq = useDebounce(q, 350);
  const effectiveQuery = dq.length >= 2 ? dq : '';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['person-search', effectiveQuery, page],
    queryFn: () => searchApi.person(effectiveQuery, { limit: LIMIT, offset: page * LIMIT }),
    enabled: !!session,
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Person Search</h1>
      <p className={styles.hint}>Search by name, Health ID, or phonetic match (e.g. "Raam" finds "Ram")</p>

      <div className={styles.searchBar}>
        <Input
          placeholder="Name or Health ID (e.g. HID-MH-A3K7-4)…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(0); }}
          autoFocus
        />
        {(isLoading || isFetching) && <Spinner size="sm" />}
      </div>

      {dq.length > 0 && dq.length < 2 && (
        <p className={styles.hint}>Type at least 2 characters to filter results.</p>
      )}

      {effectiveQuery.length >= 2 && !isLoading && items.length === 0 && (
        <p className={styles.empty}>No matches found for "{effectiveQuery}".</p>
      )}

      {items.length > 0 && (
        <>
          <p className={styles.count}>{total} result{total !== 1 ? 's' : ''}</p>
          <div className={styles.results}>
            {items.map(m => (
              <Link key={m.id} to={`/members/${m.id}`} className={styles.card}>
                <div className={styles.avatar}>{m.full_name[0]?.toUpperCase()}</div>
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{m.full_name}</span>
                    <Badge color={statusColor(m.status)}>{fmtStatus(m.status)}</Badge>
                  </div>
                  <div className={styles.meta}>
                    <span>{fmtGender(m.gender)}{calcAge(m.date_of_birth) !== null ? `, ${calcAge(m.date_of_birth)} yrs` : ''}</span>
                    {m.date_of_birth && <span>DOB: {fmtDate(m.date_of_birth)}</span>}
                    {m.health_id && <span className={styles.hid}>{m.health_id}</span>}
                  </div>
                  <div className={styles.location}>
                    <span>HH: {m.malaria_number}</span>
                    {m.village  && <span>{m.village}</span>}
                    {m.district && <span>{m.district}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
