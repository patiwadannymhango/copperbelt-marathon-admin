import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CategoryOption } from '../api/registrations';
import { STATUS_OPTIONS } from '../api/registrations';
import { GENDER_OPTIONS, AGE_RANGE_OPTIONS, TSHIRT_SIZE_OPTIONS, ATTENDANCE_TYPE_OPTIONS } from './formOptions';

// A cheat sheet for the bulk-upload Excel template: which category_code
// goes with which race, which status values are valid, and which values
// the fixed-choice extra columns (gender, age range, t-shirt size,
// attendance type) expect. Built entirely client-side from the same live
// category list the app already has loaded — never goes stale relative
// to what's actually configured for this event. Paginates automatically
// if the category list is long enough to need more than one page.
export function downloadCategoryGuide(categories: CategoryOption[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Copperbelt Marathon 2026 — Bulk Upload Guide', 40, 48);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(
    'Use the code from this list in the category_code column of the bulk-upload template.',
    40,
    68
  );

  autoTable(doc, {
    startY: 88,
    head: [['Category', 'Code', 'Price']],
    body: categories.map((c) => [c.name, c.code, `${c.currency} ${c.price}`]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [226, 149, 79], textColor: 255 },
    margin: { left: 40, right: 40 },
  });

  let cursorY = lastTableY(doc);

  cursorY = section(doc, cursorY, 'Valid status values (optional column, defaults to CONFIRMED)', [
    ['Status', 'Meaning'],
    ...STATUS_OPTIONS.map((s) => [s, statusMeaning(s)]),
  ]);

  cursorY = section(doc, cursorY, 'Gender (optional column)', [
    ['Value'],
    ...GENDER_OPTIONS.map((v) => [v]),
  ]);

  cursorY = section(doc, cursorY, 'Age range (optional column)', [
    ['Value'],
    ...AGE_RANGE_OPTIONS.map((v) => [v]),
  ]);

  cursorY = section(doc, cursorY, 'T-shirt size (optional column)', [
    ['Value'],
    ...TSHIRT_SIZE_OPTIONS.map((v) => [v]),
  ]);

  cursorY = section(doc, cursorY, 'Attendance type (optional column)', [
    ['Value', 'Meaning'],
    ...ATTENDANCE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
  ]);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(90);
  doc.text(
    'Free-text optional columns (no fixed values): country, club_or_institution,',
    40,
    cursorY + 24
  );
  doc.text('emergency_contact_name, emergency_contact_phone, medical_notes.', 40, cursorY + 38);

  doc.save('copperbelt-marathon-category-codes.pdf');
}

function lastTableY(doc: jsPDF): number {
  // TypeScript doesn't know autoTable attaches this at runtime.
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function section(doc: jsPDF, afterY: number, title: string, rows: string[][]): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  // If a section's heading wouldn't leave room for at least a couple of
  // rows before the page ends, start it on a fresh page instead of
  // splitting the heading from its table.
  if (afterY + 60 > pageHeight - 40) {
    doc.addPage();
    afterY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(title, 40, afterY + 32);

  autoTable(doc, {
    startY: afterY + 44,
    head: [rows[0]],
    body: rows.slice(1),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [226, 149, 79], textColor: 255 },
    margin: { left: 40, right: 40 },
  });

  return lastTableY(doc);
}

function statusMeaning(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Paid / confirmed — the default if the column is left blank';
    case 'PENDING_PAYMENT':
      return 'Registered but payment not yet received';
    case 'RESERVED':
      return 'Reserved a spot, pay later';
    case 'PAYMENT_PROCESSING':
      return 'Payment initiated, awaiting confirmation';
    case 'CANCELLED':
      return 'Cancelled';
    case 'EXPIRED':
      return 'Expired without payment';
    case 'REFUNDED':
      return 'Paid, then refunded';
    case 'DRAFT':
      return 'Incomplete, not submitted';
    default:
      return '';
  }
}
