<template>
  <div class="page page-with-navbar checkout-page">
    <!-- 顶部导航栏 -->
    <navbar title="结算" />

    <!-- 订单信息 -->
    <div class="order-info">
      <div class="info-header">订单信息</div>
      <div class="info-row">
        <span class="info-label">客户</span>
        <span class="info-value">{{ currentCustomer?.name || '散客' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">商品数量</span>
        <span class="info-value">{{ cartItemCount }}件</span>
      </div>
      <div class="info-row">
        <span class="info-label">原价金额</span>
        <span class="info-value">¥{{ cartTotalOriginal }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">折扣</span>
        <span class="info-value">{{ discountPercent }}%</span>
      </div>
      <div class="info-row">
        <span class="info-label">抹零</span>
        <span class="info-value">¥{{ roundOff }}</span>
      </div>
      <div class="info-row total">
        <span class="info-label">订单金额</span>
        <span class="info-value primary">¥{{ cartTotal }}</span>
      </div>
    </div>

    <!-- 商品明细 -->
    <div class="items-section">
      <div class="section-title">商品明细</div>
      <div class="items-list">
        <div v-for="item in cartItems" :key="item.skuId" class="item-row">
          <span class="item-name">{{ item.productName }}</span>
          <span class="item-sku">{{ item.color }}/{{ item.size }}</span>
          <span class="item-quantity">{{ item.quantity }}件</span>
          <span class="item-price">¥{{ item.price * item.quantity }}</span>
        </div>
      </div>
    </div>

    <!-- 付款方式 -->
    <div class="payment-section">
      <div class="section-title">付款方式</div>
      <div class="payment-options">
        <div
          v-for="method in paymentMethods"
          :key="method.value"
          class="payment-item"
          :class="{ selected: selectedMethod === method.value }"
          @click="selectedMethod = method.value"
        >
          <t-icon :name="method.icon" class="payment-icon" />
          <span class="payment-label">{{ method.label }}</span>
        </div>
      </div>
    </div>

    <!-- 收款金额 -->
    <div class="amount-section">
      <div class="section-title">收款金额</div>
      <div class="amount-input-row">
        <input
          v-model.number="paidAmount"
          type="number"
          class="amount-input"
          placeholder="输入收款金额"
        />
        <t-button theme="default" size="small" @click="setFullAmount">全额</t-button>
      </div>
      <div class="amount-info">
        <div class="amount-row">
          <span class="amount-label">应收金额</span>
          <span class="amount-value">¥{{ cartTotal }}</span>
        </div>
        <div class="amount-row">
          <span class="amount-label">实收金额</span>
          <span class="amount-value primary">¥{{ paidAmount }}</span>
        </div>
        <div class="amount-row" v-if="debtAmount > 0">
          <span class="amount-label">欠款金额</span>
          <span class="amount-value warning">¥{{ debtAmount }}</span>
        </div>
      </div>
    </div>

    <!-- 确认按钮 -->
    <div class="confirm-section">
      <t-button theme="primary" block size="large" @click="confirmOrder" :disabled="paidAmount <= 0">
        确认开单
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useBillingStore } from '@/store/billing'
import { useAccountStore } from '@/store/account'
import { useDebtStore } from '@/store/debt'
import { useCustomerStore } from '@/store/customer'
import { useInventoryStore } from '@/store/inventory'

const router = useRouter()
const billingStore = useBillingStore()
const accountStore = useAccountStore()
const debtStore = useDebtStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()

const cartItems = computed(() => billingStore.cartItems)
const cartItemCount = computed(() => billingStore.cartItemCount)
const cartTotalOriginal = computed(() => billingStore.cartTotalOriginal)
const cartTotal = computed(() => billingStore.cartTotal)
const currentCustomer = computed(() => billingStore.currentCustomer)
const discountPercent = computed(() => billingStore.orderDiscount * 100)
const roundOff = computed(() => billingStore.roundOffAmount)

const paymentMethods = [
  { value: 'cash', label: '现金', icon: 'money-circle' },
  { value: 'wechat', label: '微信', icon: 'logo-wechat' },
  { value: 'alipay', label: '支付宝', icon: 'logo-alipay' },
  { value: 'transfer', label: '转账', icon: 'swap' }
]

const selectedMethod = ref('cash')
const paidAmount = ref(0)
const debtAmount = computed(() => cartTotal.value - paidAmount.value)

const setFullAmount = () => {
  paidAmount.value = cartTotal.value
}

const confirmOrder = () => {
  if (paidAmount.value <= 0) return

  // 根据付款金额设置支付状态
  if (paidAmount.value >= cartTotal.value) {
    billingStore.setPaymentStatus('paid')
  } else {
    billingStore.setPaymentStatus('partial')
    billingStore.setPartialPaidAmount(paidAmount.value)
  }

  // 创建销售单（无需传参）
  const order = billingStore.createSalesOrder()

  // 记账
  accountStore.addSalesIncome(order.id, order.orderNo, order.paidAmount)

  // 同步欠款记录到debt store
  debtStore.syncFromSalesOrder(order)

  // 更新客户消费统计
  if (order.customerId) {
    customerStore.updateCustomerStats(order.customerId, order.totalAmount)
  }

  // 记录库存出库
  cartItems.value.forEach(item => {
    inventoryStore.addSalesOutboundLog(item.skuId, item.quantity, order.id, order.orderNo)
  })

  MessagePlugin.success('开单成功')
  router.push('/billing/success')
}
</script>

<style lang="scss" scoped>
.checkout-page {
  padding-bottom: 100px;

  .order-info {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin-bottom: $spacing-lg;

    .info-header {
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: $spacing-md;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: $spacing-sm 0;

      .info-label {
        font-size: $font-sm;
        color: $text-secondary;
      }

      .info-value {
        font-size: $font-sm;
        color: $text-primary;

        &.primary {
          font-size: $font-lg;
          font-weight: 700;
          color: $primary-color;
        }
      }

      &.total {
        border-top: 1px solid $border-light;
        padding-top: $spacing-md;
      }
    }
  }

  .items-section, .payment-section, .amount-section {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin-bottom: $spacing-lg;

    .section-title {
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: $spacing-md;
    }

    .items-list {
      .item-row {
        display: flex;
        align-items: center;
        padding: $spacing-sm 0;
        border-bottom: 1px solid $border-light;

        &:last-child {
          border-bottom: none;
        }

        .item-name {
          font-size: $font-sm;
          color: $text-primary;
          flex: 1;
        }

        .item-sku {
          font-size: $font-xs;
          color: $text-secondary;
          margin-right: $spacing-sm;
        }

        .item-quantity {
          font-size: $font-xs;
          color: $text-secondary;
          margin-right: $spacing-sm;
        }

        .item-price {
          font-size: $font-sm;
          font-weight: 500;
          color: $primary-color;
        }
      }
    }

    .payment-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: $spacing-md;

      .payment-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: $spacing-md;
        background: $bg-color;
        border-radius: $radius-md;
        cursor: pointer;

        &.selected {
          background: rgba($primary-color, 0.1);
          border: 2px solid $primary-color;
        }

        .payment-icon {
          font-size: 24px;
          color: $text-secondary;
          margin-bottom: $spacing-xs;
        }

        .payment-label {
          font-size: $font-xs;
          color: $text-primary;
        }
      }
    }

    .amount-input-row {
      display: flex;
      gap: $spacing-md;
      margin-bottom: $spacing-lg;

      .amount-input {
        flex: 1;
        height: 44px;
        padding: $spacing-md;
        border: 1px solid $border-color;
        border-radius: $radius-md;
        font-size: $font-lg;
        font-weight: 600;

        &:focus {
          border-color: $primary-color;
          outline: none;
        }
      }
    }

    .amount-info {
      .amount-row {
        display: flex;
        justify-content: space-between;
        padding: $spacing-sm 0;

        .amount-label {
          font-size: $font-sm;
          color: $text-secondary;
        }

        .amount-value {
          font-size: $font-md;
          font-weight: 500;

          &.primary {
            color: $primary-color;
          }

          &.warning {
            color: $warning-color;
          }
        }
      }
    }
  }

  .confirm-section {
    padding: $spacing-lg;
  }
}
</style>