/**
 * 库存管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
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
 * 获取库存列表
 * GET /api/inventory
 */
router.get('/', 
  [
    query('keyword').optional().isString(),
    query('lowStock').optional().isBoolean()
  ],
  validate,
  inventoryController.getInventory
);

/**
 * 获取库存流水记录
 * GET /api/inventory/logs
 */
router.get('/logs', 
  [
    query('skuId').optional().isString(),
    query('type').optional().isIn(['sales_out', 'purchase_in', 'sales_return', 'inventory_check']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  inventoryController.getInventoryLogs
);

/**
 * 库存盘点
 * POST /api/inventory/check
 */
router.post('/check',
  [
    body('items').isArray({ min: 1 }).withMessage('盘点商品不能为空'),
    body('items.*.skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('items.*.actualStock').isInt({ min: 0 }).withMessage('实际库存必须大于等于0')
  ],
  validate,
  inventoryController.inventoryCheck
);

module.exports = router;