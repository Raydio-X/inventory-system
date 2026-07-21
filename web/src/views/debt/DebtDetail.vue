<template>
  <div class="page debt-detail-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">欠款详情</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 客户信息卡片 -->
    <div class="customer-card">
      <div class="card-top">
        <div class="avatar">{{ customer?.name?.charAt(0) || '?' }}</div>
        <div class="customer-info">
          <div class="customer-name">{{ customer?.name || '未知客户' }}</div>
          <div class="customer-phone">{{ customer?.phone || '' }}</div>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-item">
          <div class="stat-value debt">¥{{ formatAmount(totalDebt) }}</div>
          <div class="stat-label">总欠款</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-value">{{ debtOrders.length }}</div>
          <div class="stat-label">欠款订单</div>
        </div>
      </div>
    </div>

    <!-- 欠款订单列表 -->
    <div class="section-header">
      <t-icon name="list" class="section-icon" />
      <span class="section-title">欠款订单</span>
    </div>

    <div class="order-list">
      <div v-if="debtOrders.length === 0" class="empty-state">
        <t-icon name="check-circle" class="empty-icon" />
        <div class="empty-text">该客户暂无欠款</div>
      </div>

      <div v-for="order in debtOrders" :key="order.id" class="order-card">
        <div class="order-top" @click="toggleOrder(order.id)">
          <div class="order-top-left">
            <span class="order-no">{{ order.orderNo }}</span>
            <span class="order-date">{{ formatDate(order.createdAt) }}</span>
          </div>
          <t-icon :class="['expand-icon', { expanded: expandedOrders[order.id] }]" name="chevron-down" />
        </div>
        <div class="order-body">
          <div class="order-row">
            <span class="order-label">订单金额</span>
            <span class="order-value">¥{{ formatAmount(order.totalAmount) }}</span>
          </div>
          <div class="order-row">
            <span class="order-label">已付款</span>
            <span class="order-value paid">¥{{ formatAmount(order.paidAmount) }}</span>
          </div>
          <div class="order-row highlight">
            <span class="order-label">欠款金额</span>
            <span class="order-value debt">¥{{ formatAmount(order.debtAmount) }}</span>
          </div>
        </div>

        <!-- 展开区域：订单商品明细 -->
        <div v-if="expandedOrders[order.id]" class="order-items">
          <div v-if="getOrderItems(order).length === 0" class="items-empty">暂无商品明细</div>
          <div v-for="(item, idx) in getOrderItems(order)" :key="idx" class="item-row">
            <div class="item-main">
              <span class="item-name">{{ item.productName }}</span>
              <span class="item-spec">{{ item.color }}/{{ item.size }}</span>
            </div>
            <div class="item-nums">
              <span class="item-price">¥{{ formatAmount(item.price) }}</span>
              <span class="item-qty">×{{ item.quantity }}</span>
              <span class="item-subtotal">¥{{ formatAmount(item.price * item.quantity) }}</span>
            </div>
          </div>
        </div>

        <div class="order-action">
          <div class="receive-btn" @click="showReceivePopup(order)">
            <t-icon name="money-circle" />
            <span>收款</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 收款弹窗 -->
    <t-dialog
      v-model:visible="showReceive"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="85%"
      :attach="false"
      class="receive-dialog"
    >
      <div class="receive-popup" v-if="selectedOrder">
        <div class="popup-header">
          <span class="popup-title">收款</span>
          <div class="popup-close" @click="showReceive = false">
            <t-icon name="close" />
          </div>
        </div>
        <div class="popup-body">
          <div class="order-summary">
            <div class="summary-row">
              <span class="summary-label">订单号</span>
              <span class="summary-value">{{ selectedOrder.orderNo }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">欠款金额</span>
              <span class="summary-value debt">¥{{ formatAmount(selectedOrder.debtAmount) }}</span>
            </div>
          </div>
          <div class="form-section">
            <div class="form-label">收款金额</div>
            <div class="form-input-wrap">
              <span class="form-prefix">¥</span>
              <input
                v-model.number="receiveAmount"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="输入金额"
                @focus="$event.target.select()"
              />
              <div class="full-btn" @click="receiveAmount = selectedOrder.debtAmount">全额</div>
            </div>
          </div>
        </div>
        <div class="popup-footer">
          <div class="footer-cancel" @click="showReceive = false">取消</div>
          <div :class="['footer-confirm', { disabled: !canReceive }]" @click="confirmReceive">确认收款</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { useDebtStore } from '@/store/debt'

const router = useRouter()
const route = useRoute()
const debtStore = useDebtStore()

const customerId = route.params.customerId

// 客户欠款详情（从API加载）
const detailData = ref(null)

const customer = computed(() => detailData.value?.customer || null)

const debtOrders = computed(() => {
  if (!detailData.value?.orders) return []
  return detailData.value.orders.map(order => ({
    id: order.id,
    orderId: order.id,
    orderNo: order.order_no || order.orderNo,
    totalAmount: order.total_amount ?? order.totalAmount,
    paidAmount: order.paid_amount ?? order.paidAmount,
    debtAmount: order.debt_amount ?? order.debtAmount,
    items: (order.items || []).map(item => ({
      productName: item.product_name || item.productName,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      price: item.price
    })),
    createdAt: order.created_at || order.createdAt,
    status: order.status
  }))
})

const totalDebt = computed(() => detailData.value?.totalDebt || 0)

const showReceive = ref(false)
const selectedOrder = ref(null)
const receiveAmount = ref(0)

// 展开状态
const expandedOrders = ref({})

const toggleOrder = (orderId) => {
  expandedOrders.value[orderId] = !expandedOrders.value[orderId]
}

// 获取订单商品明细
const getOrderItems = (debtOrder) => {
  return debtOrder.items || []
}

const canReceive = computed(() =>
  selectedOrder.value && receiveAmount.value > 0 && receiveAmount.value <= selectedOrder.value.debtAmount
)

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

const showReceivePopup = (order) => {
  selectedOrder.value = order
  receiveAmount.value = order.debtAmount
  showReceive.value = true
}

const confirmReceive = async () => {
  if (!canReceive.value) return

  try {
    await debtStore.recordPayment(customerId, {
      orderId: selectedOrder.value.orderId || selectedOrder.value.id,
      amount: receiveAmount.value,
      paymentMethod: 'cash'
    })
    MessagePlugin.success('收款成功')
    showReceive.value = false
    // 刷新详情
    detailData.value = await debtStore.fetchCustomerDebtDetail(customerId)
  } catch (e) {
    MessagePlugin.error(e.message || '收款失败')
  }
}

onMounted(async () => {
  detailData.value = await debtStore.fetchCustomerDebtDetail(customerId)
})
</script>

<style lang="scss" scoped>
.debt-detail-page {
  min-height: 100%;
  background: $bg-page;
  padding-top: calc(56px + $safe-area-top);

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

    .nav-placeholder {
      width: 32px;
    }
  }

  // ========== 客户信息卡片 ==========
  .customer-card {
    background: white;
    border-radius: 10px;
    padding: 16px;
    margin: 20px 0 12px;
    box-shadow: $shadow-sm;

    .card-top {
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

      .customer-info {
        .customer-name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
        }
        .customer-phone {
          font-size: 13px;
          color: $text-placeholder;
          margin-top: 2px;
        }
      }
    }

    .card-stats {
      display: flex;
      align-items: center;
      background: $bg-page;
      border-radius: 8px;
      padding: 12px 16px;

      .stat-item {
        flex: 1;
        text-align: center;

        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: $text-primary;

          &.debt {
            color: $error-color;
          }
        }
        .stat-label {
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

  // ========== 区域标题 ==========
  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;

    .section-icon {
      font-size: 16px;
      color: $primary-color;
      display: inline-block;
      vertical-align: middle;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  // ========== 空状态 ==========
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    background: white;
    border-radius: 10px;
    .empty-icon { font-size: 36px; color: #38A169; margin-bottom: 8px; }
    .empty-text { font-size: 14px; color: $text-placeholder; }
  }

  // ========== 订单列表 ==========
  .order-list {
    .order-card {
      background: white;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 8px;
      box-shadow: $shadow-sm;

      .order-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        cursor: pointer;

        .order-top-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .order-no {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
        }
        .order-date {
          font-size: 12px;
          color: $text-placeholder;
        }

        .expand-icon {
          font-size: 16px;
          color: $text-placeholder;
          transition: transform 0.2s;

          &.expanded {
            transform: rotate(180deg);
          }
        }
      }

      .order-body {
        background: $bg-page;
        border-radius: 8px;
        padding: 10px 12px;

        .order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;

          .order-label {
            font-size: 12px;
            color: $text-placeholder;
          }
          .order-value {
            font-size: 13px;
            font-weight: 500;
            color: $text-primary;

            &.paid { color: #38A169; }
            &.debt { color: $error-color; font-weight: 700; font-size: 14px; }
          }

          &.highlight {
            padding-top: 6px;
            margin-top: 4px;
            border-top: 1px dashed $border-lighter;
          }
        }
      }

      .order-items {
        background: $bg-page;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;

        .items-empty {
          text-align: center;
          font-size: 12px;
          color: $text-placeholder;
          padding: 8px 0;
        }

        .item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid $border-lighter;

          &:last-child { border-bottom: none; }

          .item-main {
            display: flex;
            align-items: center;
            gap: 6px;

            .item-name {
              font-size: 13px;
              font-weight: 500;
              color: $text-primary;
            }
            .item-spec {
              font-size: 11px;
              color: $text-placeholder;
            }
          }

          .item-nums {
            display: flex;
            align-items: center;
            gap: 6px;

            .item-price {
              font-size: 12px;
              color: $text-secondary;
            }
            .item-qty {
              font-size: 12px;
              color: $text-placeholder;
            }
            .item-subtotal {
              font-size: 13px;
              font-weight: 600;
              color: $primary-color;
            }
          }
        }
      }

      .order-action {
        margin-top: 10px;

        .receive-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 0;
          background: $error-color;
          color: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;

          .t-icon { font-size: 14px; }
          &:active { opacity: 0.85; }
        }
      }
    }
  }

  // ========== 收款弹窗 ==========
  :deep(.receive-dialog) {
    .t-dialog {
      margin: 20px auto;
      width: 85% !important;
      border-radius: 12px;
      overflow: visible;
      box-sizing: border-box;
      .t-dialog__header, .t-dialog__footer { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; overflow: hidden; }
      .t-dialog__close { display: none !important; }
      .t-dialog__body { padding: 0 !important; margin: 0; overflow: visible; }
    }
  }

  .receive-popup {
    background: white;
    border-radius: 12px;

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid $border-lighter;

      .popup-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
      }

      .popup-close {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; cursor: pointer; background: $bg-page;
        .t-icon { font-size: 16px; color: $text-secondary; }
      }
    }

    .popup-body {
      padding: 14px 16px;

      .order-summary {
        background: $bg-page;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 14px;

        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;

          .summary-label {
            font-size: 13px;
            color: $text-secondary;
          }
          .summary-value {
            font-size: 13px;
            font-weight: 500;
            color: $text-primary;

            &.debt { color: $error-color; font-weight: 700; }
          }
        }
      }

      .form-section {
        margin-bottom: 14px;

        .form-label {
          font-size: 13px;
          color: $text-secondary;
          margin-bottom: 8px;
        }

        .form-input-wrap {
          display: flex;
          align-items: center;
          border: 1px solid $border-color;
          border-radius: 6px;
          height: 36px;
          padding: 0 8px;
          background: white;

          .form-prefix {
            font-size: 14px;
            color: $text-placeholder;
            margin-right: 4px;
          }

          .form-input {
            flex: 1;
            border: none;
            outline: none;
            font-size: 16px;
            font-weight: 600;
            color: $text-primary;
            height: 100%;
            &::placeholder { color: $text-placeholder; font-size: 13px; }
          }

          .full-btn {
            padding: 4px 10px;
            background: $primary-color;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            flex-shrink: 0;
            &:active { opacity: 0.85; }
          }
        }
      }
    }

    .popup-footer {
      display: flex;
      gap: 10px;
      padding: 12px 16px;
      padding-bottom: calc(12px + #{$safe-area-bottom});
      border-top: 1px solid $border-lighter;

      .footer-cancel {
        flex: 1;
        text-align: center;
        padding: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: $bg-page;
        color: $text-secondary;
        &:active { background: $border-lighter; }
      }

      .footer-confirm {
        flex: 2;
        text-align: center;
        padding: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: $error-color;
        color: white;
        &:active { opacity: 0.85; }
        &.disabled {
          background: $border-lighter;
          color: $text-placeholder;
          cursor: not-allowed;
        }
      }
    }
  }
}

// ========== 响应式 ==========
@media screen and (max-width: 400px) {
  .debt-detail-page {
    .customer-card .card-stats .stat-item .stat-value {
      font-size: 18px;
    }
  }
}
</style>
