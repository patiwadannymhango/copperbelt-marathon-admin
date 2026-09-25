import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from '../components/HeaderNav';
import { formatTime, bucketStatusCounts, titleCase } from '../utils/format';
import { TSHIRT_SIZE_OPTIONS, GENDER_OPTIONS } from '../utils/formOptions';
import { getRegistrationSummary, type RegistrationSummary } from '../api/registrations';

const REFRESH_INTERVAL_MS = 30000;
const SOURCE_ORDER = ['PUBLIC', 'ADMIN', 'LENCO_MIGRATION', 'UNKNOWN'];

// Display-only relabeling for the "By race category" table — the
// distance is spelled out here specifically because that's what makes
// the category recognizable at a glance on this page. The underlying
// category name (used everywhere else: Registrations, the public form,
// bulk-upload templates) is untouched.
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'Full Marathon': '42 KM - Full Marathon',
  'Half Marathon': '21KM - Half Marathon',
  'Fun Run & Walk': '5KM Fun Run & Walk',
};

function categoryDisplayName(name: string): string {
  return CATEGORY_DISPLAY_NAMES[name] || name;
}

// Read-only progress view — total registrations, a per-race-category
// breakdown (confirmed / awaiting-pending / reserved / exempted), and a
// t-shirt size breakdown. Never creates, edits, or deletes a record; it
// only reads the aggregate counts the summary endpoint computes.
export default function Summary() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [summary, setSummary] = useState<RegistrationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    getRegistrationSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load summary.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const poll = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, []);

  const overall = summary
    ? bucketStatusCounts(summary.by_category.flatMap((c) => c.by_status))
    : null;

  const tshirtRows = summary
    ? [...summary.by_tshirt_size].sort((a, b) => {
        if (!a.size) return 1;
        if (!b.size) return -1;
        const ai = TSHIRT_SIZE_OPTIONS.indexOf(a.size);
        const bi = TSHIRT_SIZE_OPTIONS.indexOf(b.size);
        if (ai === -1 && bi === -1) return a.size.localeCompare(b.size);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : [];
  const tshirtTotal = tshirtRows.reduce((sum, t) => sum + t.count, 0);

  const genderRows = summary
    ? [...summary.by_gender].sort((a, b) => {
        if (!a.gender) return 1;
        if (!b.gender) return -1;
        const ai = GENDER_OPTIONS.indexOf(a.gender);
        const bi = GENDER_OPTIONS.indexOf(b.gender);
        if (ai === -1 && bi === -1) return a.gender.localeCompare(b.gender);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : [];
  const genderTotal = genderRows.reduce((sum, g) => sum + g.count, 0);

  const sourceRows = summary
    ? [...summary.by_source].sort((a, b) => {
        const ai = SOURCE_ORDER.indexOf(a.source);
        const bi = SOURCE_ORDER.indexOf(b.source);
        if (ai === -1 && bi === -1) return a.source_display.localeCompare(b.source_display);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : [];
  const sourceTotal = sourceRows.reduce((sum, s) => sum + s.count, 0);
  const lencoCount = sourceRows.find((s) => s.source === 'LENCO_MIGRATION')?.count ?? 0;

  return (
    <div className="page">
      <div className="header">
        <div className="header-left">
          <div className="header-title">
            <p className="eyebrow">COPPERBELT MARATHON 2026</p>
            <h1>Summary</h1>
          </div>
          <HeaderNav />
        </div>
        <div className="header-right">
          <span className="live-indicator">
            <span className="live-dot" />
            Live · {formatTime(now)}
          </span>
          <button className="btn" onClick={() => load()}>
            ↻ Refresh
          </button>
          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {loading && !summary && <div className="loading-state">Loading…</div>}

      {summary && overall && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <p className="stat-label">TOTAL</p>
              <p className="stat-value">{summary.total_registrations}</p>
              <p className="stat-sub">registrations (incl. Lenco records)</p>
            </div>
            <div className="stat-card paid">
              <p className="stat-label">CONFIRMED</p>
              <p className="stat-value">{overall.Confirmed}</p>
              <p className="stat-sub">confirmed</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">AWAITING | PENDING</p>
              <p className="stat-value">{overall.Unconfirmed}</p>
              <p className="stat-sub">awaiting confirmation</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">RESERVED</p>
              <p className="stat-value">{overall.Reserved}</p>
              <p className="stat-sub">reserved</p>
            </div>
            {overall.Exempted > 0 && (
              <div className="stat-card">
                <p className="stat-label">EXEMPTED</p>
                <p className="stat-value">{overall.Exempted}</p>
                <p className="stat-sub">cancelled | expired | refunded</p>
              </div>
            )}
            {lencoCount > 0 && (
              <div className="stat-card highlight">
                <p className="stat-label">FROM LENCO</p>
                <p className="stat-value">{lencoCount}</p>
                <p className="stat-sub">migrated — excluded from Registrations</p>
              </div>
            )}
          </div>

          <div className="table-card">
            <div className="summary-section-title">By race category</div>
            <div className="table-scroll">
              <table className="reg-table summary-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Confirmed</th>
                    <th>Awaiting | Pending</th>
                    <th>Reserved</th>
                    <th>Exempted</th>
                    <th>Total</th>
                    <th>From Lenco</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_category.map((cat) => {
                    const b = bucketStatusCounts(cat.by_status);
                    const pct = cat.capacity ? Math.round((cat.total / cat.capacity) * 100) : null;
                    return (
                      <tr key={cat.category_id}>
                        <td className="name">{categoryDisplayName(cat.category_name)}</td>
                        <td className="num-confirmed">{b.Confirmed}</td>
                        <td className="num-pending">{b.Unconfirmed}</td>
                        <td className="num-reserved">{b.Reserved}</td>
                        <td className="dim">{b.Exempted || '—'}</td>
                        <td className="name">{cat.total}</td>
                        <td>
                          {cat.lenco_count > 0 ? (
                            <span className="lenco-badge">{cat.lenco_count} Lenco</span>
                          ) : (
                            <span className="dim">—</span>
                          )}
                        </td>
                        <td className={cat.capacity ? '' : 'dim'}>
                          {cat.capacity ? `${cat.total} / ${cat.capacity} (${pct}%)` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="name">All categories</td>
                    <td className="num-confirmed">{overall.Confirmed}</td>
                    <td className="num-pending">{overall.Unconfirmed}</td>
                    <td className="num-reserved">{overall.Reserved}</td>
                    <td className="dim">{overall.Exempted || '—'}</td>
                    <td className="name">{summary.total_registrations}</td>
                    <td>
                      {lencoCount > 0 ? (
                        <span className="lenco-badge">{lencoCount} Lenco</span>
                      ) : (
                        <span className="dim">—</span>
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="table-card" style={{ marginTop: 18 }}>
            <div className="summary-section-title">T-shirt sizes</div>
            <div className="tshirt-grid">
              {tshirtRows.map((t) => (
                <div className="tshirt-chip" key={t.size || 'unspecified'}>
                  <span className="tshirt-size">{t.size || 'Not specified'}</span>
                  <span className="tshirt-count">{t.count}</span>
                  {t.lenco_count > 0 && <span className="lenco-badge">{t.lenco_count} Lenco</span>}
                </div>
              ))}
              {tshirtRows.length === 0 && <p className="dim">No sizes recorded yet.</p>}
            </div>
            {tshirtRows.length > 0 && (
              <p className="summary-footnote">{tshirtTotal} total across all sizes.</p>
            )}
          </div>

          <div className="table-card" style={{ marginTop: 18 }}>
            <div className="summary-section-title">Gender</div>
            <div className="tshirt-grid">
              {genderRows.map((g) => (
                <div className="tshirt-chip" key={g.gender || 'unspecified'}>
                  <span className="tshirt-size">{g.gender ? titleCase(g.gender) : 'Not specified'}</span>
                  <span className="tshirt-count">{g.count}</span>
                  {g.lenco_count > 0 && <span className="lenco-badge">{g.lenco_count} Lenco</span>}
                </div>
              ))}
              {genderRows.length === 0 && <p className="dim">No gender recorded yet.</p>}
            </div>
            {genderRows.length > 0 && (
              <p className="summary-footnote">{genderTotal} total.</p>
            )}
          </div>

          <div className="table-card" style={{ marginTop: 18 }}>
            <div className="summary-section-title">Source</div>
            <div className="tshirt-grid">
              {sourceRows.map((s) => (
                <div
                  className={s.source === 'LENCO_MIGRATION' ? 'tshirt-chip tshirt-chip-highlight' : 'tshirt-chip'}
                  key={s.source}
                >
                  <span className="tshirt-size">{s.source_display}</span>
                  <span className="tshirt-count">{s.count}</span>
                </div>
              ))}
              {sourceRows.length === 0 && <p className="dim">No records yet.</p>}
            </div>
            {sourceRows.length > 0 && (
              <p className="summary-footnote">
                {sourceTotal} total — the Registrations page excludes Lenco records from its own
                counts; they're still managed from the "Lenco Records" section.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
