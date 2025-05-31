/**
 * 用户API路由
 */
const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const { asyncHandler } = require('../../middleware/generic/errorHandler');
const { authenticate, hasRole } = require('../../middleware/auth/jwtAuth');
const { USER_ROLES } = require('../../constants/business');

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 获取所有用户的列表，支持分页、搜索和排序
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词(用户名、邮箱、姓名)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended, deleted]
 *         description: 用户状态
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager, user, guest]
 *         description: 用户角色
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 排序方向
 *     responses:
 *       200:
 *         description: 成功获取用户列表
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get(
  '/',
  authenticate,
  hasRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]),
  asyncHandler(async (req, res) => {
    const { page, limit, search, status, role, sortBy, sortOrder } = req.query;

    // 构建查询选项
    const options = {
      page,
      limit,
      search,
      status,
      role,
      sortBy,
      sortOrder,
    };

    // 如果非管理员，只能查看自己所在租户的用户
    if (!req.user.roles.includes(USER_ROLES.ADMIN)) {
      options.tenantId = req.user.tenantId;
    }

    const result = await userService.getUsers(options);
    res.json(result);
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     description: 根据ID获取用户详细信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户详情
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 如果非管理员，只能查看自己或自己所在租户的用户
    if (!req.user.roles.includes(USER_ROLES.ADMIN) && req.user.id !== id && req.user.roles.includes(USER_ROLES.MANAGER) === false) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: '权限不足，无法查看其他用户信息',
        },
      });
    }

    const user = await userService.getUserById(id);

    // 如果是管理员，可以查看所有用户
    // 如果是经理，只能查看自己租户的用户
    if (!req.user.roles.includes(USER_ROLES.ADMIN) && req.user.roles.includes(USER_ROLES.MANAGER) && req.user.tenantId !== user.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: '权限不足，无法查看其他租户的用户',
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: 创建新用户
 *     description: 创建一个新用户账户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [admin, manager, user, guest]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 default: active
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: 用户创建成功
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       409:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/',
  authenticate,
  hasRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]),
  asyncHandler(async (req, res) => {
    const userData = req.body;

    // 如果非管理员，确保只能创建自己租户的用户，且不能创建管理员
    if (!req.user.roles.includes(USER_ROLES.ADMIN)) {
      // 设置为当前用户的租户ID
      userData.tenantId = req.user.tenantId;

      // 不允许创建管理员
      if (userData.roles && userData.roles.includes(USER_ROLES.ADMIN)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '权限不足，无法创建管理员用户',
          },
        });
      }
    }

    const user = await userService.register(userData);

    res.status(201).json({
      success: true,
      data: user,
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: 更新用户
 *     description: 更新用户信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [admin, manager, user, guest]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: 用户更新成功
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userData = req.body;

    // 获取当前用户信息，用于权限检查
    const currentUser = await userService.getUserById(id);

    // 权限检查
    // 1. 用户可以修改自己的基本信息，但不能修改角色或状态
    // 2. 管理员可以修改任何用户的任何信息
    // 3. 经理可以修改同租户普通用户的信息，但不能修改其他经理或管理员
    if (req.user.id === id) {
      // 用户修改自己的信息
      delete userData.roles;
      delete userData.status;
      delete userData.tenantId;
    } else if (req.user.roles.includes(USER_ROLES.ADMIN)) {
      // 管理员可以修改任何信息
    } else if (req.user.roles.includes(USER_ROLES.MANAGER)) {
      // 经理只能修改同租户的普通用户
      if (req.user.tenantId !== currentUser.tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '权限不足，无法修改其他租户的用户',
          },
        });
      }

      // 经理不能修改其他经理或管理员
      if (currentUser.roles.includes(USER_ROLES.MANAGER) || currentUser.roles.includes(USER_ROLES.ADMIN)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '权限不足，无法修改管理员或经理用户',
          },
        });
      }

      // 不能将用户提升为管理员
      if (userData.roles && userData.roles.includes(USER_ROLES.ADMIN)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '权限不足，无法将用户提升为管理员',
          },
        });
      }

      // 强制设置为当前租户
      userData.tenantId = req.user.tenantId;
    } else {
      // 普通用户不能修改他人信息
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: '权限不足，无法修改其他用户信息',
        },
      });
    }

    const updatedUser = await userService.updateUser(id, userData);

    res.json({
      success: true,
      data: updatedUser,
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}/password:
 *   put:
 *     summary: 更改密码
 *     description: 更改用户密码
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 8
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: 密码更改成功
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 当前密码不正确
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.put(
  '/:id/password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // 只能修改自己的密码
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: '权限不足，只能修改自己的密码',
        },
      });
    }

    // 验证请求参数
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '当前密码和新密码都是必填项',
        },
      });
    }

    // 验证密码复杂度
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '密码必须至少包含8个字符，至少一个大写字母，一个小写字母，一个数字和一个特殊字符',
        },
      });
    }

    await userService.changePassword(id, currentPassword, newPassword);

    res.json({
      success: true,
      message: '密码更改成功',
    });
  })
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: 删除用户
 *     description: 删除用户（软删除）
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 用户删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器错误
 */
router.delete(
  '/:id',
  authenticate,
  hasRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 获取要删除的用户信息
    const userToDelete = await userService.getUserById(id);

    // 不能删除自己
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '不能删除自己的账户',
        },
      });
    }

    // 权限检查
    if (req.user.roles.includes(USER_ROLES.ADMIN)) {
      // 管理员可以删除任何用户
    } else if (req.user.roles.includes(USER_ROLES.MANAGER)) {
      // 经理只能删除同租户的普通用户
      if (req.user.tenantId !== userToDelete.tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '权限不足，无法删除其他租户的用户',
          },
        });
      }

      // 经理不能删除其他经理或管理员
      if (userToDelete.roles.includes(USER_ROLES.MANAGER) || userToDelete.roles.includes(USER_ROLES.ADMIN)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '权限不足，无法删除管理员或经理用户',
          },
        });
      }
    }

    await userService.deleteUser(id);

    res.json({
      success: true,
      message: '用户删除成功',
    });
  })
);

module.exports = router;
