<template>
  <div class="page record-detail-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar" :class="recordData.type">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">{{ recordData.type === 'sales' ? '销售单详情' : '退货单详情' }}</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 单据区域 -->
    <div class="receipt-card">
      <!-- 单据头部 -->
      <div class="receipt-header">
        <div class="receipt-type-badge" :class="recordData.type">
          <t-icon :name="recordData.type === 'sales' ? 'shop' : 'rollback'" />
          <span>{{ recordData.type === 'sales' ? '销售单' : '退货单' }}</span>
        </div>
        <div class="receipt-status" :class="getPaymentStatusClass()">
          {{ recordData.statusText }}
        </div>
      </div>

      <!-- 单号 + 时间 -->
      <div class="receipt-meta">
        <div class="meta-row">
          <span class="meta-label">单号</span>
          <span class="meta-value order-no">{{ recordData.orderNo }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">时间</span>
          <span class="meta-value">{{ formatDateTime(recordData.createdAt) }}</span>
        </div>
      </div>

      <!-- 分割线 -->
      <div class="receipt-divider">
        <span class="divider-dot"></span>
        <span class="divider-line"></span>
        <span class="divider-dot"></span>
      </div>

      <!-- 客户信息 -->
      <div class="receipt-section">
        <div class="section-title">
          <t-icon name="user" />
          <span>客户信息</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">客户名称</span>
            <span class="info-value">{{ recordData.customerName }}</span>
          </div>
          <div v-if="recordData.customerPhone" class="info-item">
            <span class="info-label">联系电话</span>
            <span class="info-value">{{ recordData.customerPhone }}</span>
          </div>
        </div>
      </div>

      <!-- 商品明细 -->
      <div class="receipt-section">
        <div class="section-title">
          <t-icon name="cart" />
          <span>商品明细</span>
          <span class="item-count">共 {{ recordData.items?.length || 0 }} 件</span>
        </div>

        <div v-if="recordData.items && recordData.items.length > 0" class="items-container">
          <!-- 表头 -->
          <div class="detail-table-header">
            <span class="col-name">商品</span>
            <span class="col-spec">规格</span>
            <span class="col-price">单价</span>
            <span class="col-qty">数量</span>
            <span class="col-sub">小计</span>
          </div>

          <!-- 商品分组列表 -->
          <div class="detail-items">
            <div v-for="group in groupItemsByProduct(recordData.items)" :key="group.productName" class="product-group">
              <!-- 商品名称行 -->
              <div class="product-group-header">
                <span class="group-name">{{ group.productName }}</span>
                <span class="group-count">{{ group.items.length }}个规格</span>
              </div>
              <!-- 规格明细 -->
              <div v-for="item in group.items" :key="item.skuId || item.id" class="detail-item">
                <span class="col-name"></span>
                <span class="col-spec">
                  <span class="sku-tag">{{ item.color || '-' }}</span>
                  <span class="sku-tag">{{ item.size || '-' }}</span>
                </span>
                <span class="col-price">¥{{ formatAmount(item.price) }}</span>
                <span class="col-qty">{{ item.quantity }}</span>
                <span class="col-sub">¥{{ formatAmount(item.price * item.quantity) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-items">暂无商品明细</div>
      </div>

      <!-- 分割线 -->
      <div class="receipt-divider">
        <span class="divider-dot"></span>
        <span class="divider-line"></span>
        <span class="divider-dot"></span>
      </div>

      <!-- 金额汇总 -->
      <div class="receipt-section">
        <div class="section-title">
          <t-icon name="wealth-1" />
          <span>金额汇总</span>
        </div>
        <div class="amount-rows">
          <div class="amount-row">
            <span class="amount-label">商品数量</span>
            <span class="amount-value">{{ totalQuantity }} 件</span>
          </div>
          <div class="amount-row">
            <span class="amount-label">订单金额</span>
            <span class="amount-value">¥{{ formatAmount(recordData.totalAmount) }}</span>
          </div>
          <div class="amount-row">
            <span class="amount-label">利润</span>
            <span :class="['amount-value', 'profit', { negative: orderProfit < 0 }]">
              {{ orderProfit < 0 ? '-' : '' }}¥{{ formatAmount(Math.abs(orderProfit)) }}
            </span>
          </div>
          <div v-if="recordData.type === 'sales' && recordData.discount > 0" class="amount-row">
            <span class="amount-label">优惠折扣</span>
            <span class="amount-value discount">-¥{{ formatAmount(recordData.discount) }}</span>
          </div>
          <div v-if="recordData.type === 'sales'" class="amount-row">
            <span class="amount-label">已付金额</span>
            <span class="amount-value paid">¥{{ formatAmount(recordData.paidAmount) }}</span>
          </div>
          <div v-if="recordData.type === 'sales' && recordData.debtAmount > 0" class="amount-row">
            <span class="amount-label">欠款金额</span>
            <span class="amount-value debt">¥{{ formatAmount(recordData.debtAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 底部合计 -->
      <div class="receipt-total" :class="recordData.type">
        <span class="total-label">{{ recordData.type === 'sales' ? '实收金额' : '退货金额' }}</span>
        <span class="total-value">¥{{ formatAmount(recordData.totalAmount) }}</span>
      </div>
    </div>

    <!-- 备注信息 -->
    <div v-if="recordData.remark" class="remark-card">
      <div class="section-title">
        <t-icon name="chat" />
        <span>备注</span>
      </div>
      <div class="remark-content">{{ recordData.remark }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const route = useRoute()
const billingStore = useBillingStore()

// 获取路由参数
const recordType = computed(() => route.params.type) // 'sales' | 'returns'
const recordId = computed(() => route.params.id)

// 查找订单数据
const recordData = computed(() => {
  let order = null

  if (recordType.value === 'sales') {
    order = billingStore.salesOrders.find(o => String(o.id) === String(recordId.value))
  } else if (recordType.value === 'returns') {
    order = billingStore.returnOrders.find(o => String(o.id) === String(recordId.value))
  }

  if (!order) {
    return {
      type: recordType.value || 'sales',
      orderNo: '-',
      customerName: '-',
      customerPhone: '',
      totalAmount: 0,
      paidAmount: 0,
      debtAmount: 0,
      discount: 0,
      status: '',
      statusText: '-',
      items: [],
      createdAt: new Date().toISOString(),
      remark: ''
    }
  }

  return {
    type: recordType.value,
    orderNo: order.orderNo,
    customerName: order.customerName || '散客',
    customerPhone: order.customerPhone || order.phone || '',
    totalAmount: order.totalAmount || 0,
    paidAmount: order.paidAmount || 0,
    debtAmount: order.debtAmount || 0,
    discount: order.discount || 0,
    status: order.paymentStatus || order.status,
    statusText: getStatusText(order.paymentStatus || order.status, recordType.value),
    items: order.items || [],
    createdAt: order.createdAt,
    remark: order.remark || ''
  }
})

// 商品总数量
const totalQuantity = computed(() => {
  return (recordData.value.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
})

// 计算订单利润 = 销售额 - 成本（退货单利润为负）
const orderProfit = computed(() => {
  const items = recordData.value.items || []
  const cost = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.costPrice || 0), 0)
  const sales = recordData.value.totalAmount || 0
  if (recordData.value.type === 'returns') {
    return -(sales - cost)
  }
  return sales - cost
})

// 尺码排序辅助函数
const getSizeOrder = (size) => {
  if (!size) return 999
  const s = String(size).toUpperCase().trim()
  // 常见尺码映射
  const sizeMap = {
    'XS': 1, 'XSMALL': 1,
    'S': 2, 'SMALL': 2,
    'M': 3, 'MEDIUM': 3,
    'L': 4, 'LARGE': 4,
    'XL': 5, 'X-LARGE': 5,
    'XXL': 6, '2XL': 6, 'XX-LARGE': 6,
    'XXXL': 7, '3XL': 7, 'XXX-LARGE': 7,
    '4XL': 8, 'XXXXL': 8,
    '5XL': 9
  }
  if (sizeMap[s] !== undefined) return sizeMap[s]
  // 数字尺码（如 36, 38, 40 等）
  const num = parseInt(s)
  if (!isNaN(num)) return num
  // 其他情况按字符串排序
  return 999
}

// 按商品名称分组，并按颜色+尺码排序
const groupItemsByProduct = (items) => {
  if (!items || items.length === 0) return []

  const groups = {}
  items.forEach(item => {
    const productName = item.productName || '未知商品'
    if (!groups[productName]) {
      groups[productName] = {
        productName,
        items: []
      }
    }
    groups[productName].items.push(item)
  })

  // 对每个分组内的规格进行排序：先按颜色，再按尺码升序
  Object.values(groups).forEach(group => {
    group.items.sort((a, b) => {
      const colorA = (a.color || '').toString().trim()
      const colorB = (b.color || '').toString().trim()
      // 先按颜色排序（使用中文拼音）
      if (colorA !== colorB) {
        return colorA.localeCompare(colorB, 'zh-CN')
      }
      // 同颜色按尺码升序
      return getSizeOrder(a.size) - getSizeOrder(b.size)
    })
  })

  return Object.values(groups)
}

// 获取状态文字
const getStatusText = (status, type) => {
  if (type === 'returns') return '已退货'
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
const getPaymentStatusClass = () => {
  if (recordData.value.type === 'returns') return 'returns'
  const status = recordData.value.status
  if (status === 'paid' || status === 'settled') return 'paid'
  if (status === 'partial') return 'partial'
  if (status === 'unpaid') return 'unpaid'
  return 'sales'
}

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 格式化日期时间
const formatDateTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

onMounted(() => {
  billingStore.initData()
})
</script>

<style lang="scss" scoped>
.record-detail-page {
  padding-bottom: 40px;
  padding-top: calc(56px + $safe-area-top);

  // 导航栏
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: white;
    border-radius: 0 0 12px 12px;
    width: 100%;

    &.returns {
      background: linear-gradient(135deg, $error-color, #ff7875);
    }

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

  // 单据卡片
  .receipt-card {
    background: $bg-card;
    border-radius: $radius-lg;
    margin-top: 12px;
    overflow: hidden;

    // 单据头部
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px dashed $border-light;

      .receipt-type-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 16px;
        font-weight: 700;

        .t-icon {
          font-size: 20px;
        }

        &.sales {
          color: $success-color;
        }

        &.returns {
          color: $error-color;
        }
      }

      .receipt-status {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
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

        &.returns {
          background: rgba($error-color, 0.1);
          color: $error-color;
        }
      }
    }

    // 单号 + 时间
    .receipt-meta {
      padding: 12px 20px;

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;

        .meta-label {
          font-size: 13px;
          color: $text-placeholder;
        }

        .meta-value {
          font-size: 13px;
          color: $text-secondary;

          &.order-no {
            font-family: 'Courier New', monospace;
            font-weight: 500;
            color: $text-primary;
          }
        }
      }
    }

    // 分割线
    .receipt-divider {
      display: flex;
      align-items: center;
      padding: 0 20px;
      margin: 4px 0;

      .divider-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: $bg-page;
        flex-shrink: 0;
      }

      .divider-line {
        flex: 1;
        border-top: 1px dashed $border-light;
        margin: 0 -4px;
      }
    }

    // 单据区块
    .receipt-section {
      padding: 12px 20px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 12px;

        .t-icon {
          font-size: 18px;
          color: $primary-color;
          position: relative;
          top: 1px;
        }

        .item-count {
          font-size: 12px;
          font-weight: 400;
          color: $text-placeholder;
          margin-left: 4px;
        }
      }
    }

    // 客户信息
    .info-grid {
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;

        .info-label {
          font-size: 13px;
          color: $text-placeholder;
        }

        .info-value {
          font-size: 14px;
          color: $text-primary;
          font-weight: 500;
        }
      }
    }

    // 商品明细容器
    .items-container {
      // 表头
      .detail-table-header {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid $border-lighter;
        font-size: 12px;
        color: $text-placeholder;
        font-weight: 500;

        .col-name {
          width: 90px;
          flex-shrink: 0;
        }

        .col-spec {
          flex: 1;
          display: flex;
          justify-content: center;
          min-width: 0;
        }

        .col-price {
          width: 65px;
          text-align: right;
          flex-shrink: 0;
        }

        .col-qty {
          width: 50px;
          text-align: center;
          flex-shrink: 0;
        }

        .col-sub {
          width: 65px;
          text-align: right;
          flex-shrink: 0;
        }
      }

      // 商品分组列表
      .detail-items {
        .product-group {
          margin-top: 12px;

          &:first-child {
            margin-top: 0;
          }

          // 商品名称行
          .product-group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0 8px;
            border-bottom: 1px dashed $border-lighter;

            .group-name {
              font-size: 14px;
              font-weight: 600;
              color: $text-primary;
              flex: 1;
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .group-count {
              font-size: 11px;
              color: $text-placeholder;
              background: $bg-page;
              padding: 2px 8px;
              border-radius: 8px;
              margin-left: 8px;
              flex-shrink: 0;
            }
          }

          // 规格明细
          .detail-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            font-size: 13px;

            .col-name {
              width: 90px;
              flex-shrink: 0;
            }

            .col-spec {
              flex: 1;
              display: flex;
              justify-content: center;
              gap: 6px;
              min-width: 0;

              .sku-tag {
                font-size: 12px;
                color: $text-secondary;
                background: $bg-page;
                padding: 2px 8px;
                border-radius: 4px;
                white-space: nowrap;
                flex-shrink: 0;
              }
            }

            .col-price {
              width: 65px;
              text-align: right;
              color: $text-secondary;
              flex-shrink: 0;
            }

            .col-qty {
              width: 50px;
              text-align: center;
              color: $text-primary;
              font-weight: 500;
              flex-shrink: 0;
            }

            .col-sub {
              width: 65px;
              text-align: right;
              color: $text-primary;
              font-weight: 600;
              flex-shrink: 0;
            }
          }
        }
      }
    }

    .no-items {
      padding: 16px 0;
      text-align: center;
      font-size: 13px;
      color: $text-placeholder;
    }

    // 金额汇总
    .amount-rows {
      .amount-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;

        .amount-label {
          font-size: 13px;
          color: $text-secondary;
        }

        .amount-value {
          font-size: 14px;
          color: $text-primary;
          font-weight: 500;

          &.paid {
            color: $success-color;
          }

          &.debt {
            color: $error-color;
            font-weight: 600;
          }

          &.profit {
            color: $success-color;
            font-weight: 600;

            &.negative {
              color: $error-color;
            }
          }
        }
      }
    }

    // 底部合计
    .receipt-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      margin-top: 4px;

      &.sales {
        background: linear-gradient(135deg, rgba($success-color, 0.06), rgba($success-color, 0.02));
        border-top: 1px solid rgba($success-color, 0.15);
      }

      &.returns {
        background: linear-gradient(135deg, rgba($error-color, 0.06), rgba($error-color, 0.02));
        border-top: 1px solid rgba($error-color, 0.15);
      }

      .total-label {
        font-size: 15px;
        font-weight: 600;
        color: $text-primary;
      }

      .total-value {
        font-size: 22px;
        font-weight: 700;

        .sales & {
          color: $success-color;
        }
      }

      &.sales .total-value {
        color: $primary-color;
      }

      &.returns .total-value {
        color: $error-color;
      }
    }
  }

  // 备注卡片
  .remark-card {
    background: $bg-card;
    border-radius: $radius-lg;
    margin-top: 12px;
    padding: 16px 20px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 10px;

      .t-icon {
        font-size: 18px;
        color: $primary-color;
        position: relative;
        top: -1px;
      }
    }

    .remark-content {
      font-size: 13px;
      color: $text-secondary;
      line-height: 1.6;
    }
  }
}
</style>
