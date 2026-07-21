/**
 * 数据库初始化脚本
 * 
 * 功能说明：
 * 1. 创建数据库及全部表结构（含字段定义、数据类型、约束条件、索引）
 * 2. 支持事务处理，保证初始化的原子性
 * 3. 可重复执行，自动检测已存在的表和数据，避免重复创建或数据冲突
 * 4. 完善的错误处理和日志输出
 * 
 * 用法：
 *   npm run db:init                  -- 增量更新
 *   npm run db:init -- --reset       -- 删除并重建数据库
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// ========== 数据库连接配置 ==========
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '338296',
  database: process.env.DB_NAME || 'inventory_system'
};

// ========== 日志工具 ==========
const log = {
  info: (msg) => console.log(`[INFO]  ${msg}`),
  warn: (msg) => console.log(`[WARN]  ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[OK]    ${msg}`),
  step: (step, msg) => console.log(`[STEP${step}] ${msg}`)
};

// ========== 表结构定义 ==========

/**
 * 数据库全部表定义（按依赖顺序排列）
 * 每个表包含：建表SQL、索引SQL、注释
 */
const TABLE_DEFINITIONS = [
  {
    name: 'users',
    comment: '用户表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
    ]
  },
  {
    name: 'products',
    comment: '商品表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        brand VARCHAR(100),
        season VARCHAR(50),
        category VARCHAR(100),
        supplier_id VARCHAR(50),
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        image VARCHAR(500),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id)'
    ]
  },
  {
    name: 'skus',
    comment: 'SKU表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS skus (
        id VARCHAR(50) PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        color VARCHAR(50) NOT NULL,
        size VARCHAR(50) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY uk_product_color_size (product_id, color, size)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_skus_product_id ON skus(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_skus_color_size ON skus(color, size)'
    ]
  },
  {
    name: 'customers',
    comment: '客户表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        address VARCHAR(500),
        remark VARCHAR(500),
        total_spent DECIMAL(10, 2) DEFAULT 0,
        order_count INT DEFAULT 0,
        total_debt DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)'
    ]
  },
  {
    name: 'sales_orders',
    comment: '销售订单表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS sales_orders (
        id VARCHAR(50) PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE,
        customer_id VARCHAR(50),
        customer_name VARCHAR(100) NOT NULL DEFAULT '散客',
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        debt_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        discount DECIMAL(10, 2) DEFAULT 0,
        payment_method VARCHAR(20) DEFAULT 'cash',
        status VARCHAR(20) DEFAULT 'partial',
        remark VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_order_no ON sales_orders(order_no)',
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON sales_orders(created_at)'
    ]
  },
  {
    name: 'sales_order_items',
    comment: '销售订单明细表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        sku_id VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        color VARCHAR(50) NOT NULL,
        size VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cost_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON sales_order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_sales_order_items_sku_id ON sales_order_items(sku_id)'
    ]
  },
  {
    name: 'return_orders',
    comment: '退货订单表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS return_orders (
        id VARCHAR(50) PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE,
        customer_id VARCHAR(50),
        customer_name VARCHAR(100) NOT NULL DEFAULT '散客',
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) DEFAULT 'returned',
        remark VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_return_orders_order_no ON return_orders(order_no)',
      'CREATE INDEX IF NOT EXISTS idx_return_orders_customer_id ON return_orders(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_return_orders_created_at ON return_orders(created_at)'
    ]
  },
  {
    name: 'return_order_items',
    comment: '退货订单明细表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS return_order_items (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        sku_id VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        color VARCHAR(50) NOT NULL,
        size VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES return_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_return_order_items_order_id ON return_order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_return_order_items_sku_id ON return_order_items(sku_id)'
    ]
  },
  {
    name: 'suppliers',
    comment: '供货商表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        remark VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_suppliers_name (name),
        INDEX idx_suppliers_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: []
  },
  {
    name: 'purchase_orders',
    comment: '采购订单表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE,
        supplier VARCHAR(100),
        supplier_id VARCHAR(50),
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        remark VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_no ON purchase_orders(order_no)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id)'
    ]
  },
  {
    name: 'purchase_order_items',
    comment: '采购订单明细表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50),
        sku_id VARCHAR(50),
        product_name VARCHAR(200) NOT NULL,
        color VARCHAR(50),
        size VARCHAR(50),
        quantity INT NOT NULL,
        cost_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON purchase_order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_order_items_sku_id ON purchase_order_items(sku_id)'
    ]
  },
  {
    name: 'account_records',
    comment: '账目记录表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS account_records (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        order_id VARCHAR(50),
        order_no VARCHAR(50),
        remark VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_account_records_type ON account_records(type)',
      'CREATE INDEX IF NOT EXISTS idx_account_records_category ON account_records(category)',
      'CREATE INDEX IF NOT EXISTS idx_account_records_created_at ON account_records(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_account_records_order_id ON account_records(order_id)'
    ]
  },
  {
    name: 'inventory_logs',
    comment: '库存流水表',
    createSQL: `
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id VARCHAR(50) PRIMARY KEY,
        sku_id VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        order_id VARCHAR(50),
        order_no VARCHAR(50),
        remark VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sku_id) REFERENCES skus(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_inventory_logs_sku_id ON inventory_logs(sku_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON inventory_logs(type)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_logs_order_id ON inventory_logs(order_id)'
    ]
  }
];

// ========== 基础配置数据 ==========

const BASE_DATA = {
  users: [
    { id: 'user-001', username: 'admin', password: '$2a$10$0rBgJ.yzspntL97Jxx0EAe9lVma0c8OpDlTAzia5lflYEUYokfCle', name: '店主', role: 'admin' }
  ]
};

// ========== 核心初始化函数 ==========

/**
 * 创建数据库（如不存在）
 */
async function createDatabase() {
  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    multipleStatements: true
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    log.success(`数据库 "${DB_CONFIG.database}" 已就绪`);
  } finally {
    await connection.end();
  }
}

/**
 * 删除并重建数据库
 */
async function resetDatabase() {
  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    multipleStatements: true
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_CONFIG.database}\``);
    log.warn(`数据库 "${DB_CONFIG.database}" 已删除`);
    await connection.query(
      `CREATE DATABASE \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    log.success(`数据库 "${DB_CONFIG.database}" 已重建`);
  } finally {
    await connection.end();
  }
}

/**
 * 检查数据库是否存在
 */
async function checkDatabaseExists() {
  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password
  });

  try {
    const [rows] = await connection.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [DB_CONFIG.database]
    );
    return rows.length > 0;
  } finally {
    await connection.end();
  }
}

/**
 * 获取数据库连接（指定数据库）
 */
async function getDbConnection() {
  return mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
    multipleStatements: true
  });
}

/**
 * 创建全部表结构（按依赖顺序）
 * 使用事务保证原子性
 */
async function createTables(connection) {
  log.step('1', '创建数据库表结构...');

  for (const table of TABLE_DEFINITIONS) {
    try {
      await connection.query(table.createSQL);
      log.info(`  表 ${table.name} (${table.comment}) - 已创建`);

      // 创建索引
      for (const indexSQL of table.indexes) {
        try {
          await connection.query(indexSQL);
        } catch (indexErr) {
          // 索引已存在时忽略错误
          if (!indexErr.message.includes('Duplicate key name') && !indexErr.message.includes('already exists')) {
            log.warn(`  索引创建警告: ${indexErr.message}`);
          }
        }
      }
    } catch (err) {
      log.error(`  表 ${table.name} 创建失败: ${err.message}`);
      throw err;
    }
  }

  log.success(`全部 ${TABLE_DEFINITIONS.length} 张表结构创建完成`);
}

/**
 * 检查表中是否已有数据
 */
async function getTableRowCount(connection, tableName) {
  const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  return rows[0].count;
}

/**
 * 插入基础配置数据（使用 ON DUPLICATE KEY UPDATE 防冲突）
 */
async function insertBaseData(connection) {
  log.step('2', '插入基础配置数据...');

  try {
    // 插入默认用户
    for (const user of BASE_DATA.users) {
      await connection.execute(
        `INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), role = VALUES(role)`,
        [user.id, user.username, user.password, user.name, user.role]
      );
    }
    log.info(`  默认用户: ${BASE_DATA.users.length} 条`);
    log.success('基础配置数据插入完成');
  } catch (err) {
    log.error(`基础数据插入失败: ${err.message}`);
    throw err;
  }
}


/**
 * 检查并更新表结构（兼容已有数据库的升级）
 * 检测 sales_orders.customer_id 是否允许 NULL（散客开单需要）
 */
async function checkAndMigrateSchema(connection) {
  log.step('0', '检查表结构兼容性...');

  try {
    // 检查 sales_orders 表 customer_id 字段是否允许 NULL
    const [columns] = await connection.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales_orders' AND COLUMN_NAME = 'customer_id'`,
      [DB_CONFIG.database]
    );

    if (columns.length > 0 && columns[0].IS_NULLABLE === 'NO') {
      log.info('  检测到 sales_orders.customer_id 为 NOT NULL，正在迁移为允许 NULL（支持散客开单）...');
      await connection.query(`
        ALTER TABLE sales_order_items DROP FOREIGN KEY sales_order_items_ibfk_1,
        DROP FOREIGN KEY sales_order_items_ibfk_2
      `).catch(() => {}); // 忽略外键名不匹配的错误

      await connection.query(`
        ALTER TABLE sales_orders 
        MODIFY COLUMN customer_id VARCHAR(50) NULL,
        MODIFY COLUMN customer_name VARCHAR(100) NOT NULL DEFAULT '散客'
      `);

      // 重新添加外键
      try {
        await connection.query(`
          ALTER TABLE sales_orders 
          ADD CONSTRAINT fk_sales_orders_customer_id 
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        `);
      } catch (fkErr) {
        if (!fkErr.message.includes('Duplicate key') && !fkErr.message.includes('already exists')) {
          log.warn(`  外键重建警告: ${fkErr.message}`);
        }
      }

      log.success('  sales_orders 表结构迁移完成');
    }

    // 检查 customers 表是否缺少 total_debt 字段
    const [customerColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'total_debt'`,
      [DB_CONFIG.database]
    );

    if (customerColumns.length === 0) {
      log.info('  检测到 customers 表缺少 total_debt 字段，正在添加...');
      await connection.query(`
        ALTER TABLE customers 
        ADD COLUMN total_debt DECIMAL(10, 2) DEFAULT 0 AFTER order_count
      `);
      log.success('  customers 表 total_debt 字段添加完成');
    }

    // 检查 customers 表 phone 字段是否允许 NULL（修复唯一约束冲突）
    const [phoneColumns] = await connection.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'phone'`,
      [DB_CONFIG.database]
    );

    if (phoneColumns.length > 0 && phoneColumns[0].IS_NULLABLE === 'NO') {
      log.info('  检测到 customers.phone 为 NOT NULL，正在迁移为允许 NULL...');
      // 先删除旧的唯一约束
      try {
        await connection.query('ALTER TABLE customers DROP INDEX phone');
      } catch (dropErr) {
        // 约束可能不存在
      }
      // 修改字段允许 NULL
      await connection.query(`
        ALTER TABLE customers 
        MODIFY COLUMN phone VARCHAR(20) DEFAULT NULL
      `);
      // 将空字符串转为 NULL
      await connection.query("UPDATE customers SET phone = NULL WHERE phone = ''");
      log.success('  customers 表 phone 字段迁移完成');
    }

    // 删除可能存在的唯一约束（电话允许重复）
    try {
      const [uniqueKeys] = await connection.query(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND CONSTRAINT_TYPE = 'UNIQUE'`,
        [DB_CONFIG.database]
      );
      for (const key of uniqueKeys) {
        if (key.CONSTRAINT_NAME.includes('phone')) {
          await connection.query(`ALTER TABLE customers DROP INDEX ${key.CONSTRAINT_NAME}`);
          log.success(`  已删除 customers.phone 唯一约束 (${key.CONSTRAINT_NAME})`);
        }
      }
    } catch (err) {
      // 忽略错误
    }

    // 检查 return_orders 表 customer_id 字段是否允许 NULL
    const [returnColumns] = await connection.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_orders' AND COLUMN_NAME = 'customer_id'`,
      [DB_CONFIG.database]
    );

    if (returnColumns.length > 0 && returnColumns[0].IS_NULLABLE === 'NO') {
      log.info('  检测到 return_orders.customer_id 为 NOT NULL，正在迁移为允许 NULL...');
      await connection.query(`
        ALTER TABLE return_orders 
        MODIFY COLUMN customer_id VARCHAR(50) NULL,
        MODIFY COLUMN customer_name VARCHAR(100) NOT NULL DEFAULT '散客'
      `);

      try {
        await connection.query(`
          ALTER TABLE return_orders 
          ADD CONSTRAINT fk_return_orders_customer_id 
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        `);
      } catch (fkErr) {
        if (!fkErr.message.includes('Duplicate key') && !fkErr.message.includes('already exists')) {
          log.warn(`  外键重建警告: ${fkErr.message}`);
        }
      }

      log.success('  return_orders 表结构迁移完成');
    }

    // 检查 products 表是否缺少 supplier_id 字段
    const [productColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'supplier_id'`,
      [DB_CONFIG.database]
    );

    if (productColumns.length === 0) {
      log.info('  检测到 products 表缺少 supplier_id 字段，正在添加...');
      await connection.query(`
        ALTER TABLE products 
        ADD COLUMN supplier_id VARCHAR(50) AFTER category
      `);
      log.success('  products 表 supplier_id 字段添加完成');
    }

    // 检查 purchase_orders 表是否缺少 supplier_id 字段
    const [purchaseOrderColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'supplier_id'`,
      [DB_CONFIG.database]
    );

    if (purchaseOrderColumns.length === 0) {
      log.info('  检测到 purchase_orders 表缺少 supplier_id 字段，正在添加...');
      await connection.query(`
        ALTER TABLE purchase_orders 
        ADD COLUMN supplier_id VARCHAR(50) AFTER supplier
      `);
      log.success('  purchase_orders 表 supplier_id 字段添加完成');

      // 为已有采购订单根据 supplier 名称回填 supplier_id
      log.info('  正在为已有采购订单回填 supplier_id...');
      const [suppliers] = await connection.query('SELECT id, name FROM suppliers');
      for (const supplier of suppliers) {
        await connection.query(
          'UPDATE purchase_orders SET supplier_id = ? WHERE supplier = ? AND supplier_id IS NULL',
          [supplier.id, supplier.name]
        );
      }
      log.success('  已有采购订单 supplier_id 回填完成');
    }

    // 删除订单明细表的外键约束（支持商品硬删除）
    log.info('  正在检查并删除订单明细表的外键约束...');
    
    // 删除 sales_order_items 的 sku_id 外键
    try {
      const [salesFks] = await connection.query(`
        SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales_order_items' 
        AND COLUMN_NAME = 'sku_id' AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [DB_CONFIG.database]);
      
      for (const fk of salesFks) {
        await connection.query(`ALTER TABLE sales_order_items DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        log.success(`  已删除 sales_order_items.${fk.CONSTRAINT_NAME} 外键`);
      }
    } catch (err) {
      log.warn(`  sales_order_items 外键检查跳过: ${err.message}`);
    }
    
    // 修改 sales_order_items.sku_id 允许 NULL
    await connection.query(`ALTER TABLE sales_order_items MODIFY COLUMN sku_id VARCHAR(50) NULL`);
    
    // 删除 return_order_items 的 sku_id 外键
    try {
      const [returnFks] = await connection.query(`
        SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'return_order_items' 
        AND COLUMN_NAME = 'sku_id' AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [DB_CONFIG.database]);
      
      for (const fk of returnFks) {
        await connection.query(`ALTER TABLE return_order_items DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        log.success(`  已删除 return_order_items.${fk.CONSTRAINT_NAME} 外键`);
      }
    } catch (err) {
      log.warn(`  return_order_items 外键检查跳过: ${err.message}`);
    }
    
    // 修改 return_order_items.sku_id 允许 NULL
    await connection.query(`ALTER TABLE return_order_items MODIFY COLUMN sku_id VARCHAR(50) NULL`);
    
    // 删除 purchase_order_items 的外键
    try {
      const [purchaseFks] = await connection.query(`
        SELECT CONSTRAINT_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchase_order_items' 
        AND COLUMN_NAME IN ('product_id', 'sku_id') AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [DB_CONFIG.database]);
      
      for (const fk of purchaseFks) {
        await connection.query(`ALTER TABLE purchase_order_items DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        log.success(`  已删除 purchase_order_items.${fk.CONSTRAINT_NAME} 外键`);
      }
    } catch (err) {
      log.warn(`  purchase_order_items 外键检查跳过: ${err.message}`);
    }
    
    // 修改 purchase_order_items.product_id 和 sku_id 允许 NULL
    await connection.query(`ALTER TABLE purchase_order_items MODIFY COLUMN product_id VARCHAR(50) NULL, MODIFY COLUMN sku_id VARCHAR(50) NULL`);
    
    log.success('  订单明细表外键约束处理完成');

    log.success('表结构兼容性检查完成');
  } catch (err) {
    log.warn(`表结构迁移检查跳过: ${err.message}`);
  }
}

