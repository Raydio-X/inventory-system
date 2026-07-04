<template>
  <div class="page page-with-navbar record-page">
    <!-- 顶部导航栏 -->
    <navbar title="收支明细" />

    <!-- 日期筛选 -->
    <div class="date-filter">
      <t-date-picker
        v-model="selectedDate"
        mode="date"
        @confirm="onDateConfirm"
      />
    </div>

    <!-- 统计 -->
    <div class="stats-card">
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value income">{{ formatAmount(periodIncome) }}</div>
          <div class="stat-label">收入</div>
        </div>
        <div class="stat-item">
          <div class="stat-value expense">{{ formatAmount(periodExpense) }}</div>
          <div class="stat-label">支出</div>
        </div>
        <div class="stat-item">
          <div class="stat-value profit">{{ formatAmount(periodProfit) }}</div>
          <div class="stat-label">净利润</div>
        </div>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="record-list">
      <div v-for="record in filteredRecords" :key="record.id" class="record-item">
        <div class="record-left">
          <span :class="['record-type', record.type]">
            {{ record.type === 'income' ? '+' : '-' }}
          </span>
          <div class="record-info">
            <span class="record-remark">{{ record.remark }}</span>
            <span class="record-time">{{ formatTime(record.createdAt) }}</span>
            <span class="record-category">{{ getCategoryText(record.category) }}</span>
          </div>
        </div>
        <div :class="['record-amount', record.type]">
          {{ formatAmount(record.amount) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { DatePicker } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()

const selectedDate = ref(new Date())

const filteredRecords = computed(() => {
  const date = selectedDate.value
  const dateStr = date.toISOString().slice(0, 10)
  return accountStore.accountRecords.filter(r =>
    r.createdAt.slice(0, 10) === dateStr
  )
})

const periodIncome = computed(() =>
  filteredRecords.value.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0)
)

const periodExpense = computed(() =>
  filteredRecords.value.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0)
)

const periodProfit = computed(() => periodIncome.value - periodExpense.value)

const formatAmount = (amount) => `¥${amount.toFixed(2)}`

const formatTime = (time) => {
  const date = new Date(time)
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getCategoryText = (category) => {
  const texts = {
    sales: '销售收入',
    repayment: '还款收入',
    other_income: '其他收入',
    purchase: '采购支出',
    daily: '日常费用',
    shipping: '运费',
    rent: '房租',
    other_expense: '其他支出'
  }
  return texts[category] || category
}

const onDateConfirm = (value) => {
  selectedDate.value = value
}

onMounted(() => {
  accountStore.initData()
})
</script>

<style lang="scss" scoped>
.record-page {
  .date-filter {
    padding: $spacing-md $spacing-lg;
    background: $bg-white;
  }

  .stats-card {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin-bottom: $spacing-lg;

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: $spacing-md;

      .stat-item {
        text-align: center;

        .stat-value {
          font-size: $font-lg;
          font-weight: 700;
          margin-bottom: $spacing-xs;

          &.income {
            color: $success-color;
          }

          &.expense {
            color: $error-color;
          }

          &.profit {
            color: $primary-color;
          }
        }

        .stat-label {
          font-size: $font-xs;
          color: $text-secondary;
        }
      }
    }
  }

  .record-list {
    background: $bg-card;
    border-radius: $radius-lg;

    .record-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid $border-light;

      &:last-child {
        border-bottom: none;
      }

      .record-left {
        display: flex;
        align-items: center;

        .record-type {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-size: $font-md;
          font-weight: 700;
          margin-right: $spacing-md;

          &.income {
            background: rgba($success-color, 0.1);
            color: $success-color;
          }

          &.expense {
            background: rgba($error-color, 0.1);
            color: $error-color;
          }
        }

        .record-info {
          .record-remark {
            font-size: $font-sm;
            color: $text-primary;
          }

          .record-time {
            font-size: $font-xs;
            color: $text-placeholder;
          }

          .record-category {
            font-size: $font-xs;
            color: $text-secondary;
          }
        }
      }

      .record-amount {
        font-size: $font-md;
        font-weight: 600;

        &.income {
          color: $success-color;
        }

        &.expense {
          color: $error-color;
        }
      }
    }
  }
}
</style>