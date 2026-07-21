import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import api from '@/utils/api'

// localStorage 持久化相关
const CART_STORAGE_KEY = 'inventory_cart_data'

// 从 localStorage 读取购物车数据
const loadCartFromStorage = () => {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('[购物车] 读取本地数据失败:', e)
  }
  return null
}

// 保存购物车数据到 localStorage
const saveCartToStorage = (data) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[购物车] 保存本地数据失败:', e)
  }
}

// 清除 localStorage 中的购物车数据
const clearCartStorage = () => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY)
  } catch (e) {
    console.error('[购物车] 清除本地数据失败:', e)
  }
}

// 开单管理 Store
export const useBillingStore = defineStore('billing', () => {
  // 从 localStorage 读取初始数据
  const savedData = loadCartFromStorage()

  // 购物车商品列表
  const cartItems = ref(savedData?.cartItems || [])

  // 当前关联的客户
  const currentCustomer = ref(savedData?.currentCustomer || null)

  // 整单折扣
  const orderDiscount = ref(savedData?.orderDiscount || 1)

  // 抹零金额
  const roundOffAmount = ref(savedData?.roundOffAmount || 0)

  // 支付状态: unpaid | partial | paid
  const paymentStatus = ref(savedData?.paymentStatus || 'unpaid')

  // 部分付款金额
  const partialPaidAmount = ref(savedData?.partialPaidAmount || 0)

  // 销售单列表
  const salesOrders = ref([])

  // 退货单列表
  const returnOrders = ref([])

  // 监听购物车状态变化，自动保存到 localStorage
  watch(
    [cartItems, currentCustomer, orderDiscount, roundOffAmount, paymentStatus, partialPaidAmount],
    () => {
      saveCartToStorage({
        cartItems: cartItems.value,
        currentCustomer: currentCustomer.value,
        orderDiscount: orderDiscount.value,
        roundOffAmount: roundOffAmount.value,
        paymentStatus: paymentStatus.value,
        partialPaidAmount: partialPaidAmount.value
      })
    },
    { deep: true }
  )

  // 购物车商品数量
  const cartItemCount = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  // 购物车总金额（原价）
  const cartTotalOriginal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity * item.originalPrice, 0)
  })

  // 购物车总金额（折后）
  const cartTotal = computed(() => {
    const total = cartItems.value.reduce((sum, item) => sum + item.quantity * item.price, 0)
    return Math.round((total * orderDiscount.value - roundOffAmount.value) * 100) / 100
  })

  // 当前订单欠款金额
  const currentOrderDebt = computed(() => {
    if (paymentStatus.value === 'paid') return 0
    if (paymentStatus.value === 'partial') {
      return Math.round((cartTotal.value - partialPaidAmount.value) * 100) / 100
    }
    return cartTotal.value
  })

  // 获取客户累计欠款
  const getCustomerTotalDebt = (customerId) => {
    if (!customerId) return 0
    return 0
  }

  // 获取客户欠款历史
  const getCustomerDebtHistory = (customerId) => {
    if (!customerId) return []
    return []
  }

  // 添加商品到购物车
  const addToCart = (product, sku, quantity = 1, price = sku.price) => {
    const existingItem = cartItems.value.find(
      item => item.productId === product.id && item.skuId === sku.id
    )

    if (existingItem) {
      existingItem.quantity += quantity
      existingItem.price = price
    } else {
      cartItems.value.push({
        productId: product.id,
        productName: product.name,
        skuId: sku.id,
        color: sku.color,
        size: sku.size,
        quantity,
        originalPrice: sku.price,
        price,
        stock: sku.stock,
        costPrice: product.avgCost || product.costPrice || 0
      })
    }
  }

  // 更新购物车商品数量
  const updateCartItemQuantity = (skuId, quantity) => {
    const item = cartItems.value.find(i => i.skuId === skuId)
    if (item) {
      item.quantity = quantity
    }
  }

  // 更新购物车商品价格
  const updateCartItemPrice = (skuId, price) => {
    const item = cartItems.value.find(i => i.skuId === skuId)
    if (item) {
      item.price = price
    }
  }

  // 移除购物车商品
  const removeFromCart = (skuId) => {
    const index = cartItems.value.findIndex(i => i.skuId === skuId)
    if (index !== -1) {
      cartItems.value.splice(index, 1)
    }
  }

  // 清空购物车
  const clearCart = () => {
    cartItems.value = []
    currentCustomer.value = null
    orderDiscount.value = 1
    roundOffAmount.value = 0
    paymentStatus.value = 'unpaid'
    partialPaidAmount.value = 0
    // 清除本地存储
    clearCartStorage()
  }

  // 设置当前客户
  const setCurrentCustomer = (customer) => {
    currentCustomer.value = customer
  }

  // 设置整单折扣
  const setOrderDiscount = (discount) => {
    orderDiscount.value = discount
  }

  // 设置抹零金额
  const setRoundOffAmount = (amount) => {
    roundOffAmount.value = amount
  }

  // 设置支付状态
  const setPaymentStatus = (status) => {
    paymentStatus.value = status
    if (status === 'unpaid') {
      partialPaidAmount.value = 0
    } else if (status === 'paid') {
      partialPaidAmount.value = cartTotal.value
    }
  }

  // 设置部分付款金额
  const setPartialPaidAmount = (amount) => {
    partialPaidAmount.value = amount
  }

  // 创建销售单（调用后端API，事务写入数据库）
  const createSalesOrder = async () => {
    const paidAmount = paymentStatus.value === 'paid' ? cartTotal.value
      : paymentStatus.value === 'partial' ? partialPaidAmount.value
      : 0

    const debtAmount = Math.round((cartTotal.value - paidAmount) * 100) / 100

    // 优惠金额 = 原价总额 - 折后总额
    const discountAmount = Math.round((cartTotalOriginal.value - cartTotal.value) * 100) / 100

    // 根据付款状态确定订单状态
    let orderStatus = 'settled'
    if (paymentStatus.value === 'unpaid') {
      orderStatus = 'unpaid'
    } else if (paymentStatus.value === 'partial') {
      orderStatus = 'partial'
    } else if (paymentStatus.value === 'paid') {
      orderStatus = 'paid'
    }

    // 构造请求数据
    const orderPayload = {
      customerId: currentCustomer.value?.id || null,
      customerName: currentCustomer.value?.name || '散客',
      items: cartItems.value.map(item => ({
        skuId: item.skuId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice || 0
      })),
      totalAmount: cartTotal.value,
      paidAmount,
      debtAmount,
      discount: discountAmount,
      paymentMethod: 'cash',
      status: orderStatus,
      remark: ''
    }

    try {
      const res = await api.post('/billing/orders', orderPayload)

      if (res.success) {
        await fetchSalesOrders()
        clearCart()
        return res.data
      } else {
        throw new Error(res.message || '创建订单失败')
      }
    } catch (error) {
      console.error('[开单] 创建销售订单失败:', error)
      throw error
    }
  }

  // 获取销售单
  const getSalesOrder = (orderId) => {
    return salesOrders.value.find(o => o.id === orderId)
  }

  // 添加收款记录（调用后端API更新订单收款）
  const addPaymentRecord = async (orderId, amount, method) => {
    try {
      const res = await api.put(`/billing/orders/${orderId}/payment`, { amount, method })
      if (res.success) {
        await fetchSalesOrders()
        return res.data
      } else {
        throw new Error(res.message || '更新收款失败')
      }
    } catch (error) {
      console.error('[开单] 更新订单收款失败:', error)
      throw error
    }
  }

  // 添加退货单（调用后端API）
  const addReturnOrder = async (returnOrder) => {
    try {
      const res = await api.post('/returns', returnOrder)
      if (res.success) {
        await fetchReturnOrders()
        return res.data
      } else {
        throw new Error(res.message || '创建退货单失败')
      }
    } catch (error) {
      console.error('[开单] 创建退货单失败:', error)
      throw error
    }
  }

  // 从后端API加载销售订单
  const fetchSalesOrders = async () => {
    try {
      const res = await api.get('/billing/orders')
      if (res.success) {
        salesOrders.value = res.data || []
      }
    } catch (error) {
      console.error('[开单] 加载销售订单失败:', error)
    }
  }

  // 从后端API加载退货订单列表
  const fetchReturnOrders = async () => {
    try {
      const res = await api.get('/returns')
      if (res.success) {
        returnOrders.value = res.data || []
      }
    } catch (error) {
      console.error('[开单] 加载退货订单失败:', error)
    }
  }

  // 更新销售订单（调用后端API）
  const updateSalesOrder = async (orderId, orderData) => {
    try {
      const res = await api.put(`/billing/orders/${orderId}`, orderData)
      if (res.success) {
        await fetchSalesOrders()
        return res.data
      } else {
        throw new Error(res.message || '修改订单失败')
      }
    } catch (error) {
      console.error('[开单] 修改订单失败:', error)
      throw error
    }
  }

  // 删除销售订单（调用后端API）
  const deleteSalesOrder = async (orderId) => {
    try {
      const res = await api.delete(`/billing/orders/${orderId}`)
      if (res.success) {
        await fetchSalesOrders()
        return true
      } else {
        throw new Error(res.message || '删除订单失败')
      }
    } catch (error) {
      console.error('[开单] 删除订单失败:', error)
      throw error
    }
  }

  // 初始化数据（从API加载）
  const initData = async () => {
    try {
      await Promise.all([
        salesOrders.value.length === 0 ? fetchSalesOrders() : Promise.resolve(),
        returnOrders.value.length === 0 ? fetchReturnOrders() : Promise.resolve()
      ])
    } catch (error) {
      console.error('[开单] 初始化数据失败:', error)
    }
  }

  return {
    cartItems,
    currentCustomer,
    orderDiscount,
    roundOffAmount,
    paymentStatus,
    partialPaidAmount,
    salesOrders,
    returnOrders,
    cartItemCount,
    cartTotalOriginal,
    cartTotal,
    currentOrderDebt,
    getCustomerTotalDebt,
    getCustomerDebtHistory,
    addToCart,
    updateCartItemQuantity,
    updateCartItemPrice,
    removeFromCart,
    clearCart,
    setCurrentCustomer,
    setOrderDiscount,
    setRoundOffAmount,
    setPaymentStatus,
    setPartialPaidAmount,
    createSalesOrder,
    getSalesOrder,
    addPaymentRecord,
    addReturnOrder,
    fetchSalesOrders,
    fetchReturnOrders,
    updateSalesOrder,
    deleteSalesOrder,
    initData
  }
})
