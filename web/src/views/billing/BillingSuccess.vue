<template>
  <div class="page page-with-navbar success-page">
    <!-- 顶部导航栏 -->
    <navbar title="开单成功" />

    <div class="success-content">
      <t-icon name="check-circle" class="success-icon" />
      <div class="success-title">开单成功</div>
      <div class="success-info">
        <div class="info-row">
          <span class="info-label">订单号</span>
          <span class="info-value">{{ lastOrder?.orderNo }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">客户</span>
          <span class="info-value">{{ lastOrder?.customerName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">订单金额</span>
          <span class="info-value primary">¥{{ lastOrder?.totalAmount }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">实收金额</span>
          <span class="info-value">¥{{ lastOrder?.paidAmount }}</span>
        </div>
        <div class="info-row" v-if="lastOrder?.debtAmount > 0">
          <span class="info-label">欠款金额</span>
          <span class="info-value warning">¥{{ lastOrder?.debtAmount }}</span>
        </div>
      </div>
      <div class="success-actions">
        <t-button theme="primary" block @click="newOrder">继续开单</t-button>
        <t-button theme="default" block @click="goHome">返回首页</t-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Icon } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const billingStore = useBillingStore()

const lastOrder = computed(() => billingStore.salesOrders[billingStore.salesOrders.length - 1])

const newOrder = () => {
  router.push('/billing')
}

const goHome = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.success-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $spacing-xl;

  .success-content {
    text-align: center;

    .success-icon {
      font-size: 64px;
      color: $success-color;
      margin-bottom: $spacing-xl;
    }

    .success-title {
      font-size: $font-xxl;
      font-weight: 700;
      color: $text-primary;
      margin-bottom: $spacing-xl;
    }

    .success-info {
      background: $bg-card;
      border-radius: $radius-lg;
      padding: $spacing-lg;
      margin-bottom: $spacing-xl;

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
            font-weight: 600;
            color: $primary-color;
          }

          &.warning {
            font-weight: 600;
            color: $warning-color;
          }
        }
      }
    }

    .success-actions {
      display: flex;
      flex-direction: column;
      gap: $spacing-md;
    }
  }
}
</style>