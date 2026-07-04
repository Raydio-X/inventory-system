/**
 * 欠款管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const debtController = require('../controllers/debtController');
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
 * 获取欠款客户列表
 * GET /api/debt/customers
 */
router.get('/customers', 
  [
    query('keyword').optional().isString(),
    query('overdue').optional().isBoolean()
  ],
  validate,
  debtController.getDebtCustomers
);

/**
 * 获取客户欠款详情
 * GET /api/debt/customers/:customerId
 */
router.get('/customers/:customerId',
  [param('customerId').notEmpty().withMessage('客户ID不能为空')],
  validate,
  debtController.getDebtCustomerDetail
);

/**
 * 记录收款
 * POST /api/debt/customers/:customerId/payments
 */
router.post('/customers/:customerId/payments',
  [
    param('customerId').notEmpty().withMessage('客户ID不能为空'),
    body('amount').isFloat({ min: 0.01 }).withMessage('收款金额必须大于0'),
    body('orderId').optional().isString(),
    body('paymentMethod').optional().isIn(['cash', 'wechat', 'alipay', 'card'])
  ],
  validate,
  debtController.recordPayment
);

module.exports = router;