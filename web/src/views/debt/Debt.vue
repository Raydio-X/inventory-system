<template>
  <div class="page debt-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">
          <t-icon name="wallet" class="nav-icon" />
          <span>欠款核对</span>
        </div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 欠款汇总 -->
    <div class="summary-card">
      <div class="summary-main">
        <div class="summary-label">总欠款金额</div>
        <div class="summary-amount">¥{{ formatAmount(totalDebt) }}</div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-sub">
        <div class="sub-value">{{ debtCustomerCount }}</div>
        <div class="sub-label">欠款客户</div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-section">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索客户姓名、手机号"
        clearable
        size="medium"
      >
        <template #prefix-icon><t-icon name="search" /></template>
      </t-input>
    </div>

    <!-- 欠款客户列表 -->
    <div class="debt-list">
      <div v-if="filteredDebtCustomers.length === 0" class="empty-state">
        <t-icon name="wallet" class="empty-icon" />
        <div class="empty-text">暂无欠款记录</div>
      </div>

      <div
        v-for="customer in filteredDebtCustomers"
        :key="customer.customerId"
        class="debt-card"
        @click="goToDetail(customer.customerId)"
      >
        <div class="card-top">
          <div class="card-left">
            <div class="avatar">{{ customer.customerName.charAt(0) }}</div>
            <div class="info">
              <div class="name-row">
                <span class="name">{{ customer.customerName }}</span>
              </div>
              <div class="meta">{{ customer.orderCount }}笔欠款</div>
            </div>
          </div>
          <div class="card-right">
            <div class="debt-value">¥{{ formatAmount(customer.totalDebt) }}</div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions">
          <div class="action-btn receive-btn" @click.stop="showReceivePopup(customer)">
            <t-icon name="money-circle" />
            <span>收款</span>
          </div>
          <div class="action-btn detail-btn" @click.stop="goToDetail(customer.customerId)">
            <t-icon name="chevron-right" />
            <span>详情</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 收款弹窗 -->
    <t-dialog
      v-model:visible="showReceivePopupVisible"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="90%"
      :attach="false"
      class="receive-dialog"
    >
      <div class="receive-popup" v-if="selectedCustomer">
        <div class="popup-header">
          <span class="popup-title">收款 - {{ selectedCustomer.customerName }}</span>
          <div class="popup-close" @click="closeReceivePopup">
            <t-icon name="close" />
          </div>
        </div>

        <div class="popup-body">
          <!-- 欠款订单列表 -->
          <div class="order-list">
            <div
              v-for="order in selectedCustomer.orders"
              :key="order.id"
              :class="['order-card', { selected: selectedOrder?.id === order.id }]"
              @click="selectOrder(order)"
            >
              <div class="order-top">
                <span class="order-no">{{ order.orderNo }}</span>
                <span class="order-date">{{ formatDate(order.createdAt) }}</span>
              </div>
              <div class="order-mid">
                <div class="order-info-item">
                  <span class="info-label">订单</span>
                  <span class="info-value">¥{{ formatAmount(order.totalAmount) }}</span>
                </div>
                <div class="order-info-item">
                  <span class="info-label">已付</span>
                  <span class="info-value paid">¥{{ formatAmount(order.paidAmount) }}</span>
                </div>
                <div class="order-info-item">
                  <span class="info-label">欠款</span>
                  <span class="info-value debt">¥{{ formatAmount(order.debtAmount) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 收款金额输入 -->
          <div v-if="selectedOrder" class="receive-form">
            <div class="form-row">
              <span class="form-label">收款金额</span>
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
                <div class="full-btn" @click="setFullAmount">全额</div>
              </div>
            </div>
            <div class="form-row">
              <span class="form-label">收款方式</span>
              <div class="method-options">
                <div
                  v-for="method in paymentMethods"
                  :key="method.value"
                  :class="['method-item', { active: selectedMethod === method.value }]"
                  @click="selectedMethod = method.value"
                >
                  <t-icon :name="method.icon" class="method-icon" />
                  <span>{{ method.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="popup-footer">
          <div class="footer-cancel" @click="closeReceivePopup">取消</div>
          <div :class="['footer-confirm', { disabled: !canReceive }]" @click="confirmReceive">确认收款</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { useDebtStore } from '@/store/debt'

const router = useRouter()
const debtStore = useDebtStore()

// 搜索关键词
const searchKeyword = ref('')

// 欠款统计
const totalDebt = computed(() => debtStore.totalDebt)
const debtCustomerCount = computed(() => debtStore.debtCustomerCount)

// 欠款客户列表（从API获取的扁平列表）
const debtCustomers = computed(() => debtStore.debtCustomers)

// 筛选后的欠款客户
const filteredDebtCustomers = computed(() => {
  if (!searchKeyword.value) return debtCustomers.value
  const keyword = searchKeyword.value.toLowerCase()
  return debtCustomers.value.filter(c =>
    c.customerName.toLowerCase().includes(keyword) ||
    (c.customerPhone && c.customerPhone.includes(keyword))
  )
})

// 搜索时触发后端搜索
watch(searchKeyword, (val) => {
  debtStore.fetchDebtCustomers(val)
})

// 收款弹窗
const showReceivePopupVisible = ref(false)
const selectedCustomer = ref(null)
const selectedOrder = ref(null)
const receiveAmount = ref(0)
const selectedMethod = ref('cash')

// 付款方式
const paymentMethods = [
  { value: 'cash', label: '现金', icon: 'money-circle' },
  { value: 'wechat', label: '微信', icon: 'chat' },
  { value: 'alipay', label: '支付宝', icon: 'logo-alipay' },
  { value: 'transfer', label: '转账', icon: 'swap' }
]

// 是否可以收款
const canReceive = computed(() =>
  selectedOrder.value && receiveAmount.value > 0 && receiveAmount.value <= selectedOrder.value.debtAmount
)

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 跳转详情
const goToDetail = (customerId) => {
  router.push(`/debt/${customerId}`)
}

// 显示收款弹窗（需要先加载客户欠款详情）
const showReceivePopup = async (customer) => {
  selectedCustomer.value = customer
  // 从API获取该客户的欠款订单明细
  const detail = await debtStore.fetchCustomerDebtDetail(customer.customerId)
  if (detail && detail.orders && detail.orders.length > 0) {
    // orders来源于sales_orders，字段名为snake_case
    selectedOrder.value = mapOrder(detail.orders[0])
    selectedCustomer.value = {
      ...customer,
      orders: detail.orders.map(mapOrder)
    }
  }
  receiveAmount.value = 0
  showReceivePopupVisible.value = true
}

// 映射后端订单字段为前端格式
const mapOrder = (order) => ({
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
})

// 关闭收款弹窗
const closeReceivePopup = () => {
  showReceivePopupVisible.value = false
  selectedCustomer.value = null
  selectedOrder.value = null
}

// 选择订单
const selectOrder = (order) => {
  selectedOrder.value = order
  receiveAmount.value = 0
}

// 设置全额
const setFullAmount = () => {
  if (selectedOrder.value) {
    receiveAmount.value = selectedOrder.value.debtAmount
  }
}

// 确认收款
const confirmReceive = async () => {
  if (!canReceive.value) return

  try {
    await debtStore.recordPayment(selectedCustomer.value.customerId, {
      orderId: selectedOrder.value.orderId || selectedOrder.value.id,
      amount: receiveAmount.value,
      paymentMethod: selectedMethod.value
    })
    MessagePlugin.success('收款成功')
    closeReceivePopup()
  } catch (e) {
    MessagePlugin.error(e.message || '收款失败')
  }
}

// 初始化
onMounted(() => {
  debtStore.initData()
})
</script>

<style lang="scss" scoped>
.debt-page {
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
    padding-top: $safe-area-top;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    box-sizing: border-box;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      padding-top: calc(12px + $safe-area-top);
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
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 17px;
      font-weight: 600;
      color: white;

      .nav-icon {
        font-size: 18px;
        display: inline-block;
        vertical-align: middle;
      }
    }

    .nav-placeholder {
      width: 32px;
    }
  }

  // ========== 汇总卡片 ==========
  .summary-card {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 10px;
    padding: 16px 20px;
    margin: 20px 0 12px;
    box-shadow: $shadow-sm;

    .summary-main {
      flex: 1;

      .summary-label {
        font-size: 12px;
        color: $text-secondary;
        margin-bottom: 4px;
      }
      .summary-amount {
        font-size: 24px;
        font-weight: 700;
        color: $error-color;
      }
    }

    .summary-divider {
      width: 1px;
      height: 36px;
      background: $border-lighter;
      margin: 0 16px;
    }

    .summary-sub {
      text-align: center;
      min-width: 56px;

      .sub-value {
        font-size: 18px;
        font-weight: 700;
        color: $text-primary;
      }
      .sub-label {
        font-size: 11px;
        color: $text-placeholder;
        margin-top: 2px;
      }
    }
  }

  // ========== 搜索 ==========
  .search-section {
    margin-bottom: 8px;
  }

  // ========== 空状态 ==========
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 0;
    .empty-icon { font-size: 48px; color: $text-placeholder; margin-bottom: 12px; }
    .empty-text { font-size: 14px; color: $text-placeholder; }
  }

  // ========== 欠款列表 ==========
  .debt-list {
    .debt-card {
      background: white;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 8px;
      box-shadow: $shadow-sm;
      cursor: pointer;

      &:active { transform: scale(0.99); }

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;

        .card-left {
          display: flex;
          align-items: center;
          gap: 10px;

          .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, $primary-color, $primary-light);
            color: white;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .info {
            .name-row {
              display: flex;
              align-items: center;
              gap: 6px;

              .name {
                font-size: 15px;
                font-weight: 600;
                color: $text-primary;
              }
            }

            .meta {
              font-size: 12px;
              color: $text-placeholder;
              margin-top: 2px;
            }
          }
        }

        .card-right {
          .debt-value {
            font-size: 18px;
            font-weight: 700;
            color: $error-color;
          }
        }
      }

      .card-orders {
        padding: 8px 0;
        border-top: 1px solid $border-lighter;
        border-bottom: 1px solid $border-lighter;

        .order-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;

          .order-no {
            font-size: 12px;
            color: $text-placeholder;
          }
          .order-amount {
            font-size: 13px;
            font-weight: 500;
            color: $text-secondary;
          }
        }
      }

      .card-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 0;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          flex: 1;

          .t-icon { font-size: 14px; }

          &.receive-btn {
            background: $error-color;
            color: white;
            &:active { opacity: 0.85; }
          }

          &.detail-btn {
            background: $bg-page;
            border: 1px solid $border-color;
            color: $text-secondary;
            &:active { background: $border-lighter; }
          }
        }
      }
    }
  }

  // ========== 收款弹窗 ==========
  :deep(.receive-dialog) {
    .t-dialog {
      margin: 20px auto;
      width: 90% !important;
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
    max-height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid $border-lighter;
      flex-shrink: 0;

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
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px;

      .order-list {
        margin-bottom: 14px;

        .order-card {
          padding: 10px 12px;
          background: $bg-page;
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;

          &.selected {
            background: #FFF5F5;
            border-color: $error-color;
          }

          .order-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;

            .order-no {
              font-size: 13px;
              font-weight: 600;
              color: $text-primary;
            }
            .order-date {
              font-size: 12px;
              color: $text-placeholder;
            }
          }

          .order-mid {
            display: flex;
            gap: 16px;

            .order-info-item {
              .info-label {
                font-size: 11px;
                color: $text-placeholder;
                display: block;
              }
              .info-value {
                font-size: 13px;
                font-weight: 600;
                color: $text-primary;

                &.paid { color: #38A169; }
                &.debt { color: $error-color; }
              }
            }
          }
        }
      }

      .receive-form {
        background: $bg-page;
        border-radius: 8px;
        padding: 12px;

        .form-row {
          margin-bottom: 12px;

          &:last-child { margin-bottom: 0; }

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

          .method-options {
            display: flex;
            gap: 8px;

            .method-item {
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 6px 12px;
              border: 1px solid $border-color;
              border-radius: 6px;
              font-size: 12px;
              color: $text-secondary;
              cursor: pointer;

              .method-icon { font-size: 14px; }

              &:active { background: $bg-hover; }

              &.active {
                border-color: $primary-color;
                color: $primary-color;
                background: rgba($primary-color, 0.05);
              }
            }
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
      flex-shrink: 0;

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
  .debt-page {
    .summary-card {
      padding: 12px 14px;
      .summary-main .summary-amount { font-size: 20px; }
      .summary-sub .sub-value { font-size: 16px; }
    }

    .debt-list .debt-card .card-actions .action-btn {
      font-size: 11px;
    }
  }
}
</style>
