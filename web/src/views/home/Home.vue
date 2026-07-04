<template>
  <div class="page home-page">
    <!-- 顶部标题 -->
    <div class="page-header">
      <h1 class="page-title">服装进销存</h1>
      <p class="page-date">{{ currentDate }}</p>
    </div>

    <!-- 今日数据卡片 -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-value">{{ formatAmount(todayStats.sales) }}</div>
        <div class="stat-label">今日销售额</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ todayStats.orders }}</div>
        <div class="stat-label">今日订单</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">{{ formatAmount(todayStats.debt) }}</div>
        <div class="stat-label">待收欠款</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ todayStats.warning }}</div>
        <div class="stat-label">库存预警</div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="section">
      <div class="section-title">快捷操作</div>
      <div class="quick-actions">
        <div class="action-item" @click="goTo('/return')">
          <t-icon name="rollback" class="action-icon" />
          <span class="action-label">客户退货</span>
        </div>
        <div class="action-item" @click="goTo('/suppliers')">
          <t-icon name="store" class="action-icon" />
          <span class="action-label">供应商管理</span>
        </div>
        <div class="action-item" @click="goTo('/debt')">
          <t-icon name="wallet" class="action-icon" />
          <span class="action-label">欠款核对</span>
        </div>
        <div class="action-item" @click="goTo('/accounts')">
          <t-icon name="chart" class="action-icon" />
          <span class="action-label">数据统计</span>
        </div>
      </div>
    </div>

    <!-- 近期操作记录 -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <t-icon name="time" />
          <span>近期操作记录</span>
        </div>
        <div class="view-all-btn" @click="goTo('/records')">
          <span>查看全部</span>
          <t-icon name="chevron-right" />
        </div>
      </div>

      <!-- 标签页切换 -->
      <div class="record-tabs">
        <div
          :class="['tab-item', { active: activeTab === 'all' }]"
          @click="activeTab = 'all'"
        >全部</div>
        <div
          :class="['tab-item', { active: activeTab === 'sales' }]"
          @click="activeTab = 'sales'"
        >
          <span class="tab-dot sales-dot"></span>开单
        </div>
        <div
          :class="['tab-item', { active: activeTab === 'returns' }]"
          @click="activeTab = 'returns'"
        >
          <span class="tab-dot return-dot"></span>退货
        </div>
      </div>

      <!-- 记录列表 -->
      <div class="record-list">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <t-icon name="inbox" class="empty-icon" />
          <span class="empty-text">暂无记录</span>
        </div>
        <div
          v-for="record in filteredRecords"
          :key="record.id"
          class="record-item"
          :class="record.type"
          @click="goToRecord(record)"
        >
          <div class="record-left">
            <div class="record-type-bar" :class="record.type"></div>
            <div class="record-info">
              <div class="record-top">
                <span :class="['record-type-tag', record.type]">
                  {{ record.type === 'sales' ? '开单' : '退货' }}
                </span>
                <span class="record-no">{{ record.orderNo }}</span>
              </div>
              <div class="record-bottom">
                <span class="record-customer">{{ record.customerName }}</span>
                <span class="record-time">{{ formatTime(record.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div class="record-right">
            <span :class="['record-amount', record.type]">
              {{ record.type === 'sales' ? '' : '-' }}{{ formatAmount(record.totalAmount) }}
            </span>
            <span :class="['record-status', getPaymentStatusClass(record)]">
              {{ record.statusText }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from 'tdesign-vue-next'
import { useBillingStore } from '@/store/billing'
import { useDebtStore } from '@/store/debt'
import { useInventoryStore } from '@/store/inventory'
import { useProductStore } from '@/store/product'

const router = useRouter()
const billingStore = useBillingStore()
const debtStore = useDebtStore()
const inventoryStore = useInventoryStore()
const productStore = useProductStore()

// 标签页切换
const activeTab = ref('all')

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})

// 今日统计
const todayStats = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const todaySales = billingStore.salesOrders.filter(o => o.createdAt.slice(0, 10) === today)
  const salesAmount = todaySales.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  return {
    sales: salesAmount,
    orders: todaySales.length,
    debt: debtStore.totalDebt,
    warning: inventoryStore.warningCount
  }
})

