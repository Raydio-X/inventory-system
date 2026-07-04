<template>
  <div class="page page-with-navbar inventory-check-page">
    <!-- 顶部导航栏 -->
    <navbar title="库存盘点" />

    <!-- 盘点商品 -->
    <div class="check-list">
      <div v-for="item in checkItems" :key="item.skuId" class="check-item">
        <div class="item-info">
          <span class="item-name">{{ item.productName }}</span>
          <span class="item-sku">{{ item.color }} / {{ item.size }}</span>
        </div>
        <div class="item-stock">
          <span class="stock-label">系统库存</span>
          <span class="stock-value">{{ item.systemStock }}件</span>
        </div>
        <div class="item-input">
          <span class="input-label">实际库存</span>
          <input
            v-model.number="item.actualStock"
            type="number"
            class="input-field"
          />
        </div>
        <div class="item-diff">
          <span :class="['diff-value', getDiffClass(item)]">
            {{ getDiffText(item) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 盘点统计 -->
    <div class="check-summary">
      <div class="summary-row">
        <span class="summary-label">盘点商品</span>
        <span class="summary-value">{{ checkItems.length }}件</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">盘盈</span>
        <span class="summary-value success">{{ profitCount }}件</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">盘亏</span>
        <span class="summary-value warning">{{ lossCount }}件</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <t-button theme="default" @click="goBack">取消</t-button>
      <t-button theme="primary" @click="confirmCheck">确认盘点</t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, MessagePlugin } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useProductStore } from '@/store/product'
import { useInventoryStore } from '@/store/inventory'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const inventoryStore = useInventoryStore()

const productId = route.query.productId

const checkItems = ref([])

const profitCount = computed(() =>
  checkItems.value.filter(i => i.actualStock > i.systemStock).length
)

const lossCount = computed(() =>
  checkItems.value.filter(i => i.actualStock < i.systemStock).length
)

const getDiffClass = (item) => {
  if (item.actualStock > item.systemStock) return 'profit'
  if (item.actualStock < item.systemStock) return 'loss'
  return 'equal'
}

const getDiffText = (item) => {
  const diff = item.actualStock - item.systemStock
  if (diff > 0) return `+${diff}`
  if (diff < 0) return `${diff}`
  return '0'
}

const goBack = () => {
  router.push('/inventory')
}

const confirmCheck = () => {
  checkItems.value.forEach(item => {
    inventoryStore.updateStock(item.skuId, item.actualStock)
    inventoryStore.addCheckLog(item)
  })

  MessagePlugin.success('盘点完成')
  router.push('/inventory')
}

onMounted(() => {
  productStore.initData()

  if (productId) {
    const product = productStore.products.find(p => p.id.toString() === productId)
    if (product) {
      checkItems.value = product.skus.map(sku => ({
        skuId: sku.id,
        productName: product.name,
        color: sku.color,
        size: sku.size,
        systemStock: sku.stock,
        actualStock: sku.stock
      }))
    }
  } else {
    checkItems.value = productStore.products.flatMap(product =>
      product.skus.map(sku => ({
        skuId: sku.id,
        productName: product.name,
        color: sku.color,
        size: sku.size,
        systemStock: sku.stock,
        actualStock: sku.stock
      }))
    )
  }
})
</script>

<style lang="scss" scoped>
.inventory-check-page {
  .check-list {
    .check-item {
      background: $bg-card;
      border-radius: $radius-lg;
      padding: $spacing-md $spacing-lg;
      margin-bottom: $spacing-md;

      .item-info {
        margin-bottom: $spacing-md;

        .item-name {
          font-size: $font-md;
          font-weight: 500;
          color: $text-primary;
        }

        .item-sku {
          font-size: $font-xs;
          color: $text-secondary;
        }
      }

      .item-stock, .item-input {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $spacing-sm;

        .stock-label, .input-label {
          font-size: $font-xs;
          color: $text-secondary;
        }

        .stock-value {
          font-size: $font-sm;
          font-weight: 500;
          color: $text-primary;
        }

        .input-field {
          width: 80px;
          height: 36px;
          padding: $spacing-sm;
          border: 1px solid $border-color;
          border-radius: $radius-sm;
          font-size: $font-sm;
          text-align: center;

          &:focus {
            border-color: $primary-color;
            outline: none;
          }
        }
      }

      .item-diff {
        text-align: right;

        .diff-value {
          font-size: $font-md;
          font-weight: 600;

          &.profit {
            color: $success-color;
          }

          &.loss {
            color: $warning-color;
          }

          &.equal {
            color: $text-placeholder;
          }
        }
      }
    }
  }

  .check-summary {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin-bottom: $spacing-lg;

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: $spacing-sm 0;

      .summary-label {
        font-size: $font-sm;
        color: $text-secondary;
      }

      .summary-value {
        font-size: $font-sm;
        font-weight: 500;
        color: $text-primary;

        &.success {
          color: $success-color;
        }

        &.warning {
          color: $warning-color;
        }
      }
    }
  }

  .action-section {
    display: flex;
    gap: $spacing-md;
    padding: $spacing-lg;
  }
}
</style>