# Express企业级Web服务器框架

高性能、可维护、可扩展的基于Express.js的主流Node.js Web服务器框架，支持高并发及企业级功能。

## 项目特点

- **模块化架构**：清晰的目录结构，便于维护和扩展
- **多数据库支持**：MySQL、Oracle、PostgreSQL、达梦(DM)
- **缓存集成**：Redis缓存策略
- **高并发优化**：集群模式、连接池、消息队列
- **安全防护**：Helmet、限流、CORS
- **API规范**：RESTful设计、统一错误处理
- **完整开发链**：ESLint/Prettier、测试工具、API文档
- **自动API文档**：集成Swagger UI，自动生成API文档

## 安装

```bash
# 克隆项目
git clone [项目地址]

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库等信息

# 启动开发环境
npm run dev
```

## 项目结构

```
src/
├── routes/api/      # API路由（按业务分组）
├── middleware/      # 中间件
│   ├── generic/     # 通用中间件
│   └── auth/        # 鉴权相关中间件
├── models/          # 数据库模型
├── services/        # 业务逻辑层
├── utils/           # 工具函数
├── config/          # 配置文件
├── constants/       # 全局常量
└── app.js           # 应用入口

public/              # 静态资源
tests/               # 测试文件
docker/              # Docker配置
```

## 核心功能

### 1. 基础功能

- RESTful API支持（GET/POST/PUT/DELETE）
- 中间件配置（morgan、compression、cors、helmet）
- 统一错误处理
- 请求限流和防刷

### 2. 数据库集成

- 多数据库支持（MySQL、Oracle、PostgreSQL、DM）
- Redis缓存集成
- ORM工具（Sequelize/TypeORM）
- 事务与分布式锁

### 3. 高并发优化

- 集群模式部署
- 连接池配置
- 静态资源优化
- 消息队列集成

### 4. 企业级功能

- 多租户支持
- 分布式事务
- 审计日志
- 权限控制

## 开发指南

### 数据库配置

在`.env`文件中配置数据库信息，支持多种数据库类型：

```env
# MySQL配置
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=myapp

# Oracle配置
ORACLE_HOST=localhost
ORACLE_USER=system
ORACLE_PASSWORD=password
ORACLE_SID=XE

# PostgreSQL配置
PG_HOST=localhost
PG_USER=postgres
PG_PASSWORD=password
PG_DATABASE=myapp

# 达梦配置
DM_HOST=localhost
DM_USER=SYSDBA
DM_PASSWORD=password
DM_DATABASE=myapp

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### API路由

创建新API路由的步骤：

1. 在`routes/api`目录下创建新的路由文件
2. 定义路由处理函数
3. 在`app.js`中引入并注册路由

示例：

```javascript
// src/routes/api/users.js
const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');

router.get('/', async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

### 中间件使用

自定义中间件示例：

```javascript
// src/middleware/auth/jwtAuth.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: '无效的认证令牌' });
  }
};
```

## 部署

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
# 构建
npm run build

# 启动（PM2集群模式）
npm start
```

### Docker部署

```bash
# 构建镜像
docker build -t express-server .

# 运行容器
docker-compose up -d
```

## API文档

API文档使用Swagger自动生成，提供了完整的API接口说明、请求参数、响应示例等信息。

### 访问文档

- 开发环境：http://localhost:3000/api/v1/docs
- 生产环境：https://[your-domain]/api/v1/docs (需在环境变量中设置 `ENABLE_SWAGGER=true`)

### 使用方法

1. 启动服务器：`npm run dev`
2. 浏览器访问：http://localhost:3000/api/v1/docs

### 添加新API文档

为路由文件添加Swagger注释，自动生成API文档：

```javascript
/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 分页页码
 *     responses:
 *       200:
 *         description: 成功获取用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/', authenticate, async (req, res, next) => {
  // 实现代码
});
```

### 环境变量配置

在`.env`文件中配置Swagger相关选项：

```env
# 启用Swagger文档（生产环境）
ENABLE_SWAGGER=true

# API前缀
API_PREFIX=/api/v1
```

## 测试

```bash
# 运行单元测试
npm test

# 运行特定测试
npm test -- tests/api/users.test.js
```

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

MIT 