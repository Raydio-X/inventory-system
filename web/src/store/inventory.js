import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

// 库存管理 Store
export const useInventoryStore = defineStore('inventory', () => {
  // 库存流水记录
  const inventoryLogs = ref([])

  // 库存预警商品
  const lowStockProducts = ref([])

  // 盘点单列表
  const checkOrders = ref([])

  // 库存预警数量
  const warningCount = computed(() => lowStockProducts.value.length)

  // 从后端获取库存流水记录
  const fetchInventoryLogs = async (params = {}) => {
    try {
      const res = await api.get('/inventory/logs', { params })
      if (res.success) {
        inventoryLogs.value = res.data
      }
    } catch (error) {
      console.error('获取库存流水失败:', error.message)
    }
  }

  // 添加库存流水（由后端在业务操作时自动生成，此处仅刷新数据）
  const addInventoryLog = async () => {
    await fetchInventoryLogs()
  }

  // 添加销售出库流水（后端自动创建，刷新流水数据）
  const addSalesOutboundLog = async () => {
    await fetchInventoryLogs()
  }

  // 添加采购入库流水（后端自动创建，刷新流水数据）
  const addPurchaseInboundLog = async () => {
    await fetchInventoryLogs()
  }

  // 添加销售退货入库流水（后端自动创建，刷新流水数据）
  const addSalesReturnLog = async () => {
    await fetchInventoryLogs()
  }

  // 添加盘点调整流水（后端自动创建，刷新流水数据）
  const addCheckAdjustLog = async () => {
    await fetchInventoryLogs()
  }

  // 设置库存预警商品（从后端获取低库存商品）
  const setLowStockProducts = async () => {
    try {
      const res = await api.get('/inventory', { params: { lowStock: true } })
      if (res.success) {
        lowStockProducts.value = res.data
      }
    } catch (error) {
      console.error('获取低库存商品失败:', error.message)
    }
  }

  // 创建盘点单
  const createCheckOrder = async (items) => {
    try {
      const res = await api.post('/inventory/check', { items })
      if (res.success) {
        const order = res.data
        checkOrders.value.push(order)
        return order
      }
    } catch (error) {
      console.error('创建盘点单失败:', error.message)
    }
  }

  // 更新盘点单
  const updateCheckOrder = async (orderId, items) => {
    try {
      const res = await api.put(`/inventory/check/${orderId}`, { items })
      if (res.success) {
        const order = checkOrders.value.find(o => o.id === orderId)
        if (order) {
          order.items = items
        }
      }
    } catch (error) {
      console.error('更新盘点单失败:', error.message)
    }
  }

  // 完成盘点单
  const completeCheckOrder = async (orderId) => {
    try {
      const res = await api.put(`/inventory/check/${orderId}/complete`)
      if (res.success) {
        const order = checkOrders.value.find(o => o.id === orderId)
        if (order) {
          order.status = 'completed'
          order.completedAt = new Date().toISOString()
        }
        await fetchInventoryLogs()
      }
    } catch (error) {
      console.error('完成盘点单失败:', error.message)
    }
  }

  // 获取 SKU 的库存流水
  const getSkuLogs = async (skuId) => {
    try {
      const res = await api.get('/inventory/logs', { params: { skuId } })
      if (res.success) {
        return res.data
      }
      return []
    } catch (error) {
      console.error('获取SKU库存流水失败:', error.message)
      return []
    }
  }

  // 初始化数据
  const initData = async () => {
    await Promise.all([
      fetchInventoryLogs(),
      setLowStockProducts()
    ])
  }

  return {
    inventoryLogs,
    lowStockProducts,
    checkOrders,
    warningCount,
    addInventoryLog,
    addSalesOutboundLog,
    addPurchaseInboundLog,
    addSalesReturnLog,
    addCheckAdjustLog,
    setLowStockProducts,
    createCheckOrder,
    updateCheckOrder,
    completeCheckOrder,
    getSkuLogs,
    fetchInventoryLogs,
    initData
  }
})
