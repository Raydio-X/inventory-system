<template>
  <div class="page page-with-navbar accounts-page">
    <!-- 顶部导航栏 -->
    <navbar title="数据统计" />

    <!-- 数据统计模块 -->
    <div class="stats-section">
      <div class="section-header">
        <div class="section-title">
          <t-icon name="chart" />
          <span>销售数据</span>
        </div>
        <div class="time-switch">
          <div :class="['switch-item', { active: statsTimeDim === 'month' }]" @click="switchPeriod('month')">月度</div>
          <div :class="['switch-item', { active: statsTimeDim === 'year' }]" @click="switchPeriod('year')">年度</div>
        </div>
      </div>

      <!-- 时间选择器 -->
      <div class="time-selector">
        <div class="selector-arrow" @click="shiftTime(-1)">
          <t-icon name="chevron-left" />
        </div>
        <div class="selector-value">{{ statsLabel || '加载中...' }}</div>
        <div class="selector-arrow" @click="shiftTime(1)">
          <t-icon name="chevron-right" />
        </div>
      </div>

      <!-- 核心指标 -->
      <div class="stats-cards">
        <div class="stats-item primary" @click="goToProfitDetail">
          <div class="stats-item-value">¥{{ formatStatAmount(statsData.profit) }}</div>
          <div class="stats-item-label">利润金额</div>
          <div class="stats-item-arrow">
            <t-icon name="chevron-right" />
          </div>
        </div>
        <div class="stats-item">
          <div class="stats-item-value">{{ statsData.salesCount }}</div>
          <div class="stats-item-label">销售数量</div>
        </div>
        <div class="stats-item">
          <div class="stats-item-value">¥{{ formatStatAmount(statsData.salesAmount) }}</div>
          <div class="stats-item-label">销售额</div>
        </div>
        <div class="stats-item">
          <div class="stats-item-value">{{ statsData.orderCount }}</div>
          <div class="stats-item-label">订单数量</div>
        </div>
      </div>
    </div>

    <!-- 客户利润模块 -->
    <div class="customer-profit-section">
      <div class="section-header">
        <div class="section-title">
          <t-icon name="user" />
          <span>客户利润</span>
        </div>
      </div>

      <!-- 时间选择器 -->
      <div class="time-selector">
        <div class="selector-arrow" @click="shiftCustomerProfitTime(-1)">
          <t-icon name="chevron-left" />
        </div>
        <div class="selector-value">{{ customerProfitLabel || '加载中...' }}</div>
        <div class="selector-arrow" @click="shiftCustomerProfitTime(1)">
          <t-icon name="chevron-right" />
        </div>
      </div>

      <!-- 客户筛选 -->
      <div class="customer-filter">
        <t-input
          v-model="customerSearchKeyword"
          placeholder="搜索客户姓名"
          clearable
          class="search-input"
        >
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
      </div>

      <!-- 客户利润列表 -->
      <div class="customer-profit-list">
        <div v-if="loading" class="loading-state">
          <t-icon name="loading" class="loading-icon" />
          <span>加载中...</span>
        </div>

        <div v-else-if="filteredCustomerProfits.length === 0" class="empty-state">
          <t-icon name="inbox" class="empty-icon" />
          <span>暂无数据</span>
        </div>

        <div v-else class="profit-items">
          <div
            v-for="customer in filteredCustomerProfits"
            :key="customer.customerId"
            class="profit-item"
          >
            <div class="customer-info">
              <div class="customer-name">{{ customer.customerName }}</div>
              <div class="customer-stats">
                <span class="stat-item">订单 {{ customer.orderCount }}</span>
                <span class="stat-divider">|</span>
                <span class="stat-item">销量 {{ customer.salesCount }}件</span>
              </div>
            </div>
            <div class="profit-info">
              <div class="profit-amount" :class="{ negative: customer.profit < 0 }">
                ¥{{ formatStatAmount(customer.profit) }}
              </div>
              <div class="profit-label">利润</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '@/components/Navbar.vue'
import api from '@/utils/api'
import { Input } from 'tdesign-vue-next'

const router = useRouter()

// 数据统计 - 时间维度
const statsTimeDim = ref('month')
const statsTimeOffset = ref(0)

// 统计数据
const statsLabel = ref('')
const statsData = ref({
  profit: 0,
  salesCount: 0,
  salesAmount: 0,
  orderCount: 0
})

// 客户利润数据
const customerProfitTimeDim = ref('year')
const customerProfitTimeOffset = ref(0)
const customerProfitLabel = ref('')
const customerProfits = ref([])
const customerSearchKeyword = ref('')
const loading = ref(false)

// 筛选后的客户利润
const filteredCustomerProfits = computed(() => {
  if (!customerSearchKeyword.value) return customerProfits.value
  const keyword = customerSearchKeyword.value.toLowerCase()
  return customerProfits.value.filter(c =>
    c.customerName.toLowerCase().includes(keyword)
  )
})

// 切换时间维度
const switchPeriod = (period) => {
  statsTimeDim.value = period
  statsTimeOffset.value = 0
  fetchStatistics()
}

// 时间偏移切换
const shiftTime = (dir) => {
  statsTimeOffset.value += dir
  fetchStatistics()
}

// 客户利润时间偏移切换
const shiftCustomerProfitTime = (dir) => {
  customerProfitTimeOffset.value += dir
  fetchCustomerProfits()
}

