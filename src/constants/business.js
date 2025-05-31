/**
 * 业务常量
 */
module.exports = {
  // 用户角色
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user',
    GUEST: 'guest',
  },

  // 用户状态
  USER_STATUS: {
    ACTIVE: 1, // 正常
    INACTIVE: 2, // 冻结
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
  },

  // 审计日志类型
  AUDIT_TYPES: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    EXPORT: 'export',
    IMPORT: 'import',
  },

  // 数据库类型
  DATABASE_TYPES: {
    MYSQL: 'mysql',
    ORACLE: 'oracle',
    POSTGRES: 'postgres',
    DM: 'dm',
  },

  // 缓存键前缀
  CACHE_PREFIXES: {
    USER: 'user:',
    TOKEN: 'token:',
    LOCK: 'lock:',
    RATE_LIMIT: 'rate:',
    SESSION: 'session:',
  },

  // 缓存过期时间（秒）
  CACHE_TTL: {
    SHORT: 60, // 1分钟
    MEDIUM: 300, // 5分钟
    LONG: 3600, // 1小时
    DAY: 86400, // 1天
    WEEK: 604800, // 1周
  },

  // 分页默认值
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // 密码规则
  PASSWORD_RULES: {
    MIN_LENGTH: 8,
    REQUIRE_LOWERCASE: true,
    REQUIRE_UPPERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },

  // 文件上传限制
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  },

  // 租户隔离模式
  TENANT_ISOLATION: {
    SCHEMA: 'schema', // 一个租户一个schema
    DATABASE: 'database', // 一个租户一个数据库
    ROW_LEVEL: 'row', // 行级隔离（添加tenant_id列）
  },

  // 错误码前缀
  ERROR_PREFIXES: {
    AUTH: 'AUTH_',
    USER: 'USER_',
    DB: 'DB_',
    VALIDATION: 'VAL_',
    SYSTEM: 'SYS_',
  },
};
