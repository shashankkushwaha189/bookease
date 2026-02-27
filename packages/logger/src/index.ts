import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Storage for correlation ID to be used in every log line
export const storage = new AsyncLocalStorage<{ correlationId: string }>();

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin() {
        const store = storage.getStore();
        return store ? { correlationId: store.correlationId } : {};
    },
    // Security: Redact sensitive fields
    redact: {
        paths: ['password', 'secret', 'token', 'jwt', 'apiKey', 'creditCard'],
        remove: true,
    },
});
