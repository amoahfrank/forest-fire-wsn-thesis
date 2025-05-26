// Forest Fire Detection System - Logging Utility
// Winston-based logging configuration for application monitoring
//
// MSc Thesis Implementation - July 2022
// Author: Frank Amoah

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs';

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss.SSS'
    }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Create transports array
const transports = [];

// Console transport
transports.push(
    new winston.transports.Console({
        level: NODE_ENV === 'development' ? 'debug' : LOG_LEVEL,
        format: NODE_ENV === 'development' ? consoleFormat : logFormat,
        handleExceptions: true,
        handleRejections: true
    })
);

// File transports for production
if (NODE_ENV === 'production') {
    // General application logs
    transports.push(
        new DailyRotateFile({
            filename: path.join(LOG_FILE_PATH, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: LOG_LEVEL,
            format: logFormat,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '14d',
            compress: true,
            handleExceptions: true,
            handleRejections: true
        })
    );
    
    // Error logs
    transports.push(
        new DailyRotateFile({
            filename: path.join(LOG_FILE_PATH, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            format: logFormat,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '30d',
            compress: true,
            handleExceptions: true,
            handleRejections: true
        })
    );
    
    // API access logs
    transports.push(
        new DailyRotateFile({
            filename: path.join(LOG_FILE_PATH, 'access-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'http',
            format: logFormat,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '7d',
            compress: true
        })
    );
    
    // Sensor data logs (separate for analysis)
    transports.push(
        new DailyRotateFile({
            filename: path.join(LOG_FILE_PATH, 'sensor-data-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '30d',
            compress: true
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: logFormat,
    defaultMeta: {
        service: 'forest-fire-api',
        version: process.env.APP_VERSION || '2.1.3',
        environment: NODE_ENV
    },
    transports,
    exitOnError: false
});

// Handle logging errors
logger.on('error', (error) => {
    console.error('Logger error:', error);
});

// Custom logging methods for specific use cases
logger.sensorData = (nodeId, data) => {
    logger.info('Sensor data received', {
        category: 'sensor-data',
        nodeId,
        data,
        timestamp: new Date().toISOString()
    });
};

logger.alert = (alertType, nodeId, data) => {
    logger.warn('Alert generated', {
        category: 'alert',
        alertType,
        nodeId,
        data,
        timestamp: new Date().toISOString()
    });
};

logger.security = (event, details) => {
    logger.warn('Security event', {
        category: 'security',
        event,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.performance = (operation, duration, details = {}) => {
    logger.info('Performance metric', {
        category: 'performance',
        operation,
        duration,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.audit = (action, user, details) => {
    logger.info('Audit event', {
        category: 'audit',
        action,
        user,
        details,
        timestamp: new Date().toISOString()
    });
};

// HTTP request logger stream
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Development helper
if (NODE_ENV === 'development') {
    logger.debug('Logger initialized in development mode');
    logger.debug(`Log level: ${LOG_LEVEL}`);
    logger.debug(`Log file path: ${LOG_FILE_PATH}`);
}

module.exports = logger;