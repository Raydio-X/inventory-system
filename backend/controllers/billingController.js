/**
 * 开单管理控制器（MySQL版）
 * 所有数据操作通过 mysqlDataStore 完成，支持事务和日志记录
 */
const dataStore = require('../models/mysqlDataStore');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * 记录业务操作日志
 */
const logOperation = (operation, details) => {
  console.log('[业务日志]', {
    operation,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * 获取销售订单列表
 */
const getSalesOrders = async (req, res, next) => {
  try {
    const { customerId, status, startDate, endDate } = req.query;

    const orders = await dataStore.getSalesOrders(customerId, status, startDate, endDate);

    // 将 snake_case 字段映射为 camelCase 给前端
    const mappedOrders = orders.map(order => ({
      id: order.id,
      orderNo: order.order_no,
      customerId: order.customer_id,
      customerName: order.customer_name,
      totalAmount: Number(order.total_amount),
      paidAmount: Number(order.paid_amount),
      debtAmount: Number(order.debt_amount),
      discount: Number(order.discount || 0),
      paymentMethod: order.payment_method,
      paymentStatus: order.status,
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
        price: Number(item.price),
        costPrice: Number(item.cost_price || 0)
      }))
    }));

    res.json({
      success: true,
      data: mappedOrders,
      total: mappedOrders.length
    });
  } catch (error) {
    logOperation('GET_SALES_ORDERS_ERROR', { error: error.message });
    next(error);
  }
};

/**
 * 获取单个销售订单详情
 */
const getSalesOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await dataStore.getSalesOrderById(id);

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    const mapped = {
      id: order.id,
      orderNo: order.order_no,
      customerId: order.customer_id,
      customerName: order.customer_name,
      totalAmount: Number(order.total_amount),
      paidAmount: Number(order.paid_amount),
      debtAmount: Number(order.debt_amount),
      discount: Number(order.discount || 0),
      paymentMethod: order.payment_method,
      paymentStatus: order.status,
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
        price: Number(item.price),
        costPrice: Number(item.cost_price || 0)
      }))
    };

    res.json({
      success: true,
      data: mapped
    });
  } catch (error) {
    logOperation('GET_SALES_ORDER_ERROR', { id: req.params.id, error: error.message });
    next(error);
  }
};

/**
 * 创建销售订单
 * 事务内完成：订单主表 + 订单明细 + 库存扣减 + 库存流水 + 账目记录 + 客户统计更新
 */
const createSalesOrder = async (req, res, next) => {
  const { customerId, customerName, items, totalAmount, paidAmount, debtAmount, discount, paymentMethod, status, remark } = req.body;
  const operator = req.user?.name || '系统';

  try {
    // 数据验证
    if (!items || items.length === 0) {
      throw new ValidationError('订单商品不能为空');
    }

    // 检查库存
    for (const item of items) {
      const sku = await dataStore.getSkuById(item.skuId);
      if (!sku) {
        throw new NotFoundError(`SKU ${item.skuId} 不存在`);
      }
      if (sku.stock < item.quantity) {
        throw new ValidationError(`商品 ${item.productName || ''} (${item.color || ''}/${item.size || ''}) 库存不足，当前库存: ${sku.stock}`);
      }
    }

    // 如果有客户ID，检查客户是否存在
    if (customerId) {
      const customer = await dataStore.getCustomerById(customerId);
      if (!customer) {
        throw new NotFoundError('客户不存在');
      }
    }

    // 构造订单数据
    const orderData = {
      customerId: customerId || null,
      customerName: customerName || '散客',
      totalAmount: totalAmount || 0,
      paidAmount: paidAmount || 0,
      debtAmount: debtAmount || 0,
      discount: discount || 0,
      paymentMethod: paymentMethod || 'cash',
      status: status || 'settled',
      remark: remark || '',
      items: items.map(item => ({
        skuId: item.skuId,
        productName: item.productName || '',
        color: item.color || '',
        size: item.size || '',
        quantity: item.quantity,
        price: item.price || 0,
        costPrice: item.costPrice || 0
      }))
    };

    // 通过 mysqlDataStore 创建订单（事务处理）
    const order = await dataStore.createSalesOrder(orderData);

    // 记录操作日志
    logOperation('CREATE_SALES_ORDER', {
      orderId: order.id,
      orderNo: order.order_no,
      customerName: orderData.customerName,
      totalAmount: orderData.totalAmount,
      paidAmount: orderData.paidAmount,
      debtAmount: orderData.debtAmount,
      itemCount: items.length,
      operator
    });

    // 映射返回数据
    const mapped = {
      id: order.id,
      orderNo: order.order_no,
      customerId: order.customer_id,
      customerName: order.customer_name,
      totalAmount: Number(order.total_amount),
      paidAmount: Number(order.paid_amount),
      debtAmount: Number(order.debt_amount),
      discount: Number(order.discount || 0),
      paymentMethod: order.payment_method,
      paymentStatus: order.status,
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
        price: Number(item.price),
        costPrice: Number(item.cost_price || 0)
      }))
    };

    res.status(201).json({
      success: true,
      data: mapped,
      message: '订单创建成功'
    });
  } catch (error) {
    // 记录失败日志
    logOperation('CREATE_SALES_ORDER_ERROR', {
      customerName: customerName || '散客',
      totalAmount: totalAmount || 0,
      itemCount: items?.length || 0,
      operator,
      error: error.message
    });
    next(error);
  }
};

