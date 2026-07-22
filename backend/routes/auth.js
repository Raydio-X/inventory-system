/**
 * 认证路由
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * 验证中间件
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg).join(', ');
    return next(new ValidationError(messages));
  }
  next();
};

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  validate,
  authController.login
);

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').isLength({ min: 6 }).withMessage('密码长度至少6位'),
    body('name').notEmpty().withMessage('姓名不能为空')
  ],
  validate,
  authController.register
);

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password',
  [
    authMiddleware,
    body('oldPassword').notEmpty().withMessage('旧密码不能为空'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码长度至少6位')
  ],
  validate,
  authController.changePassword
);

module.exports = router;