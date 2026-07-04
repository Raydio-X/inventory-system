/**
 * 库存管理控制器（MySQL版）
 * 所有数据操作通过 db 完成，支持事务和日志记录
 */
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * 生成唯一ID
 */
const generateId = (prefix = '') => `${prefix}${uuidv4()}`;

/**
 * 获取库存列表
 */
const getInventory = async (req, res, next) => {
  try {
    const { keyword, lowStock } = req.query;

    let sql = `
      SELECT
        s.id as sku_id,
        s.product_id,
        p.name as product_name,
        p.brand as product_brand,
        s.color,
        s.size,
        s.stock,
        s.price,
        p.cost_price,
        p.updated_at
      FROM skus s
      JOIN products p ON s.product_id = p.id
      WHERE p.status = 'active'
    `;
    const params = [];

    // 搜索过滤
    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 低库存过滤
    if (lowStock === 'true') {
      sql += ' AND s.stock <= 10';
    }

    sql += ' ORDER BY p.created_at DESC';

    const inventoryList = await db.query(sql, params);

    // 映射为前端需要的格式
    const mapped = inventoryList.map(item => ({
      skuId: item.sku_id,
      productId: item.product_id,
      productName: item.product_name,
      productBrand: item.product_brand,
      color: item.color,
      size: item.size,
      stock: item.stock,
      price: Number(item.price),
      costPrice: Number(item.cost_price),
      updatedAt: item.updated_at
    }));

    res.json({
      success: true,
      data: mapped,
      total: mapped.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取库存流水记录
 */
const getInventoryLogs = async (req, res, next) => {
  try {
    const { skuId, type, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM inventory_logs WHERE 1=1';
    const params = [];

    // SKU过滤
    if (skuId) {
      sql += ' AND sku_id = ?';
      params.push(skuId);
    }

    // 类型过滤
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    // 日期过滤
    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC';

    const logs = await db.query(sql, params);

    // 映射为前端需要的格式
    const mapped = logs.map(log => ({
      id: log.id,
      skuId: log.sku_id,
      type: log.type,
      quantity: log.quantity,
      orderId: log.order_id,
      orderNo: log.order_no,
      remark: log.remark || '',
      createdAt: log.created_at
    }));

    res.json({
      success: true,
      data: mapped,
      total: mapped.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 库存盘点
 * 事务内完成：遍历盘点项 → 更新库存 → 插入库存流水
 */
const inventoryCheck = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      throw new ValidationError('盘点商品不能为空');
    }

    const checkResults = [];

    await db.transaction(async (connection) => {
      for (const item of items) {
        // 查询SKU信息
        const [skus] = await connection.execute(
          `SELECT s.*, p.name as product_name FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?`,
          [item.skuId]
        );

        if (skus.length === 0) {
          throw new NotFoundError(`SKU ${item.skuId} 不存在`);
        }

        const sku = skus[0];
        const difference = item.actualStock - sku.stock;

        // 更新库存
        await connection.execute(
          'UPDATE skus SET stock = ? WHERE id = ?',
          [item.actualStock, item.skuId]
        );

        // 插入库存流水（仅当有差异时）
        if (difference !== 0) {
          const logId = generateId('inv-');
          await connection.execute(
            `INSERT INTO inventory_logs (id, sku_id, type, quantity, remark)
             VALUES (?, ?, 'inventory_check', ?, ?)`,
            [logId, item.skuId, difference, `库存盘点调整，差异: ${difference}`]
          );
        }

        checkResults.push({
          skuId: item.skuId,
          productName: sku.product_name,
          color: sku.color,
          size: sku.size,
          systemStock: sku.stock,
          actualStock: item.actualStock,
          difference
        });
      }
    });

    res.json({
      success: true,
      data: checkResults,
      message: '库存盘点完成'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryLogs,
  inventoryCheck
};
