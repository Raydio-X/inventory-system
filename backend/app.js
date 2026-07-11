const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

// 导入数据库配置
const db = require('./config/database');

// 导入路由
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const billingRoutes = require('./routes/billing');
const debtRoutes = require('./routes/debt');
const accountRoutes = require('./routes/accounts');
const inventoryRoutes = require('./routes/inventory');
const returnRoutes = require('./routes/returns');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const supplierRoutes = require('./routes/suppliers');
const purchaseRoutes = require('./routes/purchases');

// 导入中间件
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// 创建Express应用
const app = express();

// 基础中间件
app.use(helmet()); // 安全头设置
app.use(cors()); // 跨域支持
// morgan('dev') 已禁用，不再输出请求日志
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码解析

// 静态文件服务 - 提供上传图片的访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// 自定义中间件
app.use(requestLogger);

// API路由
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/debt', debtRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);

// 健康检查接口
app.get('/api/health', async (req, res) => {
  const dbConnected = await db.testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// API根路径
app.get('/api', (req, res) => {
  res.json({
    message: '服装进销存管理系统API',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      customers: '/api/customers',
      billing: '/api/billing',
      debt: '/api/debt',
      accounts: '/api/accounts',
      inventory: '/api/inventory',
      returns: '/api/returns',
      auth: '/api/auth',
      upload: '/api/upload'
    }
  });
});

// 404处理
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// 错误处理中间件
app.use(errorHandler);

// 端口配置
const PORT = process.env.PORT || 3000;

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await db.testConnection();

    // 启动服务器
    app.listen(PORT, () => {});
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;