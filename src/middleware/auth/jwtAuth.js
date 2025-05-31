/**
 * JWT认证中间件
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('../generic/errorHandler');
const statusCodes = require('../../constants/statusCodes');
const logger = require('../../utils/logger');
const config = require('../../config');
const Redis = require('../../utils/redis');

/**
 * 验证JWT令牌并将用户信息添加到请求对象
 */
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(statusCodes.UNAUTHORIZED, '未提供认证令牌', 'AUTH_TOKEN_MISSING');
    }

    // 提取token
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(statusCodes.UNAUTHORIZED, '无效的认证令牌格式', 'AUTH_INVALID_TOKEN_FORMAT');
    }

    // 验证token
    try {
      const decoded = jwt.verify(token, config.jwt.secret);

      // 检查token是否在Redis黑名单中（已注销）
      const isBlacklisted = await Redis.client.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new ApiError(statusCodes.UNAUTHORIZED, '令牌已失效，请重新登录', 'AUTH_TOKEN_REVOKED');
      }

      // 将用户信息添加到请求对象
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(statusCodes.UNAUTHORIZED, '认证令牌已过期', 'AUTH_TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new ApiError(statusCodes.UNAUTHORIZED, '无效的认证令牌', 'AUTH_INVALID_TOKEN');
      } else {
        throw error; // 传递其他错误
      }
    }
  } catch (error) {
    // 如果是ApiError实例，直接传递给错误处理中间件
    if (error instanceof ApiError) {
      next(error);
    } else {
      // 其他意外错误
      logger.error('认证过程发生错误', { error: error.message, stack: error.stack });
      next(new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '认证过程发生错误', 'AUTH_SYSTEM_ERROR'));
    }
  }
};

/**
 * 检查用户是否具有指定角色
 * @param {string|string[]} roles - 必需的角色或角色数组
 */
const hasRole = roles => (req, res, next) => {
  // 确保用户已通过认证
  if (!req.user) {
    return next(new ApiError(statusCodes.UNAUTHORIZED, '需要认证', 'AUTH_REQUIRED'));
  }

  // 转换为数组
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  // 检查用户是否具有所需角色
  if (requiredRoles.some(role => req.user.roles.includes(role))) {
    return next();
  }

  // 记录访问尝试
  logger.warn('权限不足', {
    userId: req.user.id,
    requiredRoles,
    userRoles: req.user.roles,
    method: req.method,
    path: req.originalUrl,
  });

  // 拒绝访问
  next(new ApiError(statusCodes.FORBIDDEN, '权限不足，无法访问此资源', 'AUTH_INSUFFICIENT_PERMISSIONS'));
};

/**
 * 检查用户是否有权限访问特定租户的数据
 * 用于多租户环境中的租户隔离
 */
const tenantAccess =
  (paramName = 'tenantId') =>
  (req, res, next) => {
    // 确保用户已通过认证
    if (!req.user) {
      return next(new ApiError(statusCodes.UNAUTHORIZED, '需要认证', 'AUTH_REQUIRED'));
    }

    // 获取请求中的租户ID
    const requestedTenantId = req.params[paramName] || req.body[paramName] || req.query[paramName];

    // 管理员可以访问所有租户
    if (req.user.roles.includes('admin')) {
      return next();
    }

    // 验证用户是否可以访问请求的租户
    if (!requestedTenantId || requestedTenantId !== req.user.tenantId) {
      logger.warn('租户访问被拒绝', {
        userId: req.user.id,
        userTenantId: req.user.tenantId,
        requestedTenantId,
        method: req.method,
        path: req.originalUrl,
      });

      return next(new ApiError(statusCodes.FORBIDDEN, '无权访问此租户的数据', 'AUTH_TENANT_ACCESS_DENIED'));
    }

    next();
  };

module.exports = {
  authenticate,
  hasRole,
  tenantAccess,
};
