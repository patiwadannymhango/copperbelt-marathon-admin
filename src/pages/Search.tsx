import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from '../components/HeaderNav';
import { titleCase, formatTime } from '../utils/format';
import { listRegistrations, type AdminRegistration } from '../api/registrations';
import { listVendorRegistrations, type AdminVendorRegistration } from '../api/vendors';

type SourceKey = 'marathon' | 'lenco' | 'vendor';
type ResultRow = AdminRegistration | AdminVendorRegistration;

interface ResultGroup {
  key: SourceKey;
  label: string;
  rows: ResultRow[];
  count: number;
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  marathon: 'Marathon Registrations',
  lenco: 'Marathon — Migrated from Lenco',
  vendor: 'Vendor / Exhibitor Registrations',
};

// One search box that reaches every record in the system — the regular
// Registrations/Vendors/Lenco pages each only search their own slice (and
// the main Registrations list excludes Lenco-migrated rows by default), so
// "is this person anywhere at all" otherwise means checking three places by
// hand. This fires the same search query at all three in parallel and
// groups whatever comes back by where it lives.
export default function Search() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGroups([]);
      setSearched(false);
      setError('');
      return;
    }

    const handle = setTimeout(() => {
      setLoading(true);
      setError('');
      Promise.all([
        listRegistrations({ search: q, ordering: '-registered_at' }),
        listRegistrations({ search: q, created_via: 'LENCO_MIGRATION', ordering: '-registered_at' }),
        listVendorRegistrations({ search: q, ordering: '-registered_at' }),
      ])
        .then(([marathon, lenco, vendor]) => {
          setGroups([
            { key: 'marathon', label: SOURCE_LABELS.marathon, rows: marathon.results, count: marathon.count },
            { key: 'lenco', label: SOURCE_LABELS.lenco, rows: lenco.results, count: lenco.count },
            { key: 'vendor', label: SOURCE_LABELS.vendor, rows: vendor.results, count: vendor.count },
          ]);
          setSearched(true);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Search failed.'))
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="page">
      <div className="header">
        <div className="header-left">
          <div className="header-title">
            <p className="eyebrow">COPPERBELT MARATHON 2026</p>
            <h1>Search</h1>
          </div>
          <HeaderNav />
        </div>
        <div className="header-right">
          <span className="live-indicator">
            <span className="live-dot" />
            Live · {formatTime(now)}
          </span>
          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="filters-row">
        <input
          className="filter-input"
          style={{ flex: 1, minWidth: 320 }}
          placeholder="Search every record by name, email, phone, or reference number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query.trim().length < 2 && (
        <div className="empty-state">
          Type at least 2 characters to search across every marathon registration, Lenco-migrated
          record, and vendor/exhibitor entry at once.
        </div>
      )}

      {loading && <div className="loading-state">Searching…</div>}

      {!loading && searched && (
        <p className="filters-count" style={{ margin: '0 0 16px' }}>
          {totalCount} result{totalCount === 1 ? '' : 's'} across all records
        </p>
      )}

      {!loading &&
        searched &&
        groups.map((g) => (
          <div className="table-card" key={g.key} style={{ marginBottom: 24 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <strong>{g.label}</strong>{' '}
              <span className="dim">
                ({g.count} match{g.count === 1 ? '' : 'es'}
                {g.count > g.rows.length ? `, showing first ${g.rows.length}` : ''})
              </span>
            </div>
            {g.rows.length === 0 ? (
              <div className="empty-state">No matches.</div>
            ) : (
              <div className="table-scroll">
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.registration_number}</td>
                        <td className="name">
                          {r.participant.first_name} {r.participant.last_name}
                        </td>
                        <td>{r.category_name}</td>
                        <td className={r.participant.phone ? '' : 'dim'}>
                          {r.participant.phone || '—'}
                        </td>
                        <td className={r.participant.email ? '' : 'dim'}>
                          {r.participant.email || '—'}
                        </td>
                        <td>
                          <span className={`status-badge status-${r.status}`}>
                            {titleCase(r.status)}
                          </span>
                        </td>
                        <td className="dim">{new Date(r.registered_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
