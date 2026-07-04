/**
 * 客户管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const customerController = require('../controllers/customerController');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * 验证中间件
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg).join(', ');
    next(new ValidationError(messages));
  }
  next();
};

/**
 * 获取客户列表
 * GET /api/customers
 */
router.get('/', 
  [query('keyword').optional().isString()],
  validate,
  customerController.getCustomers
);

/**
 * 获取单个客户详情
 * GET /api/customers/:id
 */
router.get('/:id',
  [param('id').notEmpty().withMessage('客户ID不能为空')],
  validate,
  customerController.getCustomerById
);

/**
 * 创建客户
 * POST /api/customers
 */
router.post('/',
  [
    body('name').notEmpty().withMessage('客户姓名不能为空'),
    body('phone').optional({ values: 'falsy' }).matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确')
  ],
  validate,
  customerController.createCustomer
);

/**
 * 更新客户
 * PUT /api/customers/:id
 */
router.put('/:id',
  [
    param('id').notEmpty().withMessage('客户ID不能为空'),
    body('name').optional().notEmpty(),
    body('phone').optional({ values: 'falsy' }).matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确')
  ],
  validate,
  customerController.updateCustomer
);

/**
 * 删除客户
 * DELETE /api/customers/:id
 */
router.delete('/:id',
  [param('id').notEmpty().withMessage('客户ID不能为空')],
  validate,
  customerController.deleteCustomer
);

module.exports = router;