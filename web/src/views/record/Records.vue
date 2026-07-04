<template>
  <div class="page records-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">操作记录</div>
        <div class="nav-placeholder"></div>
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

    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">共</span>
        <span class="stat-value">{{ filteredRecords.length }}</span>
        <span class="stat-label">条记录</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-dot sales-dot"></span>
        <span class="stat-value">{{ salesCount }}</span>
        <span class="stat-label">笔开单</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-dot return-dot"></span>
        <span class="stat-value">{{ returnCount }}</span>
        <span class="stat-label">笔退货</span>
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
        class="record-card"
        :class="record.type"
        @click="goToRecord(record)"
      >
        <!-- 顶部：类型标签 + 单号 + 时间 -->
        <div class="card-top">
          <div class="card-left">
            <span :class="['record-type-tag', record.type]">
              {{ record.type === 'sales' ? '开单' : '退货' }}
            </span>
            <span class="record-no">{{ record.orderNo }}</span>
          </div>
          <div class="card-right">
            <span class="record-time">{{ formatTime(record.createdAt) }}</span>
          </div>
        </div>

        <!-- 中部：客户 + 金额 -->
        <div class="card-middle">
          <div class="info-row">
            <span class="info-label">客户</span>
            <span class="info-value">{{ record.customerName }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">金额</span>
            <span :class="['info-value', 'amount', record.type]">
              {{ record.type === 'sales' ? '' : '-' }}{{ formatAmount(record.totalAmount) }}
            </span>
          </div>
        </div>

        <!-- 底部：状态 -->
        <div class="card-bottom">
          <div class="status-row">
            <span class="status-label">状态</span>
            <span :class="['status-value', getPaymentStatusClass(record)]">{{ record.statusText }}</span>
          </div>
        </div>

        <!-- 类型色条 -->
        <div class="type-bar" :class="record.type"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from 'tdesign-vue-next'
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const billingStore = useBillingStore()

// 标签页切换
const activeTab = ref('all')

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

// 筛选后的记录
const filteredRecords = computed(() => {
  let records = allRecords.value
  if (activeTab.value !== 'all') {
    records = records.filter(r => r.type === activeTab.value)
  }
  return records
})

// 统计数量
const salesCount = computed(() => billingStore.salesOrders.length)
const returnCount = computed(() => billingStore.returnOrders.length)

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
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

// 跳转到记录详情
const goToRecord = (record) => {
  const realId = record.id.replace(/^[sr]-/, '')
  const type = record.type === 'returns' ? 'returns' : 'sales'
  router.push(`/records/${type}/${realId}`)
}

// 初始化数据
onMounted(() => {
  billingStore.initData()
})
</script>

<style lang="scss" scoped>
.records-page {
  padding-bottom: 80px;

  // 导航栏
  .nav-bar {
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: white;
    border-radius: 0 0 12px 12px;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
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

  // 标签页
  .record-tabs {
    display: flex;
    gap: 0;
    background: $bg-color;
    border-radius: $radius-md;
    padding: 3px;
    margin-top: 12px;

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

  // 统计信息
  .stats-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    background: $bg-card;
    border-radius: $radius-lg;
    margin-top: 12px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;

      .stat-label {
        font-size: 13px;
        color: $text-secondary;
      }

      .stat-value {
        font-size: 15px;
        font-weight: 600;
        color: $text-primary;
      }

      .stat-dot {
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

    .stat-divider {
      width: 1px;
      height: 16px;
      background: $border-light;
      margin: 0 16px;
    }
  }

  // 记录列表
  .record-list {
    margin-top: 12px;

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 0;
      background: $bg-card;
      border-radius: $radius-lg;
      color: $text-placeholder;

      .empty-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }

      .empty-text {
        font-size: $font-sm;
      }
    }

    .record-card {
      background: $bg-card;
      border-radius: $radius-lg;
      margin-bottom: 12px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      cursor: pointer;

      &:active {
        background: $bg-hover;
      }

      .type-bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        border-radius: 4px 0 0 4px;

        &.sales {
          background: $success-color;
        }

        &.returns {
          background: $error-color;
        }
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .card-left {
          display: flex;
          align-items: center;
          gap: 8px;

          .record-type-tag {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;

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
            font-size: $font-sm;
            color: $text-secondary;
          }
        }

        .card-right {
          .record-time {
            font-size: $font-xs;
            color: $text-placeholder;
          }
        }
      }

      .card-middle {
        display: flex;
        gap: 24px;
        margin-bottom: 12px;
        padding-left: 8px;

        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;

          .info-label {
            font-size: $font-xs;
            color: $text-placeholder;
          }

          .info-value {
            font-size: $font-sm;
            color: $text-primary;

            &.amount {
              font-weight: 600;

              &.sales {
                color: $success-color;
              }

              &.returns {
                color: $error-color;
              }
            }
          }
        }
      }

      .card-bottom {
        padding-left: 8px;

        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;

          .status-label {
            font-size: $font-xs;
            color: $text-placeholder;
          }

          .status-value {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;

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
}
</style>