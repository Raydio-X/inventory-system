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
        <div class="stats-item primary">
          <div class="stats-item-value">¥{{ formatStatAmount(statsData.profit) }}</div>
          <div class="stats-item-label">利润金额</div>
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

    <!-- 今日数据 -->
    <div class="today-section">
      <div class="section-title">
        <t-icon name="time" />
        <span>今日数据</span>
      </div>
      <div class="today-cards">
        <div class="today-item">
          <div class="today-value">¥{{ formatStatAmount(todayData.salesAmount) }}</div>
          <div class="today-label">今日销售额</div>
        </div>
        <div class="today-item">
          <div class="today-value">{{ todayData.salesCount }}</div>
          <div class="today-label">今日销量</div>
        </div>
        <div class="today-item">
          <div class="today-value">{{ todayData.orderCount }}</div>
          <div class="today-label">今日订单</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import api from '@/utils/api'

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

// 今日数据
const todayData = ref({
  salesAmount: 0,
  salesCount: 0,
  orderCount: 0
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

// 从后端获取今日数据
const fetchTodayStatistics = async () => {
  try {
    const res = await api.get('/accounts/today')
    if (res.success && res.data) {
      todayData.value = {
        salesAmount: res.data.salesAmount || 0,
        salesCount: res.data.salesCount || 0,
        orderCount: res.data.orderCount || 0
      }
    }
  } catch (error) {
    console.error('获取今日数据失败:', error)
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
  fetchTodayStatistics()
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

          .stats-item-value,
          .stats-item-label {
            color: white;
          }
        }
      }
    }
  }

  // 今日数据
  .today-section {
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: $spacing-md;

      .t-icon {
        font-size: 18px;
        color: $primary-color;
        position: relative;
        top: -1px;
      }
    }

    .today-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      .today-item {
        background: $bg-card;
        border-radius: $radius-md;
        padding: 14px 12px;
        text-align: center;

        .today-value {
          font-size: 18px;
          font-weight: 700;
          color: $text-primary;
          margin-bottom: 4px;
        }

        .today-label {
          font-size: 12px;
          color: $text-secondary;
        }
      }
    }
  }
}
</style>