/**
 * 用户模型
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_STATUS } = require('../constants/business');

/**
 * 定义用户模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      roles: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [USER_ROLES.USER],
        validate: {
          isValidRole(value) {
            if (!Array.isArray(value)) {
              throw new Error('角色必须是数组');
            }

            const validRoles = Object.values(USER_ROLES);
            for (const role of value) {
              if (!validRoles.includes(role)) {
                throw new Error(`无效的角色: ${role}`);
              }
            }
          },
        },
      },
      status: {
        type: DataTypes.ENUM(...Object.values(USER_STATUS)),
        allowNull: false,
        defaultValue: USER_STATUS.ACTIVE,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: '多租户标识',
      },
      passwordResetToken: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true, // 添加 createdAt 和 updatedAt
      paranoid: true, // 软删除，添加 deletedAt
      tableName: 'users',
      indexes: [
        {
          unique: true,
          fields: ['username'],
        },
        {
          unique: true,
          fields: ['email'],
        },
        {
          fields: ['tenantId'],
        },
      ],
      hooks: {
        // 保存前对密码进行哈希处理
        beforeSave: async user => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );

  // 实例方法

  /**
   * 验证密码
   * @param {string} candidatePassword - 待验证的密码
   * @returns {Promise<boolean>} - 是否匹配
   */
  User.prototype.validatePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  /**
   * 更新最后登录时间
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.updateLoginTime = async function () {
    this.lastLogin = new Date();
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    return await this.save();
  };

  /**
   * 增加失败登录次数
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.incrementFailedLogins = async function () {
    this.failedLoginAttempts += 1;

    // 如果失败次数达到阈值，锁定账户
    if (this.failedLoginAttempts >= 5) {
      // 锁定30分钟
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + 30);
      this.lockUntil = lockTime;
    }

    return await this.save();
  };

  /**
   * 检查账户是否被锁定
   * @returns {boolean} - 是否被锁定
   */
  User.prototype.isLocked = function () {
    return this.lockUntil && new Date() < this.lockUntil;
  };

  /**
   * 重置密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.resetPassword = async function (newPassword) {
    this.password = newPassword;
    this.passwordResetToken = null;
    this.passwordResetExpires = null;
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    return await this.save();
  };

  /**
   * 生成密码重置令牌
   * @returns {Promise<string>} - 生成的令牌
   */
  User.prototype.generatePasswordResetToken = async function () {
    // 生成随机令牌
    const token = require('crypto').randomBytes(32).toString('hex');

    // 设置令牌及过期时间（1小时后）
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    this.passwordResetToken = token;
    this.passwordResetExpires = expiry;
    await this.save();

    return token;
  };

  /**
   * 激活账户
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.activate = async function () {
    this.status = USER_STATUS.ACTIVE;
    this.emailVerified = true;
    return await this.save();
  };

  /**
   * 停用账户
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.deactivate = async function () {
    this.status = USER_STATUS.INACTIVE;
    return await this.save();
  };

  // 类方法（静态方法）

  /**
   * 查找活跃用户
   * @returns {Promise<User[]>} - 活跃用户列表
   */
  User.findActive = function () {
    return this.findAll({
      where: {
        status: USER_STATUS.ACTIVE,
      },
    });
  };

  /**
   * 根据角色查找用户
   * @param {string} role - 角色
   * @returns {Promise<User[]>} - 匹配角色的用户列表
   */
  User.findByRole = function (role) {
    return this.findAll({
      where: sequelize.literal(`JSON_CONTAINS(roles, '"${role}"')`),
    });
  };

  /**
   * 建立关联关系
   * @param {Object} models - 所有模型
   */
  User.associate = function (models) {
    // 用户属于一个租户
    if (models.Tenant) {
      User.belongsTo(models.Tenant, {
        foreignKey: 'tenantId',
        as: 'tenant',
      });
    }

    // 其他关联关系
    // 例如: User.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
  };

  return User;
};
