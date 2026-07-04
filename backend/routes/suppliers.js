/**
 * 供货商路由
 */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const supplierController = require('../controllers/supplierController');

// 验证中间件
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

// 获取供货商列表
router.get(
  '/',
  [
    query('keyword').optional().trim(),
    validate
  ],
  supplierController.getSuppliers
);

// 获取单个供货商详情
router.get(
  '/:id',
  [
    param('id').notEmpty().withMessage('供货商ID不能为空'),
    validate
  ],
  supplierController.getSupplierById
);

// 创建供货商
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('供货商名称不能为空'),
    body('phone').optional({ values: 'falsy' }).isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
    validate
  ],
  supplierController.createSupplier
);

// 更新供货商
router.put(
  '/:id',
  [
    param('id').notEmpty().withMessage('供货商ID不能为空'),
    validate
  ],
  supplierController.updateSupplier
);

// 删除供货商
router.delete(
  '/:id',
  [
    param('id').notEmpty().withMessage('供货商ID不能为空'),
    validate
  ],
  supplierController.deleteSupplier
);

module.exports = router;
