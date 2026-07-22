/**
 * 退货管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const returnController = require('../controllers/returnController');
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
 * 获取退货订单列表
 * GET /api/returns
 */
router.get('/', 
  [
    query('customerId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  returnController.getReturnOrders
);

/**
 * 创建退货订单
 * POST /api/returns
 */
router.post('/',
  [
    body('customerId').notEmpty().withMessage('客户ID不能为空'),
    body('items').isArray({ min: 1 }).withMessage('退货商品不能为空'),
    body('items.*.skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('数量必须大于0')
  ],
  validate,
  returnController.createReturnOrder
);

module.exports = router;