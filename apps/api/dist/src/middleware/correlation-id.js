"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("@bookease/logger");
const correlationIdMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || (0, uuid_1.v4)();
    // Set in response headers
    res.setHeader('x-correlation-id', correlationId);
    // Run the rest of the request within the AsyncLocalStorage context
    logger_1.storage.run({ correlationId }, () => {
        next();
    });
};
exports.correlationIdMiddleware = correlationIdMiddleware;
