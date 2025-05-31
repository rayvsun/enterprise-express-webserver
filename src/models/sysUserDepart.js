/**
 * 用户部门关系模型
 */
const { DataTypes } = require('sequelize');

/**
 * 定义用户部门关系模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const UserDepart = sequelize.define(
    'UserDepart',
    {
      ID: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: 'id',
      },
      user_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '用户id',
      },
      dep_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '部门id',
      },
    },
    {
      timestamps: false, // 不使用 createdAt 和 updatedAt
      tableName: 'sys_user_depart',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'dep_id'],
          name: 'idx_sud_user_dep_id',
        },
        {
          fields: ['user_id'],
          name: 'idx_sud_user_id',
        },
        {
          fields: ['dep_id'],
          name: 'idx_sud_dep_id',
        },
      ],
    }
  );

  return UserDepart;
}; 