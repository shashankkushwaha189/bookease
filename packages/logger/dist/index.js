"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.storage = void 0;
const pino_1 = __importDefault(require("pino"));
const async_hooks_1 = require("async_hooks");
// Storage for correlation ID to be used in every log line
exports.storage = new async_hooks_1.AsyncLocalStorage();
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    mixin() {
        const store = exports.storage.getStore();
        return store ? { correlationId: store.correlationId } : {};
    },
    // Security: Redact sensitive fields
    redact: {
        paths: ['password', 'secret', 'token', 'jwt', 'apiKey', 'creditCard'],
        remove: true,
    },
});
