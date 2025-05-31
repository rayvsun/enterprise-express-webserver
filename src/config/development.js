/**
 * 开发环境配置
 */
module.exports = {
  // 应用配置
  app: {
    name: 'express-enterprise-server',
    port: process.env.PORT || 3000,
    apiPrefix: process.env.API_PREFIX || '/api/v1',
  },

  // 数据库配置
  databases: {
    // MySQL配置
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'myapp',
      pool: {
        max: parseInt(process.env.MYSQL_POOL_SIZE) || 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },

    // Oracle配置
    oracle: {
      host: process.env.ORACLE_HOST || 'localhost',
      port: parseInt(process.env.ORACLE_PORT) || 1521,
      username: process.env.ORACLE_USER || 'system',
      password: process.env.ORACLE_PASSWORD || '',
      sid: process.env.ORACLE_SID || 'XE',
      pool: {
        max: parseInt(process.env.ORACLE_POOL_SIZE) || 10,
        min: 0,
        increment: 1,
      },
    },

    // PostgreSQL配置
    postgres: {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT) || 5432,
      username: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      database: process.env.PG_DATABASE || 'myapp',
      pool: {
        max: parseInt(process.env.PG_POOL_SIZE) || 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },

    // 达梦配置
    dm: {
      host: process.env.DM_HOST || 'localhost',
      port: parseInt(process.env.DM_PORT) || 5236,
      username: process.env.DM_USER || 'SYSDBA',
      password: process.env.DM_PASSWORD || '',
      database: process.env.DM_DATABASE || 'myapp',
      pool: {
        max: parseInt(process.env.DM_POOL_SIZE) || 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0,
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // 日志配置
  logger: {
    level: process.env.LOG_LEVEL || 'debug',
    dir: process.env.LOG_DIR || 'logs',
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 每IP最大请求数
  },

  // 消息队列配置
  messageQueue: {
    host: process.env.MQ_HOST || 'localhost',
    port: parseInt(process.env.MQ_PORT) || 5672,
    username: process.env.MQ_USER || 'guest',
    password: process.env.MQ_PASSWORD || 'guest',
    enabled: false, // 开发环境默认不启用消息队列
  },

  // 跨域配置
  cors: {
    origin: '*', // 开发环境允许所有来源
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },
};
