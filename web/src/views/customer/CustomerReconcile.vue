<template>
  <div class="page reconcile-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">对账单</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 客户信息 -->
    <div class="customer-summary">
      <div class="summary-top">
        <div class="avatar">{{ customerName?.charAt(0) || '?' }}</div>
        <div class="summary-info">
          <div class="summary-name">{{ customerName }}</div>
          <div class="summary-phone">{{ customerPhone || '' }}</div>
        </div>
      </div>
      <div class="summary-stats">
        <div class="stat-block">
          <div class="stat-num debt">¥{{ formatAmount(totalDebt) }}</div>
          <div class="stat-text">累计欠款</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <div class="stat-num">{{ debtOrders.length }}</div>
          <div class="stat-text">欠款订单</div>
        </div>
      </div>
    </div>

    <!-- 时间筛选 -->
    <div class="period-tabs">
      <div :class="['period-tab', { active: period === 'all' }]" @click="switchPeriod('all')">全部</div>
      <div :class="['period-tab', { active: period === 'month' }]" @click="switchPeriod('month')">近一月</div>
      <div :class="['period-tab', { active: period === 'quarter' }]" @click="switchPeriod('quarter')">近三月</div>
      <div :class="['period-tab', { active: period === 'year' }]" @click="switchPeriod('year')">近一年</div>
    </div>

    <!-- 对账记录列表 -->
    <div class="record-list">
      <div v-if="loading" class="loading-state">
        <t-icon name="loading" class="loading-icon" />
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredOrders.length === 0" class="empty-state">
        <t-icon name="check-circle" class="empty-icon" />
        <span>无欠款记录</span>
      </div>

      <div v-else>
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="record-card"
        >
          <div class="record-header">
            <span class="record-no">{{ order.order_no }}</span>
            <span class="record-date">{{ formatDate(order.created_at) }}</span>
          </div>
          <div class="record-body">
            <div class="record-col">
              <span class="col-label">订单金额</span>
              <span class="col-value">¥{{ formatAmount(order.total_amount) }}</span>
            </div>
            <div class="record-col">
              <span class="col-label">已付款</span>
              <span class="col-value paid">¥{{ formatAmount(order.paid_amount) }}</span>
            </div>
            <div class="record-col">
              <span class="col-label">欠款</span>
              <span class="col-value debt">¥{{ formatAmount(order.debt_amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部合计栏 -->
    <div v-if="filteredOrders.length > 0" class="total-bar">
      <div class="total-inner">
        <span class="total-label">筛选范围欠款合计</span>
        <span class="total-amount debt">¥{{ formatAmount(filteredDebt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDebtStore } from '@/store/debt'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const debtStore = useDebtStore()

const customerId = route.params.customerId

// 状态
const loading = ref(false)
const period = ref('all')
const customerName = ref('')
const customerPhone = ref('')
const totalDebt = ref(0)
const debtOrders = ref([])

// 切换时间范围
const switchPeriod = (p) => {
  period.value = p
}

// 按时间筛选的订单
const filteredOrders = computed(() => {
  if (period.value === 'all') return debtOrders.value

  const now = new Date()
  let startDate
  if (period.value === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  } else if (period.value === 'quarter') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  } else if (period.value === 'year') {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  }

  if (!startDate) return debtOrders.value
  return debtOrders.value.filter(o => new Date(o.created_at) >= startDate)
})

// 筛选范围内欠款合计
const filteredDebt = computed(() => {
  return filteredOrders.value.reduce((sum, o) => sum + (Number(o.debt_amount) || 0), 0)
})

// 格式化
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const detail = await debtStore.fetchCustomerDebtDetail(customerId)
    if (detail) {
      customerName.value = detail.customer?.name || ''
      customerPhone.value = detail.customer?.phone || ''
      totalDebt.value = Number(detail.totalDebt) || 0
      debtOrders.value = detail.orders || []
    }
  } catch (e) {
    console.error('获取对账数据失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.reconcile-page {
  min-height: 100%;
  background: $bg-page;
  padding-top: calc(56px + $safe-area-top);
  padding-bottom: 70px;

  // ========== 导航栏 ==========
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    box-sizing: border-box;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: calc(12px + $safe-area-top) 16px;
      height: 48px;
      box-sizing: border-box;
    }

    .nav-back {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      .t-icon { font-size: 22px; color: white; }
    }

    .nav-title {
      font-size: 17px;
      font-weight: 600;
      color: white;
    }

    .nav-placeholder { width: 32px; }
  }

  // ========== 客户摘要 ==========
  .customer-summary {
    background: white;
    border-radius: 10px;
    padding: 16px;
    margin: 16px 0 12px;
    box-shadow: $shadow-sm;

    .summary-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;

      .avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, $primary-color, $primary-light);
        color: white;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .summary-info {
        .summary-name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
        }
        .summary-phone {
          font-size: 13px;
          color: $text-placeholder;
          margin-top: 2px;
        }
      }
    }

    .summary-stats {
      display: flex;
      align-items: center;
      background: $bg-page;
      border-radius: 8px;
      padding: 12px 16px;

      .stat-block {
        flex: 1;
        text-align: center;

        .stat-num {
          font-size: 20px;
          font-weight: 700;
          color: $text-primary;

          &.debt { color: $error-color; }
        }
        .stat-text {
          font-size: 12px;
          color: $text-placeholder;
          margin-top: 4px;
        }
      }

      .stat-divider {
        width: 1px;
        height: 30px;
        background: $border-lighter;
      }
    }
  }

  // ========== 时间筛选 ==========
  .period-tabs {
    display: flex;
    background: white;
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 12px;
    box-shadow: $shadow-sm;

    .period-tab {
      flex: 1;
      text-align: center;
      padding: 8px 0;
      font-size: 13px;
      color: $text-secondary;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;

      &.active {
        background: $primary-color;
        color: white;
        font-weight: 600;
      }
    }
  }

  // ========== 记录列表 ==========
  .record-list {
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 0;
      color: $text-placeholder;
      font-size: 14px;

      .loading-icon, .empty-icon {
        font-size: 36px;
        margin-bottom: 8px;
      }
      .loading-icon { animation: spin 1s linear infinite; }
    }

    .record-card {
      background: white;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 8px;
      box-shadow: $shadow-sm;

      .record-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;

        .record-no {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          font-family: 'Courier New', monospace;
        }

        .record-date {
          font-size: 12px;
          color: $text-placeholder;
        }
      }

      .record-body {
        display: flex;
        background: $bg-page;
        border-radius: 8px;
        padding: 10px 0;

        .record-col {
          flex: 1;
          text-align: center;

          .col-label {
            display: block;
            font-size: 11px;
            color: $text-placeholder;
            margin-bottom: 4px;
          }

          .col-value {
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;

            &.paid { color: $success-color; }
            &.debt { color: $error-color; }
          }
        }
      }
    }
  }

  // ========== 底部合计栏 ==========
  .total-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid $border-lighter;
    padding: 12px 16px;
    padding-bottom: calc(12px + #{$safe-area-bottom});
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
    z-index: 50;

    .total-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .total-label {
        font-size: 14px;
        color: $text-secondary;
        font-weight: 500;
      }

      .total-amount {
        font-size: 20px;
        font-weight: 700;

        &.debt { color: $error-color; }
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
