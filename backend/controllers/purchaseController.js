/**
 * 采购管理控制器
 */
const db = require('../config/database');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * 生成采购订单ID
 */
function generatePurchaseOrderId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `purchase-${timestamp}${random}`;
}

/**
 * 生成采购明细ID
 */
function generatePurchaseItemId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `pitem-${timestamp}${random}`;
}

/**
 * snake_case → camelCase 映射
 */
function mapPurchaseOrderRow(row) {
  return {
    id: row.id,
    orderNo: row.order_no,
    supplier: row.supplier,
    supplierId: row.supplier_id,
    totalAmount: parseFloat(row.total_amount),
    status: row.status,
    remark: row.remark || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPurchaseItemRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    skuId: row.sku_id,
    productName: row.product_name,
    color: row.color,
    size: row.size,
    quantity: row.quantity,
    costPrice: parseFloat(row.cost_price),
    totalPrice: parseFloat(row.total_price)
  };
}

/**
 * 获取采购订单列表
 */
const getPurchaseOrders = async (req, res, next) => {
  try {
    const { status, startDate, endDate, supplierId } = req.query;

    let sql = 'SELECT * FROM purchase_orders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(supplierId);
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
    const ordersWithItems = [];
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM purchase_order_items WHERE order_id = ?',
        [order.id]
      );
      ordersWithItems.push({
        ...mapPurchaseOrderRow(order),
        items: items.map(mapPurchaseItemRow)
      });
    }

    res.json({
      success: true,
      data: ordersWithItems,
      total: ordersWithItems.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个采购订单详情
 */
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [order] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);

    if (!order) {
      throw new NotFoundError('采购订单不存在');
    }

    const items = await db.query(
      'SELECT * FROM purchase_order_items WHERE order_id = ?',
      [id]
    );

    const result = {
      ...mapPurchaseOrderRow(order),
      items: items.map(mapPurchaseItemRow)
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建采购订单
 * 所有明细必须关联已有的商品和SKU
 * 如果 isNewProduct 为 true，自动设置为已入库状态并执行入库操作
 */
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, supplier, items, remark, isNewProduct } = req.body;

    // 数据验证
    if (!items || items.length === 0) {
      throw new ValidationError('采购商品不能为空');
    }

    // 验证每个明细的商品和SKU存在性
    for (const item of items) {
      if (!item.productId) {
        throw new ValidationError('采购明细必须关联商品');
      }

      const [product] = await db.query('SELECT id, status FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        throw new ValidationError(`商品 ${item.productId} 不存在`);
      }
      if (product.status === 'deleted') {
        throw new ValidationError(`商品 ${item.productName || item.productId} 已被删除，无法采购`);
      }

      if (!item.skuId) {
        throw new ValidationError(`商品 ${item.productName || ''} 的采购明细必须关联SKU`);
      }

      const [sku] = await db.query('SELECT id, product_id FROM skus WHERE id = ? AND product_id = ?', [item.skuId, item.productId]);
      if (!sku) {
        throw new ValidationError(`SKU ${item.skuId} 不存在或不属于该商品`);
      }
    }

    // 获取供应商名称
    let supplierName = supplier || '';
    if (supplierId && !supplierName) {
      const [supplierInfo] = await db.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
      if (supplierInfo) {
        supplierName = supplierInfo.name;
      }
    }

    // 计算总金额
    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice || 0) * (item.quantity || 0), 0);

    // 新商品入库时状态为 'completed'，否则为 'pending'
    const orderStatus = isNewProduct ? 'completed' : 'pending';

    const orderId = generatePurchaseOrderId();
    let orderNo = '';

    await db.transaction(async (connection) => {
      // 生成订单号
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE DATE(created_at) = CURDATE()`
      );
      const count = (countResult?.[0]?.count || 0) + 1;
      orderNo = `CG${dateStr}${String(count).padStart(4, '0')}`;

      await connection.query(
        `INSERT INTO purchase_orders (id, order_no, supplier, supplier_id, total_amount, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, orderNo, supplierName, supplierId || null, totalAmount, orderStatus, remark || '']
      );

      for (const item of items) {
        const itemId = generatePurchaseItemId();
        const costPrice = item.costPrice || 0;
        const quantity = item.quantity || 0;
        await connection.query(
          `INSERT INTO purchase_order_items (id, order_id, product_id, sku_id, product_name, color, size, quantity, cost_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, orderId, item.productId, item.skuId, item.productName || '', item.color || '', item.size || '', quantity, costPrice, costPrice * quantity]
        );
      }

      // 如果是新商品入库，只更新成本价，不更新库存（库存已在创建商品时写入）
      if (isNewProduct) {
        for (const item of items) {
          if (!item.skuId) continue;

          // 新商品入库：直接设置商品成本价为采购成本价
          if (item.costPrice > 0) {
            await connection.execute(
              'UPDATE products SET cost_price = ? WHERE id = ?',
              [item.costPrice, item.productId]
            );
          }

          // 记录库存流水（记录采购信息，但不改变库存）
          const logId = `inv-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
          await connection.execute(
            `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
             VALUES (?, ?, 'purchase_in', ?, ?, ?, ?)`,
            [logId, item.skuId, item.quantity, orderId, orderNo, '新商品入库成本记录']
          );
        }

        // 记录账目
        const accId = `acc-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
        await connection.execute(
          `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
           VALUES (?, 'expense', 'purchase', ?, ?, ?, ?)`,
          [accId, totalAmount, orderId, orderNo, `新商品入库成本 - ${supplierName || '供应商'}`]
        );
      }
    });

    // 查询完整订单返回
    const [newOrder] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [orderId]);
    const newItems = await db.query('SELECT * FROM purchase_order_items WHERE order_id = ?', [orderId]);

    const data = {
      ...mapPurchaseOrderRow(newOrder),
      items: newItems.map(mapPurchaseItemRow)
    };

    res.status(201).json({
      success: true,
      data,
      message: isNewProduct ? '新商品入库成功' : '采购订单创建成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 确认采购入库
 * 事务内完成：库存增加 + 成本价更新(移动加权平均) + 库存流水 + 账目记录 + 状态更新
 */
const confirmPurchase = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!existing) {
      throw new NotFoundError('采购订单不存在');
    }

    if (existing.status === 'completed') {
      throw new ValidationError('采购订单已入库，不能重复确认');
    }

    // 获取订单明细
    const items = await db.query(
      'SELECT * FROM purchase_order_items WHERE order_id = ?',
      [id]
    );

    await db.transaction(async (connection) => {
      // 更新库存 + 计算成本价
      for (const item of items) {
        if (!item.sku_id) continue;

        // 获取当前SKU信息
        const [skuRows] = await connection.execute(
          'SELECT stock FROM skus WHERE id = ?',
          [item.sku_id]
        );
        const currentSku = skuRows[0];

        if (!currentSku) continue;

        // 更新SKU库存
        await connection.execute(
          'UPDATE skus SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.sku_id]
        );

        // 移动加权平均法计算商品成本价
        if (item.cost_price > 0) {
          // 获取商品当前成本价
          const [productRows] = await connection.execute(
            'SELECT cost_price FROM products WHERE id = ?',
            [item.product_id]
          );
          const currentProduct = productRows[0];
          const oldCostPrice = Number(currentProduct?.cost_price || 0);

          const oldStock = currentSku.stock;
          const newStock = oldStock + item.quantity;
          const newCostPrice = Number(item.cost_price);

          // 移动加权平均：新成本 = (旧库存 * 旧成本 + 入库数量 * 入库成本) / 新库存
          const avgCostPrice = newStock > 0
            ? (oldStock * oldCostPrice + item.quantity * newCostPrice) / newStock
            : newCostPrice;

          // 更新商品成本价
          await connection.execute(
            'UPDATE products SET cost_price = ? WHERE id = ?',
            [Math.round(avgCostPrice * 100) / 100, item.product_id]
          );
        }

        // 记录库存流水
        const logId = `inv-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
        await connection.execute(
          `INSERT INTO inventory_logs (id, sku_id, type, quantity, order_id, order_no, remark)
           VALUES (?, ?, 'purchase_in', ?, ?, ?, '采购入库')`,
          [logId, item.sku_id, item.quantity, id, existing.order_no]
        );
      }

      // 记录账目
      const accId = `acc-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
      await connection.execute(
        `INSERT INTO account_records (id, type, category, amount, order_id, order_no, remark)
         VALUES (?, 'expense', 'purchase', ?, ?, ?, ?)`,
        [accId, existing.total_amount, id, existing.order_no, `采购入库 - ${existing.supplier || '供应商'}`]
      );

      // 更新订单状态
      await connection.execute(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        ['completed', id]
      );
    });

    // 查询更新后的订单
    const [updatedOrder] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    const updatedItems = await db.query('SELECT * FROM purchase_order_items WHERE order_id = ?', [id]);

    const data = {
      ...mapPurchaseOrderRow(updatedOrder),
      items: updatedItems.map(mapPurchaseItemRow)
    };

    res.json({
      success: true,
      data,
      message: '采购入库确认成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新采购订单（仅允许更新待入库状态的订单）
 */
const updatePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, remark } = req.body;

    const [existing] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!existing) {
      throw new NotFoundError('采购订单不存在');
    }

    if (existing.status === 'completed') {
      throw new ValidationError('已入库的采购订单不能修改');
    }

    if (!items || items.length === 0) {
      throw new ValidationError('采购商品不能为空');
    }

    // 验证每个明细的商品和SKU存在性
    for (const item of items) {
      if (!item.productId) {
        throw new ValidationError('采购明细必须关联商品');
      }

      const [product] = await db.query('SELECT id, status FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        throw new ValidationError(`商品 ${item.productId} 不存在`);
      }
      if (product.status === 'deleted') {
        throw new ValidationError(`商品 ${item.productName || item.productId} 已被删除，无法采购`);
      }

      if (!item.skuId) {
        throw new ValidationError(`商品 ${item.productName || ''} 的采购明细必须关联SKU`);
      }

      const [sku] = await db.query('SELECT id, product_id FROM skus WHERE id = ? AND product_id = ?', [item.skuId, item.productId]);
      if (!sku) {
        throw new ValidationError(`SKU ${item.skuId} 不存在或不属于该商品`);
      }
    }

    // 计算总金额
    const totalAmount = items.reduce((sum, item) => sum + (item.costPrice || 0) * (item.quantity || 0), 0);

    await db.transaction(async (connection) => {
      // 更新订单总金额和备注
      await connection.execute(
        'UPDATE purchase_orders SET total_amount = ?, remark = ? WHERE id = ?',
        [totalAmount, remark || existing.remark, id]
      );

      // 删除原有明细
      await connection.execute('DELETE FROM purchase_order_items WHERE order_id = ?', [id]);

      // 插入新明细
      for (const item of items) {
        const itemId = generatePurchaseItemId();
        const costPrice = item.costPrice || 0;
        const quantity = item.quantity || 0;
        await connection.execute(
          `INSERT INTO purchase_order_items (id, order_id, product_id, sku_id, product_name, color, size, quantity, cost_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.productId, item.skuId, item.productName || '', item.color || '', item.size || '', quantity, costPrice, costPrice * quantity]
        );
      }
    });

    // 查询更新后的订单
    const [updatedOrder] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    const updatedItems = await db.query('SELECT * FROM purchase_order_items WHERE order_id = ?', [id]);

    const data = {
      ...mapPurchaseOrderRow(updatedOrder),
      items: updatedItems.map(mapPurchaseItemRow)
    };

    res.json({
      success: true,
      data,
      message: '采购订单更新成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 撤回采购订单（仅限已入库状态）
 * 库存不回滚，但成本回滚，订单删除
 */
const revokePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!existing) {
      throw new NotFoundError('采购订单不存在');
    }

    // 只有已入库的订单可以撤回
    if (existing.status !== 'completed') {
      throw new ValidationError('只有已入库的采购订单才能撤回');
    }

    // 获取采购订单明细
    const [items] = await db.query(
      'SELECT * FROM purchase_order_items WHERE order_id = ?',
      [id]
    );

    await db.transaction(async (connection) => {
      // 回滚成本
      for (const item of items) {
        // 获取该商品的所有采购订单（排除当前要撤回的订单）
        const [otherOrders] = await connection.execute(
          `SELECT poi.quantity, poi.cost_price
           FROM purchase_order_items poi
           JOIN purchase_orders po ON poi.order_id = po.id
           WHERE poi.product_id = ? AND po.status = 'completed' AND po.id != ?`,
          [item.product_id, id]
        );

        if (otherOrders.length === 0) {
          // 没有其他采购订单，成本重置为 0
          await connection.execute(
            'UPDATE products SET cost_price = 0 WHERE id = ?',
            [item.product_id]
          );
        } else {
          // 重新计算移动加权平均成本
          let totalQuantity = 0;
          let totalCost = 0;
          for (const order of otherOrders) {
            totalQuantity += Number(order.quantity);
            totalCost += Number(order.quantity) * Number(order.cost_price);
          }
          const newCostPrice = totalQuantity > 0 ? Math.round((totalCost / totalQuantity) * 100) / 100 : 0;
          
          await connection.execute(
            'UPDATE products SET cost_price = ? WHERE id = ?',
            [newCostPrice, item.product_id]
          );
        }
      }

      // 删除采购订单明细
      await connection.execute('DELETE FROM purchase_order_items WHERE order_id = ?', [id]);
      // 删除采购订单
      await connection.execute('DELETE FROM purchase_orders WHERE id = ?', [id]);
    });

    res.json({
      success: true,
      message: '采购订单已撤回'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除采购订单（仅限待入库状态）
 */
const deletePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!existing) {
      throw new NotFoundError('采购订单不存在');
    }

    // 只有待入库的订单可以删除
    if (existing.status === 'completed') {
      throw new ValidationError('已入库的采购订单请使用撤回功能');
    }

    await db.transaction(async (connection) => {
      // 删除采购订单明细
      await connection.execute('DELETE FROM purchase_order_items WHERE order_id = ?', [id]);
      // 删除采购订单
      await connection.execute('DELETE FROM purchase_orders WHERE id = ?', [id]);
    });

    res.json({
      success: true,
      message: '采购订单删除成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchase,
  deletePurchaseOrder,
  revokePurchaseOrder
};
