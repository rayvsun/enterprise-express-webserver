/**
 * Swagger API 文档配置
 */
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Express Enterprise Server API',
    version: '1.0.0',
    description: '高性能、可维护、可扩展的基于Express.js的企业级Web服务器框架API文档',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: '技术支持',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API V1 服务器',
    },
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
          tenantId: {
            type: 'string',
            format: 'uuid',
            description: '租户ID',
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
                description: '错误信息',
              },
              details: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: '详细错误信息',
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: '错误发生时间',
          },
          path: {
            type: 'string',
            description: '请求路径',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: '未授权',
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
              timestamp: '2023-10-25T10:30:15.123Z',
              path: '/api/v1/users',
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
              timestamp: '2023-10-25T10:30:15.123Z',
              path: '/api/v1/users',
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
                code: 'USER_NOT_FOUND',
                message: '用户不存在',
              },
              timestamp: '2023-10-25T10:30:15.123Z',
              path: '/api/v1/users/123',
            },
          },
        },
      },
      ValidationError: {
        description: '请求数据验证失败',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: '请求数据验证失败',
                details: ['用户名长度必须在3-50个字符之间', '邮箱格式不正确'],
              },
              timestamp: '2023-10-25T10:30:15.123Z',
              path: '/api/v1/auth/register',
            },
          },
        },
      },
      ServerError: {
        description: '服务器内部错误',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: {
                code: 'SYS_ERROR',
                message: '服务器内部错误',
              },
              timestamp: '2023-10-25T10:30:15.123Z',
              path: '/api/v1/users',
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Auth',
      description: '认证相关接口',
    },
    {
      name: 'Users',
      description: '用户管理接口',
    },
  ],
  paths: {
    // 路径将由swagger-jsdoc从注释中自动生成
  },
}; 