"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const { app } = require("./app");
const { env } = require("./config/env");
const { logger } = require("@bookease/logger");
const { archivalJob } = require("./jobs/archival.job");

// Init background jobs
archivalJob.init();

// ================================
// Global Error Handlers
// ================================
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Promise Rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

// ================================
// Start Server (Render Compatible)
// ================================
const PORT = process.env.PORT || env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(
    `🚀 BookEase API started on port ${PORT} in ${env.NODE_ENV} mode`
  );
});

// ================================
// Graceful Shutdown
// ================================
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Process terminated.");
  });
});