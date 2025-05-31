/**
 * 用户模型
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { USER_STATUS } = require('../constants/business');

/**
 * 定义用户模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: '主键id',
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: '登录账号',
      },
      realname: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '真实姓名',
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '密码',
      },
      salt: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'md5密码盐',
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '头像',
      },
      birthday: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: '生日',
      },
      sex: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '性别(0-默认未知,1-男,2-女)',
      },
      email: {
        type: DataTypes.STRING(45),
        allowNull: true,
        unique: true,
        comment: '电子邮件',
      },
      phone: {
        type: DataTypes.STRING(45),
        allowNull: true,
        unique: true,
        comment: '电话',
      },
      org_code: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: '登录会话的机构编码',
      },
      status: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '状态(1-正常,2-冻结)',
        defaultValue: 1,
      },
      del_flag: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '删除状态(0-正常,1-已删除)',
        defaultValue: 0,
      },
      third_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '第三方登录的唯一标识',
      },
      third_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '第三方类型',
      },
      activiti_sync: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '同步工作流引擎(1-同步,0-不同步)',
      },
      work_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: '工号，唯一键',
      },
      telephone: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: '座机号',
      },
      create_by: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '创建人',
      },
      create_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '创建时间',
      },
      update_by: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '更新人',
      },
      update_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '更新时间',
      },
      user_identity: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '身份（1普通成员 2上级）',
      },
      depart_ids: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        comment: '负责部门',
      },
      client_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: '设备ID',
      },
      login_tenant_id: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        comment: '上次登录选择租户ID',
      },
      bpm_status: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: '流程入职离职状态',
      },
    },
    {
      timestamps: false, // 不使用 createdAt 和 updatedAt
      tableName: 'sys_user',
      indexes: [
        {
          unique: true,
          fields: ['work_no'],
          name: 'uniq_sys_user_work_no'
        },
        {
          unique: true,
          fields: ['username'],
          name: 'uniq_sys_user_username'
        },
        {
          unique: true,
          fields: ['phone'],
          name: 'uniq_sys_user_phone'
        },
        {
          unique: true,
          fields: ['email'],
          name: 'uniq_sys_user_email'
        },
        {
          fields: ['status'],
          name: 'idx_su_status'
        },
        {
          fields: ['del_flag'],
          name: 'idx_su_del_flag'
        },
        {
          fields: ['username', 'del_flag'],
          name: 'idx_su_del_username'
        }
      ],
      hooks: {
        // 保存前对密码进行哈希处理
        beforeSave: async user => {
          if (user.changed('password') && user.password) {
            // 使用salt进行加密
            if (!user.salt) {
              user.salt = bcrypt.genSaltSync(10);
            }
            user.password = await bcrypt.hash(user.password, user.salt);
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
    this.update_time = new Date();
    return await this.save();
  };

  /**
   * 检查账户是否被锁定
   * @returns {boolean} - 是否被锁定
   */
  User.prototype.isLocked = function () {
    return this.status === 2; // 2代表冻结状态
  };

  /**
   * 重置密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.resetPassword = async function (newPassword) {
    this.password = newPassword;
    this.update_time = new Date();
    return await this.save();
  };

  /**
   * 停用账户
   * @returns {Promise<User>} - 更新后的用户实例
   */
  User.prototype.deactivate = async function () {
    this.status = 2; // 冻结状态
    this.update_time = new Date();
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
        status: 1, // 正常状态
        del_flag: 0, // 未删除
      },
    });
  };

  /**
   * 建立关联关系
   * @param {Object} models - 所有模型
   */
  User.associate = function (models) {
    // 用户和角色多对多关系
    if (models.Role) {
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
    }
    
    // 用户和部门多对多关系
    if (models.Depart) {
      User.belongsToMany(models.Depart, {
        through: models.UserDepart,
        foreignKey: 'user_id',
        otherKey: 'dep_id',
        as: 'departs'
      });
    }
  };

  return User;
};
