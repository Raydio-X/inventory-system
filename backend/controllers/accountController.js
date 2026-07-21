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

/**
 * 获取商品利润详情（全部历史数据）
 * GET /api/accounts/profit-detail
 */
const getProfitDetail = async (req, res, next) => {
  try {
    // 查询每个商品的销售统计（销售额）
    const salesDetail = await db.query(
      `SELECT 
        soi.product_name,
        soi.color,
        soi.size,
        COALESCE(SUM(soi.quantity), 0) as sales_count,
        COALESCE(SUM(soi.quantity * soi.price), 0) as sales_amount
       FROM sales_order_items soi
       JOIN sales_orders so ON soi.order_id = so.id
       GROUP BY soi.product_name, soi.color, soi.size`
    );

    // 查询每个商品的采购成本（从采购订单明细）
    const purchaseDetail = await db.query(
      `SELECT 
        poi.product_name,
        poi.color,
        poi.size,
        COALESCE(SUM(poi.quantity), 0) as purchase_count,
        COALESCE(SUM(poi.quantity * poi.cost_price), 0) as cost_amount
       FROM purchase_order_items poi
       JOIN purchase_orders po ON poi.order_id = po.id
       WHERE po.status = 'completed'
       GROUP BY poi.product_name, poi.color, poi.size`
    );

    // 查询每个商品的退货统计
    const returnDetail = await db.query(
      `SELECT 
        roi.product_name,
        roi.color,
        roi.size,
        COALESCE(SUM(roi.quantity), 0) as return_count,
        COALESCE(SUM(roi.quantity * roi.price), 0) as return_amount
       FROM return_order_items roi
       JOIN return_orders ro ON roi.order_id = ro.id
       GROUP BY roi.product_name, roi.color, roi.size`
    );

    // 合并销售、采购、退货数据
    const productMap = new Map();
    
    // 处理采购成本数据
    purchaseDetail.forEach(item => {
      const key = `${item.product_name}|${item.color}|${item.size}`;
      productMap.set(key, {
        productName: item.product_name,
        color: item.color,
        size: item.size,
        salesCount: 0,
        salesAmount: 0,
        costAmount: Number(item.cost_amount) || 0,
        purchaseCount: Number(item.purchase_count) || 0,
        returnCount: 0,
        returnAmount: 0
      });
    });
    
    // 处理销售数据
    salesDetail.forEach(item => {
      const key = `${item.product_name}|${item.color}|${item.size}`;
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.salesCount = Number(item.sales_count) || 0;
        existing.salesAmount = Number(item.sales_amount) || 0;
      } else {
        productMap.set(key, {
          productName: item.product_name,
          color: item.color,
          size: item.size,
          salesCount: Number(item.sales_count) || 0,
          salesAmount: Number(item.sales_amount) || 0,
          costAmount: 0,
          purchaseCount: 0,
          returnCount: 0,
          returnAmount: 0
        });
      }
    });

    // 处理退货数据
    returnDetail.forEach(item => {
      const key = `${item.product_name}|${item.color}|${item.size}`;
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.returnCount = Number(item.return_count) || 0;
        existing.returnAmount = Number(item.return_amount) || 0;
      } else {
        productMap.set(key, {
          productName: item.product_name,
          color: item.color,
          size: item.size,
          salesCount: 0,
          salesAmount: 0,
          costAmount: 0,
          purchaseCount: 0,
          returnCount: Number(item.return_count) || 0,
          returnAmount: Number(item.return_amount) || 0
        });
      }
    });

    // 计算利润并按商品名分组
    const productGroups = {};
    productMap.forEach(item => {
      const netSalesCount = item.salesCount - item.returnCount;
      const netSalesAmount = item.salesAmount - item.returnAmount;
      
      // 利润 = 净销售额 - 采购总成本
      // 注意：退货时，如果退货金额大于成本，需要调整
      // 简单处理：利润 = 净销售额 - 采购成本
      const profit = netSalesAmount - item.costAmount;

      if (!productGroups[item.productName]) {
        productGroups[item.productName] = {
          productName: item.productName,
          specs: [],
          totalSalesCount: 0,
          totalSalesAmount: 0,
          totalCostAmount: 0,
          totalReturnCount: 0,
          totalReturnAmount: 0,
          totalProfit: 0
        };
      }

      productGroups[item.productName].specs.push({
        color: item.color,
        size: item.size,
        salesCount: netSalesCount,
        salesAmount: netSalesAmount,
        costAmount: item.costAmount,
        profit: profit
      });

      productGroups[item.productName].totalSalesCount += netSalesCount;
      productGroups[item.productName].totalSalesAmount += netSalesAmount;
      productGroups[item.productName].totalCostAmount += item.costAmount;
      productGroups[item.productName].totalReturnCount += item.returnCount;
      productGroups[item.productName].totalReturnAmount += item.returnAmount;
      productGroups[item.productName].totalProfit += profit;
    });

    // 转为数组并按利润排序
    const result = Object.values(productGroups).sort((a, b) => b.totalProfit - a.totalProfit);

    res.json({
      success: true,
      data: {
        products: result,
        summary: {
          totalSalesCount: result.reduce((sum, p) => sum + p.totalSalesCount, 0),
          totalSalesAmount: result.reduce((sum, p) => sum + p.totalSalesAmount, 0),
          totalCostAmount: result.reduce((sum, p) => sum + p.totalCostAmount, 0),
          totalProfit: result.reduce((sum, p) => sum + p.totalProfit, 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatistics,
  getTodayStatistics,
  getAccountRecords,
  createAccountRecord,
  getProfitDetail
};
