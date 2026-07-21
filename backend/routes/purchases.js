/**
 * 采购管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const purchaseController = require('../controllers/purchaseController');
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
 * 获取采购订单列表
 * GET /api/purchases
 */
router.get('/',
  [
    query('status').optional().isIn(['pending', 'completed']),
    query('supplierId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  purchaseController.getPurchaseOrders
);

/**
 * 获取单个采购订单详情
 * GET /api/purchases/:id
 */
router.get('/:id',
  [param('id').notEmpty().withMessage('采购订单ID不能为空')],
  validate,
  purchaseController.getPurchaseOrderById
);

/**
 * 创建采购订单
 * POST /api/purchases
 */
router.post('/',
  [
    body('items').isArray({ min: 1 }).withMessage('采购商品不能为空'),
    body('items.*.productId').notEmpty().withMessage('商品ID不能为空'),
    body('items.*.skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('采购数量必须大于0'),
    body('items.*.costPrice').isFloat({ min: 0 }).withMessage('采购单价不能为负数')
  ],
  validate,
  purchaseController.createPurchaseOrder
);

/**
 * 更新采购订单（仅允许更新待入库状态的订单）
 * PUT /api/purchases/:id
 */
router.put('/:id',
  [
    param('id').notEmpty().withMessage('采购订单ID不能为空'),
    body('items').isArray({ min: 1 }).withMessage('采购商品不能为空'),
    body('items.*.productId').notEmpty().withMessage('商品ID不能为空'),
    body('items.*.skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('采购数量必须大于0'),
    body('items.*.costPrice').isFloat({ min: 0 }).withMessage('采购单价不能为负数')
  ],
  validate,
  purchaseController.updatePurchaseOrder
);

/**
 * 确认采购入库
 * PUT /api/purchases/:id/confirm
 */
router.put('/:id/confirm',
  [param('id').notEmpty().withMessage('采购订单ID不能为空')],
  validate,
  purchaseController.confirmPurchase
);

/**
 * 撤回采购订单（仅限已入库状态）
 * POST /api/purchases/:id/revoke
 */
router.post('/:id/revoke',
  [param('id').notEmpty().withMessage('采购订单ID不能为空')],
  validate,
  purchaseController.revokePurchaseOrder
);

/**
 * 删除采购订单（仅限待入库状态）
 * DELETE /api/purchases/:id
 */
router.delete('/:id',
  [param('id').notEmpty().withMessage('采购订单ID不能为空')],
  validate,
  purchaseController.deletePurchaseOrder
);

module.exports = router;
