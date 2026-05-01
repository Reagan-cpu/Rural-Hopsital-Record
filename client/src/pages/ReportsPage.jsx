import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { reportsApi } from '../api/reports.js';
import Button from '../components/Button.jsx';
import Select from '../components/Select.jsx';
import Spinner from '../components/Spinner.jsx';
import styles from './reports-page.module.css';

const REPORTS = [
  { id: 'households-by-location', label: 'Households by Location',    hasDays: false },
  { id: 'member-demographics',    label: 'Member Demographics',        hasDays: false },
  { id: 'pregnancies-by-risk',    label: 'Pregnancies by Risk Level',  hasDays: false },
  { id: 'vaccination-coverage',   label: 'Vaccination Coverage',       hasDays: false },
  { id: 'disease-prevalence',     label: 'Disease Prevalence',         hasDays: true  },
  { id: 'deaths-migrations',      label: 'Deaths & Migrations',        hasDays: true  },
];

function fetchReport(id, days) {
  switch (id) {
    case 'households-by-location': return reportsApi.householdsByLocation();
    case 'member-demographics':    return reportsApi.memberDemographics();
    case 'pregnancies-by-risk':    return reportsApi.pregnanciesByRisk();
    case 'vaccination-coverage':   return reportsApi.vaccinationCoverage();
    case 'disease-prevalence':     return reportsApi.diseasePrevalence(days);
    case 'deaths-migrations':      return reportsApi.deathsMigrations(days);
    default: return Promise.resolve([]);
  }
}

function toCSV(rows) {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function downloadCSV(rows, filename) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { session } = useAuth();
  const [reportId, setReportId] = useState('households-by-location');
  const [days, setDays]         = useState(30);

  const meta = REPORTS.find(r => r.id === reportId);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['report', reportId, days],
    queryFn: () => fetchReport(reportId, days),
    enabled: !!session,
    staleTime: 60_000,
  });

  const handleDownload = () =>
    downloadCSV(data, `${reportId}-${new Date().toISOString().slice(0, 10)}.csv`);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Reports</h1>
        <div className={styles.controls}>
          <Select value={reportId} onChange={e => setReportId(e.target.value)}>
            {REPORTS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </Select>
          {meta?.hasDays && (
            <Select value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </Select>
          )}
          <Button variant="secondary" onClick={() => refetch()}>Refresh</Button>
          <Button onClick={handleDownload} disabled={!data.length}>↓ CSV</Button>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.subheading}>{meta?.label}</h2>
        {isLoading ? (
          <Spinner center />
        ) : data.length === 0 ? (
          <p className={styles.empty}>No data available.</p>
        ) : (
          <ReportTable rows={data} />
        )}
      </div>
    </div>
  );
}

function ReportTable({ rows }) {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);

  // Check if a value is numeric (handles numbers and numeric strings)
  const isNumericValue = (val) => {
    if (val === null || val === undefined || typeof val === 'boolean') return false;
    const s = String(val).trim();
    return s !== '' && !isNaN(s);
  };

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map(h => {
              const numeric = isNumericValue(rows[0][h]);
              return (
                <th 
                  key={h} 
                  className={numeric ? styles.num : ''}
                  style={numeric ? { textAlign: 'right' } : {}}
                >
                  {h.replace(/_/g, ' ')}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {headers.map(h => {
                const numeric = isNumericValue(row[h]);
                return (
                  <td 
                    key={h} 
                    className={numeric ? styles.num : ''}
                    style={numeric ? { textAlign: 'right' } : {}}
                  >
                    {row[h] ?? '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
