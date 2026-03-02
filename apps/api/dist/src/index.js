"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("@bookease/logger");
const archival_job_1 = require("./jobs/archival.job");
// Init background jobs
archival_job_1.archivalJob.init();
// Global Error Handlers
process.on('unhandledRejection', (reason) => {
    logger_1.logger.fatal({ reason, msg: 'Unhandled Promise Rejection' });
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    logger_1.logger.fatal({ err, msg: 'Uncaught Exception' });
    process.exit(1);
});
const server = app_1.app.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`🚀 BookEase API started on port ${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode`);
});
// Graceful Shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger_1.logger.info('Process terminated.');
    });
});
