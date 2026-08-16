import { apiFetch, apiFetchBlob, EVENT_ID } from './client';

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
  registered_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FilterOptions {
  categories: { id: string; name: string }[];
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
  today_count: number;
  by_status: { status: string; count: number }[];
  revenue_confirmed: string;
  revenue_pending: string;
  wallet_balance: string;
  wallet_pending_balance: string;
  daily_registrations: { date: string; confirmed: number; other: number }[];
  by_category: { name: string; count: number }[];
  by_country: { country: string; count: number }[];
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
  if (params.ordering) qs.set('ordering', params.ordering);
  if (params.page) qs.set('page', String(params.page));

  return apiFetch(
    `/api/v1/registrations/admin/events/${EVENT_ID}/registrations/?${qs.toString()}`
  );
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiFetch(`/api/v1/registrations/admin/events/${EVENT_ID}/registrations/filters/`);
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

// The export endpoint requires the same Bearer auth as everything else, so
// it can't just be an <a href> like a public download link — fetched as a
// blob and saved client-side instead (see Registrations.tsx).
export async function downloadExport(): Promise<Blob> {
  return apiFetchBlob(`/api/v1/registrations/admin/events/${EVENT_ID}/registrations/export/`);
}