/**
 * 更新订单收款
 * 事务内完成：更新订单金额 + 记录账目
 */
const updateOrderPayment = async (req, res, next) => {
  const { id } = req.params;
  const { paidAmount, paymentMethod } = req.body;
  const operator = req.user?.name || '系统';

  try {
    if (!paidAmount || paidAmount <= 0) {
      throw new ValidationError('收款金额必须大于0');
    }

    // 检查订单是否存在
    const existingOrder = await dataStore.getSalesOrderById(id);
    if (!existingOrder) {
      throw new NotFoundError('订单不存在');
    }

    const order = await dataStore.updateOrderPayment(id, paidAmount, paymentMethod || 'cash');

    // 记录操作日志
    logOperation('UPDATE_ORDER_PAYMENT', {
      orderId: id,
      orderNo: order.order_no,
      paidAmount,
      paymentMethod: paymentMethod || 'cash',
      operator
    });

    const mapped = {
      id: order.id,
      orderNo: order.order_no,
      customerId: order.customer_id,
      customerName: order.customer_name,
      totalAmount: Number(order.total_amount),
      paidAmount: Number(order.paid_amount),
      debtAmount: Number(order.debt_amount),
      discount: Number(order.discount || 0),
      paymentMethod: order.payment_method,
      paymentStatus: order.status,
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
        price: Number(item.price),
        costPrice: Number(item.cost_price || 0)
      }))
    };

    res.json({
      success: true,
      data: mapped,
      message: '收款更新成功'
    });
  } catch (error) {
    logOperation('UPDATE_ORDER_PAYMENT_ERROR', {
      orderId: id,
      paidAmount,
      operator,
      error: error.message
    });
    next(error);
  }
};

/**
 * 更新销售订单
 * 事务内完成：回滚旧库存 + 扣减新库存 + 更新订单明细 + 更新客户统计
 */
const updateSalesOrder = async (req, res, next) => {
  const { id } = req.params;
  const { items, totalAmount, paidAmount, debtAmount, discount, status, remark } = req.body;
  const operator = req.user?.name || '系统';

  try {
    // 数据验证
    if (!items || items.length === 0) {
      throw new ValidationError('订单商品不能为空');
    }

    // 检查订单是否存在
    const existingOrder = await dataStore.getSalesOrderById(id);
    if (!existingOrder) {
      throw new NotFoundError('订单不存在');
    }

    // 检查新商品库存
    for (const item of items) {
      const sku = await dataStore.getSkuById(item.skuId);
      if (!sku) {
        throw new NotFoundError(`SKU ${item.skuId} 不存在`);
      }
    }

    // 构造更新数据
    const orderData = {
      totalAmount: totalAmount || 0,
      paidAmount: paidAmount || 0,
      debtAmount: debtAmount || 0,
      discount: discount || 0,
      status: status || 'settled',
      remark: remark || '',
      items: items.map(item => ({
        skuId: item.skuId,
        productName: item.productName || '',
        color: item.color || '',
        size: item.size || '',
        quantity: item.quantity,
        price: item.price || 0,
        costPrice: item.costPrice || 0
      }))
    };

    const order = await dataStore.updateSalesOrder(id, orderData);

    logOperation('UPDATE_SALES_ORDER', {
      orderId: id,
      orderNo: order.order_no,
      itemCount: items.length,
      totalAmount: orderData.totalAmount,
      operator
    });

    const mapped = {
      id: order.id,
      orderNo: order.order_no,
      customerId: order.customer_id,
      customerName: order.customer_name,
      totalAmount: Number(order.total_amount),
      paidAmount: Number(order.paid_amount),
      debtAmount: Number(order.debt_amount),
      discount: Number(order.discount || 0),
      paymentMethod: order.payment_method,
      paymentStatus: order.status,
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
        price: Number(item.price),
        costPrice: Number(item.cost_price || 0)
      }))
    };

    res.json({
      success: true,
      data: mapped,
      message: '订单修改成功'
    });
  } catch (error) {
    logOperation('UPDATE_SALES_ORDER_ERROR', {
      orderId: id,
      error: error.message,
      operator
    });
    next(error);
  }
};

/**
 * 删除销售订单
 * 事务内完成：回滚库存 + 删除明细 + 删除订单 + 更新客户统计
 */
const deleteSalesOrder = async (req, res, next) => {
  const { id } = req.params;
  const operator = req.user?.name || '系统';

  try {
    // 检查订单是否存在
    const existingOrder = await dataStore.getSalesOrderById(id);
    if (!existingOrder) {
      throw new NotFoundError('订单不存在');
    }

    await dataStore.deleteSalesOrder(id);

    logOperation('DELETE_SALES_ORDER', {
      orderId: id,
      orderNo: existingOrder.order_no,
      customerName: existingOrder.customer_name,
      totalAmount: existingOrder.total_amount,
      operator
    });

    res.json({
      success: true,
      message: '订单删除成功'
    });
  } catch (error) {
    logOperation('DELETE_SALES_ORDER_ERROR', {
      orderId: id,
      error: error.message,
      operator
    });
    next(error);
  }
};

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateOrderPayment,
  updateSalesOrder,
  deleteSalesOrder
};
