import { useState } from 'react';
import { resendInBatches, type BulkResendProgress, type BulkResendReport } from '../utils/bulkResend';

interface BulkResendBarProps {
  selectedIds: string[];
  totalMatching: number;
  allPageSelected: boolean;
  onSelectAllMatching: () => Promise<void>;
  onClear: () => void;
  resendFn: (ids: string[]) => Promise<BulkResendReport>;
  onDone: () => void;
  itemLabel: string; // e.g. "registrations", "vendor registrations", "Lenco records"
}

// Reused as-is on Registrations, Vendors, and Lenco Records — all three
// select from the same underlying Registration rows and hit the same
// resend-confirmation endpoint, just scoped differently (event id /
// created_via filter), so the selection + confirm + batched-sending UX
// only needs to exist once.
export default function BulkResendBar({
  selectedIds,
  totalMatching,
  allPageSelected,
  onSelectAllMatching,
  onClear,
  resendFn,
  onDone,
  itemLabel,
}: BulkResendBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<BulkResendProgress | null>(null);
  const [summary, setSummary] = useState<{ sent: number; skipped: number; failed: number } | null>(null);

  if (selectedIds.length === 0) return null;

  async function handleSelectAllMatching() {
    setSelectingAll(true);
    try {
      await onSelectAllMatching();
    } finally {
      setSelectingAll(false);
    }
  }

  async function handleConfirmSend() {
    setSending(true);
    setProgress({ sent: 0, skipped: 0, failed: 0, done: 0, total: selectedIds.length });
    const { progress: final } = await resendInBatches(selectedIds, resendFn, setProgress);
    setSending(false);
    setSummary({ sent: final.sent, skipped: final.skipped, failed: final.failed });
  }

  function handleCloseSummary() {
    setSummary(null);
    setProgress(null);
    setConfirmOpen(false);
    onClear();
    onDone();
  }

  return (
    <>
      <div className="bulk-bar">
        <span className="bulk-bar-count">{selectedIds.length} selected</span>
        {allPageSelected && totalMatching > selectedIds.length && (
          <button className="bulk-bar-link" onClick={handleSelectAllMatching} disabled={selectingAll}>
            {selectingAll ? 'Selecting…' : `Select all ${totalMatching} matching results`}
          </button>
        )}
        <button className="btn" onClick={onClear}>
          Clear
        </button>
        <button className="btn btn-success" onClick={() => setConfirmOpen(true)}>
          ✉ Resend confirmation email
        </button>
      </div>

      {confirmOpen && (
        <div className="modal-backdrop" onClick={() => !sending && !summary && setConfirmOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {!summary ? (
              <>
                <h2>Resend confirmation email?</h2>
                <p className="bulk-intro">
                  This will send the "you're confirmed" email to{' '}
                  <strong style={{ color: 'var(--text)' }}>{selectedIds.length}</strong> {itemLabel}. Only
                  ones that are Confirmed and have an email address on file will actually receive one —
                  everything else is skipped, not failed.
                </p>
                {progress && (
                  <div className="bulk-progress">
                    <div className="bulk-progress-track">
                      <div
                        className="bulk-progress-fill"
                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                      />
                    </div>
                    <p className="field-note">
                      {progress.done} of {progress.total} — {progress.sent} sent, {progress.skipped}{' '}
                      skipped, {progress.failed} failed
                    </p>
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn" onClick={() => setConfirmOpen(false)} disabled={sending}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handleConfirmSend} disabled={sending}>
                    {sending ? 'Sending…' : `Send to ${selectedIds.length}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Done</h2>
                <div className="banner banner-success">
                  {summary.sent} sent
                  {summary.skipped > 0 && `, ${summary.skipped} skipped (not confirmed or no email)`}
                  {summary.failed > 0 && `, ${summary.failed} failed`}.
                </div>
                <div className="modal-actions">
                  <button className="btn btn-success" onClick={handleCloseSummary}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
