export interface BulkResendResult {
  id: string;
  status: 'sent' | 'skipped' | 'error';
  detail: string;
}

export interface BulkResendReport {
  sent_count: number;
  total: number;
  results: BulkResendResult[];
}

export interface BulkResendProgress {
  sent: number;
  skipped: number;
  failed: number;
  done: number;
  total: number;
}

// Matches the backend's per-request cap (see
// AdminRegistrationBulkResendConfirmationView.MAX_BATCH) — there's no
// task queue wired up for notifications, so each request sends emails
// in a plain synchronous loop, and at a few seconds per email a large
// "select all" would blow past gunicorn's request timeout.
const BATCH_SIZE = 15;

// Splits `ids` into BATCH_SIZE chunks and calls `resendFn` for each in
// sequence — not parallel; email sends are the bottleneck, not request
// overhead, so firing batches concurrently wouldn't finish any faster
// and would just make several slow requests instead of one. Reports
// cumulative progress after every batch via `onProgress`.
export async function resendInBatches(
  ids: string[],
  resendFn: (batchIds: string[]) => Promise<BulkResendReport>,
  onProgress?: (progress: BulkResendProgress) => void
): Promise<{ progress: BulkResendProgress; results: BulkResendResult[] }> {
  const progress: BulkResendProgress = { sent: 0, skipped: 0, failed: 0, done: 0, total: ids.length };
  const allResults: BulkResendResult[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const report = await resendFn(batch);
    for (const r of report.results) {
      if (r.status === 'sent') progress.sent += 1;
      else if (r.status === 'skipped') progress.skipped += 1;
      else progress.failed += 1;
      allResults.push(r);
    }
    progress.done += batch.length;
    onProgress?.({ ...progress });
  }

  return { progress, results: allResults };
}
