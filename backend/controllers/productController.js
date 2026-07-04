/**
 * 商品管理控制器
 */
const db = require('../config/database');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const moment = require('moment');

/**
 * 生成商品ID: prod-xxxxx
 */
function generateProductId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `prod-${timestamp}${random}`;
}

/**
 * 生成SKU ID: sku-xxxxx
 */
function generateSkuId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `sku-${timestamp}${random}`;
}

/**
 * 生成采购订单ID
 */
function generatePurchaseOrderId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `purchase-${timestamp}${random}`;
}

/**
 * 将数据库 snake_case 行转为 camelCase 商品对象（含 skus 数组）
 */
function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    supplierId: row.supplier_id,
    season: row.season,
    status: row.status,
    price: parseFloat(row.price),
    costPrice: parseFloat(row.cost_price),
    image: row.image,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSkuRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    color: row.color,
    size: row.size,
    stock: row.stock,
    price: parseFloat(row.price),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 获取商品列表
 */
const getProducts = async (req, res, next) => {
  try {
    const { keyword, category, status } = req.query;

    // 默认不显示已删除的商品，除非明确指定 status=deleted
    let sql = 'SELECT p.*, s.id AS sku_id, s.product_id, s.color, s.size, s.stock AS sku_stock, s.price AS sku_price, s.created_at AS sku_created_at, s.updated_at AS sku_updated_at FROM products p LEFT JOIN skus s ON p.id = s.product_id WHERE p.status != \'deleted\'';
    const params = [];

    // 如果明确要查询已删除的商品
    if (status === 'deleted') {
      sql = sql.replace('p.status != \'deleted\'', 'p.status = \'deleted\'');
    } else if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.brand LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY p.created_at DESC';

    const rows = await db.query(sql, params);

    // 合并商品与 SKU 数据
    const productMap = {};
    for (const row of rows) {
      if (!productMap[row.id]) {
        productMap[row.id] = {
          ...mapProductRow(row),
          skus: []
        };
      }
      if (row.sku_id) {
        productMap[row.id].skus.push({
          id: row.sku_id,
          productId: row.product_id,
          color: row.color,
          size: row.size,
          stock: row.sku_stock,
          price: parseFloat(row.sku_price),
          createdAt: row.sku_created_at,
          updatedAt: row.sku_updated_at
        });
      }
    }

    const products = Object.values(productMap);

    res.json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个商品详情
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

    if (!product) {
      throw new NotFoundError('商品不存在');
    }

    const skus = await db.query('SELECT * FROM skus WHERE product_id = ?', [id]);

    const result = {
      ...mapProductRow(product),
      skus: skus.map(mapSkuRow)
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
 * 创建商品
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, brand, season, category, supplierId, price, costPrice, skus, image } = req.body;

    // 数据验证
    if (!name) {
      throw new ValidationError('商品名称不能为空');
    }

    if (price === undefined || price === null || price < 0) {
      throw new ValidationError('商品价格不能为空或为负数');
    }

    if (!skus || skus.length === 0) {
      throw new ValidationError('商品SKU不能为空');
    }

    const productId = generateProductId();
    const skuIdMap = []; // 保存每个 SKU 的 ID
    await db.transaction(async (connection) => {
      await connection.query(
        'INSERT INTO products (id, name, brand, category, supplier_id, season, status, price, cost_price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, name, brand || '', category || '', supplierId || null, season || '', 'active', price, costPrice || 0, image || '']
      );

      for (const sku of skus) {
        const skuId = generateSkuId();
        skuIdMap.push(skuId);
        await connection.query(
          'INSERT INTO skus (id, product_id, color, size, stock, price) VALUES (?, ?, ?, ?, ?, ?)',
          [skuId, productId, sku.color, sku.size, sku.stock || 0, sku.price || price]
        );
      }

      // 如果指定了供应商，自动生成采购订单
      if (supplierId) {
        const [supplierRows] = await connection.query(
          'SELECT id, name FROM suppliers WHERE id = ?',
          [supplierId]
        );
        const supplierInfo = supplierRows?.[0];

        if (supplierInfo) {
          const orderId = generatePurchaseOrderId();

          // 在事务内生成订单号
          const date = moment().format('YYYYMMDD');
          const [countResult] = await connection.query(
            `SELECT COUNT(*) as count FROM purchase_orders WHERE DATE(created_at) = CURDATE()`
          );
          const count = (countResult?.[0]?.count || 0) + 1;
          const orderNo = `CG${date}${String(count).padStart(4, '0')}`;

          const totalAmount = skus.reduce((sum, sku) => {
            return sum + (costPrice || 0) * (sku.stock || 0);
          }, 0);

          await connection.query(
            `INSERT INTO purchase_orders (id, order_no, supplier, supplier_id, total_amount, status, remark)
             VALUES (?, ?, ?, ?, ?, 'completed', ?)`,
            [orderId, orderNo, supplierInfo.name, supplierId, totalAmount, '商品入库自动生成']
          );

          for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            const itemId = generatePurchaseOrderId();
            const skuCostPrice = costPrice || 0;
            const skuStock = sku.stock || 0;
            await connection.query(
              `INSERT INTO purchase_order_items (id, order_id, product_id, sku_id, product_name, color, size, quantity, cost_price, total_price)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [itemId, orderId, productId, skuIdMap[i] || null, name, sku.color || '', sku.size || '', skuStock, skuCostPrice, skuCostPrice * skuStock]
            );
          }
        }
      }
    });

    // 查询完整商品对象返回
    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    const newSkus = await db.query('SELECT * FROM skus WHERE product_id = ?', [productId]);

    const data = {
      ...mapProductRow(newProduct),
      skus: newSkus.map(mapSkuRow)
    };

    res.status(201).json({
      success: true,
      data,
      message: '商品创建成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新商品
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, brand, season, category, supplierId, price, costPrice, skus, image, status } = req.body;

    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

    if (!existing) {
      throw new NotFoundError('商品不存在');
    }

    await db.transaction(async (connection) => {
      await connection.query(
        'UPDATE products SET name = ?, brand = ?, category = ?, supplier_id = ?, season = ?, status = ?, price = ?, cost_price = ?, image = ? WHERE id = ?',
        [
          name !== undefined ? name : existing.name,
          brand !== undefined ? brand : existing.brand,
          category !== undefined ? category : existing.category,
          supplierId !== undefined ? supplierId : existing.supplier_id,
          season !== undefined ? season : existing.season,
          status !== undefined ? status : existing.status,
          price !== undefined ? price : existing.price,
          costPrice !== undefined ? costPrice : existing.cost_price,
          image !== undefined ? image : existing.image,
          id
        ]
      );

      if (skus && skus.length > 0) {
        // 删除旧 SKU，插入新 SKU
        await connection.query('DELETE FROM skus WHERE product_id = ?', [id]);
        for (const sku of skus) {
          const skuId = generateSkuId();
          await connection.query(
            'INSERT INTO skus (id, product_id, color, size, stock, price) VALUES (?, ?, ?, ?, ?, ?)',
            [skuId, id, sku.color, sku.size, sku.stock || 0, sku.price || price || existing.price]
          );
        }
      }
    });

    // 查询更新后的完整数据
    const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    const updatedSkus = await db.query('SELECT * FROM skus WHERE product_id = ?', [id]);

    const data = {
      ...mapProductRow(updatedProduct),
      skus: updatedSkus.map(mapSkuRow)
    };

    res.json({
      success: true,
      data,
      message: '商品更新成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除商品（软删除）
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

    if (!existing) {
      throw new NotFoundError('商品不存在');
    }

    await db.query("UPDATE products SET status = 'deleted' WHERE id = ?", [id]);

    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新SKU库存
 */
const updateSkuStock = async (req, res, next) => {
  try {
    const { productId, skuId } = req.params;
    const { quantity, type } = req.body;

    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      throw new NotFoundError('商品不存在');
    }

    const [sku] = await db.query('SELECT * FROM skus WHERE id = ? AND product_id = ?', [skuId, productId]);

    if (!sku) {
      throw new NotFoundError('SKU不存在');
    }

    if (type === 'increase') {
      await db.query('UPDATE skus SET stock = stock + ? WHERE id = ?', [quantity, skuId]);
    } else if (type === 'decrease') {
      if (sku.stock < quantity) {
        throw new ValidationError('库存不足');
      }
      await db.query('UPDATE skus SET stock = stock - ? WHERE id = ?', [quantity, skuId]);
    } else {
      await db.query('UPDATE skus SET stock = ? WHERE id = ?', [quantity, skuId]);
    }

    const [updatedSku] = await db.query('SELECT * FROM skus WHERE id = ?', [skuId]);

    res.json({
      success: true,
      data: mapSkuRow(updatedSku),
      message: '库存更新成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateSkuStock
};
