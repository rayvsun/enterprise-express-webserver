/**
 * 错误处理中间件
 */
const logger = require('../../utils/logger');
const statusCodes = require('../../constants/statusCodes');

/**
 * 自定义API错误类
 */
class ApiError extends Error {
  constructor(statusCode, message, code = null, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found 处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(statusCodes.NOT_FOUND, `未找到路径: ${req.originalUrl}`);
  next(error);
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 默认状态码和错误信息
  const statusCode = err.statusCode || statusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || '服务器内部错误';
  const errorCode = err.code || 'SYS_ERROR';

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };

  // 在非生产环境下添加错误堆栈
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack.split('\n');
  }

  // 如果有附加数据，添加到响应中
  if (err.data) {
    errorResponse.error.details = err.data;
  }

  // 记录错误日志（严重程度根据状态码确定）
  if (statusCode >= 500) {
    logger.error(`服务器错误: ${message}`, {
      error: err.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user ? req.user.id : 'anonymous',
    });
  } else if (statusCode >= 400) {
    logger.warn(`客户端错误: ${message}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
    });
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

/**
 * 异步函数错误处理包装器
 * 用于包装异步路由处理函数，自动捕获异常并传递给下一个中间件
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
