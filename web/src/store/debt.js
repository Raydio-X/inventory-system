import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

// 欠款管理 Store（接入后端API）
export const useDebtStore = defineStore('debt', () => {
  // 欠款客户列表（从API获取）
  const debtCustomers = ref([])

  // 当前客户欠款详情
  const customerDebtDetail = ref(null)

  // 加载状态
  const loading = ref(false)

  // ========== 计算属性 ==========

  // 总欠款金额
  const totalDebt = computed(() => {
    return debtCustomers.value.reduce((sum, c) => sum + c.totalDebt, 0)
  })

  // 欠款客户数量
  const debtCustomerCount = computed(() => {
    return debtCustomers.value.length
  })

  // ========== API 方法 ==========

  // 获取欠款客户列表
  const fetchDebtCustomers = async (keyword = '') => {
    loading.value = true
    try {
      const params = {}
      if (keyword) params.keyword = keyword
      const res = await api.get('/debt/customers', { params })
      debtCustomers.value = res.data || []
      return res.data
    } catch (e) {
      console.error('获取欠款客户列表失败:', e.message)
      return []
    } finally {
      loading.value = false
    }
  }

  // 获取客户欠款详情（含订单商品明细）
  const fetchCustomerDebtDetail = async (customerId) => {
    loading.value = true
    try {
      const res = await api.get(`/debt/customers/${customerId}`)
      customerDebtDetail.value = res.data || null
      return res.data
    } catch (e) {
      console.error('获取客户欠款详情失败:', e.message)
      return null
    } finally {
      loading.value = false
    }
  }

  // 记录收款
  const recordPayment = async (customerId, { orderId, amount, paymentMethod }) => {
    try {
      const res = await api.post(`/debt/customers/${customerId}/payments`, {
        orderId,
        amount,
        paymentMethod: paymentMethod || 'cash'
      })
      // 收款成功后刷新数据
      await fetchDebtCustomers()
      if (customerDebtDetail.value?.customer?.id === customerId) {
        await fetchCustomerDebtDetail(customerId)
      }
      return res.data
    } catch (e) {
      console.error('记录收款失败:', e.message)
      throw e
    }
  }

  // ========== 辅助方法 ==========

  // 获取客户累计欠款
  const getCustomerTotalDebt = (customerId) => {
    const customer = debtCustomers.value.find(c => c.customerId === customerId)
    return customer?.totalDebt || 0
  }

  // 获取客户欠款列表
  const getCustomerDebts = (customerId) => {
    if (customerDebtDetail.value?.customer?.id === customerId) {
      return customerDebtDetail.value.orders || []
    }
    return []
  }

  // 兼容旧接口：同步销售单欠款到debt store
  // （前端创建订单后，重新拉取欠款列表即可）
  const syncFromSalesOrder = async (order) => {
    if (order.debtAmount > 0 && order.customerId) {
      await fetchDebtCustomers()
    }
  }

  // 兼容旧接口：收款（映射到recordPayment）
  const receivePayment = async (orderId, amount, method) => {
    // 需要先找到该订单所属客户
    if (customerDebtDetail.value) {
      const customerId = customerDebtDetail.value.customer?.id
      if (customerId) {
        return await recordPayment(customerId, { orderId, amount, paymentMethod: method })
      }
    }
    throw new Error('无法确定客户信息')
  }

  // 初始化（从后端获取数据）
  const initData = async () => {
    await fetchDebtCustomers()
  }

  return {
    debtCustomers,
    customerDebtDetail,
    loading,
    totalDebt,
    debtCustomerCount,
    fetchDebtCustomers,
    fetchCustomerDebtDetail,
    recordPayment,
    getCustomerTotalDebt,
    getCustomerDebts,
    syncFromSalesOrder,
    receivePayment,
    initData
  }
})
