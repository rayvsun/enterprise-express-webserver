/**
 * 应用程序入口文件
 * 负责启动HTTP服务器和初始化应用
 */
require('dotenv').config();
const http = require('http');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = require('./app');
const logger = require('./utils/logger');

// 获取端口配置
const PORT = process.env.PORT || 3000;

// 设置端口
app.set('port', PORT);

// 创建HTTP服务器
const server = http.createServer(app);

// 集群模式（生产环境）
if (process.env.NODE_ENV === 'production' && !process.env.PM2_USAGE) {
  if (cluster.isMaster) {
    logger.info(`主进程 ${process.pid} 正在运行`);

    // 根据CPU数量生成工作进程
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    // 监听工作进程退出事件
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`工作进程 ${worker.process.pid} 退出，代码: ${code}, 信号: ${signal}`);
      logger.info('正在启动新的工作进程...');
      cluster.fork();
    });
  } else {
    // 工作进程启动服务器
    server.listen(PORT);
    server.on('error', onError);
    server.on('listening', onListening);
    logger.info(`工作进程 ${process.pid} 已启动`);
  }
} else {
  // 开发环境或使用PM2时直接启动服务器
  server.listen(PORT);
  server.on('error', onError);
  server.on('listening', onListening);
}

/**
 * HTTP服务器错误事件处理函数
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // 处理特定的监听错误
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' 需要提升权限');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' 已被占用');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * HTTP服务器监听事件处理函数
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  logger.info(`服务器监听在 ${bind}`);
}

// 处理未捕获的异常
process.on('uncaughtException', err => {
  logger.error('未捕获的异常:', err);
  // 在生产环境中可能需要优雅地关闭服务
  if (process.env.NODE_ENV === 'production') {
    logger.error('出现未捕获的异常，进程将在5秒后退出');
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});
