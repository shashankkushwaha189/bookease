import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
export declare const storage: AsyncLocalStorage<{
    correlationId: string;
}>;
export declare const logger: pino.Logger<never, boolean>;
