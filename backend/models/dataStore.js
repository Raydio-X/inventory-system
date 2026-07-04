/**
 * 数据存储类（模拟数据库）
 * 使用内存存储，未来可扩展为真实数据库
 */
class DataStore {
  constructor() {
    this.products = [];
    this.customers = [];
    this.salesOrders = [];
    this.returnOrders = [];
    this.debtRecords = [];
    this.accountRecords = [];
    this.inventoryLogs = [];
    this.purchaseOrders = [];
    this.users = [];
    
    this.initMockData();
  }

  /**
   * 初始化模拟数据
   */
  initMockData() {
    // 初始化商品数据
    this.products = [
      {
        id: 'prod-001',
        name: '休闲T恤',
        brand: '品牌A',
        season: '2024春夏',
        category: '男装-上衣',
        price: 89,
        costPrice: 45,
        status: 'active',
        skus: [
          { id: 'sku-001', color: '白色', size: 'S', stock: 20, price: 89 },
          { id: 'sku-002', color: '白色', size: 'M', stock: 25, price: 89 },
          { id: 'sku-003', color: '白色', size: 'L', stock: 15, price: 89 },
          { id: 'sku-004', color: '黑色', size: 'S', stock: 18, price: 89 },
          { id: 'sku-005', color: '黑色', size: 'M', stock: 22, price: 89 },
          { id: 'sku-006', color: '黑色', size: 'L', stock: 12, price: 89 }
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 'prod-002',
        name: '牛仔裤',
        brand: '品牌B',
        season: '2024春夏',
        category: '男装-裤子',
        price: 159,
        costPrice: 80,
        status: 'active',
        skus: [
          { id: 'sku-007', color: '蓝色', size: '28', stock: 15, price: 159 },
          { id: 'sku-008', color: '蓝色', size: '29', stock: 20, price: 159 },
          { id: 'sku-009', color: '蓝色', size: '30', stock: 18, price: 159 },
          { id: 'sku-010', color: '黑色', size: '28', stock: 12, price: 159 },
          { id: 'sku-011', color: '黑色', size: '29', stock: 16, price: 159 }
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 'prod-003',
        name: '连衣裙',
        brand: '品牌C',
        season: '2024春夏',
        category: '女装-裙子',
        price: 199,
        costPrice: 100,
        status: 'active',
        skus: [
          { id: 'sku-012', color: '粉色', size: 'S', stock: 3, price: 199 },
          { id: 'sku-013', color: '粉色', size: 'M', stock: 8, price: 199 },
          { id: 'sku-014', color: '蓝色', size: 'S', stock: 5, price: 199 },
          { id: 'sku-015', color: '蓝色', size: 'M', stock: 10, price: 199 }
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      }
    ];

    // 初始化客户数据
    this.customers = [
      {
        id: 'cust-001',
        name: '张三',
        phone: '13800138001',
        address: '北京市朝阳区',
        remark: 'VIP客户',
        totalSpent: 1500,
        orderCount: 5,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 'cust-002',
        name: '李四',
        phone: '13800138002',
        address: '上海市浦东新区',
        remark: '',
        totalSpent: 800,
        orderCount: 3,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      }
    ];

    // 初始化销售订单数据
    this.salesOrders = [
      {
        id: 'order-001',
        orderNo: 'XS202606210001',
        customerId: 'cust-001',
        customerName: '张三',
        items: [
          { skuId: 'sku-002', productName: '休闲T恤', color: '白色', size: 'M', quantity: 5, price: 89 },
          { skuId: 'sku-008', productName: '牛仔裤', color: '蓝色', size: '29', quantity: 3, price: 159 }
        ],
        totalAmount: 892,
        paidAmount: 500,
        debtAmount: 392,
        paymentMethod: 'cash',
        status: 'partial',
        createdAt: '2026-06-21T10:30:00Z',
        updatedAt: '2026-06-21T10:30:00Z'
      },
      {
        id: 'order-002',
        orderNo: 'XS202606210002',
        customerId: 'cust-002',
        customerName: '李四',
        items: [
          { skuId: 'sku-013', productName: '连衣裙', color: '粉色', size: 'M', quantity: 2, price: 199 }
        ],
        totalAmount: 398,
        paidAmount: 398,
        debtAmount: 0,
        paymentMethod: 'wechat',
        status: 'settled',
        createdAt: '2026-06-21T14:20:00Z',
        updatedAt: '2026-06-21T14:20:00Z'
      }
    ];

    // 初始化账目记录
    this.accountRecords = [
      {
        id: 'acc-001',
        type: 'income',
        category: 'sales',
        amount: 892,
        orderId: 'order-001',
        orderNo: 'XS202606210001',
        remark: '销售收款',
        createdAt: '2026-06-21T10:30:00Z'
      },
      {
        id: 'acc-002',
        type: 'income',
        category: 'sales',
        amount: 398,
        orderId: 'order-002',
        orderNo: 'XS202606210002',
        remark: '销售收款',
        createdAt: '2026-06-21T14:20:00Z'
      }
    ];

    // 初始化库存流水
    this.inventoryLogs = [
      {
        id: 'inv-001',
        skuId: 'sku-002',
        type: 'sales_out',
        quantity: -5,
        orderId: 'order-001',
        orderNo: 'XS202606210001',
        remark: '销售出库',
        createdAt: '2026-06-21T10:30:00Z'
      },
      {
        id: 'inv-002',
        skuId: 'sku-008',
        type: 'sales_out',
        quantity: -3,
        orderId: 'order-001',
        orderNo: 'XS202606210001',
        remark: '销售出库',
        createdAt: '2026-06-21T10:30:00Z'
      }
    ];

    // 初始化用户数据
    this.users = [
      {
        id: 'user-001',
        username: 'admin',
        password: 'admin123', // 实际应用中应该加密存储
        role: 'admin',
        name: '店主',
        createdAt: '2026-01-01T00:00:00Z'
      }
    ];
  }

  /**
   * 生成唯一ID
   */
  generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}-${random}`;
  }

  /**
   * 生成订单号
   */
  generateOrderNo(prefix = 'XS') {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = this.salesOrders.length + this.returnOrders.length + this.purchaseOrders.length + 1;
    return `${prefix}${date}${String(count).padStart(4, '0')}`;
  }
}

// 创建全局数据存储实例
const dataStore = new DataStore();

module.exports = dataStore;