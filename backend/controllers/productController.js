/**
 * 商品管理控制器
 */
const db = require('../config/database');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const fs = require('fs');
const path = require('path');

/**
 * 计算商品的平均成本
 * 平均成本 = 所有采购订单总成本之和 ÷ 所有采购订单总数量之和
 * @param {string} productId - 商品ID
 * @returns {number} 平均成本，保留两位小数
 */
async function calculateAvgCost(productId) {
  try {
    // 从采购订单明细中获取该商品的所有采购记录
    const result = await db.query(`
      SELECT 
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_cost
      FROM purchase_order_items oi
      JOIN purchase_orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND o.status = 'completed'
    `, [productId]);


    const row = result[0];
    const totalQuantity = row?.total_quantity || 0;
    const totalCost = row?.total_cost || 0;


    if (totalQuantity === 0) {
      return 0;
    }

    // 计算平均成本，保留两位小数
    const avgCost = Math.round((totalCost / totalQuantity) * 100) / 100;
    return avgCost;
  } catch (error) {
    console.error('[计算平均成本失败]', error);
    return 0;
  }
}

/**
 * 批量计算多个商品的平均成本
 * @param {string[]} productIds - 商品ID数组
 * @returns {Object} 商品ID -> 平均成本的映射
 */
async function batchCalculateAvgCost(productIds) {
  if (!productIds || productIds.length === 0) {
    return {};
  }

  try {
    // 使用 OR 条件代替 IN
    const placeholders = productIds.map(() => 'oi.product_id = ?').join(' OR ');
    const result = await db.query(`
      SELECT 
        oi.product_id,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_cost
      FROM purchase_order_items oi
      JOIN purchase_orders o ON oi.order_id = o.id
      WHERE (${placeholders}) AND o.status = 'completed'
      GROUP BY oi.product_id
    `, productIds);


    const avgCostMap = {};
    
    // 初始化所有商品的平均成本为0
    for (const id of productIds) {
      avgCostMap[id] = 0;
    }

    // 计算每个商品的平均成本
    for (const row of result) {
      if (row.total_quantity > 0) {
        avgCostMap[row.product_id] = Math.round((row.total_cost / row.total_quantity) * 100) / 100;
      }
    }

    return avgCostMap;
  } catch (error) {
    console.error('[批量计算平均成本失败]', error);
    const avgCostMap = {};
    for (const id of productIds) {
      avgCostMap[id] = 0;
    }
    return avgCostMap;
  }
}

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
 * 将数据库 snake_case 行转为 camelCase 商品对象（含 skus 数组）
 */
