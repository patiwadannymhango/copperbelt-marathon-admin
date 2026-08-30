import { useMemo, useState } from 'react';
import {
  commitBulkUpload,
  downloadBulkUploadTemplate,
  previewBulkUpload,
  STATUS_OPTIONS,
  type BulkUploadReport,
  type BulkUploadRow,
  type CategoryOption,
} from '../api/registrations';
import { downloadCategoryGuide } from '../utils/categoryGuide';
import { validateRows } from '../utils/bulkUploadValidation';
import { GENDER_OPTIONS, AGE_RANGE_OPTIONS, TSHIRT_SIZE_OPTIONS, ATTENDANCE_TYPE_OPTIONS } from '../utils/formOptions';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  onUploaded: () => void;
}

type Step = 'start' | 'review' | 'done';

export default function BulkUploadDialog({ open, onClose, categories, onUploaded }: BulkUploadDialogProps) {
  const [step, setStep] = useState<Step>('start');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<BulkUploadRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [finalReport, setFinalReport] = useState<BulkUploadReport | null>(null);
  const [submitError, setSubmitError] = useState('');

  const validations = useMemo(() => validateRows(rows, categories), [rows, categories]);
  const validCount = validations.filter((v) => v.errors.length === 0).length;
  const errorCount = rows.length - validCount;

  function reset() {
    setStep('start');
    setParsing(false);
    setParseError('');
    setRows([]);
    setSubmitting(false);
    setFinalReport(null);
    setSubmitError('');
  }

  function handleClose() {
    if (parsing || submitting) return;
    reset();
    onClose();
  }

  async function handleFileChosen(file: File) {
    setParsing(true);
    setParseError('');
    try {
      const report = await previewBulkUpload(file);
      setRows(report.results.map((r) => r.data ?? {}));
      setStep('review');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setParsing(false);
    }
  }

  function updateRow(index: number, patch: Partial<BulkUploadRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const rowsToUpload = rows.filter((_, i) => validations[i].errors.length === 0);
    if (rowsToUpload.length === 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const report = await commitBulkUpload(rowsToUpload);
      setFinalReport(report);
      setStep('done');
      onUploaded();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <h2>Bulk upload registrations</h2>

        {step === 'start' && (
          <>
            <p className="bulk-intro">
              Download the template, fill it in (one row per person), then upload it here. You'll
              get a chance to review and fix anything before it actually creates registrations —
              nothing is saved until you confirm on the next screen.
            </p>
            <div className="bulk-start-actions">
              <button
                className="btn"
                onClick={async () => {
                  const blob = await downloadBulkUploadTemplate();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bulk-upload-template.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
              >
                ↓ Download Excel template
              </button>
              <button className="btn" onClick={() => downloadCategoryGuide(categories)}>
                ↓ Download field & category guide (PDF)
              </button>
            </div>

            <label className="bulk-dropzone" style={{ display: 'block', cursor: 'pointer' }}>
              {parsing ? (
                'Reading file…'
              ) : (
                <>
                  <strong style={{ color: 'var(--text)' }}>Click to choose a file</strong>
                  <div>CSV or XLSX, using the template's columns</div>
                </>
              )}
              <input
                type="file"
                accept=".csv,.xlsx"
                disabled={parsing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChosen(file);
                  e.target.value = '';
                }}
              />
            </label>
            {parseError && <div className="banner banner-error" style={{ marginTop: 14 }}>{parseError}</div>}

            <div className="modal-actions">
              <button className="btn" onClick={handleClose}>
                Close
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="bulk-summary">
              <span>
                <strong>{rows.length}</strong> row{rows.length === 1 ? '' : 's'}
              </span>
              <span className="valid-count">✓ {validCount} ready</span>
              {errorCount > 0 && <span className="error-count">⚠ {errorCount} need attention</span>}
              <span style={{ color: 'var(--text-faint)' }}>
                Edit any cell to fix a problem — rows still marked with an error are skipped on upload.
              </span>
            </div>

            <div className="bulk-table-wrap">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>First name</th>
                    <th>Last name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Gender</th>
                    <th>Age range</th>
                    <th>Country</th>
                    <th>T-shirt size</th>
                    <th>Attendance</th>
                    <th>Club / institution</th>
                    <th>Emergency contact name</th>
                    <th>Emergency contact phone</th>
                    <th>Medical notes</th>
                    <th>Issues</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const v = validations[index];
                    return (
                      <tr key={index} className={v.errors.length ? 'row-error' : ''}>
                        <td className="row-index">{index + 2}</td>
                        <td>
                          <input
                            value={row.first_name || ''}
                            onChange={(e) => updateRow(index, { first_name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={row.last_name || ''}
                            onChange={(e) => updateRow(index, { last_name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={row.email || ''}
                            onChange={(e) => updateRow(index, { email: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={row.phone || ''}
                            onChange={(e) => updateRow(index, { phone: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            value={row.category_code || ''}
                            onChange={(e) => updateRow(index, { category_code: e.target.value })}
                          >
                            <option value="">Select…</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.code}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={(row.status || 'CONFIRMED').toUpperCase()}
                            onChange={(e) => updateRow(index, { status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.gender || ''}
                            onChange={(e) => updateRow(index, { gender: e.target.value })}
                          >
                            <option value="">—</option>
                            {GENDER_OPTIONS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.age_range || ''}
                            onChange={(e) => updateRow(index, { age_range: e.target.value })}
                          >
                            <option value="">—</option>
                            {AGE_RANGE_OPTIONS.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={row.country || ''}
                            onChange={(e) => updateRow(index, { country: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            value={row.tshirt_size || ''}
                            onChange={(e) => updateRow(index, { tshirt_size: e.target.value })}
                          >
                            <option value="">—</option>
                            {TSHIRT_SIZE_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.attendance_type || ''}
                            onChange={(e) => updateRow(index, { attendance_type: e.target.value })}
                          >
                            <option value="">—</option>
                            {ATTENDANCE_TYPE_OPTIONS.map((a) => (
                              <option key={a.value} value={a.value}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={row.club_or_institution || ''}
                            onChange={(e) => updateRow(index, { club_or_institution: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={row.emergency_contact_name || ''}
                            onChange={(e) => updateRow(index, { emergency_contact_name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={row.emergency_contact_phone || ''}
                            onChange={(e) => updateRow(index, { emergency_contact_phone: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={row.medical_notes || ''}
                            onChange={(e) => updateRow(index, { medical_notes: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: 180 }}>
                          {v.errors.length === 0 && v.warnings.length === 0 && (
                            <span style={{ color: 'var(--green)' }}>✓ OK</span>
                          )}
                          {(v.errors.length > 0 || v.warnings.length > 0) && (
                            <div className="row-issues">
                              {v.errors.map((e, i) => (
                                <div className="row-error-text" key={`e${i}`}>
                                  {e}
                                </div>
                              ))}
                              {v.warnings.map((w, i) => (
                                <div className="row-warning-text" key={`w${i}`}>
                                  {w}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            className="row-remove-btn"
                            title="Remove this row"
                            onClick={() => removeRow(index)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {submitError && <div className="banner banner-error">{submitError}</div>}

            <div className="modal-actions">
              <button className="btn" onClick={() => setStep('start')} disabled={submitting}>
                ‹ Back
              </button>
              <button className="btn" onClick={handleClose} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleSubmit} disabled={submitting || validCount === 0}>
                {submitting
                  ? 'Uploading…'
                  : `Upload ${validCount} valid registration${validCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}

        {step === 'done' && finalReport && (
          <>
            <div className="banner banner-success">
              Created {finalReport.created_count} registration{finalReport.created_count === 1 ? '' : 's'}.
            </div>
            {finalReport.error_count > 0 && (
              <div className="banner banner-error">
                {finalReport.error_count} row{finalReport.error_count === 1 ? '' : 's'} still failed on
                submit — a category or setting may have changed since you reviewed it:
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  {finalReport.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-success" onClick={handleClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
