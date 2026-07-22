/**
 * 商品管理路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const productController = require('../controllers/productController');
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
 * 获取商品列表
 * GET /api/products
 */
router.get('/', 
  [
    query('keyword').optional().isString(),
    query('category').optional().isString(),
    query('status').optional().isIn(['active', 'deleted'])
  ],
  validate,
  productController.getProducts
);

/**
 * 获取单个商品详情
 * GET /api/products/:id
 */
router.get('/:id',
  [param('id').notEmpty().withMessage('商品ID不能为空')],
  validate,
  productController.getProductById
);

/**
 * 创建商品
 * POST /api/products
 */
router.post('/',
  [
    body('name').notEmpty().withMessage('商品名称不能为空'),
    body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
    body('skus').isArray({ min: 1 }).withMessage('SKU列表不能为空')
  ],
  validate,
  productController.createProduct
);

/**
 * 更新商品
 * PUT /api/products/:id
 */
router.put('/:id',
  [
    param('id').notEmpty().withMessage('商品ID不能为空'),
    body('name').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 })
  ],
  validate,
  productController.updateProduct
);

/**
 * 删除商品
 * DELETE /api/products/:id
 */
router.delete('/:id',
  [param('id').notEmpty().withMessage('商品ID不能为空')],
  validate,
  productController.deleteProduct
);

/**
 * 更新SKU库存
 * PUT /api/products/:productId/skus/:skuId/stock
 */
router.put('/:productId/skus/:skuId/stock',
  [
    param('productId').notEmpty().withMessage('商品ID不能为空'),
    param('skuId').notEmpty().withMessage('SKU ID不能为空'),
    body('quantity').isInt({ min: 0 }).withMessage('数量必须大于等于0'),
    body('type').isIn(['increase', 'decrease', 'set']).withMessage('类型必须是increase、decrease或set')
  ],
  validate,
  productController.updateSkuStock
);

module.exports = router;