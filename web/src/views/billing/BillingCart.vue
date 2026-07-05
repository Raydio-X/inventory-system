<template>
  <div class="page cart-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="goBack">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">购物车</div>
        <div v-if="cartItems.length > 0" class="nav-action" @click="clearAll">
          <span class="clear-text">清空</span>
        </div>
      </div>
    </div>

    <!-- 客户选择卡片 -->
    <div class="customer-card" @click="showCustomer = true">
      <div class="customer-left">
        <t-icon name="user" class="customer-icon" />
        <div class="customer-info">
          <span v-if="currentCustomer" class="customer-name">{{ currentCustomer.name }}</span>
          <span v-else class="customer-name walk-in">散客</span>
          <span v-if="currentCustomer" class="customer-phone">{{ currentCustomer.phone }}</span>
        </div>
      </div>
      <div class="customer-right">
        <span class="customer-change">修改</span>
        <t-icon name="chevron-right" class="customer-arrow" />
      </div>
    </div>

    <!-- 客户欠款提示 -->
    <div v-if="currentCustomer && customerTotalDebt > 0" class="debt-warning" @click="showDebtHistory = true">
      <div class="debt-warning-left">
        <t-icon name="error-circle" class="debt-warning-icon" />
        <span class="debt-warning-text">累计欠款</span>
      </div>
      <div class="debt-warning-right">
        <span class="debt-amount">¥{{ formatAmount(customerTotalDebt) }}</span>
        <t-icon name="chevron-right" class="debt-arrow" />
      </div>
    </div>

    <!-- 空购物车 -->
    <div v-if="cartItems.length === 0" class="empty-state">
      <t-icon name="cart" class="empty-icon" />
      <div class="empty-text">购物车为空</div>
      <div class="empty-hint">返回开单页面选择商品</div>
      <div class="empty-btn" @click="goBack">去开单</div>
    </div>

    <!-- 购物车商品列表 -->
    <div v-if="cartItems.length > 0" class="cart-list">
      <div v-for="(item, index) in cartItems" :key="item.skuId" class="cart-item">
        <!-- 第一行：商品名 + 规格标签 + 删除 -->
        <div class="item-top">
          <div class="item-name">{{ item.productName }}</div>
          <div class="item-spec">
            <span class="spec-tag">{{ item.color }}</span>
            <span class="spec-tag">{{ item.size }}</span>
          </div>
          <div class="item-del" @click="remove(item.skuId)">
            <t-icon name="close" />
          </div>
        </div>
        <!-- 第二行：原价 + 单价×数量 -->
        <div class="item-mid">
          <div class="original-price">
            原价 ¥{{ formatAmount(item.originalPrice) }}
          </div>
          <div class="item-amount-row">
            <div class="price-input-wrap">
              <span class="price-prefix">¥</span>
              <input v-model.number="item.price" type="number" step="0.01" min="0" class="price-input" @focus="$event.target.select()" />
            </div>
            <span class="amount-x">×</span>
            <div class="item-qty">
              <span class="qty-btn" @click="decrease(item)">-</span>
              <span class="qty-value">{{ item.quantity }}</span>
              <span class="qty-btn" @click="increase(item)">+</span>
            </div>
          </div>
        </div>
        <!-- 第三行：小计金额 -->
        <div class="item-bottom">
          <span class="subtotal-label">小计</span>
          <span class="item-subtotal">¥{{ formatAmount(item.price * item.quantity) }}</span>
        </div>
      </div>
    </div>

    <!-- 折扣 & 抹零 -->
    <div v-if="cartItems.length > 0" class="extra-section">
      <div class="extra-row">
        <span class="extra-label">整单折扣</span>
        <div class="extra-input-wrap">
          <input v-model.number="discountPercent" type="number" min="0" max="100" class="extra-input" />
          <span class="extra-unit">%</span>
        </div>
      </div>
      <div class="extra-row">
        <span class="extra-label">抹零</span>
        <div class="extra-input-wrap">
          <input v-model.number="roundOff" type="number" min="0" class="extra-input" />
          <span class="extra-unit">元</span>
        </div>
      </div>
    </div>

    <!-- 支付状态 -->
    <div v-if="cartItems.length > 0" class="payment-section">
      <div class="section-header">
        <t-icon name="wallet" class="section-icon" />
        <span class="section-title">付款状态</span>
      </div>
      <div class="payment-tabs">
        <div
          :class="['pay-tab', { active: paymentStatus === 'unpaid', 'tab-unpaid': paymentStatus === 'unpaid' }]"
          @click="changePaymentStatus('unpaid')"
        >
          <t-icon name="close-circle" class="tab-icon" />
          <span>未付款</span>
        </div>
        <div
          :class="['pay-tab', { active: paymentStatus === 'partial', 'tab-partial': paymentStatus === 'partial' }]"
          @click="changePaymentStatus('partial')"
        >
          <t-icon name="time" class="tab-icon" />
          <span>部分付款</span>
        </div>
        <div
          :class="['pay-tab', { active: paymentStatus === 'paid', 'tab-paid': paymentStatus === 'paid' }]"
          @click="changePaymentStatus('paid')"
        >
          <t-icon name="check-circle" class="tab-icon" />
          <span>全部付清</span>
        </div>
      </div>

      <!-- 部分付款输入 -->
      <div v-if="paymentStatus === 'partial'" class="partial-pay-area">
        <div class="partial-row">
          <span class="partial-label">已付金额</span>
          <div class="partial-input-wrap">
            <span class="partial-prefix">¥</span>
            <input
              v-model.number="paidInput"
              type="number"
              step="0.01"
              min="0"
              class="partial-input"
              placeholder="输入已付金额"
              @focus="$event.target.select()"
            />
          </div>
        </div>
        <div class="partial-row">
          <span class="partial-label">剩余欠款</span>
          <span class="partial-debt">¥{{ formatAmount(remainDebt) }}</span>
        </div>
      </div>

      <!-- 全部付清提示 -->
      <div v-if="paymentStatus === 'paid'" class="pay-info paid-info">
        <t-icon name="check-circle" class="pay-info-icon" />
        <span>本次订单已全部付清</span>
      </div>

      <!-- 未付款提示 -->
      <div v-if="paymentStatus === 'unpaid'" class="pay-info unpaid-info">
        <t-icon name="error-circle" class="pay-info-icon" />
        <span>本次订单未付款，将计入客户欠款</span>
      </div>
    </div>

    <!-- 底部固定栏 -->
    <div v-if="cartItems.length > 0" class="bottom-bar">
      <div class="bar-summary">
        <div class="bar-row">
          <span class="bar-label">{{ cartItemCount }}件商品</span>
          <span class="bar-original">原价 ¥{{ formatAmount(cartTotalOriginal) }}</span>
        </div>
        <div class="bar-total">
          <span class="bar-total-label">折后</span>
          <span class="bar-total-amount">¥{{ formatAmount(cartTotal) }}</span>
        </div>
      </div>
      <div class="bar-actions">
        <div class="btn-checkout" @click="goToCheckout">
          <span>结算</span>
        </div>
      </div>
    </div>

    <!-- 客户选择弹窗 -->
    <t-dialog
      v-model:visible="showCustomer"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="85%"
      :attach="false"
      class="customer-dialog"
    >
      <div class="customer-popup">
        <div class="popup-header">
          <span class="popup-title">选择客户</span>
          <div class="popup-close" @click="showCustomer = false">
            <t-icon name="close" />
          </div>
        </div>
        <div class="popup-search">
          <t-input v-model="customerKeyword" placeholder="搜索客户姓名、手机号" clearable size="small">
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
        </div>
        <div class="popup-list">
          <!-- 散客选项 -->
          <div
            :class="['popup-customer-item', 'walk-in-item', { selected: !currentCustomer }]"
            @click="selectCustomer(null)"
          >
            <div class="popup-customer-avatar walk-in-avatar">
              <t-icon name="user" />
            </div>
            <div class="popup-customer-info">
              <span class="popup-customer-name">散客</span>
              <span class="popup-customer-phone">无需选择客户</span>
            </div>
            <t-icon v-if="!currentCustomer" name="check-circle" class="check-icon" />
          </div>
          <!-- 客户列表 -->
          <div v-for="customer in filteredCustomers" :key="customer.id"
            :class="['popup-customer-item', { selected: currentCustomer?.id === customer.id }]"
            @click="selectCustomer(customer)"
          >
            <div class="popup-customer-avatar">
              <t-icon name="user" />
            </div>
            <div class="popup-customer-info">
              <span class="popup-customer-name">{{ customer.name }}</span>
              <span class="popup-customer-phone">{{ customer.phone }}</span>
            </div>
            <t-icon v-if="currentCustomer?.id === customer.id" name="check-circle" class="check-icon" />
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 欠款历史弹窗 -->
    <t-dialog
      v-model:visible="showDebtHistory"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="90%"
      :attach="false"
      class="debt-dialog"
    >
      <div class="debt-popup">
        <div class="popup-header">
          <span class="popup-title">欠款记录</span>
          <div class="popup-close" @click="showDebtHistory = false">
            <t-icon name="close" />
          </div>
        </div>
        <div class="debt-summary-card">
          <div class="debt-summary-label">累计欠款</div>
          <div class="debt-summary-amount">¥{{ formatAmount(customerTotalDebt) }}</div>
        </div>
        <div class="debt-list">
          <div v-if="debtHistory.length === 0" class="debt-empty">暂无欠款记录</div>
          <div v-for="record in debtHistory" :key="record.id" class="debt-item">
            <div class="debt-item-left">
              <div class="debt-item-no">{{ record.orderNo }}</div>
              <div class="debt-item-time">{{ formatDate(record.createdAt) }}</div>
            </div>
            <div class="debt-item-right">
              <span :class="['debt-item-amount', { settled: record.settled }]">
                {{ record.settled ? '已结清' : '¥' + formatAmount(record.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 删除确认弹窗 -->
    <t-dialog
      v-model:visible="showConfirm"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="70%"
      :attach="false"
      class="confirm-dialog"
    >
      <div class="confirm-popup">
        <div class="confirm-title">确认删除</div>
        <div class="confirm-msg">{{ confirmMsg }}</div>
        <div class="confirm-actions">
          <div class="confirm-cancel" @click="showConfirm = false">取消</div>
          <div class="confirm-ok" @click="doConfirm">删除</div>
        </div>
      </div>
    </t-dialog>

    <!-- 结算确认弹窗 -->
    <t-dialog
      v-model:visible="showCheckoutConfirm"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="80%"
      :attach="false"
      class="checkout-dialog"
    >
      <div class="checkout-popup">
        <div class="checkout-header">
          <t-icon name="check-circle" class="checkout-icon" />
          <span class="checkout-title">确认结算</span>
        </div>
        <div class="checkout-body">
          <div class="checkout-row">
            <span class="checkout-label">商品数量</span>
            <span class="checkout-value">{{ cartItemCount }}件</span>
          </div>
          <div class="checkout-row">
            <span class="checkout-label">订单金额</span>
            <span class="checkout-value amount">¥{{ formatAmount(cartTotal) }}</span>
          </div>
          <div class="checkout-row">
            <span class="checkout-label">客户</span>
            <span class="checkout-value">{{ currentCustomer ? currentCustomer.name : '散客' }}</span>
          </div>
          <div class="checkout-row">
            <span class="checkout-label">付款状态</span>
            <span :class="['checkout-value', 'status', paymentStatus]">
              {{ paymentStatus === 'paid' ? '全部付清' : paymentStatus === 'partial' ? '部分付款' : '未付款' }}
            </span>
          </div>
          <div v-if="paymentStatus === 'partial'" class="checkout-row">
            <span class="checkout-label">已付金额</span>
            <span class="checkout-value">¥{{ formatAmount(paidInput) }}</span>
          </div>
          <div v-if="paymentStatus !== 'paid'" class="checkout-row">
            <span class="checkout-label">欠款金额</span>
            <span class="checkout-value debt">¥{{ formatAmount(remainDebt) }}</span>
          </div>
        </div>
        <div class="checkout-actions">
          <div class="checkout-cancel" @click="showCheckoutConfirm = false">取消</div>
          <div class="checkout-ok" @click="doCheckout">确认结算</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { useBillingStore } from '@/store/billing'
import { useCustomerStore } from '@/store/customer'
import { useDebtStore } from '@/store/debt'

const router = useRouter()
const billingStore = useBillingStore()
const customerStore = useCustomerStore()
const debtStore = useDebtStore()

const cartItems = computed(() => billingStore.cartItems)
const cartItemCount = computed(() => billingStore.cartItemCount)
const cartTotalOriginal = computed(() => billingStore.cartTotalOriginal)
const cartTotal = computed(() => billingStore.cartTotal)
const paymentStatus = computed(() => billingStore.paymentStatus)
const currentCustomer = computed(() => billingStore.currentCustomer)

const discountPercent = ref(100)
const roundOff = ref(0)

// 部分付款输入
const paidInput = ref(0)

// 客户欠款
const customerTotalDebt = computed(() => {
  if (!currentCustomer.value?.id) return 0
  return debtStore.getCustomerTotalDebt(currentCustomer.value.id)
})

// 客户欠款历史
const customerDebtHistory = computed(() => {
  if (!currentCustomer.value?.id) return []
  return debtStore.getCustomerDebts(currentCustomer.value.id)
})

// 剩余欠款
const remainDebt = computed(() => {
  const paid = paidInput.value || 0
  return Math.round((cartTotal.value - paid) * 100) / 100
})

// 客户搜索
const showCustomer = ref(false)
const customerKeyword = ref('')
const customers = computed(() => customerStore.customers)

const filteredCustomers = computed(() => {
  if (!customerKeyword.value) return customers.value
  const kw = customerKeyword.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(kw) || (c.phone && c.phone.includes(kw))
  )
})

// 欠款历史弹窗
const showDebtHistory = ref(false)

// 监听折扣变化
watch(discountPercent, (val) => {
  billingStore.setOrderDiscount(val / 100)
})

watch(roundOff, (val) => {
  billingStore.setRoundOffAmount(val)
})

// 支付状态变更
const changePaymentStatus = (status) => {
  if (status === 'partial') {
    paidInput.value = 0
  }
  billingStore.setPaymentStatus(status)
}

// 监听部分付款输入
watch(paidInput, (val) => {
  const num = Number(val)
  if (isNaN(num) || num < 0) {
    billingStore.setPartialPaidAmount(0)
    return
  }
  if (num > cartTotal.value) {
    paidInput.value = cartTotal.value
    billingStore.setPartialPaidAmount(cartTotal.value)
    MessagePlugin.warning('已付金额不能大于订单总金额')
    return
  }
  billingStore.setPartialPaidAmount(num)
})

const selectCustomer = (customer) => {
  billingStore.setCurrentCustomer(customer)
  showCustomer.value = false
}

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 增减数量
const decrease = (item) => {
  if (item.quantity > 1) {
    billingStore.updateCartItemQuantity(item.skuId, item.quantity - 1)
  } else {
    showConfirmDialog(`确定要移除「${item.productName}」吗？`, () => {
      billingStore.removeFromCart(item.skuId)
    })
  }
}

const increase = (item) => {
  billingStore.updateCartItemQuantity(item.skuId, item.quantity + 1)
}

// 移除商品（弹窗确认）
const remove = (skuId) => {
  const item = cartItems.value.find(i => i.skuId === skuId)
  const name = item ? item.productName : '该商品'
  showConfirmDialog(`确定要移除「${name}」吗？`, () => {
    billingStore.removeFromCart(skuId)
  })
}

// 清空购物车（弹窗确认）
const clearAll = () => {
  showConfirmDialog('确定要清空购物车中的所有商品吗？', () => {
    billingStore.clearCart()
    MessagePlugin.success('已清空购物车')
  })
}

// 二次确认弹窗
const showConfirm = ref(false)
const confirmMsg = ref('')
const confirmAction = ref(null)

// 结算确认弹窗
const showCheckoutConfirm = ref(false)

const showConfirmDialog = (msg, action) => {
  confirmMsg.value = msg
  confirmAction.value = action
  showConfirm.value = true
}

const doConfirm = () => {
  if (confirmAction.value) {
    confirmAction.value()
  }
  showConfirm.value = false
}

// 结算（先显示确认弹窗）
const goToCheckout = () => {
  // 验证部分付款金额
  if (paymentStatus.value === 'partial') {
    const paid = Number(paidInput.value) || 0
    if (paid <= 0) {
      MessagePlugin.warning('请输入已付金额')
      return
    }
    if (paid > cartTotal.value) {
      MessagePlugin.warning('已付金额不能大于订单总金额')
      return
    }
  }
  // 未付款且未选客户时提醒
  if (paymentStatus.value === 'unpaid' && !currentCustomer.value) {
    MessagePlugin.warning('未付款订单需选择客户以便记录欠款')
    return
  }
  if (paymentStatus.value === 'partial' && !currentCustomer.value) {
    MessagePlugin.warning('部分付款订单需选择客户以便记录欠款')
    return
  }

  // 显示结算确认弹窗
  showCheckoutConfirm.value = true
}

// 确认结算（执行实际结算逻辑，调用后端API写入数据库）
const doCheckout = async () => {
  showCheckoutConfirm.value = false

  try {
    const order = await billingStore.createSalesOrder()
    if (order) {
      // 同步欠款记录到debt store
      debtStore.syncFromSalesOrder(order)
      MessagePlugin.success('结算成功')
      router.push('/billing')
    }
  } catch (error) {
    console.error('结算失败:', error)
    MessagePlugin.error(error.message || '结算失败，请稍后重试')
  }
}

// 返回
const goBack = () => {
  router.push('/billing')
}
</script>

<style lang="scss" scoped>
.cart-page {
  min-height: 100%;
  background: $bg-page;
  padding-bottom: 140px;

  // ========== 导航栏 ==========
  .nav-bar {
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    padding-top: $safe-area-top;
    position: sticky;
    top: 0;
    z-index: 100;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    box-sizing: border-box;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
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
      font-size: 17px; font-weight: 600; color: white;
    }

    .nav-action {
      cursor: pointer;
      .clear-text { font-size: 14px; color: rgba(255, 255, 255, 0.85); }
    }
  }

  // ========== 客户卡片 ==========
  .customer-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    border-radius: 10px;
    padding: 12px 14px;
    margin: 20px 0 12px;
    box-shadow: $shadow-sm;
    cursor: pointer;

    &:active { transform: scale(0.99); }

    .customer-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .customer-icon {
        font-size: 20px;
        color: $primary-color;
      }

      .customer-info {
        .customer-name {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          display: block;

          &.walk-in {
            color: $text-secondary;
          }
        }
        .customer-placeholder {
          font-size: 14px;
          color: $text-placeholder;
        }
        .customer-phone {
          font-size: 12px;
          color: $text-placeholder;
          margin-top: 2px;
          display: block;
        }
      }
    }

    .customer-right {
      display: flex;
      align-items: center;
      gap: 4px;

      .customer-change {
        font-size: 13px;
        color: $text-placeholder;
      }

      .customer-arrow {
        font-size: 16px;
        color: $text-placeholder;
      }
    }
  }

  // ========== 欠款提示 ==========
  .debt-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #FFF5F5;
    border: 1px solid #FED7D7;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 12px;
    cursor: pointer;

    &:active { background: #FED7D7; }

    .debt-warning-left {
      display: flex;
      align-items: center;
      gap: 6px;

      .debt-warning-icon {
        font-size: 16px;
        color: $error-color;
      }
      .debt-warning-text {
        font-size: 13px;
        color: $text-secondary;
      }
    }

    .debt-warning-right {
      display: flex;
      align-items: center;
      gap: 4px;

      .debt-amount {
        font-size: 15px;
        font-weight: 700;
        color: $error-color;
      }
      .debt-arrow {
        font-size: 14px;
        color: $error-color;
      }
    }
  }

  // ========== 空状态 ==========
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 0;
    .empty-icon { font-size: 48px; color: $text-placeholder; margin-bottom: 12px; }
    .empty-text { font-size: 15px; color: $text-primary; margin-bottom: 4px; }
    .empty-hint { font-size: 13px; color: $text-placeholder; margin-bottom: 20px; }
    .empty-btn {
      padding: 8px 28px;
      background: $primary-color;
      color: white;
      font-size: 14px;
      font-weight: 600;
      border-radius: 20px;
      cursor: pointer;
    }
  }

  // ========== 商品列表 ==========
  .cart-list {
    .cart-item {
      background: white;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 8px;
      box-shadow: $shadow-sm;

      .item-top {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        .item-name {
          font-size: 18px;
          font-weight: 600;
          color: $text-primary;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
          flex-shrink: 1;
        }

        .item-spec {
          display: flex;
          gap: 4px;
          margin-left: 8px;
          flex-shrink: 0;

          .spec-tag {
            display: inline-block;
            padding: 1px 6px;
            background: $bg-page;
            border-radius: 3px;
            font-size: 12px;
            color: $text-secondary;
          }
        }

        .item-del {
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
          margin-left: auto;
          .t-icon { font-size: 14px; color: $text-placeholder; }
          &:active .t-icon { color: $error-color; }
        }
      }

      .item-mid {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .original-price {
          font-size: 13px;
          color: $text-placeholder;
          flex-shrink: 0;
        }

        .item-amount-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;

          .price-input-wrap {
            display: flex;
            align-items: center;
            border: 1px solid $border-color;
            border-radius: 6px;
            height: 28px;
            padding: 0 6px;
            background: white;

            .price-prefix {
              font-size: 12px;
              color: $text-placeholder;
              margin-right: 2px;
              flex-shrink: 0;
            }

            .price-input {
              width: 52px;
              border: none;
              outline: none;
              font-size: 13px;
              color: $text-primary;
              height: 100%;
              &::placeholder { color: $text-placeholder; font-size: 11px; }
            }
          }

          .amount-x {
            font-size: 12px;
            color: $text-placeholder;
            flex-shrink: 0;
          }

          .item-qty {
            display: flex;
            align-items: center;

            .qty-btn {
              width: 28px; height: 28px;
              display: flex; align-items: center; justify-content: center;
              background: $bg-page; border: 1px solid $border-color;
              font-size: 16px; color: $text-secondary; cursor: pointer; user-select: none;
              &:first-child { border-radius: 6px 0 0 6px; }
              &:last-child { border-radius: 0 6px 6px 0; }
              &:active { background: $border-lighter; }
            }

            .qty-value {
              width: 36px; height: 28px;
              display: flex; align-items: center; justify-content: center;
              border: 1px solid $border-color; border-left: none; border-right: none;
              font-size: 13px; color: $text-primary; font-weight: 600;
            }
          }
        }
      }

      .item-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 8px;
        border-top: 1px dashed $border-lighter;

        .subtotal-label {
          font-size: 12px;
          color: $text-placeholder;
        }

        .item-subtotal {
          font-size: 15px;
          font-weight: 700;
          color: $primary-color;
        }
      }
    }
  }

  // ========== 折扣 & 抹零 ==========
  .extra-section {
    background: white;
    border-radius: 10px;
    padding: 10px 14px;
    margin-top: 8px;
    box-shadow: $shadow-sm;

    .extra-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;

      &:not(:last-child) {
        border-bottom: 1px solid $border-lighter;
        padding-bottom: 8px;
        margin-bottom: 2px;
      }

      .extra-label {
        font-size: 13px;
        color: $text-secondary;
      }

      .extra-input-wrap {
        display: flex;
        align-items: center;
        gap: 4px;

        .extra-input {
          width: 64px;
          height: 28px;
          border: 1px solid $border-color;
          border-radius: 6px;
          text-align: center;
          font-size: 13px;
          color: $text-primary;
          outline: none;
          &:focus { border-color: $primary-color; }
        }

        .extra-unit {
          font-size: 12px;
          color: $text-placeholder;
        }
      }
    }
  }

  // ========== 支付状态 ==========
  .payment-section {
    background: white;
    border-radius: 10px;
    padding: 14px;
    margin-top: 8px;
    box-shadow: $shadow-sm;

    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;

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

    .payment-tabs {
      display: flex;
      gap: 8px;

      .pay-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px 0;
        border: 1px solid $border-color;
        border-radius: 8px;
        font-size: 13px;
        color: $text-secondary;
        cursor: pointer;
        transition: all 0.2s;

        .tab-icon {
          font-size: 14px;
        }

        &:active { transform: scale(0.97); }

        &.tab-unpaid {
          background: #FFF5F5;
          border-color: #FEB2B2;
          color: $error-color;
        }

        &.tab-partial {
          background: #FFFBEB;
          border-color: #F6E05E;
          color: #D69E2E;
        }

        &.tab-paid {
          background: #F0FFF4;
          border-color: #68D391;
          color: #38A169;
        }

        &.active {
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
      }
    }

    .partial-pay-area {
      margin-top: 12px;
      padding: 12px;
      background: $bg-page;
      border-radius: 8px;

      .partial-row {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &:not(:last-child) {
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px dashed $border-lighter;
        }

        .partial-label {
          font-size: 13px;
          color: $text-secondary;
        }

        .partial-input-wrap {
          display: flex;
          align-items: center;
          border: 1px solid $border-color;
          border-radius: 6px;
          height: 32px;
          padding: 0 8px;
          background: white;

          .partial-prefix {
            font-size: 13px;
            color: $text-placeholder;
            margin-right: 4px;
          }

          .partial-input {
            width: 80px;
            border: none;
            outline: none;
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;
            height: 100%;
            &::placeholder { color: $text-placeholder; font-size: 12px; }
          }
        }

        .partial-debt {
          font-size: 15px;
          font-weight: 700;
          color: $error-color;
        }
      }
    }

    .pay-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;

      .pay-info-icon {
        font-size: 14px;
      }

      &.paid-info {
        background: #F0FFF4;
        color: #38A169;
      }

      &.unpaid-info {
        background: #FFF5F5;
        color: $error-color;
      }
    }
  }

  // ========== 底部固定栏 ==========
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: white;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);

    .bar-summary {
      padding: 10px 16px 6px;
      border-bottom: 1px solid $border-lighter;

      .bar-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;

        .bar-label {
          font-size: 12px;
          color: $text-secondary;
        }
        .bar-original {
          font-size: 12px;
          color: $text-placeholder;
          text-decoration: line-through;
        }
      }

      .bar-total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;

        .bar-total-label {
          font-size: 13px;
          color: $text-secondary;
        }
        .bar-total-amount {
          font-size: 22px;
          font-weight: 700;
          color: $primary-color;
        }
      }
    }

    .bar-actions {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      padding-bottom: calc(10px + #{$safe-area-bottom});
      gap: 10px;

      .btn-checkout {
        flex: 1;
        text-align: center;
        padding: 10px 0;
        background: linear-gradient(135deg, $primary-color, $primary-dark);
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba($primary-color, 0.3);
        &:active { transform: scale(0.98); }
      }
    }
  }

  // ========== 客户弹窗 ==========
  :deep(.customer-dialog) {
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

  .customer-popup {
    background: white;
    border-radius: 12px;

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid $border-lighter;

      .popup-title { font-size: 16px; font-weight: 600; color: $text-primary; }

      .popup-close {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; cursor: pointer; background: $bg-page;
        .t-icon { font-size: 16px; color: $text-secondary; }
      }
    }

    .popup-search {
      padding: 10px 16px;
    }

    .popup-list {
      max-height: 280px;
      overflow-y: auto;
      padding: 0 16px;

      .popup-customer-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid $border-lighter;
        cursor: pointer;

        &:last-child { border-bottom: none; }
        &:active { background: $bg-hover; }

        .popup-customer-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: $bg-page;
          display: flex; align-items: center; justify-content: center;
          margin-right: 10px; flex-shrink: 0;
          .t-icon { font-size: 16px; color: $text-placeholder; }
        }

        .popup-customer-info {
          flex: 1; min-width: 0;
          .popup-customer-name { font-size: 14px; color: $text-primary; font-weight: 500; display: block; }
          .popup-customer-phone { font-size: 12px; color: $text-placeholder; margin-top: 2px; display: block; }
        }

        .check-icon { font-size: 20px; color: $primary-color; flex-shrink: 0; }

        &.selected {
          .popup-customer-name { color: $primary-color; }
        }

        // 散客选项样式
        &.walk-in-item {
          .walk-in-avatar {
            background: $bg-page;
            .t-icon { color: $text-secondary; }
          }

          &.selected {
            .walk-in-avatar {
              background: rgba($primary-color, 0.1);
              .t-icon { color: $primary-color; }
            }
            .popup-customer-name { color: $primary-color; }
          }
        }
      }
    }
  }

  // ========== 欠款历史弹窗 ==========
  :deep(.debt-dialog) {
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

  .debt-popup {
    background: white;
    border-radius: 12px;
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid $border-lighter;
      flex-shrink: 0;

      .popup-title { font-size: 16px; font-weight: 600; color: $text-primary; }

      .popup-close {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; cursor: pointer; background: $bg-page;
        .t-icon { font-size: 16px; color: $text-secondary; }
      }
    }

    .debt-summary-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: #FFF5F5;
      margin: 12px 16px 0;
      border-radius: 8px;

      .debt-summary-label {
        font-size: 14px;
        color: $text-secondary;
      }
      .debt-summary-amount {
        font-size: 20px;
        font-weight: 700;
        color: $error-color;
      }
    }

    .debt-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px 16px;

      .debt-empty {
        text-align: center;
        padding: 30px 0;
        font-size: 13px;
        color: $text-placeholder;
      }

      .debt-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid $border-lighter;

        &:last-child { border-bottom: none; }

        .debt-item-left {
          .debt-item-no {
            font-size: 13px;
            font-weight: 500;
            color: $text-primary;
          }
          .debt-item-time {
            font-size: 12px;
            color: $text-placeholder;
            margin-top: 2px;
          }
        }

        .debt-item-right {
          .debt-item-amount {
            font-size: 14px;
            font-weight: 600;
            color: $error-color;

            &.settled {
              color: #38A169;
              font-weight: 500;
            }
          }
        }
      }
    }
  }

  // ========== 确认弹窗 ==========
  :deep(.confirm-dialog) {
    .t-dialog {
      margin: 0 auto;
      width: 70% !important;
      border-radius: 12px;
      overflow: visible;
      box-sizing: border-box;
      .t-dialog__header, .t-dialog__footer { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; overflow: hidden; }
      .t-dialog__close { display: none !important; }
      .t-dialog__body { padding: 0 !important; margin: 0; overflow: visible; }
    }
  }

  .confirm-popup {
    background: white;
    border-radius: 12px;
    padding: 24px 20px 16px;
    text-align: center;

    .confirm-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 8px;
    }

    .confirm-msg {
      font-size: 13px;
      color: $text-secondary;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      gap: 12px;

      .confirm-cancel {
        flex: 1;
        padding: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: $bg-page;
        color: $text-secondary;
        &:active { background: $border-lighter; }
      }

      .confirm-ok {
        flex: 1;
        padding: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: $error-color;
        color: white;
        &:active { opacity: 0.85; }
      }
    }
  }

  // ========== 结算确认弹窗 ==========
  :deep(.checkout-dialog) {
    .t-dialog {
      margin: 0 auto;
      width: 80% !important;
      border-radius: 12px;
      overflow: visible;
      box-sizing: border-box;
      .t-dialog__header, .t-dialog__footer { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; overflow: hidden; }
      .t-dialog__close { display: none !important; }
      .t-dialog__body { padding: 0 !important; margin: 0; overflow: visible; }
    }
  }

  .checkout-popup {
    background: white;
    border-radius: 12px;

    .checkout-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid $border-lighter;

      .checkout-icon {
        font-size: 20px;
        color: $success-color;
      }

      .checkout-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
      }
    }

    .checkout-body {
      padding: 16px 20px;

      .checkout-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;

        &:not(:last-child) {
          border-bottom: 1px dashed $border-lighter;
        }

        .checkout-label {
          font-size: 13px;
          color: $text-secondary;
        }

        .checkout-value {
          font-size: 14px;
          color: $text-primary;
          font-weight: 500;

          &.amount {
            font-size: 16px;
            font-weight: 700;
            color: $primary-color;
          }

          &.debt {
            color: $error-color;
            font-weight: 600;
          }

          &.status {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;

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
        }
      }
    }

    .checkout-actions {
      display: flex;
      gap: 12px;
      padding: 12px 20px 16px;

      .checkout-cancel {
        flex: 1;
        padding: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: $bg-page;
        color: $text-secondary;
        &:active { background: $border-lighter; }
      }

      .checkout-ok {
        flex: 1;
        padding: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: linear-gradient(135deg, $primary-color, $primary-dark);
        color: white;
        box-shadow: 0 2px 8px rgba($primary-color, 0.3);
        &:active { transform: scale(0.98); }
      }
    }
  }
}

// ========== 响应式适配 ==========
@media screen and (max-width: 400px) {
  .cart-page {
    .cart-list .cart-item .item-mid {
      flex-wrap: wrap;
      gap: 6px;

      .item-amount-row {
        margin-left: auto;
      }
    }

    .bottom-bar .bar-summary .bar-total .bar-total-amount {
      font-size: 20px;
    }

    .payment-section .payment-tabs {
      .pay-tab {
        padding: 8px 0;
        font-size: 12px;
      }
    }
  }
}
</style>
