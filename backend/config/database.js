/**
 * MySQL数据库连接模块
 */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

/**
 * 创建数据库连接池
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '338296',
  database: process.env.DB_NAME || 'inventory_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * 测试数据库连接
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 执行查询
 */
const query = async (sql, params) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error.message);
    throw error;
  }
};

/**
 * 执行事务
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    connection.release();
    return result;
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

/**
 * 关闭连接池
 */
const closePool = async () => {
  try {
    await pool.end();
  } catch (error) {
    // 静默处理
  }
};

module.exports = {
  pool,
  testConnection,
  query,
  transaction,
  closePool
};