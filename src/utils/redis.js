/**
 * Redis工具类
 * 用于缓存、分布式锁和会话管理
 */
const Redis = require('ioredis');
const logger = require('./logger');
const config = require('../config');
const { CACHE_PREFIXES, CACHE_TTL } = require('../constants/business');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 重试间隔，单位毫秒
  }

  /**
   * 初始化Redis连接
   */
  async connect() {
    try {
      // 如果已经连接，则返回现有客户端
      if (this.client && this.isConnected) {
        return this.client;
      }

      // 集群模式配置
      if (config.redis.cluster) {
        this.client = new Redis.Cluster(config.redis.cluster, {
          redisOptions: {
            password: config.redis.password,
            db: config.redis.db,
          },
        });
      } else {
        // 单机模式配置
        this.client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
        });
      }

      // 监听连接事件
      this.client.on('connect', () => {
        this.isConnected = true;
        this.retryCount = 0;
        logger.info('Redis 连接成功');
      });

      // 监听错误事件
      this.client.on('error', error => {
        this.isConnected = false;
        logger.error('Redis 连接错误', { error: error.message });
        this.retryConnection();
      });

      return this.client;
    } catch (error) {
      logger.error('Redis 初始化失败', { error: error.message });
      this.retryConnection();
      throw error;
    }
  }

  /**
   * 重试连接
   */
  retryConnection() {
    if (this.retryCount >= this.maxRetries) {
      logger.error(`Redis 连接失败，已达到最大重试次数 (${this.maxRetries})`);
      return;
    }

    this.retryCount++;
    logger.info(`尝试重新连接 Redis (${this.retryCount}/${this.maxRetries})...`);

    setTimeout(() => {
      this.connect().catch(err => {
        logger.error('Redis 重连失败', { error: err.message });
      });
    }, this.retryDelay);
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any>} - 解析后的缓存值
   */
  async get(key) {
    try {
      await this.ensureConnection();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis 获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 要缓存的值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async set(key, value, ttl = CACHE_TTL.MEDIUM) {
    try {
      await this.ensureConnection();
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Redis 设置缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async del(key) {
    try {
      await this.ensureConnection();
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis 删除缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 设置缓存并附加过期时间
   * @param {string} key - 缓存键
   * @param {any} value - 要缓存的值
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async setWithExpiry(key, value, ttl = CACHE_TTL.MEDIUM) {
    return this.set(key, value, ttl);
  }

  /**
   * 获取哈希表中的所有字段和值
   * @param {string} key - 哈希表键
   * @returns {Promise<Object>} - 哈希表内容
   */
  async hgetall(key) {
    try {
      await this.ensureConnection();
      const data = await this.client.hgetall(key);
      return data || {};
    } catch (error) {
      logger.error('Redis hgetall 失败', { key, error: error.message });
      return {};
    }
  }

  /**
   * 设置哈希表字段的值
   * @param {string} key - 哈希表键
   * @param {string} field - 字段
   * @param {any} value - 值
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async hset(key, field, value) {
    try {
      await this.ensureConnection();
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis hset 失败', { key, field, error: error.message });
      return false;
    }
  }

  /**
   * 获取哈希表中指定字段的值
   * @param {string} key - 哈希表键
   * @param {string} field - 字段
   * @returns {Promise<any>} - 字段值
   */
  async hget(key, field) {
    try {
      await this.ensureConnection();
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis hget 失败', { key, field, error: error.message });
      return null;
    }
  }

  /**
   * 尝试获取分布式锁
   * @param {string} lockName - 锁名称
   * @param {number} ttl - 锁过期时间（秒）
   * @returns {Promise<boolean>} - 是否成功获取锁
   */
  async acquireLock(lockName, ttl = 30) {
    try {
      await this.ensureConnection();
      const lockKey = `${CACHE_PREFIXES.LOCK}${lockName}`;

      // 使用NX选项，只在键不存在时设置
      const result = await this.client.set(lockKey, Date.now(), 'EX', ttl, 'NX');

      return result === 'OK';
    } catch (error) {
      logger.error('Redis 获取锁失败', { lockName, error: error.message });
      return false;
    }
  }

  /**
   * 释放分布式锁
   * @param {string} lockName - 锁名称
   * @returns {Promise<boolean>} - 是否成功释放锁
   */
  async releaseLock(lockName) {
    try {
      await this.ensureConnection();
      const lockKey = `${CACHE_PREFIXES.LOCK}${lockName}`;
      await this.client.del(lockKey);
      return true;
    } catch (error) {
      logger.error('Redis 释放锁失败', { lockName, error: error.message });
      return false;
    }
  }

  /**
   * 确保连接已建立
   */
  async ensureConnection() {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }
  }
}

// 创建单例实例
const redisClient = new RedisClient();

// 初始化连接
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis 初始连接失败，将在需要时重试', { error: error.message });
  }
})();

module.exports = redisClient;
