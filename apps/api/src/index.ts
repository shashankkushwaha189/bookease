import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { archivalJob } from './jobs/archival.job';

// Init background jobs
archivalJob.init();

// Global Error Handlers
process.on('unhandledRejection', (reason) => {
    logger.fatal('Unhandled Promise Rejection', { reason });
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.fatal('Uncaught Exception', { err });
    process.exit(1);
});

const server = app.listen(env.PORT, () => {
    logger.info(`🚀 BookEase API started on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Process terminated.');
    });
});
