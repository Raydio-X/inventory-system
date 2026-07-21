/**
 * 开单管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const billingController = require('../controllers/billingController');
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
 * 获取销售订单列表
 * GET /api/billing/orders
 */
router.get('/orders', 
  [
    query('customerId').optional().isString(),
    query('status').optional().isIn(['unpaid', 'partial', 'paid', 'settled', 'overdue']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  billingController.getSalesOrders
);

/**
 * 获取单个销售订单详情
 * GET /api/billing/orders/:id
 */
router.get('/orders/:id',
  [param('id').notEmpty().withMessage('订单ID不能为空')],
  validate,
  billingController.getSalesOrderById
);

/**
 * 创建销售订单
 * POST /api/billing/orders
 */
router.post('/orders',
  [
    body('items').isArray({ min: 1 }).withMessage('订单商品不能为空'),
    body('items.*.skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
    body('items.*.price').optional().isFloat({ min: 0 }),
    body('customerId').optional().isString(),
    body('customerName').optional().isString(),
    body('totalAmount').optional().isFloat({ min: 0 }),
    body('paidAmount').optional().isFloat({ min: 0 }),
    body('debtAmount').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0 }),
    body('paymentMethod').optional().isIn(['cash', 'wechat', 'alipay', 'card']),
    body('status').optional().isIn(['unpaid', 'partial', 'paid', 'settled']),
    body('remark').optional().isString()
  ],
  validate,
  billingController.createSalesOrder
);

/**
 * 更新订单收款
 * PUT /api/billing/orders/:id/payment
 */
router.put('/orders/:id/payment',
  [
    param('id').notEmpty().withMessage('订单ID不能为空'),
    body('paidAmount').isFloat({ min: 0 }).withMessage('收款金额必须大于等于0'),
    body('paymentMethod').optional().isIn(['cash', 'wechat', 'alipay', 'card'])
  ],
  validate,
  billingController.updateOrderPayment
);

/**
 * 更新销售订单
 * PUT /api/billing/orders/:id
 */
router.put('/orders/:id',
  [
    param('id').notEmpty().withMessage('订单ID不能为空'),
    body('items').isArray({ min: 1 }).withMessage('订单商品不能为空'),
    body('items.*.skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须大于0'),
    body('items.*.price').optional().isFloat({ min: 0 }),
    body('totalAmount').optional().isFloat({ min: 0 }),
    body('paidAmount').optional().isFloat({ min: 0 }),
    body('debtAmount').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['unpaid', 'partial', 'paid', 'settled']),
    body('remark').optional().isString()
  ],
  validate,
  billingController.updateSalesOrder
);

/**
 * 删除销售订单
 * DELETE /api/billing/orders/:id
 */
router.delete('/orders/:id',
  [param('id').notEmpty().withMessage('订单ID不能为空')],
  validate,
  billingController.deleteSalesOrder
);

module.exports = router;