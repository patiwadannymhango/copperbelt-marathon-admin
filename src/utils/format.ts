export function titleCase(value?: string) {
  if (!value) return '';
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(value.includes('-') ? '-' : ' ');
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Collapses the backend's 8 statuses down to the 4 buckets the admin cares
// about at a glance.
export function registrationStatusLabel(
  status: string
): 'Confirmed' | 'Reserved' | 'Unconfirmed' | 'Exempted' {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'RESERVED') return 'Reserved';
  if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'REFUNDED') return 'Exempted';
  return 'Unconfirmed';
}

// Same 4-bucket convention as registrationStatusLabel above, applied to a
// {status, count}[] breakdown (e.g. from the summary endpoint's
// per-category by_status) instead of a single registration's status.
export function bucketStatusCounts(byStatus: { status: string; count: number }[]) {
  const buckets = { Confirmed: 0, Reserved: 0, Unconfirmed: 0, Exempted: 0 };
  for (const { status, count } of byStatus) {
    buckets[registrationStatusLabel(status)] += count;
  }
  return buckets;
}
