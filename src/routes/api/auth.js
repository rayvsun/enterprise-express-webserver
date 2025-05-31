/**
 * 认证API路由
 */
const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const { asyncHandler } = require('../../middleware/generic/errorHandler');
const { authenticate } = require('../../middleware/auth/jwtAuth');
const statusCodes = require('../../constants/statusCodes');
const { PASSWORD_RULES } = require('../../constants/business');

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 注册新用户
 *     description: 创建一个新的用户账户
 *     tags: [Auth]
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
 *     responses:
 *       201:
 *         description: 用户创建成功
 *       400:
 *         description: 请求数据无效
 *       409:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    // 验证请求参数
    if (!username || !email || !password) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名、邮箱和密码都是必填项',
        },
      });
    }

    // 验证用户名格式
    if (username.length < 3 || username.length > 50) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名长度必须在3-50个字符之间',
        },
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '邮箱格式不正确',
        },
      });
    }

    // 验证密码复杂度
    const passwordErrors = [];

    if (password.length < PASSWORD_RULES.MIN_LENGTH) {
      passwordErrors.push(`密码长度必须至少为${PASSWORD_RULES.MIN_LENGTH}个字符`);
    }

    if (PASSWORD_RULES.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      passwordErrors.push('密码必须包含至少一个小写字母');
    }

    if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      passwordErrors.push('密码必须包含至少一个大写字母');
    }

    if (PASSWORD_RULES.REQUIRE_NUMBER && !/\d/.test(password)) {
      passwordErrors.push('密码必须包含至少一个数字');
    }

    if (PASSWORD_RULES.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      passwordErrors.push('密码必须包含至少一个特殊字符');
    }

    if (passwordErrors.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '密码不符合安全要求',
          details: passwordErrors,
        },
      });
    }

    // 创建用户
    const userData = {
      username,
      email,
      password,
      firstName,
      lastName,
    };

    const user = await userService.register(userData);

    res.status(statusCodes.CREATED).json({
      success: true,
      message: '注册成功',
      data: user,
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名/邮箱和密码登录
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名或邮箱
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登录成功
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 用户名或密码错误
 *       403:
 *         description: 账户被锁定或未激活
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // 验证请求参数
    if (!username || !password) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名/邮箱和密码都是必填项',
        },
      });
    }

    // 登录
    const result = await userService.login(username, password);

    res.json({
      success: true,
      message: '登录成功',
      data: result,
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: 注销登录
 *     description: 注销当前用户会话
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 注销成功
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    // 获取认证令牌
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // 注销登录
    await userService.logout(token, req.user);

    res.json({
      success: true,
      message: '注销成功',
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: 忘记密码
 *     description: 发送密码重置链接到用户邮箱
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: 密码重置链接已发送
 *       404:
 *         description: 邮箱未注册
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // 验证请求参数
    if (!email) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '邮箱是必填项',
        },
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '邮箱格式不正确',
        },
      });
    }

    // 请求密码重置
    const resetToken = await userService.requestPasswordReset(email);

    // 注意：在实际应用中，这里应该发送邮件而不是直接返回令牌
    // 这里为了演示方便，直接返回令牌

    res.json({
      success: true,
      message: '密码重置链接已发送到您的邮箱',
      // 仅在开发环境返回令牌，生产环境不应该这样做
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: 重置密码
 *     description: 使用重置令牌重设密码
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: 密码重置成功
 *       400:
 *         description: 请求数据无效或令牌已过期
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    // 验证请求参数
    if (!token || !newPassword) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '令牌和新密码都是必填项',
        },
      });
    }

    // 验证密码复杂度
    const passwordErrors = [];

    if (newPassword.length < PASSWORD_RULES.MIN_LENGTH) {
      passwordErrors.push(`密码长度必须至少为${PASSWORD_RULES.MIN_LENGTH}个字符`);
    }

    if (PASSWORD_RULES.REQUIRE_LOWERCASE && !/[a-z]/.test(newPassword)) {
      passwordErrors.push('密码必须包含至少一个小写字母');
    }

    if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(newPassword)) {
      passwordErrors.push('密码必须包含至少一个大写字母');
    }

    if (PASSWORD_RULES.REQUIRE_NUMBER && !/\d/.test(newPassword)) {
      passwordErrors.push('密码必须包含至少一个数字');
    }

    if (PASSWORD_RULES.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      passwordErrors.push('密码必须包含至少一个特殊字符');
    }

    if (passwordErrors.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '密码不符合安全要求',
          details: passwordErrors,
        },
      });
    }

    // 重置密码
    await userService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录',
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 获取当前已登录用户的详细信息
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 当前用户信息
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    // 从请求中获取用户ID
    const userId = req.user.id;

    // 获取用户详情
    const user = await userService.getUserById(userId);

    res.json({
      success: true,
      data: user,
    });
  })
);

module.exports = router;
