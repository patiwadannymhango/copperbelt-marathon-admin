import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from '../components/HeaderNav';
import { titleCase, formatTime, registrationStatusLabel } from '../utils/format';
import {
  createVendorManually,
  getVendorDashboard,
  getVendorFilterOptions,
  listVendorRegistrations,
  REQUIREMENT_OPTIONS,
  STATUS_OPTIONS,
  type AdminVendorRegistration,
  type VendorDashboardStats,
  type VendorFilterOptions,
} from '../api/vendors';

const PAGE_SIZE = 25;
const REFRESH_INTERVAL_MS = 30000;

export default function Vendors() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<VendorFilterOptions | null>(null);

  const [rows, setRows] = useState<AdminVendorRegistration[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addForm, setAddForm] = useState({
    business_name: '',
    contact_first_name: '',
    contact_last_name: '',
    email: '',
    phone: '',
    business_location: '',
    category_id: '',
    products_services: '',
    requirement: '',
    status: 'CONFIRMED',
  });

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      listVendorRegistrations({
        search,
        status: statusFilter,
        category: categoryFilter,
        ordering: '-registered_at',
        page,
      })
        .then((data) => {
          setRows(data.results);
          setCount(data.count);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load vendor registrations.'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter, categoryFilter, page]
  );

  function loadStats() {
    getVendorDashboard()
      .then(setStats)
      .catch(() => {});
  }

  useEffect(load, [load]);
  useEffect(loadStats, []);

  useEffect(() => {
    getVendorFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const poll = setInterval(() => {
      load(true);
      loadStats();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [load]);

  function handleRefresh() {
    load();
    loadStats();
  }

  function statusCount(status: string) {
    return stats?.by_status.find((s) => s.status === status)?.count ?? 0;
  }

  const pendingCount =
    statusCount('PENDING_PAYMENT') + statusCount('RESERVED') + statusCount('PAYMENT_PROCESSING');

  async function handleAddVendor() {
    setAddBusy(true);
    setError('');
    try {
      await createVendorManually({
        category_id: addForm.category_id,
        participant: {
          first_name: addForm.contact_first_name,
          last_name: addForm.contact_last_name,
          email: addForm.email,
          phone: addForm.phone,
        },
        form_data: {
          business_name: addForm.business_name,
          business_location: addForm.business_location,
          products_services: addForm.products_services,
          requirement: addForm.requirement,
        },
        status: addForm.status,
      });
      setNotice('Vendor registered.');
      setAddOpen(false);
      setAddForm({
        business_name: '',
        contact_first_name: '',
        contact_last_name: '',
        email: '',
        phone: '',
        business_location: '',
        category_id: '',
        products_services: '',
        requirement: '',
        status: 'CONFIRMED',
      });
      load();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register vendor.');
    } finally {
      setAddBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="page">
      <div className="header">
        <div className="header-left">
          <div className="header-title">
            <p className="eyebrow">COPPERBELT MARATHON 2026</p>
            <h1>Vendors</h1>
          </div>
          <HeaderNav />
        </div>
        <div className="header-right">
          <span className="live-indicator">
            <span className="live-dot" />
            Live · {formatTime(now)}
          </span>
          <button className="btn" onClick={handleRefresh}>
            ↻ Refresh
          </button>
          <button className="btn btn-success" onClick={() => setAddOpen(true)}>
            + Add Vendor
          </button>
          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <p className="stat-label">TOTAL</p>
            <p className="stat-value">{stats.total_registrations}</p>
            <p className="stat-sub">vendor registrations</p>
          </div>
          <div className="stat-card paid">
            <p className="stat-label">PAID</p>
            <p className="stat-value">{statusCount('CONFIRMED')}</p>
            <p className="stat-sub">confirmed</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">AWAITING CONFIRMATION | RESERVED | EXEMPTED </p>
            <p className="stat-value">{pendingCount}</p>
            <p className="stat-sub">awaiting confirmation | Reserved | Exempted </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">TODAY</p>
            <p className="stat-value">{stats.today_count ?? 0}</p>
            <p className="stat-sub">new today</p>
          </div>
        </div>
      )}

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search business, contact, email, phone, reference…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {filterOptions?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="filters-count">
          {count} of {stats?.total_registrations ?? count}
        </span>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="reg-table">
            <thead>
              <tr>
                <th>•</th>
                <th>Reference</th>
                <th>Business</th>
                <th>Contact person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Location</th>
                <th>Category</th>
                <th>Requirement</th>
                <th>Amount</th>
                <th>Registration Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="dim">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{r.registration_number}</td>
                  <td className="name">{r.form_data.business_name || '—'}</td>
                  <td>
                    {r.participant.first_name} {r.participant.last_name}
                  </td>
                  <td className={r.participant.phone ? '' : 'dim'}>{r.participant.phone || '—'}</td>
                  <td className={r.participant.email ? '' : 'dim'}>{r.participant.email || '—'}</td>
                  <td className={r.form_data.business_location ? '' : 'dim'}>
                    {r.form_data.business_location || '—'}
                  </td>
                  <td>{r.category_name}</td>
                  <td className={r.form_data.requirement ? '' : 'dim'}>{r.form_data.requirement || '—'}</td>
                  <td>
                    {Number(r.amount) > 0 ? `K${Number(r.amount).toLocaleString()}` : 'FREE'}
                  </td>
                  <td>
                    <span className={`status-badge status-${r.status}`}>
                      {registrationStatusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="loading-state">Loading…</div>}
          {!loading && rows.length === 0 && <div className="empty-state">No vendor registrations match these filters.</div>}
        </div>

        <div className="table-footer">
          <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ‹
          </button>
          <span className="filters-count">
            Page {page} of {totalPages}
          </span>
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            ›
          </button>
        </div>
      </div>

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add vendor</h2>
            <div className="field">
              <label>Business / Company name</label>
              <input
                value={addForm.business_name}
                onChange={(e) => setAddForm({ ...addForm, business_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contact first name</label>
              <input
                value={addForm.contact_first_name}
                onChange={(e) => setAddForm({ ...addForm, contact_first_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contact last name</label>
              <input
                value={addForm.contact_last_name}
                onChange={(e) => setAddForm({ ...addForm, contact_last_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Business location</label>
              <input
                value={addForm.business_location}
                onChange={(e) => setAddForm({ ...addForm, business_location: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.category_id}
                onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
              >
                <option value="">Select a category…</option>
                {filterOptions?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Exhibition / activation requirement</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.requirement}
                onChange={(e) => setAddForm({ ...addForm, requirement: e.target.value })}
              >
                <option value="">Select…</option>
                {REQUIREMENT_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Products / services</label>
              <textarea
                rows={3}
                value={addForm.products_services}
                onChange={(e) => setAddForm({ ...addForm, products_services: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleAddVendor}
                disabled={
                  addBusy ||
                  !addForm.business_name ||
                  !addForm.contact_first_name ||
                  !addForm.category_id
                }
              >
                {addBusy ? 'Saving…' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
