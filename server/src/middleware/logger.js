/**
 * Structured JSON logger compatible with ELK Stack (Elasticsearch, Logstash, Kibana).
 *
 * Logs are written as newline-delimited JSON to stdout (for Logstash/Filebeat
 * consumption) and optionally to a rotating file in the `logs/` directory.
 *
 * Environment variables:
 *   LOG_LEVEL   — minimum log level (default: "info")
 *   LOG_TO_FILE — set to "true" to also write logs/app.log (default: false)
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logTransports = [
    new transports.Console({
        format: format.combine(
            format.timestamp(),
            format.json()
        )
    })
];

if (process.env.LOG_TO_FILE === 'true') {
    logTransports.push(
        new transports.File({
            filename: path.join(logsDir, 'app.log'),
            format: format.combine(format.timestamp(), format.json()),
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
            tailable: true
        })
    );
}

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'edutrack-server' },
    transports: logTransports
});

/**
 * Express middleware — logs every request with method, path, status and duration.
 */
logger.expressMiddleware = function (req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        logger.info('http_request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration_ms: Date.now() - start,
            ip: req.ip
        });
    });
    next();
};

module.exports = logger;