/**
 * 打印数据库初始化摘要
 */
async function printSummary(connection) {
  log.step('4', '数据库初始化摘要');
  log.info('  ┌──────────────────────┬───────┐');
  log.info('  │ 表名                  │ 行数   │');
  log.info('  ├──────────────────────┼───────┤');

  for (const table of TABLE_DEFINITIONS) {
    try {
      const count = await getTableRowCount(connection, table.name);
      const namePad = table.name.padEnd(20);
      const countPad = String(count).padStart(5);
      log.info(`  │ ${namePad} │ ${countPad} │`);
    } catch {
      const namePad = table.name.padEnd(20);
      log.info(`  │ ${namePad} │   N/A │`);
    }
  }

  log.info('  └──────────────────────┴───────┘');
}

/**
 * 完整初始化流程
 */
async function initDatabase(options = {}) {
  const { reset = false } = options;
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    服装进销存管理系统 - 数据库初始化       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  log.info(`数据库: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  log.info(`模式: ${reset ? '重置重建' : '增量更新'}`);
  console.log('');

  // Step 0: 重置或创建数据库
  if (reset) {
    await resetDatabase();
  } else {
    const exists = await checkDatabaseExists();
    if (exists) {
      log.info(`数据库 "${DB_CONFIG.database}" 已存在，将进行增量更新`);
    } else {
      await createDatabase();
    }
  }

  // 获取数据库连接
  const connection = await getDbConnection();

  try {
    // 使用事务包裹全部表操作
    await connection.beginTransaction();

    try {
      // Step 1: 创建表结构
      await createTables(connection);

      // Step 1.5: 检查并迁移表结构（兼容已有数据库升级）
      await checkAndMigrateSchema(connection);

      // Step 2: 插入基础配置数据
      await insertBaseData(connection);

      // 提交事务
      await connection.commit();
      log.success('事务已提交');

    } catch (err) {
      // 回滚事务
      await connection.rollback();
      log.error('事务已回滚');
      throw err;
    }

    // Step 4: 打印摘要
    await printSummary(connection);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    log.success(`数据库初始化完成！耗时 ${elapsed}s`);
    console.log('');

  } finally {
    await connection.end();
  }
}

// ========== 主函数 ==========

async function main() {
  try {
    const args = process.argv.slice(2);
    const reset = args.includes('--reset');

    await initDatabase({ reset });
    process.exit(0);
  } catch (error) {
    console.log('');
    log.error(`初始化失败: ${error.message}`);
    log.error(`堆栈: ${error.stack}`);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  initDatabase,
  checkDatabaseExists,
  resetDatabase,
  createDatabase,
  TABLE_DEFINITIONS,
  BASE_DATA
};
