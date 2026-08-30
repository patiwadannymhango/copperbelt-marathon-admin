import type { BulkUploadRow, CategoryOption } from '../api/registrations';
import { STATUS_OPTIONS } from '../api/registrations';

// Mirrors the backend's row-validation rules (apps/registrations/views.py,
// AdminRegistrationBulkUploadView._process_rows) so edits in the review
// table get instant feedback without a round trip on every keystroke. The
// server re-runs the real checks on commit regardless — this is purely for
// responsive UI, never the final word on whether a row will actually save.

const REQUIRED_FIELDS: (keyof BulkUploadRow)[] = ['first_name', 'last_name', 'category_code'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface RowValidation {
  errors: string[];
  warnings: string[];
}

export function validateRows(rows: BulkUploadRow[], categories: CategoryOption[]): RowValidation[] {
  const codeSet = new Set(categories.map((c) => c.code));
  const seenEmails = new Map<string, number>(); // lowercased email -> display row number

  return rows.map((row, index) => {
    const displayRow = index + 2; // spreadsheet row number, header is row 1
    const errors: string[] = [];
    const warnings: string[] = [];

    const missing = REQUIRED_FIELDS.filter((f) => !(row[f] || '').trim());
    if (missing.length) errors.push(`Missing required field(s): ${missing.join(', ')}`);

    const code = (row.category_code || '').trim();
    if (code && !codeSet.has(code)) errors.push(`Unknown category_code '${code}'`);

    const statusValue = (row.status || 'CONFIRMED').trim().toUpperCase();
    if (!STATUS_OPTIONS.includes(statusValue)) errors.push(`Unknown status '${statusValue}'`);

    const email = (row.email || '').trim();
    if (email) {
      if (!EMAIL_RE.test(email)) {
        warnings.push(`'${email}' doesn't look like a valid email`);
      } else {
        const key = email.toLowerCase();
        if (seenEmails.has(key)) {
          warnings.push(`Duplicate email — also row ${seenEmails.get(key)}`);
        } else {
          seenEmails.set(key, displayRow);
        }
      }
    }

    return { errors, warnings };
  });
}
