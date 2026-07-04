/**
 * 供货商管理控制器
 */
const db = require('../config/database');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * snake_case → camelCase 映射
 */
function mapSupplierRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 生成供货商ID
 */
const generateSupplierId = () => {
  return 'sup-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

/**
 * 获取供货商列表
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    let sql = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR contact LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await db.query(sql, params);
    const suppliers = rows.map(mapSupplierRow);

    res.json({
      success: true,
      data: suppliers,
      total: suppliers.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个供货商详情（含采购订单列表）
 */
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rows = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    const supplier = rows[0];

    if (!supplier) {
      throw new NotFoundError('供货商不存在');
    }

    // 获取该供应商的采购订单列表（通过 supplier_id 关联）
    const orders = await db.query(
      'SELECT * FROM purchase_orders WHERE supplier_id = ? ORDER BY created_at DESC',
      [id]
    );

    // 获取每个订单的明细
    const ordersWithItems = [];
    for (const order of orders) {
      const items = await db.query(
        'SELECT * FROM purchase_order_items WHERE order_id = ?',
        [order.id]
      );
      ordersWithItems.push({
        id: order.id,
        orderNo: order.order_no,
        supplier: order.supplier,
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        remark: order.remark,
        createdAt: order.created_at,
        items: items.map(item => ({
          id: item.id,
          productName: item.product_name,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          costPrice: parseFloat(item.cost_price),
          totalPrice: parseFloat(item.total_price)
        }))
      });
    }

    // 统计信息
    const totalOrders = ordersWithItems.length;
    const totalAmount = ordersWithItems.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      success: true,
      data: {
        ...mapSupplierRow(supplier),
        totalOrders,
        totalAmount,
        orders: ordersWithItems
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建供货商
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, phone, remark } = req.body;

    if (!name) {
      throw new ValidationError('供货商名称不能为空');
    }

    const id = generateSupplierId();

    await db.query(
      'INSERT INTO suppliers (id, name, phone, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, phone || '', remark || '', new Date(), new Date()]
    );

    const rows = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    const newSupplier = rows[0] || {};

    res.status(201).json({
      success: true,
      data: mapSupplierRow(newSupplier),
      message: '供货商创建成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新供货商
 */
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, remark } = req.body;

    const rows = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    const existing = rows[0];

    if (!existing) {
      throw new NotFoundError('供货商不存在');
    }

    await db.query(
      'UPDATE suppliers SET name = ?, phone = ?, remark = ?, updated_at = ? WHERE id = ?',
      [
        name !== undefined ? name : existing.name,
        phone !== undefined ? phone : existing.phone,
        remark !== undefined ? remark : existing.remark,
        new Date(),
        id
      ]
    );

    // 如果供应商名称发生变更，同步更新关联采购订单的 supplier 字段
    if (name !== undefined && name !== existing.name) {
      await db.query(
        'UPDATE purchase_orders SET supplier = ? WHERE supplier_id = ?',
        [name, id]
      );
    }

    const updatedRows = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    const updatedSupplier = updatedRows[0] || {};

    res.json({
      success: true,
      data: mapSupplierRow(updatedSupplier),
      message: '供货商更新成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除供货商
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rows = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    const existing = rows[0];

    if (!existing) {
      throw new NotFoundError('供货商不存在');
    }

    await db.query('DELETE FROM suppliers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '供货商删除成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
