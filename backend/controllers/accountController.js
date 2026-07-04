/**
 * 数据统计控制器（MySQL版）
 * 从数据库获取销售、退货、利润等统计数据
 */
const db = require('../config/database');

/**
 * 获取数据统计
 * GET /api/accounts/statistics?period=month&offset=0
 * period: month | year
 * offset: 0=当前, -1=上一个, 1=下一个
 */
const getStatistics = async (req, res, next) => {
  try {
    const period = req.query.period || 'month';
    const offset = parseInt(req.query.offset) || 0;

    // 计算时间范围
    const now = new Date();
    let startDate, endDate, label;

    if (period === 'month') {
      const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      startDate = new Date(base.getFullYear(), base.getMonth(), 1);
      endDate = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      label = `${base.getFullYear()}年${base.getMonth() + 1}月`;
    } else {
      const year = now.getFullYear() + offset;
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
      label = `${year}年`;
    }

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    // 查询销售订单统计
    const salesResult = await db.query(
      `SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as sales_amount,
        COALESCE(SUM(paid_amount), 0) as paid_amount,
        COALESCE(SUM(debt_amount), 0) as debt_amount
       FROM sales_orders 
       WHERE created_at >= ? AND created_at < ?`,
      [startStr, endStr]
    );

    // 查询销售商品数量和成本
    const salesItemsResult = await db.query(
      `SELECT 
        COALESCE(SUM(soi.quantity), 0) as sales_count,
        COALESCE(SUM(soi.quantity * soi.cost_price), 0) as cost_amount
       FROM sales_order_items soi
       JOIN sales_orders so ON soi.order_id = so.id
       WHERE so.created_at >= ? AND so.created_at < ?`,
      [startStr, endStr]
    );

    // 查询退货统计
    const returnResult = await db.query(
      `SELECT 
        COUNT(*) as return_count,
        COALESCE(SUM(total_amount), 0) as return_amount
       FROM return_orders 
       WHERE created_at >= ? AND created_at < ?`,
      [startStr, endStr]
    );

    // 查询退货商品数量
    const returnItemsResult = await db.query(
      `SELECT 
        COALESCE(SUM(roi.quantity), 0) as return_count
       FROM return_order_items roi
       JOIN return_orders ro ON roi.order_id = ro.id
       WHERE ro.created_at >= ? AND ro.created_at < ?`,
      [startStr, endStr]
    );

    const salesRow = salesResult[0] || {};
    const salesItemsRow = salesItemsResult[0] || {};
    const returnRow = returnResult[0] || {};
    const returnItemsRow = returnItemsResult[0] || {};

    const salesAmount = Number(salesRow.sales_amount) || 0;
    const returnAmount = Number(returnRow.return_amount) || 0;
    const costAmount = Number(salesItemsRow.cost_amount) || 0;
    const salesCount = Number(salesItemsRow.sales_count) || 0;
    const returnItemCount = Number(returnItemsRow.return_count) || 0;

    const profit = salesAmount - costAmount;

    res.json({
      success: true,
      data: {
        period,
        offset,
        label,
        startDate: startStr,
        endDate: endStr,
        profit: profit,
        salesCount: salesCount - returnItemCount,
        salesAmount: salesAmount - returnAmount,
        orderCount: Number(salesRow.order_count) || 0,
        // 明细
        salesAmountGross: salesAmount,
        returnAmount: returnAmount,
        costAmount: costAmount,
        paidAmount: Number(salesRow.paid_amount) || 0,
        debtAmount: Number(salesRow.debt_amount) || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取今日数据统计
 * GET /api/accounts/today
 */
const getTodayStatistics = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 今日销售
    const salesResult = await db.query(
      `SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as sales_amount
       FROM sales_orders 
       WHERE DATE(created_at) = ?`,
      [today]
    );

    // 今日销售商品数量
    const salesItemsResult = await db.query(
      `SELECT 
        COALESCE(SUM(soi.quantity), 0) as sales_count
       FROM sales_order_items soi
       JOIN sales_orders so ON soi.order_id = so.id
       WHERE DATE(so.created_at) = ?`,
      [today]
    );

    // 今日退货
    const returnResult = await db.query(
      `SELECT 
        COUNT(*) as return_count,
        COALESCE(SUM(total_amount), 0) as return_amount
       FROM return_orders 
       WHERE DATE(created_at) = ?`,
      [today]
    );

    // 今日退货商品数量
    const returnItemsResult = await db.query(
      `SELECT 
        COALESCE(SUM(roi.quantity), 0) as return_count
       FROM return_order_items roi
       JOIN return_orders ro ON roi.order_id = ro.id
       WHERE DATE(ro.created_at) = ?`,
      [today]
    );

    const salesRow = salesResult[0] || {};
    const salesItemsRow = salesItemsResult[0] || {};
    const returnRow = returnResult[0] || {};
    const returnItemsRow = returnItemsResult[0] || {};

    const salesAmount = Number(salesRow.sales_amount) || 0;
    const returnAmount = Number(returnRow.return_amount) || 0;
    const salesCount = Number(salesItemsRow.sales_count) || 0;
    const returnCount = Number(returnItemsRow.return_count) || 0;

    res.json({
      success: true,
      data: {
        salesAmount: salesAmount - returnAmount,
        salesCount: salesCount - returnCount,
        orderCount: Number(salesRow.order_count) || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取账目记录列表（保留兼容）
 * GET /api/accounts/records
 */
const getAccountRecords = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM account_records WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC';

    const records = await db.query(sql, params);

    const totalIncome = records.filter(r => r.type === 'income')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpense = records.filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    res.json({
      success: true,
      data: records,
      total: records.length,
      statistics: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手动记账
 * POST /api/accounts/records
 */
const createAccountRecord = async (req, res, next) => {
  try {
    const { type, category, amount, remark } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: { message: '类型、分类和金额不能为空' }
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: '金额必须大于0' }
      });
    }

    const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.query(
      `INSERT INTO account_records (id, type, category, amount, remark, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, type, category, amount, remark || '']
    );

    res.status(201).json({
      success: true,
      data: { id, type, category, amount, remark },
      message: '账目记录创建成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatistics,
  getTodayStatistics,
  getAccountRecords,
  createAccountRecord
};
