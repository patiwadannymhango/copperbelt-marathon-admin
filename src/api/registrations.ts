import { apiFetch, apiFetchBlob, EVENT_ID } from './client';
import type { BulkResendReport } from '../utils/bulkResend';

export interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string;
}

export interface RegistrationFormData {
  gender?: string;
  country?: string;
  age_range?: string;
  tshirt_size?: string;
  medical_notes?: string;
  attendance_type?: string;
  club_or_institution?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  [key: string]: string | undefined;
}

export interface AdminRegistration {
  id: string;
  registration_number: string;
  status: string;
  amount: string;
  currency: string;
  participant: Participant;
  category: string;
  category_name: string;
  event: string;
  event_name: string;
  form_data: RegistrationFormData;
  created_via: string;
  created_via_display: string;
  registered_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CategoryOption {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
}

export interface FilterOptions {
  categories: CategoryOption[];
  genders: string[];
  organisations: string[];
  attendance_types: string[];
}

export const STATUS_OPTIONS = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAYMENT_PROCESSING',
  'RESERVED',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
];

export interface DashboardStats {
  total_registrations: number;
  by_status: { status: string; count: number }[];
  revenue_confirmed: string;
  revenue_pending: string;
  wallet_balance: string;
  wallet_pending_balance: string;
}

export async function getDashboard(): Promise<DashboardStats> {
  return apiFetch(`/api/v1/payments/admin/events/${EVENT_ID}/dashboard/`);
}

export async function listRegistrations(params: {
  search?: string;
  status?: string;
  category?: string;
  gender?: string;
  organisation?: string;
  attendance_type?: string;
  created_via?: string;
  ordering?: string;
  page?: number;
}): Promise<Paginated<AdminRegistration>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.gender) qs.set('gender', params.gender);
  if (params.organisation) qs.set('organisation', params.organisation);
  if (params.attendance_type) qs.set('attendance_type', params.attendance_type);
  if (params.created_via) qs.set('created_via', params.created_via);
  if (params.ordering) qs.set('ordering', params.ordering);
  if (params.page) qs.set('page', String(params.page));

  return apiFetch(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/?${qs.toString()}`
  );
}

// Same filters as listRegistrations, but every matching id with no
// pagination — powers "select all N matching results" for the bulk
// resend action, since the table only ever has one page loaded.
export async function fetchAllRegistrationIds(params: {
  search?: string;
  status?: string;
  category?: string;
  gender?: string;
  organisation?: string;
  attendance_type?: string;
  created_via?: string;
}): Promise<{ ids: string[]; count: number }> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.gender) qs.set('gender', params.gender);
  if (params.organisation) qs.set('organisation', params.organisation);
  if (params.attendance_type) qs.set('attendance_type', params.attendance_type);
  if (params.created_via) qs.set('created_via', params.created_via);

  return apiFetch(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/ids/?${qs.toString()}`
  );
}

// Resends the "you're confirmed" email for each listed registration —
// only ones that are actually Confirmed and have an email on file get
// sent; the rest come back "skipped" in the report rather than failing
// the whole call. Capped server-side at 15 ids per call (see the
// backend view's docstring) — BulkResendBar splits a bigger selection
// into several calls via resendInBatches.
export async function resendConfirmationEmails(ids: string[]): Promise<BulkResendReport> {
  return apiFetch(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/resend-confirmation/`,
    { method: 'POST', body: { registration_ids: ids } }
  );
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiFetch(`/api/v1/registrations/admin/events/${EVENT_ID}/registrations/filters/`);
}

// --- Progress summary ---------------------------------------------------
// Read-only aggregate counts (never touches individual records) powering
// the Summary page: total registrations, a per-category status
// breakdown, and overall t-shirt size and gender breakdowns.

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_code: string;
  capacity: number | null;
  total: number;
  lenco_count: number;
  by_status: { status: string; count: number }[];
}

export interface TshirtSizeCount {
  size: string;
  count: number;
  lenco_count: number;
}

export interface GenderCount {
  gender: string;
  count: number;
  lenco_count: number;
}

export interface SourceCount {
  source: string;
  source_display: string;
  count: number;
}

export interface RegistrationSummary {
  total_registrations: number;
  by_category: CategorySummary[];
  by_tshirt_size: TshirtSizeCount[];
  by_gender: GenderCount[];
  by_source: SourceCount[];
}

export async function getRegistrationSummary(): Promise<RegistrationSummary> {
  return apiFetch(`/api/v1/registrations/admin/events/${EVENT_ID}/registrations/summary/`);
}

export async function createRegistrationManually(payload: {
  category_id: string;
  participant: Record<string, string>;
  form_data?: Record<string, string>;
  status?: string;
}) {
  return apiFetch<AdminRegistration>(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/create/`,
    { method: 'POST', body: payload }
  );
}

