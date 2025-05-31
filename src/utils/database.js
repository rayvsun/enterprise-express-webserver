/**
 * 数据库连接工具
 * 支持MySQL、Oracle、PostgreSQL和达梦数据库
 */
const { Sequelize } = require('sequelize');
const logger = require('./logger');
const config = require('../config');
const { DATABASE_TYPES } = require('../constants/business');

// 导入数据库模型
const SysUserModel = require('../models/sysUser');
const SysRoleModel = require('../models/sysRole');
const SysPermissionModel = require('../models/sysPermission');
const SysUserRoleModel = require('../models/sysUserRole');
const SysRolePermissionModel = require('../models/sysRolePermission');
const SysDepartModel = require('../models/sysDepart');
const SysUserDepartModel = require('../models/sysUserDepart');

// 数据库连接对象
const connections = {};

/**
 * 初始化MySQL连接
 * @returns {Promise<Sequelize>} - Sequelize连接实例
 */
async function initMySQLConnection() {
  try {
    const { host, port, username, password, database, pool } = config.databases.mysql;

    logger.info('正在连接MySQL数据库...');

    const sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect: 'mysql',
      pool,
      logging: msg => logger.debug(msg),
      dialectOptions: {
        // 其他MySQL特定选项
        dateStrings: true,
        typeCast: true,
      },
      timezone: '+08:00', // 东八区
    });

    // 测试连接
    await sequelize.authenticate();
    logger.info('MySQL数据库连接成功');

    // 初始化模型
    initModels(sequelize);

    return sequelize;
  } catch (error) {
    logger.error('MySQL数据库连接失败', { error: error.message });
    throw error;
  }
}

/**
 * 初始化Oracle连接
 * @returns {Promise<Sequelize>} - Sequelize连接实例
 */
async function initOracleConnection() {
  try {
    const { host, port, username, password, sid, pool } = config.databases.oracle;

    logger.info('正在连接Oracle数据库...');

    const sequelize = new Sequelize('', username, password, {
      host,
      port,
      dialect: 'oracle',
      pool,
      logging: msg => logger.debug(msg),
      dialectOptions: {
        connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`,
        // 其他Oracle特定选项
      },
    });

    // 测试连接
    await sequelize.authenticate();
    logger.info('Oracle数据库连接成功');

    // 初始化模型
    initModels(sequelize);

    return sequelize;
  } catch (error) {
    logger.error('Oracle数据库连接失败', { error: error.message });
    throw error;
  }
}

/**
 * 初始化PostgreSQL连接
 * @returns {Promise<Sequelize>} - Sequelize连接实例
 */
async function initPostgresConnection() {
  try {
    const { host, port, username, password, database, pool } = config.databases.postgres;

    logger.info('正在连接PostgreSQL数据库...');

    const sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect: 'postgres',
      pool,
      logging: msg => logger.debug(msg),
      dialectOptions: {
        // PostgreSQL特定选项
        useUTC: false,
      },
      timezone: '+08:00', // 东八区
    });

    // 测试连接
    await sequelize.authenticate();
    logger.info('PostgreSQL数据库连接成功');

    // 初始化模型
    initModels(sequelize);

    return sequelize;
  } catch (error) {
    logger.error('PostgreSQL数据库连接失败', { error: error.message });
    throw error;
  }
}

/**
 * 初始化达梦数据库连接
 * @returns {Promise<Sequelize>} - Sequelize连接实例
 */
async function initDMConnection() {
  try {
    const { host, port, username, password, database, pool } = config.databases.dm;

    logger.info('正在连接达梦数据库...');

    // 注意: 达梦数据库支持通常需要特定的Sequelize方言
    // 这里使用PostgreSQL方言作为示例，实际项目中可能需要达梦专用的方言包
    const sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect: 'postgres', // 使用PostgreSQL方言作为兼容方案
      pool,
      logging: msg => logger.debug(msg),
      dialectOptions: {
        // 达梦数据库特定选项
      },
    });

    // 测试连接
    await sequelize.authenticate();
    logger.info('达梦数据库连接成功');

    // 初始化模型
    initModels(sequelize);

    return sequelize;
  } catch (error) {
    logger.error('达梦数据库连接失败', { error: error.message });
    throw error;
  }
}

/**
 * 初始化数据库模型
 * @param {Sequelize} sequelize - Sequelize实例
 */
function initModels(sequelize) {
  // 初始化模型
  const models = {
    User: SysUserModel(sequelize),
    Role: SysRoleModel(sequelize),
    Permission: SysPermissionModel(sequelize),
    UserRole: SysUserRoleModel(sequelize),
    RolePermission: SysRolePermissionModel(sequelize),
    Depart: SysDepartModel(sequelize),
    UserDepart: SysUserDepartModel(sequelize),
    // 在此处添加其他模型
  };

  // 建立模型之间的关联关系
  Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
      models[modelName].associate(models);
    }
  });

  // 将模型绑定到Sequelize实例
  sequelize.models = models;
}

/**
 * 获取数据库连接
 * @param {string} type - 数据库类型 (mysql, oracle, postgres, dm)
 * @returns {Promise<Sequelize>} - 数据库连接实例
 */
async function getConnection(type = DATABASE_TYPES.MYSQL) {
  // 如果连接已存在，直接返回
  if (connections[type]) {
    return connections[type];
  }

  let connection;

  // 根据类型初始化不同的数据库连接
  switch (type) {
    case DATABASE_TYPES.MYSQL:
      connection = await initMySQLConnection();
      break;
    case DATABASE_TYPES.ORACLE:
      connection = await initOracleConnection();
      break;
    case DATABASE_TYPES.POSTGRES:
      connection = await initPostgresConnection();
      break;
    case DATABASE_TYPES.DM:
      connection = await initDMConnection();
      break;
    default:
      throw new Error(`不支持的数据库类型: ${type}`);
  }

  // 缓存连接
  connections[type] = connection;

  return connection;
}

/**
 * 关闭所有数据库连接
 */
async function closeAllConnections() {
  for (const type in connections) {
    if (connections[type]) {
      logger.info(`正在关闭 ${type} 数据库连接...`);
      await connections[type].close();
      logger.info(`${type} 数据库连接已关闭`);
      delete connections[type];
    }
  }
}

/**
 * 同步数据库模型（创建表）
 * @param {string} type - 数据库类型
 * @param {boolean} force - 是否强制重建表
 */
async function syncModels(type = DATABASE_TYPES.MYSQL, force = false) {
  try {
    const sequelize = await getConnection(type);

    if (force) {
      logger.warn('正在强制重建数据库表...');
    } else {
      logger.info('正在同步数据库模型...');
    }

    await sequelize.sync({ force });

    logger.info('数据库模型同步完成');
  } catch (error) {
    logger.error('数据库模型同步失败', { error: error.message });
    throw error;
  }
}

/**
 * 执行事务
 * @param {Function} callback - 事务回调函数
 * @param {string} type - 数据库类型
 * @returns {Promise<any>} - 事务执行结果
 */
async function transaction(callback, type = DATABASE_TYPES.MYSQL) {
  const sequelize = await getConnection(type);
  let tx;

  try {
    // 开始事务
    tx = await sequelize.transaction();

    // 执行回调
    const result = await callback(tx);

    // 提交事务
    await tx.commit();

    return result;
  } catch (error) {
    // 回滚事务
    if (tx) await tx.rollback();

    logger.error('事务执行失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

// 导出工具函数
module.exports = {
  getConnection,
  closeAllConnections,
  syncModels,
  transaction,
  DATABASE_TYPES,
};