// 合并所有操作记录
const allRecords = computed(() => {
  const salesRecords = billingStore.salesOrders.map(order => ({
    id: `s-${order.id}`,
    type: 'sales',
    orderNo: order.orderNo,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    status: order.paymentStatus || order.status,
    statusText: getSalesStatusText(order.paymentStatus || order.status),
    createdAt: order.createdAt
  }))

  const returnRecords = billingStore.returnOrders.map(order => ({
    id: `r-${order.id}`,
    type: 'returns',
    orderNo: order.orderNo,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    status: order.status,
    statusText: '已退货',
    createdAt: order.createdAt
  }))

  return [...salesRecords, ...returnRecords]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

// 筛选后的记录（始终显示最新的10条）
const filteredRecords = computed(() => {
  let records = allRecords.value
  if (activeTab.value !== 'all') {
    records = records.filter(r => r.type === activeTab.value)
  }
  return records.slice(0, 10)
})

// 获取销售状态文字
const getSalesStatusText = (status) => {
  const texts = {
    paid: '已付清',
    partial: '部分付款',
    unpaid: '未付款',
    settled: '已结清',
    pending: '待付款'
  }
  return texts[status] || status || '已完成'
}

// 获取付款状态样式类
const getPaymentStatusClass = (record) => {
  if (record.type === 'returns') return 'returns'
  const status = record.status
  if (status === 'paid' || status === 'settled') return 'paid'
  if (status === 'partial') return 'partial'
  if (status === 'unpaid') return 'unpaid'
  return 'sales'
}

// 格式化金额
const formatAmount = (amount) => {
  return `¥${Number(amount).toFixed(2)}`
}

// 格式化时间
const formatTime = (time) => {
  const date = new Date(time)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 跳转
const goTo = (path) => router.push(path)

// 跳转到记录详情
const goToRecord = (record) => {
  // record.id 格式: 's-{orderId}' 或 'r-{orderId}'
  const realId = record.id.replace(/^[sr]-/, '')
  const type = record.type === 'returns' ? 'returns' : 'sales'
  router.push(`/records/${type}/${realId}`)
}

// 初始化数据
onMounted(() => {
  productStore.initData()
  billingStore.initData()
  debtStore.initData()
  inventoryStore.initData()
})
</script>

<style lang="scss" scoped>
.home-page {
  .page-header {
    margin-bottom: $spacing-xl;

    .page-title {
      font-size: $font-xxl;
      font-weight: 700;
      color: $text-primary;
      margin-bottom: $spacing-xs;
    }

    .page-date {
      font-size: $font-sm;
      color: $text-secondary;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-md;
    margin-bottom: $spacing-xl;

    .stat-card {
      background: $bg-card;
      border-radius: $radius-lg;
      padding: $spacing-lg;
      box-shadow: $shadow-sm;

      .stat-value {
        font-size: $font-xl;
        font-weight: 700;
        color: $text-primary;
        margin-bottom: $spacing-xs;
      }

      .stat-label {
        font-size: $font-xs;
        color: $text-secondary;
      }

      &.primary {
        background: linear-gradient(135deg, $primary-color, $primary-light);

        .stat-value, .stat-label {
          color: white;
        }
      }

      &.warning {
        .stat-value {
          color: $warning-color;
        }
      }
    }
  }

  .section {
    margin-bottom: $spacing-xl;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-md;
    }

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
        position: relative;
        top: 1px;
      }
    }

    .view-all-btn {
      display: flex;
      align-items: center;
      gap: 2px;
      color: $text-secondary;
      font-size: $font-xs;
      cursor: pointer;

      .t-icon {
        font-size: 14px;
      }

      &:active {
        color: $primary-color;
      }
    }
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: $spacing-md;

    .action-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: $spacing-lg;
      background: $bg-card;
      border-radius: $radius-lg;
      cursor: pointer;

      &:active {
        background: $bg-hover;
      }

      .action-icon {
        font-size: 28px;
        margin-bottom: $spacing-sm;
        color: $primary-color;
      }

      .action-label {
        font-size: $font-xs;
        color: $text-primary;
      }
    }
  }

  // 标签页
  .record-tabs {
    display: flex;
    gap: 0;
    background: $bg-color;
    border-radius: $radius-md;
    padding: 3px;
    margin-bottom: $spacing-md;

    .tab-item {
      flex: 1;
      text-align: center;
      padding: 8px 0;
      font-size: 13px;
      color: $text-secondary;
      border-radius: $radius-sm;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;

      &.active {
        background: $bg-white;
        color: $text-primary;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .tab-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;

        &.sales-dot {
          background: $success-color;
        }

        &.return-dot {
          background: $error-color;
        }
      }
    }
  }

  // 记录列表
  .record-list {
    background: $bg-card;
    border-radius: $radius-lg;

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 0;
      color: $text-placeholder;

      .empty-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }

      .empty-text {
        font-size: $font-sm;
      }
    }

    .record-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid $border-light;
      cursor: pointer;

      &:active {
        background: $bg-hover;
      }

      &:last-child {
        border-bottom: none;
      }

      .record-left {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;

        .record-type-bar {
          width: 3px;
          height: 36px;
          border-radius: 2px;
          margin-right: 12px;
          flex-shrink: 0;

          &.sales {
            background: $success-color;
          }

          &.returns {
            background: $error-color;
          }
        }

        .record-info {
          flex: 1;
          min-width: 0;

          .record-top {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;

            .record-type-tag {
              padding: 1px 6px;
              border-radius: 3px;
              font-size: 11px;
              font-weight: 500;
              flex-shrink: 0;

              &.sales {
                background: rgba($success-color, 0.1);
                color: $success-color;
              }

              &.returns {
                background: rgba($error-color, 0.1);
                color: $error-color;
              }
            }

            .record-no {
              font-size: $font-xs;
              color: $text-secondary;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .record-bottom {
            display: flex;
            align-items: center;
            gap: 8px;

            .record-customer {
              font-size: $font-sm;
              color: $text-primary;
              font-weight: 500;
            }

            .record-time {
              font-size: $font-xs;
              color: $text-placeholder;
            }
          }
        }
      }

      .record-right {
        text-align: right;
        flex-shrink: 0;
        margin-left: 12px;

        .record-amount {
          font-size: $font-md;
          font-weight: 600;
          display: block;
          margin-bottom: 2px;

          &.sales {
            color: $success-color;
          }

          &.returns {
            color: $error-color;
          }
        }

        .record-status {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 11px;

          &.paid {
            background: rgba($success-color, 0.08);
            color: $success-color;
          }

          &.partial {
            background: rgba($warning-color, 0.08);
            color: $warning-color;
          }

          &.unpaid {
            background: rgba($error-color, 0.08);
            color: $error-color;
          }

          &.returns {
            background: rgba($error-color, 0.08);
            color: $error-color;
          }
        }
      }
    }
  }
}
</style>