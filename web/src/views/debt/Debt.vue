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
          <div class="action-btn receive-btn" @click.stop="openReceivePopup(customer)">
            <t-icon name="wealth-1" />
            <span>收款</span>
          </div>
          <div class="action-btn detail-btn" @click.stop="goToDetail(customer.customerId)">
            <t-icon name="chevron-right" />
            <span>详情</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量收款弹窗 -->
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
      <div class="receive-popup" v-if="receiveCustomer">
        <div class="popup-header">
          <span class="popup-title">收款 - {{ receiveCustomer.customerName }}</span>
          <div class="popup-close" @click="closeReceivePopup">
            <t-icon name="close" />
          </div>
        </div>

        <div class="popup-body">
          <!-- 欠款订单列表 -->
          <div class="order-list">
            <!-- 全选行 -->
            <div class="select-all-row" @click="toggleSelectAll">
              <t-icon :name="isAllSelected ? 'check-circle-filled' : 'circle'" class="select-icon" :class="{ active: isAllSelected }" />
              <span class="select-text">全选</span>
              <span class="select-count">已选{{ selectedOrderIds.length }}笔</span>
            </div>

            <div
              v-for="order in receiveOrders"
              :key="order.id"
              class="order-card"
              :class="{ selected: selectedOrderIds.includes(order.id) }"
              @click="toggleOrderSelect(order.id)"
            >
              <div class="order-left">
                <t-icon :name="selectedOrderIds.includes(order.id) ? 'check-circle-filled' : 'circle'" class="order-check" :class="{ active: selectedOrderIds.includes(order.id) }" />
              </div>
              <div class="order-info">
                <div class="order-top">
                  <span class="order-no">{{ order.orderNo }}</span>
                  <span class="order-date">{{ formatDate(order.createdAt) }}</span>
                </div>
                <div class="order-bottom">
                  <span class="order-label">欠款</span>
                  <span class="order-debt">¥{{ formatAmount(order.debtAmount) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 收款金额区域 -->
          <div v-if="selectedOrderIds.length > 0" class="receive-form">
            <div class="form-row">
              <span class="form-label">应收金额</span>
              <span class="form-value">¥{{ formatAmount(selectedTotalDebt) }}</span>
            </div>
            <div class="form-row">
              <span class="form-label">抹零金额</span>
              <div class="form-input-wrap">
                <span class="form-prefix">¥</span>
                <input
                  v-model.number="roundOffAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  :max="selectedTotalDebt"
                  class="form-input"
                  placeholder="0.00"
                  @focus="$event.target.select()"
                />
              </div>
            </div>
            <div class="form-row highlight-row">
              <span class="form-label">实收金额</span>
              <span class="form-value actual">¥{{ formatAmount(actualReceiveAmount) }}</span>
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
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const debtStore = useDebtStore()
const billingStore = useBillingStore()

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

// ========== 批量收款 ==========
const showReceivePopupVisible = ref(false)
const receiveCustomer = ref(null)
const receiveOrders = ref([])
const selectedOrderIds = ref([])
const roundOffAmount = ref(0)

// 映射后端订单字段为前端格式
const mapOrder = (order) => ({
  id: order.id,
  orderNo: order.order_no || order.orderNo,
  totalAmount: Number(order.total_amount ?? order.totalAmount) || 0,
  paidAmount: Number(order.paid_amount ?? order.paidAmount) || 0,
  debtAmount: Number(order.debt_amount ?? order.debtAmount) || 0,
  createdAt: order.created_at || order.createdAt
})

// 是否全选
const isAllSelected = computed(() =>
  receiveOrders.value.length > 0 && selectedOrderIds.value.length === receiveOrders.value.length
)

// 选中订单的总欠款
const selectedTotalDebt = computed(() => {
  return receiveOrders.value
    .filter(o => selectedOrderIds.value.includes(o.id))
    .reduce((sum, o) => sum + o.debtAmount, 0)
})

// 实收金额 = 应收 - 抹零
const actualReceiveAmount = computed(() => {
  const actual = selectedTotalDebt.value - (roundOffAmount.value || 0)
  return Math.max(0, actual)
})

// 是否可收款
const canReceive = computed(() =>
  selectedOrderIds.value.length > 0 && actualReceiveAmount.value > 0
)

// 打开批量收款弹窗
const openReceivePopup = async (customer) => {
  receiveCustomer.value = customer
  selectedOrderIds.value = []
  roundOffAmount.value = 0

  // 从API获取该客户的欠款订单明细
  const detail = await debtStore.fetchCustomerDebtDetail(customer.customerId)
  if (detail && detail.orders && detail.orders.length > 0) {
    receiveOrders.value = detail.orders.map(mapOrder)
    // 默认全选
    selectedOrderIds.value = receiveOrders.value.map(o => o.id)
  } else {
    receiveOrders.value = []
  }

  showReceivePopupVisible.value = true
}

// 关闭弹窗
const closeReceivePopup = () => {
  showReceivePopupVisible.value = false
  receiveCustomer.value = null
  receiveOrders.value = []
  selectedOrderIds.value = []
  roundOffAmount.value = 0
}

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedOrderIds.value = []
  } else {
    selectedOrderIds.value = receiveOrders.value.map(o => o.id)
  }
  roundOffAmount.value = 0
}