function mapProductRow(row) {
  // 兼容旧图片路径：/uploads/xxx -> /api/uploads/xxx
  let imageUrl = row.image || '';
  if (imageUrl && imageUrl.startsWith('/uploads/') && !imageUrl.startsWith('/api/uploads/')) {
    imageUrl = '/api' + imageUrl;
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplierId: row.supplier_id,
    status: row.status,
    price: parseFloat(row.price),
    costPrice: parseFloat(row.cost_price),
    image: imageUrl,
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

    // 硬删除后不再需要过滤已删除商品
    let sql = 'SELECT p.*, s.id AS sku_id, s.product_id, s.color, s.size, s.stock AS sku_stock, s.price AS sku_price, s.created_at AS sku_created_at, s.updated_at AS sku_updated_at FROM products p LEFT JOIN skus s ON p.id = s.product_id WHERE 1=1';
    const params = [];

    if (status) {
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

    // 批量计算所有商品的平均成本
    const productIds = products.map(p => p.id);
    const avgCostMap = await batchCalculateAvgCost(productIds);

    // 将平均成本添加到每个商品
    for (const product of products) {
      product.avgCost = avgCostMap[product.id] || 0;
    }

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

    // 计算平均成本
    const avgCost = await calculateAvgCost(id);

    const result = {
      ...mapProductRow(product),
      avgCost, // 平均成本（从采购订单计算）
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
    const { name, category, supplierId, price, costPrice, skus, image } = req.body;

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
    await db.transaction(async (connection) => {
      await connection.query(
        'INSERT INTO products (id, name, category, supplier_id, status, price, cost_price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, name, category || '', supplierId || null, 'active', price, costPrice || 0, image || '']
      );

      for (const sku of skus) {
        const skuId = generateSkuId();
        await connection.query(
          'INSERT INTO skus (id, product_id, color, size, stock, price) VALUES (?, ?, ?, ?, ?, ?)',
          [skuId, productId, sku.color, sku.size, sku.stock || 0, price]
        );
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
    const { name, category, supplierId, price, costPrice, skus, image, status } = req.body;

    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

    if (!existing) {
      throw new NotFoundError('商品不存在');
    }

    await db.transaction(async (connection) => {
      await connection.query(
        'UPDATE products SET name = ?, category = ?, supplier_id = ?, status = ?, price = ?, cost_price = ?, image = ? WHERE id = ?',
        [
          name !== undefined ? name : existing.name,
          category !== undefined ? category : existing.category,
          supplierId !== undefined ? supplierId : existing.supplier_id,
          status !== undefined ? status : existing.status,
          price !== undefined ? price : existing.price,
          costPrice !== undefined ? costPrice : existing.cost_price,
          image !== undefined ? image : existing.image,
          id
        ]
      );

      if (skus && skus.length > 0) {
        // 获取当前商品的 SKU ID 列表
        const [currentSkus] = await connection.query('SELECT id FROM skus WHERE product_id = ?', [id]);
        const currentSkuIds = currentSkus.map(s => s.id);
        const newSkuIds = skus.filter(s => s.id).map(s => s.id);

        // 删除前端已移除的 SKU
        const idsToDelete = currentSkuIds.filter(sid => !newSkuIds.includes(sid));
        if (idsToDelete.length > 0) {
          const placeholders = idsToDelete.map(() => '?').join(',');
          await connection.query(`DELETE FROM skus WHERE id IN (${placeholders})`, idsToDelete);
        }

        // 获取商品售价（用于SKU）
        const productPrice = price !== undefined ? price : existing.price;

        // 更新或插入 SKU
        for (const sku of skus) {
          if (sku.id && currentSkuIds.includes(sku.id)) {
            // 更新已有 SKU（保留 ID，保持关联数据完整性）
            await connection.query(
              'UPDATE skus SET color = ?, size = ?, stock = ?, price = ? WHERE id = ?',
              [sku.color, sku.size, sku.stock || 0, productPrice, sku.id]
            );
          } else {
            // 新增 SKU
            const skuId = sku.id || generateSkuId();
            await connection.query(
              'INSERT INTO skus (id, product_id, color, size, stock, price) VALUES (?, ?, ?, ?, ?, ?)',
              [skuId, id, sku.color, sku.size, sku.stock || 0, productPrice]
            );
          }
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
 * 删除商品（硬删除），同时删除商品图片和关联的SKU
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

    if (!existing) {
      throw new NotFoundError('商品不存在');
    }

    // 删除商品图片文件
    if (existing.image) {
      try {
        // 图片路径格式: /api/uploads/products/xxx.jpg 或 /uploads/products/xxx.jpg
        let imagePath = existing.image;
        // 去掉 /api 前缀（如果有）
        if (imagePath.startsWith('/api/')) {
          imagePath = imagePath.replace('/api', '');
        }
        // 构建实际文件路径
        const fullPath = path.join(__dirname, '..', '..', imagePath);
        
        // 检查文件是否存在并删除
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`[商品删除] 已删除图片: ${fullPath}`);
        }
      } catch (err) {
        // 图片删除失败不影响商品删除
        console.error('[商品删除] 删除图片失败:', err.message);
      }
    }

    // 先删除关联的 SKU 记录
    await db.query("DELETE FROM skus WHERE product_id = ?", [id]);
    
    // 然后硬删除商品记录
    await db.query("DELETE FROM products WHERE id = ?", [id]);

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
