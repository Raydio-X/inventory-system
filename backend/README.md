# 服装进销存管理系统 - 后端API

## 项目简介

这是一个基于Node.js和Express框架开发的服装进销存管理系统后端API，提供完整的商品管理、客户管理、销售开单、退货管理、欠款管理、账目管理、库存管理和进货管理功能。

**数据库支持：** MySQL数据库存储（推荐）或内存存储（演示模式）

## 技术栈

- **Node.js** - 运行环境
- **Express** - Web框架
- **MySQL** - 数据库（mysql2驱动）
- **express-validator** - 数据验证
- **jsonwebtoken** - JWT认证
- **bcryptjs** - 密码加密
- **moment** - 时间处理
- **cors** - 跨域支持
- **helmet** - 安全头设置
- **morgan** - 日志记录

## 项目结构

```
backend/
├── app.js                 # 应用入口
├── package.json           # 项目配置
├── .env                   # 环境变量
├── config/                # 配置文件
│   └── database.js        # MySQL数据库连接配置
├── database/              # 数据库相关
│   ├── schema.sql         # 数据库表结构SQL脚本
│   └ init.js              # 数据库初始化脚本
├── controllers/           # 控制器
│   ├── productController.js
│   ├── customerController.js
│   ├── billingController.js
│   ├── returnController.js
│   ├── debtController.js
│   ├── accountController.js
│   ├── inventoryController.js
│   ├── purchaseController.js
│   └── authController.js
├── routes/                # 路由
│   ├── products.js
│   ├── customers.js
│   ├── billing.js
│   ├── returns.js
│   ├── debt.js
│   ├── accounts.js
│   ├── inventory.js
│   ├── purchase.js
│   └ auth.js
├── models/                # 数据模型
│   ├── mysqlDataStore.js  # MySQL数据存储
│   └── dataStore.js       # 内存数据存储（备用）
└── middleware/            # 中间件
│   ├── errorHandler.js
│   ├── requestLogger.js
│   └ authMiddleware.js
```

## 安装和运行

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置MySQL数据库

