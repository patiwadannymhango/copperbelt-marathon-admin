import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from '../components/HeaderNav';
import { titleCase, formatTime, registrationStatusLabel } from '../utils/format';
import {
  deleteRegistration,
  downloadExport,
  getFilterOptions,
  listRegistrations,
  updateRegistrationDetails,
  STATUS_OPTIONS,
  type AdminRegistration,
  type FilterOptions,
} from '../api/registrations';
import {
  GENDER_OPTIONS,
  AGE_RANGE_OPTIONS,
  TSHIRT_SIZE_OPTIONS,
  ATTENDANCE_TYPE_OPTIONS,
} from '../utils/formOptions';

const PAGE_SIZE = 25;
const REFRESH_INTERVAL_MS = 30000;
const CREATED_VIA = 'LENCO_MIGRATION';

// Migrated from the Lenco-era system (this platform's previous payment
// gateway/registration flow, before Lipila) — these already had their own
// reference numbers and confirmed status there, preserved as-is on import
// rather than re-numbered. Same view/search/edit/delete "management" as
// the main Registrations page, just permanently scoped to this one
// source via created_via, so day-to-day registrations stay uncluttered.
export default function LencoRecords() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [rows, setRows] = useState<AdminRegistration[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [raceFilter, setRaceFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const [exportBusy, setExportBusy] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminRegistration | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    age_range: '',
    country: '',
    tshirt_size: '',
    attendance_type: '',
    club_or_institution: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminRegistration | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      listRegistrations({
        search,
        status: statusFilter,
        category: raceFilter,
        gender: genderFilter,
        created_via: CREATED_VIA,
        ordering: '-registered_at',
        page,
      })
        .then((data) => {
          setRows(data.results);
          setCount(data.count);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load Lenco records.'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter, raceFilter, genderFilter, page]
  );

  useEffect(load, [load]);

  useEffect(() => {
    getFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const poll = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [load]);

  function openEditDialog(row: AdminRegistration) {
    setEditTarget(row);
    setEditError('');
    setEditForm({
      first_name: row.participant.first_name,
      last_name: row.participant.last_name,
      phone: row.participant.phone,
      gender: row.form_data.gender || '',
      age_range: row.form_data.age_range || '',
      country: row.form_data.country || '',
      tshirt_size: row.form_data.tshirt_size || '',
      attendance_type: row.form_data.attendance_type || '',
      club_or_institution: row.form_data.club_or_institution || '',
      emergency_contact_name: row.form_data.emergency_contact_name || '',
      emergency_contact_phone: row.form_data.emergency_contact_phone || '',
      medical_notes: row.form_data.medical_notes || '',
    });
  }

  function closeEditDialog() {
    if (editBusy) return;
    setEditTarget(null);
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setEditBusy(true);
    setEditError('');
    try {
      await updateRegistrationDetails(editTarget.id, editForm);
      setEditTarget(null);
      setNotice('Record updated.');
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update record.');
    } finally {
      setEditBusy(false);
    }
  }

  function openDeleteDialog(row: AdminRegistration) {
    setDeleteTarget(row);
    setDeleteError('');
  }

  function closeDeleteDialog() {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteError('');
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteRegistration(deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Record deleted.');
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleExport() {
    setExportBusy(true);
    setError('');
    try {
      const blob = await downloadExport(CREATED_VIA);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lenco-records.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="page">
      <div className="header">
        <div className="header-left">
          <div className="header-title">
            <p className="eyebrow">COPPERBELT MARATHON 2026</p>
            <h1>Lenco Records</h1>
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
          <button className="btn btn-amber" onClick={handleExport} disabled={exportBusy}>
            {exportBusy ? 'Exporting…' : '↓ Export Excel'}
          </button>
          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <p className="summary-footnote" style={{ padding: 0, marginTop: -6 }}>
        Registrations migrated from the previous Lenco-based system — their original reference
        numbers were kept as-is. View, search, and edit them here just like the main Registrations
        page.
      </p>

      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <p className="stat-label">TOTAL</p>
          <p className="stat-value">{count}</p>
          <p className="stat-sub">migrated records</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search name, email, phone, reference…"
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
          value={raceFilter}
          onChange={(e) => {
            setRaceFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All races</option>
          {filterOptions?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All genders</option>
          {filterOptions?.genders.map((g) => (
            <option key={g} value={g}>
              {titleCase(g)}
            </option>
          ))}
        </select>
        <span className="filters-count">
          {count} of {count}
        </span>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="reg-table">
            <thead>
              <tr>
                <th>•</th>
                <th>Reference</th>
                <th>Name</th>
                <th>Organisation</th>
                <th>Race</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Shirt</th>
                <th>Registration Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="dim">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{r.registration_number}</td>
                  <td className="name">
                    {r.participant.first_name} {r.participant.last_name}
                  </td>
                  <td className={r.form_data.club_or_institution ? '' : 'dim'}>
                    {r.form_data.club_or_institution || '—'}
                  </td>
                  <td>{r.category_name}</td>
                  <td className={r.form_data.gender ? '' : 'dim'}>
                    {titleCase(r.form_data.gender) || '—'}
                  </td>
                  <td className={r.form_data.age_range ? '' : 'dim'}>{r.form_data.age_range || '—'}</td>
                  <td className={r.participant.phone ? '' : 'dim'}>{r.participant.phone || '—'}</td>
                  <td className={r.participant.email ? '' : 'dim'}>{r.participant.email || '—'}</td>
                  <td className={r.form_data.tshirt_size ? '' : 'dim'}>{r.form_data.tshirt_size || '—'}</td>
                  <td>
                    <span className={`status-badge status-${r.status}`}>
                      {registrationStatusLabel(r.status)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="row-action-btn" title="Edit" onClick={() => openEditDialog(r)}>
                        ✎
                      </button>
                      {registrationStatusLabel(r.status) === 'Unconfirmed' && (
                        <button
                          className="row-action-btn row-action-danger"
                          title="Delete (only available for unconfirmed registrations)"
                          onClick={() => openDeleteDialog(r)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="loading-state">Loading…</div>}
          {!loading && rows.length === 0 && <div className="empty-state">No Lenco records match these filters.</div>}
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

      {editTarget && (
        <div className="modal-backdrop" onClick={closeEditDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit record — {editTarget.registration_number}</h2>
            <div className="field">
              <label>Email</label>
              <input value={editTarget.participant.email || '—'} disabled />
              <p className="field-note">Email can't be changed after registration.</p>
            </div>
            <div className="field">
              <label>First name</label>
              <input
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Last name</label>
              <input
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {titleCase(g)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Age range</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.age_range}
                onChange={(e) => setEditForm({ ...editForm, age_range: e.target.value })}
              >
                <option value="">Select…</option>
                {AGE_RANGE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Country</label>
              <input
                value={editForm.country}
                placeholder="Zambia"
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
              />
            </div>
            <div className="field">
              <label>T-shirt size</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.tshirt_size}
                onChange={(e) => setEditForm({ ...editForm, tshirt_size: e.target.value })}
              >
                <option value="">Select…</option>
                {TSHIRT_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Attendance type</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={editForm.attendance_type}
                onChange={(e) => setEditForm({ ...editForm, attendance_type: e.target.value })}
              >
                <option value="">Select…</option>
                {ATTENDANCE_TYPE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Club / institution</label>
              <input
                value={editForm.club_or_institution}
                onChange={(e) => setEditForm({ ...editForm, club_or_institution: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact name</label>
              <input
                value={editForm.emergency_contact_name}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Emergency contact phone</label>
              <input
                value={editForm.emergency_contact_phone}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Medical notes</label>
              <textarea
                rows={3}
                value={editForm.medical_notes}
                onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
              />
            </div>
            {editError && <div className="banner banner-error">{editError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeEditDialog} disabled={editBusy}>
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleSaveEdit}
                disabled={editBusy || !editForm.first_name.trim() || !editForm.last_name.trim()}
              >
                {editBusy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={closeDeleteDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-danger">⚠ Delete record?</h2>
            <p className="bulk-intro">
              Are you sure you want to delete{' '}
              <strong style={{ color: 'var(--text)' }}>{deleteTarget.registration_number}</strong> (
              {deleteTarget.participant.first_name} {deleteTarget.participant.last_name})? This cannot be undone.
            </p>
            {deleteError && <div className="banner banner-error">{deleteError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeDeleteDialog} disabled={deleteBusy}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
