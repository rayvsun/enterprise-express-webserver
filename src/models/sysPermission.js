/**
 * 权限模型
 */
const { DataTypes } = require('sequelize');

/**
 * 定义权限模型
 * @param {import('sequelize').Sequelize} sequelize - Sequelize实例
 */
module.exports = sequelize => {
  const Permission = sequelize.define(
    'Permission',
    {
      id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
        comment: '主键id',
      },
      parent_id: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: '父id',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '菜单标题',
      },
      url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '路径',
      },
      component: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '组件',
      },
      is_route: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        defaultValue: 1,
        comment: '是否路由菜单: 0:不是 1:是（默认值1）',
      },
      component_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '组件名字',
      },
      redirect: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '一级菜单跳转地址',
      },
      menu_type: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        comment: '菜单类型(0:一级菜单; 1:子菜单:2:按钮权限)',
      },
      perms: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '菜单权限编码',
      },
      perms_type: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: '0',
        comment: '权限策略1显示2禁用',
      },
      sort_no: {
        type: DataTypes.DOUBLE(8, 2),
        allowNull: true,
        comment: '菜单排序',
      },
      always_show: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '聚合子路由: 1是0否',
      },
      icon: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '菜单图标',
      },
      is_leaf: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '是否叶子节点: 1是0否',
      },
      keep_alive: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '是否缓存该页面: 1:是 0:不是',
      },
      hidden: {
        type: DataTypes.TINYINT(4),
        allowNull: true,
        defaultValue: 0,
        comment: '是否隐藏路由: 0否,1是',
      },
      hide_tab: {
        type: DataTypes.TINYINT(4),
        allowNull: true,
        comment: '是否隐藏tab: 0否,1是',
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '描述',
      },
      create_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '创建人',
      },
      create_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '创建时间',
      },
      update_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '更新人',
      },
      update_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '更新时间',
      },
      del_flag: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        defaultValue: 0,
        comment: '删除状态 0正常 1已删除',
      },
      rule_flag: {
        type: DataTypes.INTEGER(3),
        allowNull: true,
        defaultValue: 0,
        comment: '是否添加数据权限1是0否',
      },
      status: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: '按钮权限状态(0无效1有效)',
      },
      internal_or_external: {
        type: DataTypes.TINYINT(1),
        allowNull: true,
        comment: '外链菜单打开方式 0/内部打开 1/外部打开',
      },
    },
    {
      timestamps: false, // 不使用 createdAt 和 updatedAt
      tableName: 'sys_permission',
      indexes: [
        {
          fields: ['menu_type'],
          name: 'index_menu_type',
        },
        {
          fields: ['hidden'],
          name: 'index_menu_hidden',
        },
        {
          fields: ['status'],
          name: 'index_menu_status',
        },
        {
          fields: ['del_flag'],
          name: 'index_menu_del_flag',
        },
        {
          fields: ['url'],
          name: 'index_menu_url',
        },
        {
          fields: ['sort_no'],
          name: 'index_menu_sort_no',
        },
      ],
    }
  );

  /**
   * 建立关联关系
   * @param {Object} models - 所有模型
   */
  Permission.associate = function (models) {
    // 权限和角色多对多关系
    if (models.Role) {
      Permission.belongsToMany(models.Role, {
        through: models.RolePermission,
        foreignKey: 'permission_id',
        otherKey: 'role_id',
        as: 'roles',
      });
    }
    
    // 权限自关联（父子关系）
    Permission.hasMany(Permission, {
      foreignKey: 'parent_id',
      as: 'children',
    });
    
    Permission.belongsTo(Permission, {
      foreignKey: 'parent_id',
      as: 'parent',
    });
  };

  return Permission;
}; 