/**
 * 欠款管理控制器（MySQL版本）
 */
const dataStore = require('../models/mysqlDataStore');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * 获取欠款客户列表
 */
const getDebtCustomers = async (req, res, next) => {
  try {
    const { keyword } = req.query;
    
    // 从 customers 表获取有欠款的客户（使用 total_debt 字段）
    const query = `
      SELECT 
        c.id AS customerId,
        c.name AS customerName,
        c.phone AS customerPhone,
        c.total_debt AS totalDebt,
        (
          SELECT COUNT(*) 
          FROM sales_orders so 
          WHERE so.customer_id = c.id AND so.debt_amount > 0
        ) AS orderCount
      FROM customers c
      WHERE c.total_debt > 0
      ORDER BY c.total_debt DESC
    `;
    
    let debtCustomers = await dataStore.query(query);
    
    // 搜索过滤
    if (keyword) {
      const key = keyword.toLowerCase();
      debtCustomers = debtCustomers.filter(c => 
        c.customerName.toLowerCase().includes(key) ||
        (c.customerPhone && c.customerPhone.includes(key))
      );
    }
    
    res.json({
      success: true,
      data: debtCustomers,
      total: debtCustomers.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取客户欠款详情（含订单商品明细）
 */
const getDebtCustomerDetail = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    
    // 获取客户信息（包含 total_debt）
    const customers = await dataStore.query(
      'SELECT id, name, phone, total_debt FROM customers WHERE id = ?',
      [customerId]
    );
    
    if (customers.length === 0) {
      throw new NotFoundError('客户不存在');
    }
    
    const customer = customers[0];
    
    // 获取客户的所有欠款订单
    const orders = await dataStore.query(
      `SELECT id, order_no, total_amount, paid_amount, debt_amount, status, created_at
       FROM sales_orders 
       WHERE customer_id = ? AND debt_amount > 0
       ORDER BY created_at DESC`,
      [customerId]
    );
    
    // 获取每个订单的商品明细
    for (const order of orders) {
      const items = await dataStore.query(
        `SELECT product_name, color, size, quantity, price 
         FROM sales_order_items 
         WHERE order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    
    // 使用 customers 表的 total_debt 字段
    const totalDebt = Number(customer.total_debt) || 0;
    
    res.json({
      success: true,
      data: {
        customer: { 
          id: customer.id, 
          name: customer.name, 
          phone: customer.phone 
        },
        orders,
        totalDebt,
        orderCount: orders.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 记录收款
 */
const recordPayment = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { orderId, amount, paymentMethod, remark } = req.body;
    
    // 数据验证
    if (!amount || amount <= 0) {
      throw new ValidationError('收款金额必须大于0');
    }
    
    const customers = await dataStore.query(
      'SELECT id, name FROM customers WHERE id = ?',
      [customerId]
    );
    
    if (customers.length === 0) {
      throw new NotFoundError('客户不存在');
    }
    
    const customer = customers[0];
    
    if (orderId) {
      // 指定订单收款
      const order = await dataStore.updateOrderPayment(orderId, amount, paymentMethod || 'cash');
      
      if (!order) {
        throw new NotFoundError('订单不存在');
      }
    } else {
      // 未指定订单，按时间顺序收款
      const orders = await dataStore.query(
        `SELECT id FROM sales_orders 
         WHERE customer_id = ? AND debt_amount > 0 
         ORDER BY created_at ASC`,
        [customerId]
      );
      
      let remainingAmount = amount;
      for (const order of orders) {
        if (remainingAmount <= 0) break;
        
        const orderDetail = await dataStore.getSalesOrderById(order.id);
        const paymentForOrder = Math.min(remainingAmount, Number(orderDetail.debt_amount));
        
        await dataStore.updateOrderPayment(order.id, paymentForOrder, paymentMethod || 'cash');
        remainingAmount -= paymentForOrder;
      }
    }
    
    res.status(201).json({
      success: true,
      data: {
        customerId,
        customerName: customer.name,
        amount,
        paymentMethod: paymentMethod || 'cash',
        remark: remark || ''
      },
      message: '收款记录成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新订单已付款金额（直接设置，而非追加）
 */
const updatePaidAmount = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paidAmount } = req.body;

    // 数据验证
    if (paidAmount === undefined || paidAmount === null || isNaN(paidAmount)) {
      throw new ValidationError('已付款金额格式错误');
    }

    const newPaidAmount = Number(paidAmount);
    if (newPaidAmount < 0) {
      throw new ValidationError('已付款金额不能为负数');
    }

    // 获取订单信息
    const orders = await dataStore.query(
      'SELECT id, order_no, total_amount, paid_amount, debt_amount, customer_id FROM sales_orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      throw new NotFoundError('订单不存在');
    }

    const order = orders[0];
    const totalAmount = Number(order.total_amount);

    // 验证：已付款金额不能超过订单总金额
    if (newPaidAmount > totalAmount) {
      throw new ValidationError('已付款金额不能超过订单总金额');
    }

    const oldPaidAmount = Number(order.paid_amount);
    const oldDebtAmount = Number(order.debt_amount);
    const newDebtAmount = Math.round((totalAmount - newPaidAmount) * 100) / 100;
    const newStatus = newDebtAmount <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'unpaid');
    const paidDiff = newPaidAmount - oldPaidAmount; // 正值=多付，负值=少付

    // 更新订单
    await dataStore.query(
      `UPDATE sales_orders SET paid_amount = ?, debt_amount = ?, status = ? WHERE id = ?`,
      [newPaidAmount, newDebtAmount, newStatus, orderId]
    );

    // 更新客户欠款统计
    if (order.customer_id) {
      // 差额部分需要从客户total_debt中扣除（正值减少欠款，负值增加欠款）
      await dataStore.query(
        `UPDATE customers SET total_debt = GREATEST(0, total_debt - ?) WHERE id = ?`,
        [paidDiff, order.customer_id]
      );
    }

    // 更新账目记录
    // 如果有差额，记录一笔调整
    if (Math.abs(paidDiff) > 0.001) {
      const accId = 'acc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

      if (paidDiff > 0) {
        // 多付了：记录收入
        await dataStore.query(
          `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
           VALUES (?, 'income', 'debt_payment', ?, ?, ?, '欠款金额调整（增加付款）')`,
          [accId, Math.abs(paidDiff), orderId, order.order_no]
        );
      } else {
        // 少付了：记录支出（冲减之前的收入）
        await dataStore.query(
          `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
           VALUES (?, 'expense', 'debt_adjustment', ?, ?, ?, '欠款金额调整（减少付款）')`,
          [accId, Math.abs(paidDiff), orderId, order.order_no]
        );
      }
    }

    // 返回更新后的数据
    const updatedOrders = await dataStore.query(
      'SELECT id, order_no, total_amount, paid_amount, debt_amount, status FROM sales_orders WHERE id = ?',
      [orderId]
    );

    res.json({
      success: true,
      data: updatedOrders[0],
      message: '已付款金额更新成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDebtCustomers,
  getDebtCustomerDetail,
  recordPayment,
  updatePaidAmount
};
