/**
 * 客户管理控制器
 */
const db = require('../config/database');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * 生成客户ID: cust-xxxxx
 */
function generateCustomerId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `cust-${timestamp}${random}`;
}

/**
 * 将数据库 snake_case 行转为 camelCase 客户对象
 */
function mapCustomerRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    remark: row.remark,
    totalSpent: parseFloat(row.total_spent),
    orderCount: row.order_count,
    totalDebt: parseFloat(row.total_debt),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 获取客户列表
 */
const getCustomers = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await db.query(sql, params);
    const customers = rows.map(mapCustomerRow);

    res.json({
      success: true,
      data: customers,
      total: customers.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个客户详情
 */
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [customer] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);

    if (!customer) {
      throw new NotFoundError('客户不存在');
    }

    res.json({
      success: true,
      data: mapCustomerRow(customer)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建客户
 */
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, remark } = req.body;

    // 数据验证
    if (!name) {
      throw new ValidationError('客户姓名不能为空');
    }

    // 检查手机号是否已存在
    if (phone) {
      const [existing] = await db.query('SELECT * FROM customers WHERE phone = ?', [phone]);
      if (existing) {
        throw new ValidationError('该手机号已存在');
      }
    }

    const customerId = generateCustomerId();
    await db.query(
      'INSERT INTO customers (id, name, phone, remark, total_spent, order_count, total_debt) VALUES (?, ?, ?, ?, 0, 0, 0)',
      [customerId, name, phone || '', remark || '']
    );

    const [newCustomer] = await db.query('SELECT * FROM customers WHERE id = ?', [customerId]);

    res.status(201).json({
      success: true,
      data: mapCustomerRow(newCustomer),
      message: '客户创建成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新客户
 */
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, remark } = req.body;

    const [existing] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);

    if (!existing) {
      throw new NotFoundError('客户不存在');
    }

    // 如果更新手机号，检查是否已存在
    if (phone && phone !== existing.phone) {
      const [duplicate] = await db.query('SELECT * FROM customers WHERE phone = ? AND id != ?', [phone, id]);
      if (duplicate) {
        throw new ValidationError('该手机号已存在');
      }
    }

    await db.query(
      'UPDATE customers SET name = ?, phone = ?, remark = ? WHERE id = ?',
      [
        name !== undefined ? name : existing.name,
        phone !== undefined ? phone : existing.phone,
        remark !== undefined ? remark : existing.remark,
        id
      ]
    );

    const [updatedCustomer] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);

    res.json({
      success: true,
      data: mapCustomerRow(updatedCustomer),
      message: '客户更新成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除客户
 */
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);

    if (!existing) {
      throw new NotFoundError('客户不存在');
    }

    await db.query('DELETE FROM customers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '客户删除成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
