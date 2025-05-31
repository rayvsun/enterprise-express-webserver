/**
 * Swagger配置模块
 * 用于自动生成API文档
 */
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const config = require('./index');

// Swagger定义
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Express企业级Web服务器API文档',
    version: '1.0.0',
    description: '高性能、可维护、可扩展的基于Express.js的企业级Web服务器框架API文档',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: '技术支持',
      url: 'https://example.com',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}${process.env.API_PREFIX || '/api/v1'}`,
      description: '开发服务器',
    },
    {
      url: `https://api.example.com${process.env.API_PREFIX || '/api/v1'}`,
      description: '生产服务器',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: '认证相关接口，包括登录、注册、重置密码等',
    },
    {
      name: 'Users',
      description: '用户管理接口，包括用户CRUD操作',
    },
    // 其他标签可以在这里添加
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '用户唯一标识',
          },
          username: {
            type: 'string',
            description: '用户名',
          },
          email: {
            type: 'string',
            format: 'email',
            description: '电子邮件',
          },
          firstName: {
            type: 'string',
            description: '名',
          },
          lastName: {
            type: 'string',
            description: '姓',
          },
          roles: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['admin', 'manager', 'user', 'guest'],
            },
            description: '用户角色',
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended', 'deleted'],
            description: '用户状态',
          },
          lastLogin: {
            type: 'string',
            format: 'date-time',
            description: '最后登录时间',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '创建时间',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: '更新时间',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: '错误代码',
              },
              message: {
                type: 'string',
                description: '错误消息',
              },
              details: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: '错误详情',
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: '未授权访问',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'AUTH_REQUIRED',
                message: '需要认证',
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: '权限不足',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'AUTH_INSUFFICIENT_PERMISSIONS',
                message: '权限不足，无法访问此资源',
              },
            },
          },
        },
      },
      NotFoundError: {
        description: '资源未找到',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'RESOURCE_NOT_FOUND',
                message: '请求的资源不存在',
              },
            },
          },
        },
      },
    },
  },
};

// Swagger选项
const swaggerOptions = {
  swaggerDefinition,
  // 扫描所有包含Swagger注释的路由文件
  apis: [
    path.join(__dirname, '../routes/api/**/*.js'),
    path.join(__dirname, '../models/**/*.js'),
  ],
};

// 生成Swagger规范
const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * 设置Swagger文档路由
 * @param {Express} app - Express应用实例
 */
function setupSwagger(app) {
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  
  // Swagger UI路由
  app.use(`${apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Express企业级Web服务器API文档',
  }));
  
  // 提供swagger.json端点
  app.get(`${apiPrefix}/docs.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log(`Swagger文档已启用: ${apiPrefix}/docs`);
}

module.exports = setupSwagger; 