// 切换单个订单选中
const toggleOrderSelect = (orderId) => {
  const idx = selectedOrderIds.value.indexOf(orderId)
  if (idx >= 0) {
    selectedOrderIds.value.splice(idx, 1)
  } else {
    selectedOrderIds.value.push(orderId)
  }
  roundOffAmount.value = 0
}

// 确认批量收款
const confirmReceive = async () => {
  if (!canReceive.value) return

  const selectedOrders = receiveOrders.value.filter(o => selectedOrderIds.value.includes(o.id))
  const totalDebt = selectedTotalDebt.value
  const roundOff = roundOffAmount.value || 0

  // 将实收金额按欠款比例分配到各订单
  const actualTotal = actualReceiveAmount.value

  try {
    let remaining = actualTotal
    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i]
      let paymentAmount
      if (i === selectedOrders.length - 1) {
        // 最后一笔：分配剩余金额，避免精度丢失
        paymentAmount = remaining
      } else {
        // 按欠款比例分配
        paymentAmount = Math.round((order.debtAmount / totalDebt) * actualTotal * 100) / 100
        remaining = Math.round((remaining - paymentAmount) * 100) / 100
      }

      if (paymentAmount > 0) {
        await debtStore.recordPayment(receiveCustomer.value.customerId, {
          orderId: order.id,
          amount: paymentAmount,
          paymentMethod: 'cash'
        })
      }
    }

    MessagePlugin.success(`收款成功，实收¥${formatAmount(actualTotal)}`)
    closeReceivePopup()
    // 刷新欠款列表
    await debtStore.fetchDebtCustomers()
    await billingStore.fetchSalesOrders()
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
      padding: 0;

      // 全选行
      .select-all-row {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid $border-lighter;
        cursor: pointer;

        .select-icon {
          font-size: 20px;
          color: #d9d9d9;
          flex-shrink: 0;
          transition: color 0.2s;

          &.active { color: $primary-color; }
        }

        .select-text {
          font-size: 14px;
          font-weight: 500;
          color: $text-primary;
          margin-left: 8px;
        }

        .select-count {
          font-size: 12px;
          color: $text-placeholder;
          margin-left: auto;
        }
      }

      // 订单列表
      .order-list {
        .order-card {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid $border-lighter;
          cursor: pointer;
          transition: background 0.2s;

          &:last-child { border-bottom: none; }

          &.selected { background: rgba($primary-color, 0.03); }

          .order-left {
            flex-shrink: 0;
            margin-right: 10px;

            .order-check {
              font-size: 20px;
              color: #d9d9d9;
              transition: color 0.2s;

              &.active { color: $primary-color; }
            }
          }

          .order-info {
            flex: 1;
            min-width: 0;

            .order-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 4px;

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

            .order-bottom {
              display: flex;
              align-items: center;
              justify-content: space-between;

              .order-label {
                font-size: 11px;
                color: $text-placeholder;
              }
              .order-debt {
                font-size: 14px;
                font-weight: 700;
                color: $error-color;
              }
            }
          }
        }
      }

      // 收款表单
      .receive-form {
        padding: 14px 16px;
        background: $bg-page;
        border-top: 1px solid $border-lighter;

        .form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;

          &:last-child { margin-bottom: 0; }

          .form-label {
            font-size: 13px;
            color: $text-secondary;
            flex-shrink: 0;
            white-space: nowrap;
          }

          .form-value {
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;

            &.actual {
              font-size: 18px;
              font-weight: 700;
              color: $primary-color;
            }
          }

          .form-input-wrap {
            display: flex;
            align-items: center;
            border: 1px solid $border-color;
            border-radius: 6px;
            height: 32px;
            padding: 0 8px;
            background: white;
            width: 100px;

            .form-prefix {
              font-size: 13px;
              color: $text-placeholder;
              margin-right: 2px;
              flex-shrink: 0;
            }

            .form-input {
              flex: 1;
              border: none;
              outline: none;
              font-size: 14px;
              font-weight: 600;
              color: $text-primary;
              height: 100%;
              min-width: 0;
              text-align: right;

              &::placeholder { color: $text-placeholder; font-size: 12px; }

              // 隐藏数字输入框的箭头
              &::-webkit-outer-spin-button,
              &::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }

              &[type='number'] {
                -moz-appearance: textfield;
              }
            }
          }

          &.highlight-row {
            padding: 8px 0;
            border-top: 1px dashed $border-lighter;
            margin-top: 4px;
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
        background: $primary-color;
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
