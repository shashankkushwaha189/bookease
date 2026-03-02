"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importService = exports.ImportService = exports.StaffImportRowSchema = exports.ServiceImportRowSchema = exports.CustomerImportRowSchema = void 0;
var csv_parse_1 = require("csv-parse");
var zod_1 = require("zod");
var prisma_1 = require("../../lib/prisma");
var errors_1 = require("../../lib/errors");
var stream_1 = require("stream");
// Schemas
exports.CustomerImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    phone: zod_1.z.string().optional(),
    tags: zod_1.z.string().optional()
});
exports.ServiceImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    durationMinutes: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform(function (v) {
        var num = Number(v);
        return isNaN(num) || v === '' ? undefined : num;
    }).refine(function (v) { return v !== undefined && v > 0; }, "Duration must be > 0"),
    bufferBefore: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(function (v) {
        if (v === undefined || v === '')
            return 0;
        var num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(function (v) { return v >= 0; }, "Buffer before must be >= 0"),
    bufferAfter: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(function (v) {
        if (v === undefined || v === '')
            return 0;
        var num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(function (v) { return v >= 0; }, "Buffer after must be >= 0"),
    price: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(function (v) {
        if (v === undefined || v === '')
            return 0;
        var num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(function (v) { return v >= 0; }, "Price must be >= 0"),
});
exports.StaffImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    assignedServices: zod_1.z.string().optional()
});
var ImportService = /** @class */ (function () {
    function ImportService() {
    }
    // Core CSV parser 
    ImportService.prototype.parseCsv = function (buffer, schema) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var results = [];
                        var errors = [];
                        var rowCount = 0;
                        var stream = stream_1.Readable.from(buffer);
                        var parser = (0, csv_parse_1.parse)({
                            columns: true,
                            skip_empty_lines: true,
                            trim: true,
                            relax_column_count: true
                        });
                        parser.on('readable', function () {
                            var record;
                            while ((record = parser.read()) !== null) {
                                rowCount++;
                                if (rowCount > 10000) {
                                    parser.destroy(new errors_1.AppError('Maximum of 10,000 rows exceeded.', 413, 'FILE_TOO_LARGE'));
                                    return;
                                }
                                var parsed = schema.safeParse(record);
                                if (parsed.success) {
                                    results.push(parsed.data);
                                }
                                else {
                                    parsed.error.issues.forEach(function (err) {
                                        errors.push({
                                            row: rowCount,
                                            field: err.path.join('.'),
                                            message: err.message
                                        });
                                    });
                                }
                            }
                        });
                        parser.on('error', function (err) { return reject(err); });
                        parser.on('end', function () { return resolve({ rows: results, errors: errors }); });
                        stream.pipe(parser);
                    })];
            });
        });
    };
    ImportService.prototype.importCustomers = function (tenantId, buffer) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, rows, errors;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.parseCsv(buffer, exports.CustomerImportRowSchema)];
                    case 1:
                        _a = _b.sent(), rows = _a.rows, errors = _a.errors;
                        if (!(rows.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var customerData;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            customerData = rows.map(function (r) { return ({
                                                tenantId: tenantId,
                                                name: r.name,
                                                email: r.email,
                                                phone: r.phone || null,
                                                tags: r.tags ? r.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []
                                            }); });
                                            // Handle upsert-like logic manually if needed, or simple create
                                            // Many times imports just skip existing emails, let's keep it simple with createMany 
                                            // and skipDuplicates to true so we don't crash on repeated emails inside the same file
                                            return [4 /*yield*/, tx.customer.createMany({
                                                    data: customerData,
                                                    skipDuplicates: true
                                                })];
                                        case 1:
                                            // Handle upsert-like logic manually if needed, or simple create
                                            // Many times imports just skip existing emails, let's keep it simple with createMany 
                                            // and skipDuplicates to true so we don't crash on repeated emails inside the same file
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, {
                            imported: rows.length,
                            failed: errors.length,
                            errors: errors
                        }];
                }
            });
        });
    };
    ImportService.prototype.importServices = function (tenantId, buffer) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, rows, errors;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.parseCsv(buffer, exports.ServiceImportRowSchema)];
                    case 1:
                        _a = _b.sent(), rows = _a.rows, errors = _a.errors;
                        if (!(rows.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.service.createMany({
                                                data: rows.map(function (r) { return ({
                                                    tenantId: tenantId,
                                                    name: r.name,
                                                    durationMinutes: r.durationMinutes,
                                                    bufferBefore: r.bufferBefore,
                                                    bufferAfter: r.bufferAfter,
                                                    price: r.price
                                                }); }),
                                                skipDuplicates: true
                                            })];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, {
                            imported: rows.length,
                            failed: errors.length,
                            errors: errors
                        }];
                }
            });
        });
    };
    ImportService.prototype.importStaff = function (tenantId, buffer) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, rows, errors;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.parseCsv(buffer, exports.StaffImportRowSchema)];
                    case 1:
                        _a = _b.sent(), rows = _a.rows, errors = _a.errors;
                        if (!(rows.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var existingServices, _loop_1, _i, rows_1, r;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.service.findMany({ where: { tenantId: tenantId } })];
                                        case 1:
                                            existingServices = _a.sent();
                                            _loop_1 = function (r) {
                                                var staff, serviceNames_1, matchingServices;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0: return [4 /*yield*/, tx.staff.create({
                                                                data: {
                                                                    tenantId: tenantId,
                                                                    name: r.name,
                                                                    email: r.email,
                                                                }
                                                            })];
                                                        case 1:
                                                            staff = _b.sent();
                                                            if (!r.assignedServices) return [3 /*break*/, 3];
                                                            serviceNames_1 = r.assignedServices.split(',').map(function (s) { return s.trim().toLowerCase(); });
                                                            matchingServices = existingServices.filter(function (es) { return serviceNames_1.includes(es.name.toLowerCase()); });
                                                            if (!(matchingServices.length > 0)) return [3 /*break*/, 3];
                                                            return [4 /*yield*/, tx.staffService.createMany({
                                                                    data: matchingServices.map(function (ms) { return ({
                                                                        staffId: staff.id,
                                                                        serviceId: ms.id
                                                                    }); })
                                                                })];
                                                        case 2:
                                                            _b.sent();
                                                            _b.label = 3;
                                                        case 3: return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            _i = 0, rows_1 = rows;
                                            _a.label = 2;
                                        case 2:
                                            if (!(_i < rows_1.length)) return [3 /*break*/, 5];
                                            r = rows_1[_i];
                                            return [5 /*yield**/, _loop_1(r)];
                                        case 3:
                                            _a.sent();
                                            _a.label = 4;
                                        case 4:
                                            _i++;
                                            return [3 /*break*/, 2];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, {
                            imported: rows.length,
                            failed: errors.length,
                            errors: errors
                        }];
                }
            });
        });
    };
    return ImportService;
}());
exports.ImportService = ImportService;
exports.importService = new ImportService();
