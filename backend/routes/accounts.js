/**
 * 数据统计路由
 */
const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const accountController = require('../controllers/accountController');
const { ValidationError } = require('../middleware/errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => err.msg).join(', ');
    next(new ValidationError(messages));
  }
  next();
};

/**
 * 获取数据统计（月度/年度）
 * GET /api/accounts/statistics?period=month&offset=0
 */
router.get('/statistics',
  [
    query('period').optional().isIn(['month', 'year']),
    query('offset').optional().isInt()
  ],
  validate,
  accountController.getStatistics
);

/**
 * 获取今日数据统计
 * GET /api/accounts/today
 */
router.get('/today', accountController.getTodayStatistics);

/**
 * 获取商品利润详情（全部历史数据）
 * GET /api/accounts/profit-detail
 */
router.get('/profit-detail', accountController.getProfitDetail);

/**
 * 获取账目记录列表
 * GET /api/accounts/records
 */
router.get('/records',
  [
    query('type').optional().isIn(['income', 'expense']),
    query('category').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  accountController.getAccountRecords
);

/**
 * 手动记账
 * POST /api/accounts/records
 */
router.post('/records',
  [
    body('type').isIn(['income', 'expense']).withMessage('类型必须是income或expense'),
    body('category').notEmpty().withMessage('分类不能为空'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0')
  ],
  validate,
  accountController.createAccountRecord
);

module.exports = router;
