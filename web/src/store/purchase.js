import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

// 采购管理 Store
export const usePurchaseStore = defineStore('purchase', () => {
  // 采购订单列表
  const purchaseOrders = ref([])

  // 从后端获取采购订单列表
  const fetchPurchaseOrders = async (params = {}) => {
    try {
      const res = await api.get('/purchases', { params })
      if (res.success) {
        purchaseOrders.value = res.data
      }
      return res
    } catch (error) {
      throw error
    }
  }

  // 从后端获取单个采购订单详情
  const fetchPurchaseOrder = async (id) => {
    try {
      const res = await api.get(`/purchases/${id}`)
      return res.data
    } catch (error) {
      throw error
    }
  }

  // 创建采购订单
  const createPurchaseOrder = async (orderData) => {
    try {
      const res = await api.post('/purchases', orderData)
      if (res.success) {
        await fetchPurchaseOrders()
      }
      return res
    } catch (error) {
      throw error
    }
  }

  // 更新采购订单
  const updatePurchaseOrder = async (id, orderData) => {
    try {
      const res = await api.put(`/purchases/${id}`, orderData)
      if (res.success) {
        await fetchPurchaseOrders()
      }
      return res
    } catch (error) {
      throw error
    }
  }

  // 确认采购入库
  const confirmPurchase = async (id) => {
    try {
      const res = await api.put(`/purchases/${id}/confirm`)
      if (res.success) {
        await fetchPurchaseOrders()
      }
      return res
    } catch (error) {
      throw error
    }
  }

  // 删除采购订单
  const deletePurchaseOrder = async (id) => {
    try {
      const res = await api.delete(`/purchases/${id}`)
      if (res.success) {
        await fetchPurchaseOrders()
      }
      return res
    } catch (error) {
      throw error
    }
  }

  // 初始化数据
  const initData = async () => {
    try {
      await fetchPurchaseOrders()
    } catch (error) {
      // 静默处理
    }
  }

  return {
    purchaseOrders,
    fetchPurchaseOrders,
    fetchPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrder,
    confirmPurchase,
    deletePurchaseOrder,
    initData
  }
})
