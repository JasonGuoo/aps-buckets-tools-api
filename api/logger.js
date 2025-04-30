// logger.js - 日志功能封装
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../server/logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 文件日志
const fileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'job-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'info',
});

// 控制台日志
const consoleTransport = new winston.transports.Console({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`)
    )
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [fileTransport, consoleTransport]
});

module.exports = logger; 