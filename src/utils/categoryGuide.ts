import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CategoryOption } from '../api/registrations';
import { STATUS_OPTIONS } from '../api/registrations';

// A one-page cheat sheet for the bulk-upload Excel template: which
// category_code goes with which race, and which status values are valid.
// Built entirely client-side from the same live category list the app
// already has loaded — never goes stale relative to what's actually
// configured for this event.
export function downloadCategoryGuide(categories: CategoryOption[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Copperbelt Marathon 2026 — Bulk Upload Category Codes', 40, 48);

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

  // TypeScript doesn't know autoTable attaches this at runtime.
  const afterCategories = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Valid status values (optional column, defaults to CONFIRMED)', 40, afterCategories + 32);

  autoTable(doc, {
    startY: afterCategories + 44,
    head: [['Status', 'Meaning']],
    body: STATUS_OPTIONS.map((s) => [s, statusMeaning(s)]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [226, 149, 79], textColor: 255 },
    margin: { left: 40, right: 40 },
  });

  doc.save('copperbelt-marathon-category-codes.pdf');
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
