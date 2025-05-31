/*
 * @Author: ray.v.sun ray.v.sun@qq.com
 * @Date: 2025-05-31 20:55:08
 * @LastEditors: ray.v.sun ray.v.sun@qq.com
 * @LastEditTime: 2025-05-31 21:03:50
 * @FilePath: \WebServer\src\services\sysUserService.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 用户服务类
 * 处理与用户相关的业务逻辑
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('../utils/database');
const logger = require('../utils/logger');
const redisClient = require('../utils/redis');
const config = require('../config');
const { ApiError } = require('../middleware/generic/errorHandler');
const statusCodes = require('../constants/statusCodes');
const { CACHE_PREFIXES, CACHE_TTL, USER_ROLES, USER_STATUS } = require('../constants/business');

class SysUserService {
  /**
   * 获取用户模型
   * @param {string} dbType - 数据库类型
   * @returns {Promise<Model>} - 用户模型
   */
  async getUserModel(dbType) {
    const sequelize = await database.getConnection(dbType);
    return sequelize.models.User;
  }

  /**
   * 注册新用户
   * @param {Object} userData - 用户数据
   * @param {string} dbType - 数据库类型
   * @returns {Promise<Object>} - 新创建的用户
   */
  async register(userData, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        where: {
          [User.sequelize.Op.or]: [{ username: userData.username }, { email: userData.email }],
        },
      });

      if (existingUser) {
        if (existingUser.username === userData.username) {
          throw new ApiError(statusCodes.CONFLICT, '用户名已存在', 'USER_USERNAME_EXISTS');
        } else {
          throw new ApiError(statusCodes.CONFLICT, '邮箱已存在', 'USER_EMAIL_EXISTS');
        }
      }

      // 创建用户
      const user = await database.transaction(async transaction => {
        // 设置默认角色和状态
        const newUser = await User.create(
          {
            ...userData,
            roles: userData.roles || [USER_ROLES.USER],
            status: userData.status || USER_STATUS.ACTIVE,
          },
          { transaction }
        );

        // 记录审计日志
        logger.audit(newUser.id, 'register', 'user', {
          id: newUser.id,
          username: newUser.username,
        });

        return newUser;
      }, dbType);

      // 从返回结果中移除敏感信息
      const userWithoutPassword = this.sanitizeUser(user.toJSON());
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('用户注册失败', { error: error.message, userData });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '用户注册失败', 'USER_REGISTRATION_FAILED');
    }
  }

  /**
   * 用户登录
   * @param {string} username - 用户名或邮箱
   * @param {string} password - 密码
   * @param {string} dbType - 数据库类型
   * @returns {Promise<Object>} - 用户信息和JWT令牌
   */
  async login(username, password, dbType) {
    const User = await this.getUserModel(dbType);
    const Role = User.sequelize.models.Role;
    const Permission = User.sequelize.models.Permission;

    try {
      // 查找用户
      const user = await User.findOne({
        where: {
          [User.sequelize.Op.or]: [{ username }, { email: username }],
          del_flag: 0, // 只查询未删除的用户
        },
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] }, // 不返回中间表数据
            include: [
              {
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }, // 不返回中间表数据
                where: {
                  del_flag: 0, // 只查询未删除的权限
                  status: '1', // 只查询有效的权限
                },
                required: false,
              },
            ],
          },
        ],
      });

      // 用户不存在
      if (!user) {
        throw new ApiError(statusCodes.UNAUTHORIZED, '用户名或密码不正确', 'AUTH_INVALID_CREDENTIALS');
      }

      // 检查账户状态
      if (user.status !== 1) { // 1-正常
        throw new ApiError(statusCodes.FORBIDDEN, '账户未激活或已被禁用', 'AUTH_ACCOUNT_INACTIVE');
      }

      // 检查账户是否被锁定
      if (user.isLocked()) {
        throw new ApiError(statusCodes.FORBIDDEN, '账户已被锁定，请联系管理员', 'AUTH_ACCOUNT_LOCKED');
      }

      // 验证密码
      const isPasswordValid = await user.validatePassword(password);

      if (!isPasswordValid) {
        throw new ApiError(statusCodes.UNAUTHORIZED, '用户名或密码不正确', 'AUTH_INVALID_CREDENTIALS');
      }

      // 更新最后登录时间
      await user.updateLoginTime();

      // 生成JWT令牌
      const token = this.generateToken(user);

      // 记录审计日志
      logger.audit(user.id, 'login', 'user', { id: user.id, username: user.username });

      // 提取用户权限编码
      const perms = [];
      if (user.roles) {
        for (const role of user.roles) {
          if (role.permissions) {
            for (const perm of role.permissions) {
              if (perm.perms && !perms.includes(perm.perms)) {
                perms.push(perm.perms);
              }
            }
          }
        }
      }

      // 缓存用户信息
      const userCache = this.sanitizeUser({
        ...user.toJSON(),
        permissions: perms,
      });
      
      await redisClient.set(`${CACHE_PREFIXES.USER}${user.id}`, JSON.stringify(userCache), CACHE_TTL.LONG);

      return {
        user: userCache,
        token,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('用户登录失败', { error: error.message, username });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '登录过程中发生错误', 'AUTH_LOGIN_FAILED');
    }
  }

  /**
   * 退出登录
   * @param {string} token - JWT令牌
   * @param {Object} user - 用户信息
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async logout(token, user) {
    try {
      // 将令牌添加到黑名单
      const tokenExpiry = this.getTokenExpiry(token);
      const expiryTime = tokenExpiry ? Math.floor((tokenExpiry - Date.now()) / 1000) : CACHE_TTL.DAY;

      await redisClient.set(`blacklist:${token}`, 'true', expiryTime);

      // 记录用户最后登出时间
      if (user && user.id) {
        const User = await this.getUserModel();
        const userModel = await User.findByPk(user.id);
        if (userModel) {
          userModel.update_time = new Date(); // 更新时间作为最后登出时间
          await userModel.save();
        }
        
        // 删除用户缓存
        await redisClient.delete(`${CACHE_PREFIXES.USER}${user.id}`);
        
        // 记录审计日志
        logger.audit(user.id, 'logout', 'user', { id: user.id, username: user.username });
      }

      return true;
    } catch (error) {
      logger.error('用户注销失败', { error: error.message, userId: user?.id });
      return false;
    }
  }

  /**
   * 获取用户列表
   * @param {Object} options - 查询选项
   * @param {string} dbType - 数据库类型
   * @returns {Promise<Object>} - 用户列表和分页信息
   */
  async getUsers(options = {}, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      const { page = 1, limit = 10, status, role, tenantId, search, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

      // 构建查询条件
      const where = {};

      if (status) {
        where.status = status;
      }

      if (tenantId) {
        where.tenantId = tenantId;
      }

      if (search) {
        where[User.sequelize.Op.or] = [
          { username: { [User.sequelize.Op.like]: `%${search}%` } },
          { email: { [User.sequelize.Op.like]: `%${search}%` } },
          { firstName: { [User.sequelize.Op.like]: `%${search}%` } },
          { lastName: { [User.sequelize.Op.like]: `%${search}%` } },
        ];
      }

      // 角色过滤（JSON字段）
      let roleCondition = null;
      if (role) {
        roleCondition = User.sequelize.literal(`JSON_CONTAINS(roles, '"${role}"')`);
      }

      // 执行查询
      const { rows, count } = await User.findAndCountAll({
        where: roleCondition ? { ...where, [User.sequelize.Op.and]: [roleCondition] } : where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] },
      });

      // 计算分页信息
      const totalPages = Math.ceil(count / limit);

      return {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
        },
      };
    } catch (error) {
      logger.error('获取用户列表失败', { error: error.message, options });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '获取用户列表失败', 'USER_LIST_FAILED');
    }
  }

  /**
   * 获取用户详情
   * @param {string} id - 用户ID
   * @param {string} dbType - 数据库类型
   * @returns {Promise<Object>} - 用户信息
   */
  async getUserById(id, dbType) {
    try {
      // 尝试从缓存获取
      const cachedUser = await redisClient.get(`${CACHE_PREFIXES.USER}${id}`);

      if (cachedUser) {
        return cachedUser;
      }

      // 缓存未命中，从数据库获取
      const User = await this.getUserModel(dbType);

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] },
      });

      if (!user) {
        throw new ApiError(statusCodes.NOT_FOUND, '用户不存在', 'USER_NOT_FOUND');
      }

      // 缓存用户信息
      const userJson = user.toJSON();
      await redisClient.set(`${CACHE_PREFIXES.USER}${id}`, userJson, CACHE_TTL.MEDIUM);

      return userJson;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('获取用户详情失败', { error: error.message, userId: id });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '获取用户详情失败', 'USER_DETAILS_FAILED');
    }
  }

  /**
   * 更新用户信息
   * @param {string} id - 用户ID
   * @param {Object} userData - 要更新的用户数据
   * @param {string} dbType - 数据库类型
   * @returns {Promise<Object>} - 更新后的用户信息
   */
  async updateUser(id, userData, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      return await database.transaction(async transaction => {
        // 查找用户
        const user = await User.findByPk(id, { transaction });

        if (!user) {
          throw new ApiError(statusCodes.NOT_FOUND, '用户不存在', 'USER_NOT_FOUND');
        }

        // 禁止更新敏感字段
        const protectedFields = ['id', 'password', 'passwordResetToken', 'passwordResetExpires'];
        protectedFields.forEach(field => {
          delete userData[field];
        });

        // 更新用户
        await user.update(userData, { transaction });

        // 清除缓存
        await redisClient.del(`${CACHE_PREFIXES.USER}${id}`);

        // 记录审计日志
        logger.audit(user.id, 'update', 'user', { id: user.id, fields: Object.keys(userData) });

        // 返回更新后的用户（不包含敏感信息）
        return this.sanitizeUser(user.toJSON());
      }, dbType);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('更新用户信息失败', { error: error.message, userId: id, userData });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '更新用户信息失败', 'USER_UPDATE_FAILED');
    }
  }

  /**
   * 更改用户密码
   * @param {string} id - 用户ID
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @param {string} dbType - 数据库类型
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async changePassword(id, currentPassword, newPassword, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      return await database.transaction(async transaction => {
        // 查找用户
        const user = await User.findByPk(id, { transaction });

        if (!user) {
          throw new ApiError(statusCodes.NOT_FOUND, '用户不存在', 'USER_NOT_FOUND');
        }

        // 验证当前密码
        const isPasswordValid = await user.validatePassword(currentPassword);

        if (!isPasswordValid) {
          throw new ApiError(statusCodes.UNAUTHORIZED, '当前密码不正确', 'AUTH_INVALID_CURRENT_PASSWORD');
        }

        // 验证新密码是否与当前密码相同
        if (currentPassword === newPassword) {
          throw new ApiError(statusCodes.BAD_REQUEST, '新密码不能与当前密码相同', 'AUTH_SAME_PASSWORD');
        }

        // 更新密码
        await user.resetPassword(newPassword);

        // 记录审计日志
        logger.audit(user.id, 'change_password', 'user', { id: user.id });

        return true;
      }, dbType);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('更改密码失败', { error: error.message, userId: id });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '更改密码失败', 'USER_PASSWORD_CHANGE_FAILED');
    }
  }

  /**
   * 请求重置密码
   * @param {string} email - 用户邮箱
   * @param {string} dbType - 数据库类型
   * @returns {Promise<string>} - 重置令牌
   */
  async requestPasswordReset(email, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      // 查找用户
      const user = await User.findOne({ where: { email } });

      if (!user) {
        throw new ApiError(statusCodes.NOT_FOUND, '该邮箱未注册', 'USER_EMAIL_NOT_FOUND');
      }

      // 生成重置令牌
      const resetToken = await user.generatePasswordResetToken();

      // 记录审计日志
      logger.audit(user.id, 'request_password_reset', 'user', { id: user.id, email });

      return resetToken;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('请求重置密码失败', { error: error.message, email });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '请求重置密码失败', 'USER_PASSWORD_RESET_REQUEST_FAILED');
    }
  }

  /**
   * 重置密码
   * @param {string} token - 重置令牌
   * @param {string} newPassword - 新密码
   * @param {string} dbType - 数据库类型
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async resetPassword(token, newPassword, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      return await database.transaction(async transaction => {
        // 查找用户
        const user = await User.findOne({
          where: {
            passwordResetToken: token,
            passwordResetExpires: { [User.sequelize.Op.gt]: new Date() },
          },
          transaction,
        });

        if (!user) {
          throw new ApiError(statusCodes.BAD_REQUEST, '重置令牌无效或已过期', 'AUTH_INVALID_RESET_TOKEN');
        }

        // 重置密码
        await user.resetPassword(newPassword);

        // 记录审计日志
        logger.audit(user.id, 'reset_password', 'user', { id: user.id });

        return true;
      }, dbType);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('重置密码失败', { error: error.message });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '重置密码失败', 'USER_PASSWORD_RESET_FAILED');
    }
  }

  /**
   * 删除用户（软删除）
   * @param {string} id - 用户ID
   * @param {string} dbType - 数据库类型
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async deleteUser(id, dbType) {
    const User = await this.getUserModel(dbType);

    try {
      return await database.transaction(async transaction => {
        // 查找用户
        const user = await User.findByPk(id, { transaction });

        if (!user) {
          throw new ApiError(statusCodes.NOT_FOUND, '用户不存在', 'USER_NOT_FOUND');
        }

        // 软删除用户
        await user.destroy({ transaction });

        // 清除缓存
        await redisClient.del(`${CACHE_PREFIXES.USER}${id}`);

        // 记录审计日志
        logger.audit(id, 'delete', 'user', { id });

        return true;
      }, dbType);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('删除用户失败', { error: error.message, userId: id });
      throw new ApiError(statusCodes.INTERNAL_SERVER_ERROR, '删除用户失败', 'USER_DELETE_FAILED');
    }
  }

  /**
   * 从用户对象中移除敏感信息
   * @param {Object} user - 用户对象
   * @returns {Object} - 处理后的用户对象
   */
  sanitizeUser(user) {
    const { password, passwordResetToken, passwordResetExpires, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * 生成JWT令牌
   * @param {Object} user - 用户对象
   * @returns {string} - JWT令牌
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
    };

    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  }

  /**
   * 获取令牌过期时间
   * @param {string} token - JWT令牌
   * @returns {number|null} - 过期时间戳
   */
  getTokenExpiry(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded && decoded.exp ? decoded.exp * 1000 : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new SysUserService(); 