export async function deleteRegistration(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/registrations/admin/registrations/${id}/`, { method: 'DELETE' });
}

// Same field set as the manual "Add person" form, minus email — the
// backend rejects the whole request outright if an "email" key is
// present at all, so this is never even offered as an option here.
export async function updateRegistrationDetails(
  id: string,
  payload: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    gender?: string;
    age_range?: string;
    country?: string;
    tshirt_size?: string;
    attendance_type?: string;
    club_or_institution?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    medical_notes?: string;
  }
): Promise<AdminRegistration> {
  return apiFetch<AdminRegistration>(
    `/api/v1/registrations/admin/registrations/${id}/details/`,
    { method: 'PATCH', body: payload }
  );
}

// The export endpoint requires the same Bearer auth as everything else, so
// it can't just be an <a href> like a public download link — fetched as a
// blob and saved client-side instead (see Registrations.tsx). An optional
// createdVia scopes it to one source (e.g. Lenco Records exporting just
// its own rows) instead of every registration for the event.
export async function downloadExport(createdVia?: string): Promise<Blob> {
  const qs = createdVia ? `?created_via=${encodeURIComponent(createdVia)}` : '';
  return apiFetchBlob(`/api/v1/registrations/admin/events/${EVENT_ID}/registrations/export/${qs}`);
}

// --- Bulk upload -----------------------------------------------------

export interface BulkUploadRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  category_code?: string;
  status?: string;
  // Same optional extra fields as the manual "Add person" form — all
  // stored in form_data.
  gender?: string;
  age_range?: string;
  country?: string;
  tshirt_size?: string;
  attendance_type?: string;
  club_or_institution?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  [key: string]: string | undefined;
}

export interface BulkUploadRowResult {
  row: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: BulkUploadRow;
  reference?: string;
}

export interface BulkUploadReport {
  created_count: number;
  created_references: string[];
  error_count: number;
  errors: { row: number; error: string }[];
  results: BulkUploadRowResult[];
}

// Same-shaped download as the Excel/vendor exports elsewhere in this app —
// requires the auth header, so it goes through apiFetchBlob rather than a
// plain <a href>.
export async function downloadBulkUploadTemplate(): Promise<Blob> {
  return apiFetchBlob(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/bulk-upload/template/`
  );
}

// Dry run: parses the file and reports which rows would succeed/fail, but
// creates nothing. Powers the review screen.
export async function previewBulkUpload(file: File): Promise<BulkUploadReport> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<BulkUploadReport>(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/bulk-upload/preview/`,
    { method: 'POST', body: formData, isFormData: true }
  );
}

// The real thing — takes the (possibly hand-edited) rows from the review
// screen as JSON rather than re-uploading a file, so edits actually take
// effect. Runs through the exact same validation as the preview above, so
// a row that previewed clean will only fail here if something changed
// server-side between preview and commit (e.g. a category was removed).
export async function commitBulkUpload(rows: BulkUploadRow[]): Promise<BulkUploadReport> {
  return apiFetch<BulkUploadReport>(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/bulk-upload/`,
    { method: 'POST', body: { rows } }
  );
}
