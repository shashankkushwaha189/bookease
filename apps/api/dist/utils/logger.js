"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "ERROR";
    LogLevel["WARN"] = "WARN";
    LogLevel["INFO"] = "INFO";
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["FATAL"] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    log(level, message, context) {
        const logEntry = {
            level,
            message,
            timestamp: new Date(),
            context
        };
        // Format and output log
        const formattedLog = `[${logEntry.timestamp.toISOString()}] ${logEntry.level}: ${message}`;
        if (context) {
            console.log(formattedLog, context);
        }
        else {
            console.log(formattedLog);
        }
    }
    error(message, context) {
        this.log(LogLevel.ERROR, message, context);
    }
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    fatal(message, context) {
        this.log(LogLevel.FATAL, message, context);
    }
}
exports.logger = new Logger();