// 跳转到利润详情
const goToProfitDetail = () => {
  router.push('/accounts/profit')
}

// 从后端获取统计数据
const fetchStatistics = async () => {
  try {
    const res = await api.get('/accounts/statistics', {
      params: {
        period: statsTimeDim.value,
        offset: statsTimeOffset.value
      }
    })
    if (res.success && res.data) {
      statsLabel.value = res.data.label
      statsData.value = {
        profit: res.data.profit || 0,
        salesCount: res.data.salesCount || 0,
        salesAmount: res.data.salesAmount || 0,
        orderCount: res.data.orderCount || 0
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 从后端获取客户利润数据
const fetchCustomerProfits = async () => {
  loading.value = true
  try {
    const res = await api.get('/accounts/customer-profit', {
      params: {
        period: customerProfitTimeDim.value,
        offset: customerProfitTimeOffset.value
      }
    })
    if (res.success && res.data) {
      customerProfitLabel.value = res.data.label
      customerProfits.value = res.data.customers || []
    }
  } catch (error) {
    console.error('获取客户利润数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化统计金额
const formatStatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 初始化
onMounted(() => {
  fetchStatistics()
  fetchCustomerProfits()
})
</script>

<style lang="scss" scoped>
.accounts-page {
  // 数据统计模块
  .stats-section {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin-bottom: $spacing-lg;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-md;

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: $font-md;
        font-weight: 600;
        color: $text-primary;

        .t-icon {
          font-size: 18px;
          color: $primary-color;
        }
      }

      .time-switch {
        display: flex;
        background: $bg-color;
        border-radius: 6px;
        padding: 2px;

        .switch-item {
          padding: 4px 12px;
          font-size: 12px;
          color: $text-secondary;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;

          &.active {
            background: $primary-color;
            color: white;
            font-weight: 600;
          }
        }
      }
    }

    .time-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 10px 0;
      margin-bottom: $spacing-md;

      .selector-arrow {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        cursor: pointer;
        color: $text-secondary;

        &:active {
          background: $bg-hover;
          color: $primary-color;
        }

        .t-icon {
          font-size: 18px;
        }
      }

      .selector-value {
        font-size: 15px;
        font-weight: 600;
        color: $text-primary;
        min-width: 100px;
        text-align: center;
      }
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;

      .stats-item {
        background: $bg-color;
        border-radius: $radius-md;
        padding: 14px 16px;

        .stats-item-value {
          font-size: 20px;
          font-weight: 700;
          color: $text-primary;
          margin-bottom: 4px;
        }

        .stats-item-label {
          font-size: 12px;
          color: $text-secondary;
        }

        &.primary {
          background: linear-gradient(135deg, $primary-color, $primary-light);
          cursor: pointer;
          position: relative;

          .stats-item-value,
          .stats-item-label {
            color: white;
          }

          .stats-item-arrow {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.8);
          }

          &:active {
            opacity: 0.9;
          }
        }
      }
    }
  }

  // 客户利润模块
  .customer-profit-section {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin-bottom: $spacing-lg;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-md;

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: $font-md;
        font-weight: 600;
        color: $text-primary;

        .t-icon {
          font-size: 18px;
          color: $primary-color;
        }
      }

      .header-actions {
        .time-switch {
          display: flex;
          background: $bg-color;
          border-radius: 6px;
          padding: 2px;

          .switch-item {
            padding: 4px 12px;
            font-size: 12px;
            color: $text-secondary;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;

            &.active {
              background: $primary-color;
              color: white;
              font-weight: 600;
            }
          }
        }
      }
    }

    .time-selector {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 10px 0;
      margin-bottom: $spacing-md;

      .selector-arrow {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        cursor: pointer;
        color: $text-secondary;

        &:active {
          background: $bg-hover;
          color: $primary-color;
        }

        .t-icon {
          font-size: 18px;
        }
      }

      .selector-value {
        font-size: 15px;
        font-weight: 600;
        color: $text-primary;
        min-width: 100px;
        text-align: center;
      }
    }

    .customer-filter {
      margin-bottom: $spacing-md;

      .search-input {
        width: 100%;
        border-radius: $radius-md;
        background: $bg-color;

        :deep(.t-input__inner) {
          height: 36px;
          padding-left: $spacing-md;
        }
      }
    }

    .customer-profit-list {
      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: $spacing-xl * 2;
        color: $text-placeholder;

        .loading-icon,
        .empty-icon {
          font-size: 48px;
          margin-bottom: $spacing-sm;
        }

        .loading-icon {
          animation: spin 1s linear infinite;
        }
      }

      .profit-items {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;

        .profit-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: $bg-color;
          border-radius: $radius-md;
          padding: $spacing-md;
          transition: all 0.2s;

          &:active {
            background: $bg-hover;
          }

          .customer-info {
            flex: 1;

            .customer-name {
              font-size: $font-md;
              font-weight: 600;
              color: $text-primary;
              margin-bottom: 4px;
            }

            .customer-stats {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: $font-xs;
              color: $text-secondary;

              .stat-divider {
                color: $text-placeholder;
              }
            }
          }

          .profit-info {
            text-align: right;

            .profit-amount {
              font-size: 18px;
              font-weight: 700;
              color: $success-color;

              &.negative {
                color: $error-color;
              }
            }

            .profit-label {
              font-size: $font-xs;
              color: $text-secondary;
              margin-top: 2px;
            }
          }
        }
      }
    }
  }
}

// 加载动画
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>