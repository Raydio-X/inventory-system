import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

// 账目管理 Store
export const useAccountStore = defineStore('account', () => {
  // 账目流水
  const accountRecords = ref([])

  // 今日数据（从API获取）
  const todayIncome = ref(0)
  const todayExpense = ref(0)
  const todayProfit = computed(() => todayIncome.value - todayExpense.value)

  // 月度数据（从API获取）
  const monthIncome = ref(0)
  const monthExpense = ref(0)
  const monthProfit = computed(() => monthIncome.value - monthExpense.value)

  // 初始化数据，加载账目记录
  const initData = async () => {
    try {
      const res = await api.get('/accounts/records')
      if (res.success) {
        accountRecords.value = res.data
      }
    } catch (error) {
      console.error('加载账目记录失败:', error)
    }
  }

  // 获取今日数据
  const fetchTodayData = async () => {
    try {
      const res = await api.get('/accounts/today')
      if (res.success) {
        todayIncome.value = res.data.income || 0
        todayExpense.value = res.data.expense || 0
      }
    } catch (error) {
      console.error('获取今日数据失败:', error)
    }
  }

  // 获取月度统计数据
  const fetchMonthData = async () => {
    try {
      const res = await api.get('/accounts/statistics', { params: { period: 'month' } })
      if (res.success) {
        monthIncome.value = res.data.income || 0
        monthExpense.value = res.data.expense || 0
      }
    } catch (error) {
      console.error('获取月度数据失败:', error)
    }
  }

  // 添加账目记录
  const addAccountRecord = async (record) => {
    try {
      const res = await api.post('/accounts/records', record)
      if (res.success) {
        await initData()
      }
    } catch (error) {
      console.error('添加账目记录失败:', error)
    }
  }

  // 添加销售收款记录
  const addSalesIncome = async (orderId, orderNo, amount) => {
    try {
      const res = await api.post('/accounts/records', {
        type: 'income',
        category: 'sales',
        amount,
        orderId,
        orderNo,
        remark: `销售收款 - ${orderNo}`
      })
      if (res.success) {
        await initData()
      }
    } catch (error) {
      console.error('添加销售收款失败:', error)
    }
  }

  // 添加客户还款记录
  const addRepaymentIncome = async (orderId, orderNo, amount, customerName) => {
    try {
      const res = await api.post('/accounts/records', {
        type: 'income',
        category: 'repayment',
        amount,
        orderId,
        orderNo,
        remark: `客户还款 - ${customerName}`
      })
      if (res.success) {
        await initData()
      }
    } catch (error) {
      console.error('添加客户还款失败:', error)
    }
  }

  // 添加采购支出记录
  const addPurchaseExpense = async (orderId, orderNo, amount, supplierName) => {
    try {
      const res = await api.post('/accounts/records', {
        type: 'expense',
        category: 'purchase',
        amount,
        orderId,
        orderNo,
        remark: `采购支出 - ${supplierName}`
      })
      if (res.success) {
        await initData()
      }
    } catch (error) {
      console.error('添加采购支出失败:', error)
    }
  }

  // 添加退货退款记录
  const addRefundExpense = async (orderId, orderNo, amount) => {
    try {
      const res = await api.post('/accounts/records', {
        type: 'expense',
        category: 'refund',
        amount,
        orderId,
        orderNo,
        remark: `退货退款 - ${orderNo}`
      })
      if (res.success) {
        await initData()
      }
    } catch (error) {
      console.error('添加退货退款失败:', error)
    }
  }

  // 手动记账
  const addManualRecord = async (type, category, amount, remark) => {
    try {
      const res = await api.post('/accounts/records', {
        type,
        category,
        amount,
        remark,
        orderId: null,
        orderNo: null
      })
      if (res.success) {
        await initData()
      }
    } catch (error) {
      console.error('手动记账失败:', error)
    }
  }

  // 获取某时间段的账目汇总
  const getPeriodSummary = async (startDate, endDate) => {
    try {
      const res = await api.get('/accounts/records', {
        params: { startDate, endDate }
      })
      if (res.success) {
        const records = res.data
        const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0)
        const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0)
        return {
          income,
          expense,
          profit: income - expense,
          records
        }
      }
      return { income: 0, expense: 0, profit: 0, records: [] }
    } catch (error) {
      console.error('获取时段汇总失败:', error)
      return { income: 0, expense: 0, profit: 0, records: [] }
    }
  }

  return {
    accountRecords,
    todayIncome,
    todayExpense,
    todayProfit,
    monthIncome,
    monthExpense,
    monthProfit,
    initData,
    fetchTodayData,
    fetchMonthData,
    addAccountRecord,
    addSalesIncome,
    addRepaymentIncome,
    addPurchaseExpense,
    addRefundExpense,
    addManualRecord,
    getPeriodSummary
  }
})
