<template>
  <div class="page today-sales-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">今日销售单</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <div class="summary-card">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-value">{{ todayOrders.length }}</div>
          <div class="summary-label">订单数</div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <div class="summary-value">¥{{ formatAmount(totalSales) }}</div>
          <div class="summary-label">销售额</div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <div class="summary-value">¥{{ formatAmount(totalProfit) }}</div>
          <div class="summary-label">利润</div>
        </div>
      </div>
    </div>

    <!-- 销售单列表 -->
    <div v-if="todayOrders.length === 0" class="empty-state">
      <t-icon name="inbox" class="empty-icon" />
      <div class="empty-text">今日暂无销售订单</div>
    </div>

    <div v-else class="order-list">
      <div
        v-for="order in todayOrders"
        :key="order.id"
        class="receipt-card"
      >
        <!-- 单据标题栏 -->
        <div class="receipt-title-bar" @click="goToDetail(order)">
          <div class="title-left">
            <span class="receipt-label">销售单</span>
          </div>
          <div class="title-right">
            <span :class="['status-tag', getPaymentStatusClass(order.paymentStatus)]">
              {{ getStatusText(order.paymentStatus) }}
            </span>
            <t-icon name="chevron-right" class="arrow-icon" />
          </div>
        </div>

        <!-- 单据基本信息 -->
        <div class="receipt-info" @click="goToDetail(order)">
          <div class="info-row">
            <span class="info-label">单号</span>
            <span class="info-value mono">{{ order.orderNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">客户</span>
            <span class="info-value">{{ order.customerName || '散客' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">时间</span>
            <span class="info-value">{{ formatTime(order.createdAt) }}</span>
          </div>
        </div>

        <!-- 金额摘要 -->
        <div class="receipt-amount-bar" @click="goToDetail(order)">
          <div class="amount-section">
            <span class="amount-label">销售额</span>
            <span class="amount-value">¥{{ formatAmount(order.totalAmount) }}</span>
          </div>
          <div class="amount-divider"></div>
          <div class="amount-section">
            <span class="amount-label">利润</span>
            <span :class="['amount-value', 'profit', { negative: getOrderProfit(order) < 0 }]">
              {{ getOrderProfit(order) < 0 ? '-' : '' }}¥{{ formatAmount(Math.abs(getOrderProfit(order))) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const billingStore = useBillingStore()

// 今日销售订单
const todayOrders = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return billingStore.salesOrders.filter(o => o.createdAt?.slice(0, 10) === today)
})

// 总销售额
const totalSales = computed(() => {
  return todayOrders.value.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
})

// 总利润
const totalProfit = computed(() => {
  return todayOrders.value.reduce((sum, o) => sum + getOrderProfit(o), 0)
})

// 计算订单利润
const getOrderProfit = (order) => {
  const items = order.items || []
  const cost = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.costPrice || 0), 0)
  return (order.totalAmount || 0) - cost
}

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  const d = new Date(time)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// 获取状态文字
const getStatusText = (status) => {
  const texts = {
    paid: '已付清',
    partial: '部分付款',
    unpaid: '未付款',
    settled: '已结清'
  }
  return texts[status] || status || '已完成'
}

// 获取付款状态样式类
const getPaymentStatusClass = (status) => {
  if (status === 'paid' || status === 'settled') return 'paid'
  if (status === 'partial') return 'partial'
  if (status === 'unpaid') return 'unpaid'
  return ''
}

// 跳转详情
const goToDetail = (order) => {
  router.push(`/records/sales/${order.id}`)
}

onMounted(() => {
  billingStore.fetchSalesOrders()
})
</script>

<style lang="scss" scoped>
.today-sales-page {
  padding-top: calc(56px + $safe-area-top);
  padding-bottom: 80px;

  // 导航栏
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: linear-gradient(135deg, $primary-color, rgba($primary-color, 0.8));
    color: white;
    border-radius: 0 0 12px 12px;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: calc(12px + $safe-area-top) 16px 12px 16px;
    }

    .nav-back {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 50%;

      .t-icon {
        font-size: 20px;
        color: white;
      }

      &:active {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    .nav-placeholder {
      width: 32px;
    }

    .nav-title {
      font-size: 16px;
      font-weight: 600;
    }
  }

  // 汇总卡片
  .summary-card {
    background: $bg-card;
    border-radius: $radius-lg;
    margin-top: 12px;
    overflow: hidden;

    .summary-row {
      display: flex;
      align-items: center;
      padding: 16px;

      .summary-item {
        flex: 1;
        text-align: center;

        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: $text-primary;
        }

        .summary-label {
          font-size: 12px;
          color: $text-secondary;
          margin-top: 2px;
        }
      }

      .summary-divider {
        width: 1px;
        height: 28px;
        background: $border-lighter;
      }
    }
  }

  // 空状态
  .empty-state {
    text-align: center;
    padding: 60px 0;

    .empty-icon {
      font-size: 48px;
      color: $text-placeholder;
      margin-bottom: 12px;
    }

    .empty-text {
      font-size: 14px;
      color: $text-secondary;
    }
  }

  // 订单列表
  .order-list {
    margin-top: 12px;

    .receipt-card {
      background: $bg-card;
      border-radius: $radius-lg;
      margin-bottom: 12px;
      overflow: hidden;
      border: 1px solid $border-lighter;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

      // 标题栏
      .receipt-title-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;
        cursor: pointer;
        background: linear-gradient(135deg, rgba($primary-color, 0.03), rgba($primary-color, 0.01));

        &:active {
          background: rgba($primary-color, 0.06);
        }

        .title-left {
          .receipt-label {
            font-size: 16px;
            font-weight: 700;
            color: $text-primary;
          }
        }

        .title-right {
          display: flex;
          align-items: center;
          gap: 10px;

          .status-tag {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;

            &.paid {
              background: rgba($success-color, 0.1);
              color: $success-color;
            }

            &.partial {
              background: rgba($warning-color, 0.1);
              color: $warning-color;
            }

            &.unpaid {
              background: rgba($error-color, 0.1);
              color: $error-color;
            }
          }

          .arrow-icon {
            font-size: 18px;
            color: $text-placeholder;
          }
        }
      }

      // 基本信息
      .receipt-info {
        padding: 10px 18px;

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;

          .info-label {
            font-size: 14px;
            color: $text-placeholder;
          }

          .info-value {
            font-size: 14px;
            color: $text-secondary;
            font-weight: 500;

            &.mono {
              font-family: 'Courier New', monospace;
              color: $text-primary;
              font-weight: 600;
            }
          }
        }
      }

      // 金额摘要
      .receipt-amount-bar {
        display: flex;
        padding: 12px 18px;
        background: rgba($primary-color, 0.02);
        border-top: 1px solid $border-lighter;
        gap: 12px;

        .amount-section {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .amount-divider {
          width: 1px;
          background: $border-lighter;
          align-self: stretch;
        }

        .amount-label {
          font-size: 14px;
          color: $text-secondary;
          font-weight: 500;
        }

        .amount-value {
          font-size: 16px;
          font-weight: 700;
          color: $primary-color;

          &.profit {
            color: $success-color;

            &.negative {
              color: $error-color;
            }
          }
        }
      }
    }
  }
}
</style>
