/**
 * MySQL数据存储类
 * 使用MySQL数据库存储数据，替代内存存储
 */
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class MySQLDataStore {
  /**
   * 生成唯一ID
   */
  generateId(prefix = '') {
    return `${prefix}${uuidv4()}`;
  }

  /**
   * 执行通用SQL查询
   */
  async query(sql, params = []) {
    return await db.query(sql, params);
  }

  /**
   * 生成订单号
   */
  async generateOrderNo(prefix = 'XS') {
    const date = moment().format('YYYYMMDD');
    const countQuery = `
      SELECT COUNT(*) as count FROM sales_orders
      WHERE DATE(created_at) = CURDATE()
    `;
    const result = await db.query(countQuery);
    const count = (result[0]?.count || 0) + 1;
    return `${prefix}${date}${String(count).padStart(4, '0')}`;
  }

  // ==================== 商品管理 ====================

  /**
   * 获取商品列表
   */
  async getProducts(keyword, category, status) {
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR brand LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const products = await db.query(sql, params);

    // 获取每个商品的SKU
    for (const product of products) {
      const skus = await db.query(
        'SELECT * FROM skus WHERE product_id = ?',
        [product.id]
      );
      product.skus = skus;
    }

    return products;
  }

  /**
   * 获取单个商品
   */
  async getProductById(id) {
    const product = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (product.length === 0) {
      return null;
    }

    const skus = await db.query(
      'SELECT * FROM skus WHERE product_id = ?',
      [id]
    );

    product[0].skus = skus;
    return product[0];
  }

  /**
   * 创建商品
   */
  async createProduct(productData) {
    const productId = this.generateId('prod-');

    await db.transaction(async (connection) => {
      // 插入商品
      await connection.execute(
        `INSERT INTO products (id, name, brand, season, category, price, cost_price, image, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          productId,
          productData.name,
          productData.brand || '',
          productData.season || '',
          productData.category || '',
          productData.price,
          productData.costPrice || 0,
          productData.image || ''
        ]
      );

      // 插入SKU
      for (const sku of productData.skus) {
        const skuId = this.generateId('sku-');
        await connection.execute(
          `INSERT INTO skus (id, product_id, color, size, stock, price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            skuId,
            productId,
            sku.color,
            sku.size,
            sku.stock || 0,
            sku.price || productData.price
          ]
        );
      }
    });

    return await this.getProductById(productId);
  }

  /**
   * 更新商品
   */
  async updateProduct(id, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (['name', 'brand', 'season', 'category', 'price', 'cost_price', 'image', 'status'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return await this.getProductById(id);
  }

  /**
   * 删除商品（软删除）
   */
  async deleteProduct(id) {
    await db.query(
      'UPDATE products SET status = "deleted" WHERE id = ?',
      [id]
    );
  }

  // ==================== SKU管理 ====================

  /**
   * 获取SKU
   */
  async getSkuById(skuId) {
    const skus = await db.query(
      'SELECT * FROM skus WHERE id = ?',
      [skuId]
    );
    return skus.length > 0 ? skus[0] : null;
  }

  /**
   * 更新SKU库存
   */
  async updateSkuStock(skuId, quantity, type) {
    let sql = 'UPDATE skus SET stock = stock + ? WHERE id = ?';
    let qty = quantity;

    if (type === 'decrease') {
      qty = -quantity;
    } else if (type === 'set') {
      sql = 'UPDATE skus SET stock = ? WHERE id = ?';
    }

    await db.query(sql, [qty, skuId]);
  }

  // ==================== 客户管理 ====================

  /**
   * 获取客户列表
   */
  async getCustomers(keyword) {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    return await db.query(sql, params);
  }

  /**
   * 获取单个客户
   */
  async getCustomerById(id) {
    const customers = await db.query(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );
    return customers.length > 0 ? customers[0] : null;
  }

  /**
   * 创建客户
   */
  async createCustomer(customerData) {
    const customerId = this.generateId('cust-');

    await db.query(
      `INSERT INTO customers (id, name, phone, address, remark, total_spent, order_count)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [
        customerId,
        customerData.name,
        customerData.phone,
        customerData.address || '',
        customerData.remark || ''
      ]
    );

    return await this.getCustomerById(customerId);
  }

  /**
   * 更新客户
   */
  async updateCustomer(id, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (['name', 'phone', 'address', 'remark', 'total_spent', 'order_count'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return await this.getCustomerById(id);
  }

  /**
   * 删除客户
   */
  async deleteCustomer(id) {
    await db.query('DELETE FROM customers WHERE id = ?', [id]);
  }

  // ==================== 销售订单管理 ====================

  /**
   * 获取销售订单列表
   */
  async getSalesOrders(customerId, status, startDate, endDate) {
    let sql = 'SELECT * FROM sales_orders WHERE 1=1';
    const params = [];

    if (customerId) {
      sql += ' AND customer_id = ?';
      params.push(customerId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
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

    // 获取每个订单的明细
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM sales_order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return orders;
  }

  /**
   * 获取单个销售订单
   */
  async getSalesOrderById(id) {
    const orders = await db.query(
      'SELECT * FROM sales_orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return null;
    }

    const items = await db.query(
      'SELECT * FROM sales_order_items WHERE order_id = ?',
      [id]
    );

    orders[0].items = items;
    return orders[0];
  }

  /**
   * 创建销售订单
   */
  async createSalesOrder(orderData) {
    const orderId = this.generateId('order-');
    const orderNo = await this.generateOrderNo('XS');

    await db.transaction(async (connection) => {
      // 插入订单
      await connection.execute(
        `INSERT INTO sales_orders 
         (id, order_no, customer_id, customer_name, total_amount, paid_amount, debt_amount, discount, payment_method, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNo,
          orderData.customerId,
          orderData.customerName,
          orderData.totalAmount,
          orderData.paidAmount || 0,
          orderData.debtAmount,
          orderData.discount || 0,
          orderData.paymentMethod || 'cash',
          orderData.status,
          orderData.remark || ''
        ]
      );

      // 插入订单明细
      for (const item of orderData.items) {
        const itemId = this.generateId('item-');

        // 获取商品最新的成本价（从products表）
        let latestCostPrice = item.costPrice || 0;
        if (item.skuId) {
          const [skuRows] = await connection.execute(
            `SELECT p.cost_price FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?`,
            [item.skuId]
          );
          if (skuRows.length > 0 && skuRows[0].cost_price > 0) {
            latestCostPrice = Number(skuRows[0].cost_price);
          }
        }

        await connection.execute(
          `INSERT INTO sales_order_items 
           (id, order_id, sku_id, product_name, color, size, quantity, price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.skuId,
            item.productName,
            item.color,
            item.size,
            item.quantity,
            item.price,
            latestCostPrice
          ]
        );

        // 更新库存
        await connection.execute(
          'UPDATE skus SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.skuId]
        );

        // 记录库存流水
        const logId = this.generateId('inv-');
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'sales_out', ?, ?, ?, '销售出库')`,
          [logId, item.skuId, -item.quantity, orderId, orderNo]
        );
      }

      // 记录账目
      if (orderData.paidAmount > 0) {
        const accId = this.generateId('acc-');
        await connection.execute(
          `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
           VALUES (?, 'income', 'sales', ?, ?, ?, '销售收款')`,
          [accId, orderData.paidAmount, orderId, orderNo]
        );
      }

      // 更新客户统计（仅当有客户ID时）
      if (orderData.customerId) {
        await connection.execute(
          `UPDATE customers 
           SET total_spent = total_spent + ?, order_count = order_count + 1 
           WHERE id = ?`,
          [orderData.totalAmount, orderData.customerId]
        );
      }
    });

    return await this.getSalesOrderById(orderId);
  }

  /**
   * 更新销售订单（修改商品明细、金额等）
   * 事务内完成：回滚旧库存 + 扣减新库存 + 更新订单明细 + 更新客户统计
   */
  async updateSalesOrder(id, orderData) {
    await db.transaction(async (connection) => {
      // 获取原订单
      const [orderRows] = await connection.execute(
        'SELECT * FROM sales_orders WHERE id = ?',
        [id]
      );
      if (orderRows.length === 0) {
        throw new Error('订单不存在');
      }
      const oldOrder = orderRows[0];

      // 获取原订单明细
      const [oldItems] = await connection.execute(
        'SELECT * FROM sales_order_items WHERE order_id = ?',
        [id]
      );

      // 回滚旧库存
      for (const oldItem of oldItems) {
        await connection.execute(
          'UPDATE skus SET stock = stock + ? WHERE id = ?',
          [oldItem.quantity, oldItem.sku_id]
        );
        // 记录库存流水
        const logId = this.generateId('inv-');
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'order_edit_rollback', ?, ?, ?, '修改订单回滚库存')`,
          [logId, oldItem.sku_id, oldItem.quantity, id, oldOrder.order_no]
        );
      }

      // 删除旧明细
      await connection.execute(
        'DELETE FROM sales_order_items WHERE order_id = ?',
        [id]
      );

      // 插入新明细 + 扣减新库存
      for (const item of orderData.items) {
        const itemId = this.generateId('item-');

        // 获取商品最新的成本价（从products表）
        let latestCostPrice = item.costPrice || 0;
        if (item.skuId) {
          const [skuRows] = await connection.execute(
            `SELECT p.cost_price FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?`,
            [item.skuId]
          );
          if (skuRows.length > 0 && skuRows[0].cost_price > 0) {
            latestCostPrice = Number(skuRows[0].cost_price);
          }
        }

        await connection.execute(
          `INSERT INTO sales_order_items
           (id, order_id, sku_id, product_name, color, size, quantity, price, cost_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            id,
            item.skuId,
            item.productName,
            item.color,
            item.size,
            item.quantity,
            item.price,
            latestCostPrice
          ]
        );

        // 扣减库存
        await connection.execute(
          'UPDATE skus SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.skuId]
        );

        // 记录库存流水
        const logId = this.generateId('inv-');
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'order_edit_deduct', ?, ?, ?, '修改订单扣减库存')`,
          [logId, item.skuId, -item.quantity, id, oldOrder.order_no]
        );
      }

      // 更新订单主表
      await connection.execute(
        `UPDATE sales_orders
         SET total_amount = ?, paid_amount = ?, debt_amount = ?, discount = ?, status = ?, remark = ?
         WHERE id = ?`,
        [
          orderData.totalAmount,
          orderData.paidAmount || 0,
          orderData.debtAmount || 0,
          orderData.discount || 0,
          orderData.status || (orderData.debtAmount > 0 ? 'partial' : 'settled'),
          orderData.remark || '',
          id
        ]
      );

      // 更新客户统计：回滚旧的 + 加上新的
      if (oldOrder.customer_id) {
        await connection.execute(
          `UPDATE customers SET total_spent = total_spent - ? + ? WHERE id = ?`,
          [oldOrder.total_amount, orderData.totalAmount, oldOrder.customer_id]
        );
      }
    });

    return await this.getSalesOrderById(id);
  }

  /**
   * 删除销售订单
   * 事务内完成：回滚库存 + 删除明细 + 删除订单 + 更新客户统计 + 删除相关账目记录
   */
  async deleteSalesOrder(id) {
    await db.transaction(async (connection) => {
      // 获取订单
      const [orderRows] = await connection.execute(
        'SELECT * FROM sales_orders WHERE id = ?',
        [id]
      );
      if (orderRows.length === 0) {
        throw new Error('订单不存在');
      }
      const order = orderRows[0];

      // 获取订单明细
      const [items] = await connection.execute(
        'SELECT * FROM sales_order_items WHERE order_id = ?',
        [id]
      );

      // 回滚库存
      for (const item of items) {
        await connection.execute(
          'UPDATE skus SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.sku_id]
        );
        // 记录库存流水
        const logId = this.generateId('inv-');
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'order_delete_rollback', ?, ?, ?, '删除订单回滚库存')`,
          [logId, item.sku_id, item.quantity, id, order.order_no]
        );
      }

      // 删除账目记录
      await connection.execute(
        'DELETE FROM account_records WHERE order_id = ?',
        [id]
      );

      // 删除订单明细
      await connection.execute(
        'DELETE FROM sales_order_items WHERE order_id = ?',
        [id]
      );

      // 删除订单
      await connection.execute(
        'DELETE FROM sales_orders WHERE id = ?',
        [id]
      );

      // 更新客户统计
      if (order.customer_id) {
        await connection.execute(
          `UPDATE customers SET total_spent = total_spent - ?, order_count = order_count - 1 WHERE id = ?`,
          [order.total_amount, order.customer_id]
        );
      }
    });
  }

  /**
   * 更新订单收款
   */
  async updateOrderPayment(id, paidAmount, paymentMethod) {
    await db.transaction(async (connection) => {
      // 获取订单信息
      const [order] = await connection.execute(
        'SELECT * FROM sales_orders WHERE id = ?',
        [id]
      );

      if (order.length === 0) {
        throw new Error('订单不存在');
      }

      const currentOrder = order[0];
      const newPaidAmount = currentOrder.paid_amount + paidAmount;
      const newDebtAmount = currentOrder.debt_amount - paidAmount;
      const newStatus = newDebtAmount <= 0 ? 'settled' : 'partial';

      // 更新订单
      await connection.execute(
        `UPDATE sales_orders 
         SET paid_amount = ?, debt_amount = ?, status = ? 
         WHERE id = ?`,
        [newPaidAmount, Math.max(0, newDebtAmount), newStatus, id]
      );

      // 记录账目
      const accId = this.generateId('acc-');
      await connection.execute(
        `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
         VALUES (?, 'income', 'debt_payment', ?, ?, ?, '欠款收款')`,
        [accId, paidAmount, id, currentOrder.order_no]
      );
    });

    return await this.getSalesOrderById(id);
  }

  // ==================== 退货订单管理 ====================

  /**
   * 获取退货订单列表
   */
  async getReturnOrders(customerId, startDate, endDate) {
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

    // 获取每个订单的明细
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM return_order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return orders;
  }

  /**
   * 创建退货订单
   */
  async createReturnOrder(orderData) {
    const orderId = this.generateId('return-');
    const orderNo = await this.generateOrderNo('RT');

    await db.transaction(async (connection) => {
      // 插入退货订单
      await connection.execute(
        `INSERT INTO return_orders 
         (id, order_no, customer_id, customer_name, total_amount, status, remark)
         VALUES (?, ?, ?, ?, ?, 'returned', ?)`,
        [
          orderId,
          orderNo,
          orderData.customerId,
          orderData.customerName,
          orderData.totalAmount,
          orderData.remark || ''
        ]
      );

      // 插入退货明细
      for (const item of orderData.items) {
        const itemId = this.generateId('item-');
        await connection.execute(
          `INSERT INTO return_order_items 
           (id, order_id, sku_id, product_name, color, size, quantity, price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.skuId,
            item.productName,
            item.color,
            item.size,
            item.quantity,
            item.price
          ]
        );

        // 更新库存
        await connection.execute(
          'UPDATE skus SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.skuId]
        );

        // 记录库存流水
        const logId = this.generateId('inv-');
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'sales_return', ?, ?, ?, '客户退货入库')`,
          [logId, item.skuId, item.quantity, orderId, orderNo]
        );
      }

      // 记录账目
      const accId = this.generateId('acc-');
      await connection.execute(
        `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
         VALUES (?, 'expense', 'return', ?, ?, ?, ?)`,
        [accId, orderData.totalAmount, orderId, orderNo, `客户退货 - ${orderData.customerName}`]
      );

      // 更新客户统计
      await connection.execute(
        `UPDATE customers 
         SET total_spent = total_spent - ?, order_count = order_count - 1 
         WHERE id = ?`,
        [orderData.totalAmount, orderData.customerId]
      );
    });

    return { id: orderId, orderNo };
  }

  // ==================== 采购订单管理 ====================

  /**
   * 获取采购订单列表
   */
  async getPurchaseOrders(status, startDate, endDate) {
    let sql = 'SELECT * FROM purchase_orders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
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

    // 获取每个订单的明细
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM purchase_order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    return orders;
  }

  /**
   * 创建采购订单
   */
  async createPurchaseOrder(orderData) {
    const orderId = this.generateId('purchase-');
    const orderNo = await this.generateOrderNo('CG');

    await db.transaction(async (connection) => {
      // 插入采购订单
      await connection.execute(
        `INSERT INTO purchase_orders 
         (id, order_no, supplier, supplier_id, total_amount, status, remark)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [
          orderId,
          orderNo,
          orderData.supplier || '',
          orderData.supplierId || null,
          orderData.totalAmount,
          orderData.remark || ''
        ]
      );

      // 插入采购明细
      for (const item of orderData.items) {
        const itemId = this.generateId('item-');
        await connection.execute(
          `INSERT INTO purchase_order_items 
           (id, order_id, product_id, sku_id, product_name, color, size, quantity, cost_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.productId,
            item.skuId || null,
            item.productName,
            item.color || '',
            item.size || '',
            item.quantity,
            item.costPrice,
            item.totalPrice
          ]
        );
      }
    });

    return { id: orderId, orderNo };
  }

  /**
   * 确认采购入库
   */
  async confirmPurchase(orderId) {
    await db.transaction(async (connection) => {
      // 获取订单信息
      const [order] = await connection.execute(
        'SELECT * FROM purchase_orders WHERE id = ?',
        [orderId]
      );

      if (order.length === 0) {
        throw new Error('采购订单不存在');
      }

      const currentOrder = order[0];

      // 获取订单明细
      const [items] = await connection.execute(
        'SELECT * FROM purchase_order_items WHERE order_id = ?',
        [orderId]
      );

      // 更新库存 + 计算成本价
      for (const item of items) {
        if (item.sku_id) {
          // 获取当前库存和成本价用于移动加权平均计算
          const [skuRows] = await connection.execute(
            'SELECT stock, price FROM skus WHERE id = ?',
            [item.sku_id]
          );
          const currentSku = skuRows[0];

          // 更新SKU库存
          await connection.execute(
            'UPDATE skus SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.sku_id]
          );

          // 移动加权平均法计算商品成本价
          if (currentSku && item.cost_price > 0) {
            const oldStock = currentSku.stock;
            const oldPrice = Number(currentSku.price);
            const newStock = oldStock + item.quantity;
            const newCostPrice = Number(item.cost_price);
            const avgPrice = newStock > 0
              ? (oldStock * oldPrice + item.quantity * newCostPrice) / newStock
              : newCostPrice;

            // 更新商品成本价
            await connection.execute(
              'UPDATE products SET cost_price = ? WHERE id = ?',
              [Math.round(avgPrice * 100) / 100, item.product_id]
            );
          }

          // 记录库存流水
          const logId = this.generateId('inv-');
          await connection.execute(
            `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
             VALUES (?, ?, 'purchase_in', ?, ?, ?, '采购入库')`,
            [logId, item.sku_id, item.quantity, orderId, currentOrder.order_no]
          );
        } else {
          // 采购明细必须关联已有SKU，无SKU的明细跳过入库
          continue;
        }
      }

      // 记录账目
      const accId = this.generateId('acc-');
      await connection.execute(
        `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
         VALUES (?, 'expense', 'purchase', ?, ?, ?, ?)`,
        [
          accId,
          currentOrder.total_amount,
          orderId,
          currentOrder.order_no,
          `采购入库 - ${currentOrder.supplier || '供应商'}`
        ]
      );

      // 更新订单状态
      await connection.execute(
        'UPDATE purchase_orders SET status = "completed" WHERE id = ?',
        [orderId]
      );
    });
  }

  // ==================== 账目管理 ====================

  /**
   * 获取账目记录列表
   */
  async getAccountRecords(type, category, startDate, endDate) {
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

    return await db.query(sql, params);
  }

  /**
   * 创建账目记录
   */
  async createAccountRecord(recordData) {
    const recordId = this.generateId('acc-');

    await db.query(
      `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        recordData.type,
        recordData.category,
        recordData.amount,
        recordData.orderId || null,
        recordData.orderNo || null,
        recordData.remark || ''
      ]
    );

    return { id: recordId };
  }

  // ==================== 库存管理 ====================

  /**
   * 获取库存列表
   */
  async getInventory(keyword, lowStock) {
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

    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (lowStock) {
      sql += ' AND s.stock <= 10';
    }

    sql += ' ORDER BY p.created_at DESC';

    return await db.query(sql, params);
  }

  /**
   * 获取库存流水记录
   */
  async getInventoryLogs(skuId, type, startDate, endDate) {
    let sql = 'SELECT * FROM inventory_logs WHERE 1=1';
    const params = [];

    if (skuId) {
      sql += ' AND sku_id = ?';
      params.push(skuId);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
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

    return await db.query(sql, params);
  }

  /**
   * 创建库存流水记录
   */
  async createInventoryLog(logData) {
    const logId = this.generateId('inv-');

    await db.query(
      `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        logData.skuId,
        logData.type,
        logData.quantity,
        logData.orderId || null,
        logData.orderNo || null,
        logData.remark || ''
      ]
    );

    return { id: logId };
  }

  // ==================== 用户管理 ====================

  /**
   * 获取用户列表
   */
  async getUsers() {
    return await db.query('SELECT * FROM users ORDER BY created_at DESC');
  }

  /**
   * 获取用户
   */
  async getUserById(id) {
    const users = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * 获取用户（通过用户名）
   */
  async getUserByUsername(username) {
    const users = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * 创建用户
   */
  async createUser(userData) {
    const userId = this.generateId('user-');

    await db.query(
      `INSERT INTO users (id, username, password, name, role)
       VALUES (?, ?, ?, ?, 'user')`,
      [userId, userData.username, userData.password, userData.name]
    );

    return await this.getUserById(userId);
  }

  /**
   * 更新用户密码
   */
  async updateUserPassword(id, newPassword) {
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [newPassword, id]
    );
  }
}

// 创建全局数据存储实例
const dataStore = new MySQLDataStore();

module.exports = dataStore;