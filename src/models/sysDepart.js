/**
 * 部门模型
 */
const { DataTypes } = require('sequelize');

/**
 * 定义部门模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const Depart = sequelize.define(
    'Depart',
    {
      id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: 'ID',
      },
      parent_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '父机构ID',
      },
      depart_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '机构/部门名称',
      },
      depart_name_en: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '英文名',
      },
      depart_name_abbr: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '缩写',
      },
      depart_order: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        defaultValue: 0,
        comment: '排序',
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '描述',
      },
      org_category: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '1',
        comment: '机构类别 1公司，2组织机构，3岗位',
      },
      org_type: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: '机构类型 1一级部门 2子部门',
      },
      org_code: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: '机构编码',
      },
      mobile: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '手机号',
      },
      fax: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '传真',
      },
      address: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '地址',
      },
      memo: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: '备注',
      },
      status: {
        type: DataTypes.STRING(1),
        allowNull: true,
        comment: '状态（1启用，0不启用）',
      },
      del_flag: {
        type: DataTypes.STRING(1),
        allowNull: true,
        comment: '删除状态（0，正常，1已删除）',
      },
      qywx_identifier: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '对接企业微信的ID',
      },
      ding_identifier: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '对接钉钉部门的ID',
      },
      create_by: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '创建人',
      },
      create_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '创建日期',
      },
      update_by: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '更新人',
      },
      update_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '更新日期',
      },
      tenant_id: {
        type: DataTypes.INTEGER(10),
        allowNull: true,
        defaultValue: 0,
        comment: '租户ID',
      },
      iz_leaf: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        defaultValue: 0,
        comment: '是否有叶子节点: 1是0否',
      },
    },
    {
      timestamps: false, // 不使用 createdAt 和 updatedAt
      tableName: 'sys_depart',
      indexes: [
        {
          unique: true,
          fields: ['org_code'],
          name: 'uniq_depart_org_code'
        },
        {
          fields: ['parent_id'],
          name: 'idx_sd_parent_id'
        },
        {
          fields: ['depart_order'],
          name: 'idx_sd_depart_order'
        }
      ],
    }
  );

  /**
   * 建立关联关系
   * @param {Object} models - 所有模型
   */
  Depart.associate = function (models) {
    // 部门和用户多对多关系
    if (models.User) {
      Depart.belongsToMany(models.User, {
        through: models.UserDepart,
        foreignKey: 'dep_id',
        otherKey: 'user_id',
        as: 'users'
      });
    }
    
    // 部门自关联（父子关系）
    Depart.hasMany(Depart, {
      foreignKey: 'parent_id',
      as: 'children'
    });
    
    Depart.belongsTo(Depart, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
  };

  return Depart;
}; 