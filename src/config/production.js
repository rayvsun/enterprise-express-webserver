/**
 * 生产环境配置
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
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      pool: {
        max: parseInt(process.env.MYSQL_POOL_SIZE) || 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      }
    },
    
    // Oracle配置
    oracle: {
      host: process.env.ORACLE_HOST,
      port: parseInt(process.env.ORACLE_PORT) || 1521,
      username: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      sid: process.env.ORACLE_SID,
      pool: {
        max: parseInt(process.env.ORACLE_POOL_SIZE) || 20,
        min: 5,
        increment: 1
      }
    },
    
    // PostgreSQL配置
    postgres: {
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT) || 5432,
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      pool: {
        max: parseInt(process.env.PG_POOL_SIZE) || 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      }
    },
    
    // 达梦配置
    dm: {
      host: process.env.DM_HOST,
      port: parseInt(process.env.DM_PORT) || 5236,
      username: process.env.DM_USER,
      password: process.env.DM_PASSWORD,
      database: process.env.DM_DATABASE,
      pool: {
        max: parseInt(process.env.DM_POOL_SIZE) || 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    // 生产环境使用集群配置
    cluster: process.env.REDIS_CLUSTER === 'true' ? [
      {
        host: process.env.REDIS_CLUSTER_HOST_1 || process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_1) || 6379
      },
      {
        host: process.env.REDIS_CLUSTER_HOST_2 || process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_2) || 6380
      },
      {
        host: process.env.REDIS_CLUSTER_HOST_3 || process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_CLUSTER_PORT_3) || 6381
      }
    ] : null
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // 日志配置
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs'
  },
  
  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1分钟
    max: parseInt(process.env.RATE_LIMIT_MAX) || 60 // 每IP最大请求数
  },
  
  // 消息队列配置
  messageQueue: {
    host: process.env.MQ_HOST,
    port: parseInt(process.env.MQ_PORT) || 5672,
    username: process.env.MQ_USER,
    password: process.env.MQ_PASSWORD,
    enabled: true // 生产环境默认启用消息队列
  },
  
  // 跨域配置
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false, // 生产环境限制来源
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  
  // 静态资源缓存
  static: {
    maxAge: '7d' // 生产环境静态资源缓存7天
  }
}; 