#### 安装MySQL
确保MySQL服务已安装并运行。您可以从 [MySQL官网](https://www.mysql.com/) 下载安装。

#### 配置环境变量
编辑 `.env` 文件，配置MySQL数据库连接信息：

```env
# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=338296
DB_NAME=inventory_system
```

#### 初始化数据库
运行数据库初始化脚本创建数据库和表结构：

```bash
npm run db:init
```

这将：
- 创建 `inventory_system` 数据库
- 创建所有必要的表结构
- 插入示例数据（商品、客户、订单等）

#### 重置数据库（可选）
如果需要重置数据库，运行：

```bash
npm run db:init --reset
```

这将删除现有数据库并重新创建。

### 3. 启动服务器

```bash
# 开发模式（使用nodemon）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

启动时会自动测试数据库连接：
- 如果数据库连接成功，将使用MySQL存储
- 如果数据库连接失败，将提示错误信息

### 4. 检查数据库状态

访问健康检查接口查看数据库连接状态：

```bash
curl http://localhost:3000/api/health
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2026-06-24T...",
  "uptime": 123.45,
  "database": "connected"
}
```

## API接口文档

### 基础接口

#### 健康检查
```
GET /api/health
```

#### API信息
```
GET /api
```

### 认证接口 (/api/auth)

#### 用户登录
```
POST /api/auth/login
Body: { username, password }
```

#### 用户注册
```
POST /api/auth/register
Body: { username, password, name }
```

#### 获取当前用户信息
```
GET /api/auth/me
Headers: Authorization: Bearer <token>
```

#### 修改密码
```
PUT /api/auth/password
Headers: Authorization: Bearer <token>
Body: { oldPassword, newPassword }
```

### 商品管理接口 (/api/products)

#### 获取商品列表
```
GET /api/products
Query: keyword, category, status
```

#### 获取商品详情
```
GET /api/products/:id
```

#### 创建商品
```
POST /api/products
Body: { name, brand, season, category, price, costPrice, skus }
```

#### 更新商品
```
PUT /api/products/:id
Body: { name, price, ... }
```

#### 删除商品
```
DELETE /api/products/:id
```

#### 更新SKU库存
```
PUT /api/products/:productId/skus/:skuId/stock
Body: { quantity, type }
```

### 客户管理接口 (/api/customers)

#### 获取客户列表
```
GET /api/customers
Query: keyword
```

#### 获取客户详情
```
GET /api/customers/:id
```

#### 创建客户
```
POST /api/customers
Body: { name, phone, address, remark }
```

#### 更新客户
```
PUT /api/customers/:id
Body: { name, phone, ... }
```

#### 删除客户
```
DELETE /api/customers/:id
```

### 开单管理接口 (/api/billing)

#### 获取销售订单列表
```
GET /api/billing/orders
Query: customerId, status, startDate, endDate
```

#### 获取订单详情
```
GET /api/billing/orders/:id
```

#### 创建销售订单
```
POST /api/billing/orders
Body: { customerId, items, paidAmount, paymentMethod, discount }
```

#### 更新订单收款
```
PUT /api/billing/orders/:id/payment
Body: { paidAmount, paymentMethod }
```

### 退货管理接口 (/api/returns)

#### 获取退货订单列表
```
GET /api/returns
Query: customerId, startDate, endDate
```

#### 创建退货订单
```
POST /api/returns
Body: { customerId, items, remark }
```

### 欠款管理接口 (/api/debt)

#### 获取欠款客户列表
```
GET /api/debt/customers
Query: keyword, overdue
```

#### 获取客户欠款详情
```
GET /api/debt/customers/:customerId
```

#### 记录收款
```
POST /api/debt/customers/:customerId/payments
Body: { orderId, amount, paymentMethod }
```

### 账目管理接口 (/api/accounts)

#### 获取账目记录列表
```
GET /api/accounts/records
Query: type, category, startDate, endDate
```

#### 获取账目统计
```
GET /api/accounts/statistics
Query: startDate, endDate
```

#### 手动记账
```
POST /api/accounts/records
Body: { type, category, amount, remark }
```

### 库存管理接口 (/api/inventory)

#### 获取库存列表
```
GET /api/inventory
Query: keyword, lowStock
```

#### 获取库存流水记录
```
GET /api/inventory/logs
Query: skuId, type, startDate, endDate
```

#### 库存盘点
```
POST /api/inventory/check
Body: { items: [{ skuId, actualStock }] }
```

### 进货管理接口 (/api/purchase)

#### 获取采购订单列表
```
GET /api/purchase/orders
Query: status, startDate, endDate
```

#### 创建采购订单
```
POST /api/purchase/orders
Body: { supplier, items, remark }
```

#### 确认入库
```
PUT /api/purchase/orders/:orderId/confirm
```

## 数据验证

所有API接口都使用 `express-validator` 进行数据验证，确保数据的完整性和正确性。验证失败时会返回详细的错误信息。

## 错误处理

系统使用统一的错误处理机制，所有错误都会通过 `errorHandler` 中间件处理，返回标准化的错误响应格式：

```json
{
  "success": false,
  "error": {
    "message": "错误信息",
    "status": 400,
    "timestamp": "2026-06-24T..."
  }
}
```

## 安全特性

- **JWT认证** - 使用JWT令牌进行用户认证
- **密码加密** - 使用bcryptjs加密存储密码（生产环境）
- **安全头** - 使用helmet设置安全HTTP头
- **跨域控制** - 使用cors控制跨域访问
- **输入验证** - 所有输入数据都经过严格验证

## 数据存储

系统支持两种数据存储方式：

### MySQL数据库存储（推荐）
- 持久化数据存储
- 支持事务处理
- 数据安全可靠
- 适合生产环境

**数据库表结构：**
- `users` - 用户表
- `products` - 商品表
- `skus` - SKU表
- `customers` - 客户表
- `sales_orders` - 销售订单表
- `sales_order_items` - 销售订单明细表
- `return_orders` - 退货订单表
- `return_order_items` - 退货订单明细表
- `purchase_orders` - 采购订单表
- `purchase_order_items` - 采购订单明细表
- `account_records` - 账目记录表
- `inventory_logs` - 库存流水表

### 内存存储（演示模式）
- 临时数据存储
- 适合开发和测试
- 服务器重启后数据丢失
- 不适合生产环境

系统会根据数据库连接状态自动选择存储方式。

## 数据库初始化

### 初始化步骤

1. **确保MySQL服务已启动**
   ```bash
   # Windows
   net start mysql
   
   # Linux/Mac
   sudo systemctl start mysql
   ```

2. **运行初始化脚本**
   ```bash
   npm run db:init
   ```

3. **验证数据库**
   ```bash
   mysql -u root -p338296 -e "SHOW DATABASES;"
   mysql -u root -p338296 inventory_system -e "SHOW TABLES;"
   ```

### 数据库管理

#### 查看数据库状态
```bash
mysql -u root -p338296 -e "SELECT COUNT(*) FROM products;"
```

#### 备份数据库
```bash
mysqldump -u root -p338296 inventory_system > backup.sql
```

#### 恢复数据库
```bash
mysql -u root -p338296 inventory_system < backup.sql
```

## 测试

```bash
npm test
```

## 生产部署建议

1. **修改 `.env` 文件中的 `JWT_SECRET` 为强密码**
2. **使用MySQL数据库存储**
3. **配置数据库备份策略**
4. **启用HTTPS**
5. **配置日志系统**
6. **使用PM2等进程管理器**
7. **设置数据库连接池大小**
8. **定期监控数据库性能**
9. **配置防火墙规则**
10. **实施安全审计**

### PM2部署示例

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name inventory-system

# 查看状态
pm2 status

# 查看日志
pm2 logs inventory-system

# 重启应用
pm2 restart inventory-system
```

### 数据库优化建议

1. **定期清理日志数据**
2. **优化查询性能**
3. **设置合适的索引**
4. **配置数据库缓存**
5. **监控数据库连接数**

## 常见问题

### 数据库连接失败

**问题：** 启动时提示数据库连接失败

**解决方案：**
1. 检查MySQL服务是否已启动
2. 检查 `.env` 文件中的数据库配置
3. 确认数据库密码是否正确
4. 运行 `npm run db:init` 初始化数据库

### 数据库初始化失败

**问题：** 运行 `npm run db:init` 失败

**解决方案：**
1. 检查MySQL用户权限
2. 确认MySQL服务正常运行
3. 检查SQL脚本语法
4. 查看错误日志

### 性能问题

**问题：** API响应速度慢

**解决方案：**
1. 优化数据库查询
2. 增加数据库连接池大小
3. 使用缓存机制
4. 检查数据库索引

## 许可证

ISC

## 作者

服装进销存管理系统开发团队