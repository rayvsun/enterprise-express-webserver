/**
 * 日志工具模块
 * 使用winston实现分级日志记录
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { format } = winston;
const config = require('../config');

// 确保日志目录存在
const logDir = config.logger?.dir || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义格式
const customFormat = format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.errors({ stack: true }), format.splat(), format.json());

// 创建日志记录器
const logger = winston.createLogger({
  level: config.logger?.level || 'info',
  format: customFormat,
  defaultMeta: { service: config.app?.name || 'express-server' },
  transports: [
    // 记录所有error级别日志到error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 记录所有日志到combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 单独记录访问日志
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 非生产环境同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        })
      ),
    })
  );
}

// 审计日志记录方法
logger.audit = (userId, action, resource, details = {}) => {
  logger.info('审计日志', {
    audit: true,
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
  });
};

// 性能日志记录方法
logger.performance = (operation, duration, metadata = {}) => {
  logger.info(`性能统计 - ${operation} (${duration}ms)`, {
    performance: true,
    operation,
    duration,
    ...metadata,
  });
};

// 请求日志记录器中间件
logger.requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // 响应完成后记录请求
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'anonymous',
    };

    const level = res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `HTTP ${req.method} ${req.originalUrl || req.url}`, logData);

    // 记录慢请求
    if (duration > 1000) {
      logger.warn(`慢请求: ${duration}ms`, logData);
    }
  });

  next();
};

// 允许使用简写方法
const shortcutMethods = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
shortcutMethods.forEach(method => {
  module.exports[method] = (...args) => logger[method](...args);
});

module.exports = logger;
