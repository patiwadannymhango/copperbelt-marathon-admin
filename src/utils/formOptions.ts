// Shared between the manual "Add person" form (Registrations.tsx) and the
// bulk-upload feature (BulkUploadDialog.tsx, categoryGuide.ts) so the two
// entry paths always offer/expect the exact same values — matches the
// public registration form's exact field options too.
export const GENDER_OPTIONS = ['male', 'female'];
export const AGE_RANGE_OPTIONS = ['Under 18', '18-29', '30-39', '40-49', '50-59', '60+'];
export const TSHIRT_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
export const ATTENDANCE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'in-person', label: 'In-person' },
  { value: 'virtual', label: 'Virtual' },
];
