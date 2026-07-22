/**
 * 退货管理控制器（MySQL版）
 * 所有数据操作通过 db 完成，支持事务和日志记录
 */
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * 生成唯一ID
 */
const generateId = (prefix = '') => `${prefix}${uuidv4()}`;

/**
 * 生成退货单号：RT + YYYYMMDD + 4位序号
 */
const generateReturnOrderNo = async () => {
  const date = moment().format('YYYYMMDD');
  const results = await db.query(
    `SELECT COUNT(*) as count FROM return_orders WHERE DATE(created_at) = CURDATE()`
  );
  const count = results[0].count + 1;
  return `RT${date}${String(count).padStart(4, '0')}`;
};

/**
 * 获取退货订单列表
 */
const getReturnOrders = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate } = req.query;

    let sql = 'SELECT * FROM return_orders WHERE 1=1';
    const params = [];

    if (customerId) {
      sql += ' AND customer_id = ?';
      params.push(customerId);
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

    const orders = await db.query(sql, params);

    // 获取每个退货订单的明细
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM return_order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    // 映射 snake_case 为 camelCase 给前端
    const mappedOrders = orders.map(order => ({
      id: order.id,
      orderNo: order.order_no,
      customerId: order.customer_id,
      customerName: order.customer_name,
      totalAmount: Number(order.total_amount),
      status: order.status,
      remark: order.remark || '',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: (order.items || []).map(item => ({
        id: item.id,
        skuId: item.sku_id,
        productName: item.product_name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: Number(item.price)
      }))
    }));

    res.json({
      success: true,
      data: mappedOrders,
      total: mappedOrders.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建退货订单
 * 事务内完成：退货主表 + 退货明细 + 库存增加 + 库存流水 + 账目记录 + 客户统计更新
 */
const createReturnOrder = async (req, res, next) => {
  const { customerId, customerName, items, remark } = req.body;

  try {
    // 数据验证
    if (!items || items.length === 0) {
      throw new ValidationError('退货商品不能为空');
    }

    // 如果有客户ID，检查客户是否存在
    if (customerId) {
      const customers = await db.query(
        'SELECT * FROM customers WHERE id = ?',
        [customerId]
      );
      if (customers.length === 0) {
        throw new NotFoundError('客户不存在');
      }
    }

    // 检查所有SKU是否存在，并获取价格信息
    const skuList = [];
    for (const item of items) {
      const skus = await db.query(
        `SELECT s.*, p.name as product_name FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?`,
        [item.skuId]
      );
      if (skus.length === 0) {
        throw new NotFoundError(`SKU ${item.skuId} 不存在`);
      }
      skuList.push({ ...item, skuInfo: skus[0] });
    }

    // 计算退货总金额
    const totalAmount = skuList.reduce((sum, item) => {
      return sum + (Number(item.skuInfo.price) * item.quantity);
    }, 0);

    // 确定客户名称
    const finalCustomerName = customerName || '散客';

    // 生成ID和单号
    const orderId = generateId('return-');
    const orderNo = await generateReturnOrderNo();

    // 事务处理
    await db.transaction(async (connection) => {
      // 1. 插入退货订单主表
      await connection.execute(
        `INSERT INTO return_orders (id, order_no, customer_id, customer_name, total_amount, status, remark)
         VALUES (?, ?, ?, ?, ?, 'returned', ?)`,
        [orderId, orderNo, customerId || null, finalCustomerName, totalAmount, remark || '']
      );

      // 2. 插入退货明细 + 更新库存 + 记录库存流水
      for (const item of skuList) {
        const itemId = generateId('item-');
        const sku = item.skuInfo;

        // 插入退货明细
        await connection.execute(
          `INSERT INTO return_order_items (id, order_id, sku_id, product_name, color, size, quantity, price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, orderId, item.skuId, sku.product_name, sku.color, sku.size, item.quantity, sku.price]
        );

        // 退货后商品不收回，不更新库存
        // await connection.execute(
        //   'UPDATE skus SET stock = stock + ? WHERE id = ?',
        //   [item.quantity, item.skuId]
        // );

        // 插入库存流水（记录退货但不增加库存）
        const logId = generateId('inv-');
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'sales_return', ?, ?, ?, '客户退货（不收回商品）')`,
          [logId, item.skuId, item.quantity, orderId, orderNo]
        );
      }

      // 3. 插入账目记录
      const accId = generateId('acc-');
      await connection.execute(
        `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
         VALUES (?, 'expense', 'return', ?, ?, ?, ?)`,
        [accId, totalAmount, orderId, orderNo, `客户退货 - ${finalCustomerName}`]
      );

      // 4. 更新客户统计（仅当有客户ID时）
      if (customerId) {
        // 退货减少消费总额，但不减少订单数（退货单是单独记录的）
        await connection.execute(
          `UPDATE customers SET total_spent = total_spent - ? WHERE id = ?`,
          [totalAmount, customerId]
        );

        // 如果客户有欠款，退款后减少总欠款金额（不超过欠款总额）
        // 退款金额优先抵扣欠款
        const [customerInfo] = await connection.execute(
          'SELECT total_debt FROM customers WHERE id = ?',
          [customerId]
        );
        const currentDebt = customerInfo[0]?.total_debt || 0;
        if (currentDebt > 0) {
          // 退款金额减少欠款，但不能让欠款变为负数
          const newDebt = Math.max(0, currentDebt - totalAmount);
          await connection.execute(
            'UPDATE customers SET total_debt = ? WHERE id = ?',
            [newDebt, customerId]
          );
        }
      }
    });

    // 查询完整的退货订单数据返回
    const orders = await db.query('SELECT * FROM return_orders WHERE id = ?', [orderId]);
    const orderItems = await db.query('SELECT * FROM return_order_items WHERE order_id = ?', [orderId]);

    const mapped = {
      id: orders[0].id,
      orderNo: orders[0].order_no,
      customerId: orders[0].customer_id,
      customerName: orders[0].customer_name,
      totalAmount: Number(orders[0].total_amount),
      status: orders[0].status,
      remark: orders[0].remark || '',
      createdAt: orders[0].created_at,
      updatedAt: orders[0].updated_at,
      items: orderItems.map(item => ({
        id: item.id,
        skuId: item.sku_id,
        productName: item.product_name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: Number(item.price)
      }))
    };

    res.status(201).json({
      success: true,
      data: mapped,
      message: '退货订单创建成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReturnOrders,
  createReturnOrder
};
