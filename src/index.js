/**
 * 应用入口文件
 * 支持根据环境变量启动不同环境的服务
 */
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = require('./app');
const http = require('http');
const cluster = require('cluster');
const os = require('os');
const config = require('./config');
const logger = require('./utils/logger');

// 获取端口
const port = process.env.PORT || config.port || 3000;
app.set('port', port);

// 创建HTTP服务器
const server = http.createServer(app);

// 集群模式处理
if (process.env.CLUSTER_ENABLED === 'true' && cluster.isMaster) {
  // 获取工作进程数量
  const numWorkers = Number(process.env.CLUSTER_WORKERS) || os.cpus().length;
  
  logger.info(`主进程 ${process.pid} 正在运行`);
  logger.info(`启动 ${numWorkers} 个工作进程...`);

  // 创建工作进程
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // 监听工作进程退出事件，重启退出的工作进程
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`工作进程 ${worker.process.pid} 退出，代码: ${code}, 信号: ${signal}`);
    logger.info('正在启动新的工作进程...');
    cluster.fork();
  });
} else {
  // 单进程或工作进程模式
  // 监听端口
  server.listen(port);

  // 错误处理
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // 特定监听错误的友好错误消息
    switch (error.code) {
      case 'EACCES':
        logger.error(`${bind} 需要提升权限`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(`${bind} 已被占用`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // 监听服务器启动事件
  server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    logger.info(`服务器监听在 ${bind} (${process.env.NODE_ENV || 'development'} 环境)`);
    
    if (process.env.NODE_ENV === 'development') {
      logger.info(`API文档地址: http://localhost:${port}${process.env.API_PREFIX}/docs`);
    }
  });
}

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常', err);
  // 在生产环境可能需要优雅地关闭服务器
  if (process.env.NODE_ENV === 'production') {
    logger.error('发生严重错误，服务将在5秒后重启...');
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason, promise });
});

module.exports = server; // 导出服务器实例，便于测试
