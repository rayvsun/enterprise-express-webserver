/**
 * 角色权限关系模型
 */
const { DataTypes } = require('sequelize');

/**
 * 定义角色权限关系模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const RolePermission = sequelize.define(
    'RolePermission',
    {
      id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: '主键id',
      },
      role_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '角色id',
      },
      permission_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '权限id',
      },
      data_rule_ids: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        comment: '数据权限ids',
      },
      operate_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '操作时间',
      },
      operate_ip: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '操作ip',
      },
    },
    {
      timestamps: false, // 不使用 createdAt 和 updatedAt
      tableName: 'sys_role_permission',
      indexes: [
        {
          fields: ['role_id', 'permission_id'],
          name: 'idx_srp_role_per_id',
        },
        {
          fields: ['role_id'],
          name: 'idx_srp_role_id',
        },
        {
          fields: ['permission_id'],
          name: 'idx_srp_permission_id',
        },
      ],
    }
  );

  return RolePermission;
};
