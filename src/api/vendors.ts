import { apiFetch, apiFetchBlob } from './client';

// Vendor/exhibitor registration is a separate Event from the runner
// registration (see backend seed_vendor_registration) — a RegistrationForm
// is one-per-event, and vendor fields have nothing in common with runner
// fields, so this is a parallel API module rather than parameterizing
// registrations.ts. Falls back to the real production vendor event if the
// env var isn't set — this id isn't sensitive, it's just a UUID visible in
// any API response.
export const VENDOR_EVENT_ID = import.meta.env.VITE_VENDOR_EVENT_ID || '06c27591-74d3-4f9c-8690-9c9021b2600e';

export interface VendorParticipant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface VendorFormData {
  business_name?: string;
  business_location?: string;
  products_services?: string;
  requirement?: string;
  [key: string]: string | undefined;
}

export interface AdminVendorRegistration {
  id: string;
  registration_number: string;
  status: string;
  amount: string;
  currency: string;
  participant: VendorParticipant;
  category: string;
  category_name: string;
  form_data: VendorFormData;
  registered_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface VendorFilterOptions {
  categories: { id: string; name: string }[];
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

export const REQUIREMENT_OPTIONS = [
  'Exhibition Space',
  'Vendor Stall',
  'Food & Beverage Stall',
  'Corporate Activation',
  'Branding / Promotional Space',
  'Other',
];

export interface VendorDashboardStats {
  total_registrations: number;
  today_count?: number;
  by_status: { status: string; count: number }[];
  revenue_confirmed: string;
  revenue_pending: string;
  wallet_balance: string;
  wallet_pending_balance: string;
}

export async function getVendorDashboard(): Promise<VendorDashboardStats> {
  return apiFetch(`/api/v1/payments/admin/events/${VENDOR_EVENT_ID}/dashboard/`);
}

export async function listVendorRegistrations(params: {
  search?: string;
  status?: string;
  category?: string;
  ordering?: string;
  page?: number;
}): Promise<Paginated<AdminVendorRegistration>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.ordering) qs.set('ordering', params.ordering);
  if (params.page) qs.set('page', String(params.page));

  return apiFetch(
    `/api/v1/registrations/admin/events/${VENDOR_EVENT_ID}/registrations/?${qs.toString()}`
  );
}

export async function getVendorFilterOptions(): Promise<VendorFilterOptions> {
  return apiFetch(`/api/v1/registrations/admin/events/${VENDOR_EVENT_ID}/registrations/filters/`);
}

export async function createVendorManually(payload: {
  category_id: string;
  participant: Record<string, string>;
  form_data?: Record<string, string>;
  status?: string;
}) {
  return apiFetch<AdminVendorRegistration>(
    `/api/v1/registrations/admin/events/${VENDOR_EVENT_ID}/registrations/create/`,
    { method: 'POST', body: payload }
  );
}

export async function downloadVendorExport(): Promise<Blob> {
  return apiFetchBlob(`/api/v1/registrations/admin/events/${VENDOR_EVENT_ID}/registrations/export/`);
}
