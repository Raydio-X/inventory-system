import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('@/views/product/Products.vue'),
    meta: { title: '商品管理' }
  },
  {
    path: '/products/add',
    name: 'ProductAdd',
    component: () => import('@/views/product/ProductAdd.vue'),
    meta: { title: '添加商品', hideTabBar: true }
  },
  {
    path: '/products/edit/:id',
    name: 'ProductEdit',
    component: () => import('@/views/product/ProductAdd.vue'),
    meta: { title: '编辑商品', hideTabBar: true }
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('@/views/product/ProductDetail.vue'),
    meta: { title: '商品详情', hideTabBar: true }
  },
  {
    path: '/billing',
    name: 'Billing',
    component: () => import('@/views/billing/Billing.vue'),
    meta: { title: '批发开单' }
  },
  {
    path: '/return',
    name: 'Return',
    component: () => import('@/views/return/Return.vue'),
    meta: { title: '客户退货' }
  },
  {
    path: '/records',
    name: 'Records',
    component: () => import('@/views/record/Records.vue'),
    meta: { title: '操作记录', hideTabBar: true }
  },
  {
    path: '/records/:type/:id',
    name: 'RecordDetail',
    component: () => import('@/views/record/RecordDetail.vue'),
    meta: { title: '记录详情', hideTabBar: true }
  },
  {
    path: '/billing/cart',
    name: 'BillingCart',
    component: () => import('@/views/billing/BillingCart.vue'),
    meta: { title: '购物车', hideTabBar: true }
  },
  {
    path: '/billing/checkout',
    name: 'BillingCheckout',
    component: () => import('@/views/billing/BillingCheckout.vue'),
    meta: { title: '结算', hideTabBar: true }
  },
  {
    path: '/billing/success',
    name: 'BillingSuccess',
    component: () => import('@/views/billing/BillingSuccess.vue'),
    meta: { title: '开单成功', hideTabBar: true }
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/views/customer/Customers.vue'),
    meta: { title: '客户管理' }
  },
  {
    path: '/customers/:id',
    name: 'CustomerDetail',
    component: () => import('@/views/customer/CustomerDetail.vue'),
    meta: { title: '客户详情', hideTabBar: true }
  },
  {
    path: '/customers/:customerId/order/:orderId/edit',
    name: 'OrderEdit',
    component: () => import('@/views/customer/OrderEdit.vue'),
    meta: { title: '修改订单', hideTabBar: true }
  },
  {
    path: '/debt',
    name: 'Debt',
    component: () => import('@/views/debt/Debt.vue'),
    meta: { title: '未付款核对' }
  },
  {
    path: '/debt/:customerId',
    name: 'DebtDetail',
    component: () => import('@/views/debt/DebtDetail.vue'),
    meta: { title: '欠款详情', hideTabBar: true }
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('@/views/account/Accounts.vue'),
    meta: { title: '数据统计' }
  },
  {
    path: '/accounts/record',
    name: 'AccountRecord',
    component: () => import('@/views/record/Record.vue'),
    meta: { title: '收支明细', hideTabBar: true }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/inventory/Inventory.vue'),
    meta: { title: '库存管理' }
  },
  {
    path: '/inventory/check',
    name: 'InventoryCheck',
    component: () => import('@/views/inventory/InventoryCheck.vue'),
    meta: { title: '库存盘点', hideTabBar: true }
  },
  {
    path: '/mine',
    name: 'Mine',
    component: () => import('@/views/mine/Mine.vue'),
    meta: { title: '我的' }
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: () => import('@/views/setting/Suppliers.vue'),
    meta: { title: '供应商管理' }
  },
  {
    path: '/suppliers/:id',
    name: 'SupplierDetail',
    component: () => import('@/views/setting/SupplierDetail.vue'),
    meta: { title: '供应商详情', hideTabBar: true }
  },
  {
    path: '/mine/settings',
    name: 'Settings',
    component: () => import('@/views/setting/Settings.vue'),
    meta: { title: '系统设置', hideTabBar: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', hideTabBar: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 登录校验 + 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 服装进销存` : '服装进销存管理系统'

  // 登录页直接放行
  if (to.path === '/login') {
    const token = localStorage.getItem('token')
    if (token) {
      next('/')
      return
    }
    next()
    return
  }

  // 其他页面需要登录
  const token = localStorage.getItem('token')
  if (!token) {
    next('/login')
    return
  }

  next()
})

export default router