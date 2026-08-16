import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createRegistrationManually,
  downloadExport,
  getDashboard,
  getFilterOptions,
  listRegistrations,
  STATUS_OPTIONS,
  type AdminRegistration,
  type DashboardStats,
  type FilterOptions,
} from '../api/registrations';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';

const PAGE_SIZE = 25;
const REFRESH_INTERVAL_MS = 30000;

function titleCase(value?: string) {
  if (!value) return '';
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(value.includes('-') ? '-' : ' ');
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Parsed as a local date (not UTC) so the "last 14 days" trend chart doesn't
// shift a day off depending on the browser's timezone.
function formatChartDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Registrations() {
  const { logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
  const [orgFilter, setOrgFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    category_id: '',
  });
  const [exportBusy, setExportBusy] = useState(false);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      listRegistrations({
        search,
        status: statusFilter,
        category: raceFilter,
        gender: genderFilter,
        organisation: orgFilter,
        ordering: '-registered_at',
        page,
      })
        .then((data) => {
          setRows(data.results);
          setCount(data.count);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load registrations.'))
        .finally(() => setLoading(false));
    },
    [search, statusFilter, raceFilter, genderFilter, orgFilter, page]
  );

  function loadStats() {
    getDashboard()
      .then(setStats)
      .catch(() => {});
  }

  useEffect(load, [load]);
  useEffect(loadStats, []);

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

  async function handleAddPerson() {
    setAddBusy(true);
    setError('');
    try {
      await createRegistrationManually({
        category_id: addForm.category_id,
        participant: {
          first_name: addForm.first_name,
          last_name: addForm.last_name,
          email: addForm.email,
          phone: addForm.phone,
        },
        status: 'CONFIRMED',
      });
      setNotice('Person registered.');
      setAddOpen(false);
      setAddForm({ first_name: '', last_name: '', email: '', phone: '', category_id: '' });
      load();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register person.');
    } finally {
      setAddBusy(false);
    }
  }

  async function handleExport() {
    setExportBusy(true);
    setError('');
    try {
      const blob = await downloadExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'registrations.xlsx';
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

  const chartDates = stats?.daily_registrations.map((d) => formatChartDate(d.date)) ?? [];
  const chartConfirmed = stats?.daily_registrations.map((d) => d.confirmed) ?? [];
  const chartOther = stats?.daily_registrations.map((d) => d.other) ?? [];
  const categoryData = stats?.by_category ?? [];
  const countryPieData = (stats?.by_country ?? []).map((c, i) => ({
    id: i,
    value: c.count,
    label: c.country,
  }));

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, sm: 3, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ pb: 3, mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar src="/logo.png" variant="rounded" sx={{ width: 44, height: 44 }} />
          <Box>
            <Typography variant="overline" color="primary" fontWeight={700} lineHeight={1.2} display="block">
              Copperbelt Marathon 2026
            </Typography>
            <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
              Registrations
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mr: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: '0 0 0 3px rgba(52, 211, 153, 0.15)',
              }}
            />
            <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
              Live · {formatTime(now)}
            </Typography>
          </Stack>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add Person
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exportBusy}
          >
            {exportBusy ? 'Exporting…' : 'Export Excel'}
          </Button>
          <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            Log out
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {stats && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {stats.total_registrations}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    registrations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Paid
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main">
                    {statusCount('CONFIRMED')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    confirmed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Awaiting Confirmation | Reserved | Exempted
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {pendingCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    awaiting confirmation · reserved · exempted
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Today
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {stats.today_count ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    new today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={7}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Registrations — last 14 days
                  </Typography>
                  {chartDates.length > 0 ? (
                    <LineChart
                      height={260}
                      xAxis={[{ scaleType: 'point', data: chartDates }]}
                      series={[
                        { data: chartConfirmed, label: 'Confirmed', color: '#34d399', area: true },
                        { data: chartOther, label: 'Not yet confirmed', color: '#e2954f', area: true },
                      ]}
                    />
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No data yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Registrations by country
                  </Typography>
                  {countryPieData.length > 0 ? (
                    <PieChart
                      height={260}
                      series={[{ data: countryPieData, innerRadius: 40, paddingAngle: 2 }]}
                      slotProps={{ legend: { direction: 'column' } }}
                    />
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No data yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Registrations by race category
                  </Typography>
                  {categoryData.length > 0 ? (
                    <BarChart
                      height={260}
                      xAxis={[{ scaleType: 'band', data: categoryData.map((c) => c.name || 'Unknown') }]}
                      series={[{ data: categoryData.map((c) => c.count), label: 'Registrations', color: '#5b8def' }]}
                    />
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No data yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search name, email, phone, reference…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 240, flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {titleCase(s)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="race-filter-label">Race</InputLabel>
          <Select
            labelId="race-filter-label"
            label="Race"
            value={raceFilter}
            onChange={(e) => {
              setRaceFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All races</MenuItem>
            {filterOptions?.categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="gender-filter-label">Gender</InputLabel>
          <Select
            labelId="gender-filter-label"
            label="Gender"
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All genders</MenuItem>
            {filterOptions?.genders.map((g) => (
              <MenuItem key={g} value={g}>
                {titleCase(g)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="org-filter-label">Organisation</InputLabel>
          <Select
            labelId="org-filter-label"
            label="Organisation"
            value={orgFilter}
            onChange={(e) => {
              setOrgFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All organisations</MenuItem>
            {filterOptions?.organisations.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
          {count} of {stats?.total_registrations ?? count}
        </Typography>
      </Stack>

      <div className="table-card">
        <div className="table-scroll">
          <table className="reg-table">
            <thead>
              <tr>
                <th>•</th>
                <th>Reference</th>
                <th>Bib</th>
                <th>Name</th>
                <th>Organisation</th>
                <th>Race</th>
                <th>Attendance</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Shirt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="dim">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{r.registration_number}</td>
                  <td className="dim">—</td>
                  <td className="name">
                    {r.participant.first_name} {r.participant.last_name}
                  </td>
                  <td className={r.form_data.club_or_institution ? '' : 'dim'}>
                    {r.form_data.club_or_institution || '—'}
                  </td>
                  <td>{r.category_name}</td>
                  <td className={r.form_data.attendance_type ? '' : 'dim'}>
                    {titleCase(r.form_data.attendance_type) || '—'}
                  </td>
                  <td className={r.form_data.gender ? '' : 'dim'}>
                    {titleCase(r.form_data.gender) || '—'}
                  </td>
                  <td className={r.form_data.age_range ? '' : 'dim'}>{r.form_data.age_range || '—'}</td>
                  <td className={r.participant.phone ? '' : 'dim'}>{r.participant.phone || '—'}</td>
                  <td className={r.participant.email ? '' : 'dim'}>{r.participant.email || '—'}</td>
                  <td className={r.form_data.tshirt_size ? '' : 'dim'}>{r.form_data.tshirt_size || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="loading-state">Loading…</div>}
          {!loading && rows.length === 0 && <div className="empty-state">No registrations match these filters.</div>}
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
            <h2>Add person</h2>
            <div className="field">
              <label>First name</label>
              <input
                value={addForm.first_name}
                onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Last name</label>
              <input
                value={addForm.last_name}
                onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
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
              <label>Race</label>
              <select
                className="filter-select"
                style={{ width: '100%' }}
                value={addForm.category_id}
                onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
              >
                <option value="">Select a race…</option>
                {filterOptions?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                onClick={handleAddPerson}
                disabled={addBusy || !addForm.first_name || !addForm.last_name || !addForm.category_id}
              >
                {addBusy ? 'Saving…' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}
