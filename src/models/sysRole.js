/**
 * 角色模型
 */
const { DataTypes } = require('sequelize');

/**
 * 定义角色模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const Role = sequelize.define(
    'Role',
    {
      id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: '主键id',
      },
      role_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: '角色名称',
      },
      role_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '角色编码',
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '描述',
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
      tenant_id: {
        type: DataTypes.INTEGER(10),
        allowNull: true,
        defaultValue: 0,
        comment: '租户ID',
      },
    },
    {
      timestamps: false, // 不使用 createdAt 和 updatedAt
      tableName: 'sys_role',
      indexes: [
        {
          unique: true,
          fields: ['role_code'],
          name: 'uniq_sys_role_role_code',
        },
        {
          fields: ['tenant_id'],
          name: 'idx_sysrole_tenant_id',
        },
      ],
    }
  );

  /**
   * 建立关联关系
   * @param {Object} models - 所有模型
   */
  Role.associate = function (models) {
    // 角色和用户多对多关系
    if (models.User) {
      Role.belongsToMany(models.User, {
        through: models.UserRole,
        foreignKey: 'role_id',
        otherKey: 'user_id',
        as: 'users',
      });
    }

    // 角色和权限多对多关系
    if (models.Permission) {
      Role.belongsToMany(models.Permission, {
        through: models.RolePermission,
        foreignKey: 'role_id',
        otherKey: 'permission_id',
        as: 'permissions',
      });
    }
  };

  return Role;
};
