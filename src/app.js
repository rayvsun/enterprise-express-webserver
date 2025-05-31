/**
 * 应用主文件
 * 负责配置Express应用、中间件和路由
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { errorHandler, notFoundHandler } = require('./middleware/generic/errorHandler');
const logger = require('./utils/logger');
const config = require('./config');
const setupSwagger = require('./config/swagger');

// 导入路由
const userRoutes = require('./routes/api/users');
const authRoutes = require('./routes/api/auth');

// 创建Express应用
const app = express();

// 基本中间件
app.use(helmet()); // 安全HTTP头
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // 请求日志
app.use(compression()); // Gzip压缩
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码
app.use(cors()); // 跨域

// 静态文件
app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  })
);

// 速率限制
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1分钟
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 每个IP的请求次数
  message: {
    status: 429,
    message: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API前缀
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// 应用速率限制到所有API路由
app.use(API_PREFIX, apiLimiter);

// 注册API路由
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);

// 设置Swagger API文档
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app);
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// 添加版本信息端点
app.get('/version', (req, res) => {
  res.status(200).json({
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// 处理404错误
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

module.exports = app;
