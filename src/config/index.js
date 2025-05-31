/**
 * 配置文件索引
 * 根据环境变量加载不同的配置
 */
const path = require('path');

// 确定当前环境
const env = process.env.NODE_ENV || 'development';
let config;

// 根据环境加载配置
try {
  config = require(`./${env}`);
  console.log(`已加载 ${env} 环境配置`);
} catch (error) {
  console.warn(`未找到 ${env} 环境配置，将使用开发环境配置`);
  config = require('./development');
}

module.exports = config; 