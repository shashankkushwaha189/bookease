import { ServiceImportRowSchema } from './src/modules/import/import.service';

const testRows = [
    { name: 'Haircut', durationMinutes: '60', price: '50', bufferBefore: '0', bufferAfter: '15' },
    { name: 'Consultation', durationMinutes: '', price: '0', bufferBefore: '0', bufferAfter: '0' },
    { name: 'Quick Wash', durationMinutes: '15', price: '' }
];

testRows.forEach((row, i) => {
    const res = ServiceImportRowSchema.safeParse(row);
    console.log(`Row ${i + 1} (${row.name}) success:`, res.success);
    if (!res.success) {
        console.log(`Row ${i + 1} errors:`, JSON.stringify(res.error.issues, null, 2));
    } else {
        console.log(`Row ${i + 1} data:`, res.data);
    }
});
