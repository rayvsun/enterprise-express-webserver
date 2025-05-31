/**
 * 用户角色关系模型
 */
const { DataTypes } = require('sequelize');

/**
 * 定义用户角色关系模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const UserRole = sequelize.define(
    'UserRole',
    {
      id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: '主键id',
      },
      user_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '用户id',
      },
      role_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '角色id',
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
      tableName: 'sys_user_role',
      indexes: [
        {
          fields: ['user_id'],
          name: 'idx_sur_user_id',
        },
        {
          fields: ['role_id'],
          name: 'idx_sur_role_id',
        },
        {
          fields: ['user_id', 'role_id'],
          name: 'idx_sur_user_role_id',
        },
      ],
    }
  );

  return UserRole;
}; 