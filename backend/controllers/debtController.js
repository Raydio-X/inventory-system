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
    
    // 获取所有有欠款的客户
    const query = `
      SELECT 
        so.customer_id AS customerId,
        so.customer_name AS customerName,
        c.phone AS customerPhone,
        SUM(so.debt_amount) AS totalDebt,
        COUNT(*) AS orderCount,
        MIN(so.created_at) AS oldestOrderDate
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.debt_amount > 0
      GROUP BY so.customer_id, so.customer_name, c.phone
      ORDER BY totalDebt DESC
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
    
    // 获取客户信息
    const customers = await dataStore.query(
      'SELECT id, name, phone FROM customers WHERE id = ?',
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
    
    if (orders.length === 0) {
      return res.json({
        success: true,
        data: {
          customer: { id: customer.id, name: customer.name, phone: customer.phone },
          orders: [],
          totalDebt: 0,
          orderCount: 0
        }
      });
    }
    
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
    
    const totalDebt = orders.reduce((sum, o) => sum + Number(o.debt_amount), 0);
    
    res.json({
      success: true,
      data: {
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
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

module.exports = {
  getDebtCustomers,
  getDebtCustomerDetail,
  recordPayment
};
