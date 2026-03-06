export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  FATAL = 'FATAL'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
}

class Logger {
  private log(level: LogLevel, message: string, context?: any): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context
    };

    // Format and output log
    const formattedLog = `[${logEntry.timestamp.toISOString()}] ${logEntry.level}: ${message}`;
    
    if (context) {
      console.log(formattedLog, context);
    } else {
      console.log(formattedLog);
    }
  }

  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  fatal(message: string, context?: any): void {
    this.log(LogLevel.FATAL, message, context);
  }
}

export const logger = new Logger();
