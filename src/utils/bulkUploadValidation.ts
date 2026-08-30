import type { BulkUploadRow, CategoryOption } from '../api/registrations';
import { STATUS_OPTIONS } from '../api/registrations';
import { GENDER_OPTIONS, AGE_RANGE_OPTIONS, TSHIRT_SIZE_OPTIONS, ATTENDANCE_TYPE_OPTIONS } from './formOptions';

// Mirrors the backend's row-validation rules (apps/registrations/views.py,
// AdminRegistrationBulkUploadView._process_rows) so edits in the review
// table get instant feedback without a round trip on every keystroke. The
// server re-runs the real checks on commit regardless — this is purely for
// responsive UI, never the final word on whether a row will actually save.

const REQUIRED_FIELDS: (keyof BulkUploadRow)[] = ['first_name', 'last_name', 'category_code'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Only fields with a fixed set of valid values get a (non-blocking)
// warning on mismatch — the rest (country, club, emergency contact,
// medical notes) are free text.
const KNOWN_VALUES: Record<string, string[]> = {
  gender: GENDER_OPTIONS,
  age_range: AGE_RANGE_OPTIONS,
  tshirt_size: TSHIRT_SIZE_OPTIONS,
  attendance_type: ATTENDANCE_TYPE_OPTIONS.map((o) => o.value),
};

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

    for (const [field, known] of Object.entries(KNOWN_VALUES)) {
      const value = (row[field] || '').trim();
      if (value && !known.includes(value)) {
        warnings.push(`'${value}' isn't one of the usual ${field} values (${known.join(', ')}) — check spelling/casing`);
      }
    }

    return { errors, warnings };
  });
}
