import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

// 客户管理 Store
export const useCustomerStore = defineStore('customer', () => {
  // 客户列表
  const customers = ref([])

  // 搜索关键词
  const searchKeyword = ref('')

  // 筛选后的客户列表
  const filteredCustomers = computed(() => {
    if (!searchKeyword.value) return customers.value
    const keyword = searchKeyword.value.toLowerCase()
    return customers.value.filter(c =>
      c.name.toLowerCase().includes(keyword) ||
      c.phone.includes(keyword)
    )
  })

  // 从后端刷新客户列表
  const fetchCustomers = async () => {
    const res = await api.get('/customers')
    if (res.success) {
      customers.value = res.data
    }
  }

  // 初始化数据
  const initData = async () => {
    try {
      await fetchCustomers()
    } catch (error) {
      throw error
    }
  }

  // 添加客户
  const addCustomer = async (customer) => {
    try {
      await api.post('/customers', customer)
      await fetchCustomers()
    } catch (error) {
      throw error
    }
  }

  // 更新客户
  const updateCustomer = async (id, data) => {
    try {
      await api.put(`/customers/${id}`, data)
      await fetchCustomers()
    } catch (error) {
      throw error
    }
  }

  // 删除客户
  const deleteCustomer = async (id) => {
    try {
      await api.delete(`/customers/${id}`)
      await fetchCustomers()
    } catch (error) {
      throw error
    }
  }

  // 获取客户
  const getCustomer = (id) => {
    return customers.value.find(c => c.id === id)
  }

  // 设置搜索关键词
  const setSearchKeyword = (keyword) => {
    searchKeyword.value = keyword
  }

  // 更新客户消费统计
  const updateCustomerStats = async (customerId, amount) => {
    try {
      const customer = customers.value.find(c => c.id === customerId)
      if (customer) {
        await api.put(`/customers/${customerId}`, {
          totalSpent: customer.totalSpent + amount,
          orderCount: customer.orderCount + 1
        })
        await fetchCustomers()
      }
    } catch (error) {
      throw error
    }
  }

  return {
    customers,
    searchKeyword,
    filteredCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    setSearchKeyword,
    updateCustomerStats,
    initData
  }
})
