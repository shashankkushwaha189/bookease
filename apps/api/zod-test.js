"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var import_service_1 = require("./src/modules/import/import.service");
var testRows = [
    { name: 'Haircut', durationMinutes: '60', price: '50', bufferBefore: '0', bufferAfter: '15' },
    { name: 'Consultation', durationMinutes: '', price: '0', bufferBefore: '0', bufferAfter: '0' },
    { name: 'Quick Wash', durationMinutes: '15', price: '' }
];
testRows.forEach(function (row, i) {
    var res = import_service_1.ServiceImportRowSchema.safeParse(row);
    console.log("Row ".concat(i + 1, " (").concat(row.name, ") success:"), res.success);
    if (!res.success) {
        console.log("Row ".concat(i + 1, " errors:"), JSON.stringify(res.error.issues, null, 2));
    }
    else {
        console.log("Row ".concat(i + 1, " data:"), res.data);
    }
});
