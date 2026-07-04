<template>
  <div class="page page-with-navbar inventory-page">
    <!-- 顶部导航�?-->
    <navbar title="库存管理" />

    <!-- 库存统计 -->
    <div class="stats-card">
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">{{ totalStock }}</div>
          <div class="stat-label">总库�?�?</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatAmount(totalCost) }}</div>
          <div class="stat-label">库存成本</div>
        </div>
        <div class="stat-item">
          <div class="stat-value warning">{{ warningCount }}</div>
          <div class="stat-label">预警商品</div>
        </div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索商品名称"
        clearable
      />
    </div>

    <!-- 库存列表 -->
    <div class="inventory-list">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="inventory-card"
      >
        <div class="card-header">
          <span class="product-name">{{ product.name }}</span>
          <span class="product-brand">{{ product.brand }}</span>
        </div>
        <div class="sku-list">
          <div v-for="sku in product.skus" :key="sku.id" class="sku-row">
            <span class="sku-info">{{ sku.color }} / {{ sku.size }}</span>
            <span class="sku-stock" :class="{ warning: sku.stock < 5 }">
              {{ sku.stock }}件</span>
            <span class="sku-price">¥{{ sku.price }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="total-stock">总库存：{{ getTotalStock(product) }}件</span>
          <t-button theme="default" size="small" @click="goToCheck(product.id)">盘点</t-button>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <t-button theme="primary" block @click="goToCheckAll">库存盘点</t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Button } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useProductStore } from '@/store/product'
import { useInventoryStore } from '@/store/inventory'

const router = useRouter()
const productStore = useProductStore()
const inventoryStore = useInventoryStore()

const searchKeyword = ref('')

const filteredProducts = computed(() => {
  let products = productStore.products.filter(p => p.status === 'active')
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    products = products.filter(p => p.name.toLowerCase().includes(keyword))
  }
  return products
})

const totalStock = computed(() =>
  filteredProducts.value.reduce((sum, p) => sum + getTotalStock(p), 0)
)

const totalCost = computed(() =>
  filteredProducts.value.reduce((sum, p) =>
    sum + p.skus.reduce((sSum, sku) => sSum + sku.stock * p.costPrice, 0), 0
  )
)

const warningCount = computed(() => inventoryStore.warningCount)

const getTotalStock = (product) =>
  product.skus?.reduce((sum, sku) => sum + sku.stock, 0) || 0

const formatAmount = (amount) => `¥${amount.toFixed(2)}`

const goToCheck = (productId) => {
  router.push(`/inventory/check?productId=${productId}`)
}

const goToCheckAll = () => {
  router.push('/inventory/check')
}

onMounted(() => {
  productStore.initData()
  inventoryStore.initData()
})
</script>

<style lang="scss" scoped>
.inventory-page {
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
          font-size: $font-xl;
          font-weight: 700;
          color: $text-primary;
          margin-bottom: $spacing-xs;

          &.warning {
            color: $warning-color;
          }
        }

        .stat-label {
          font-size: $font-xs;
          color: $text-secondary;
        }
      }
    }
  }

  .search-bar {
    padding: $spacing-sm $spacing-lg;
    background: $bg-white;
    margin-bottom: $spacing-md;
    box-shadow: $shadow-sm;
  }

  .inventory-list {
    .inventory-card {
      background: $bg-card;
      border-radius: $radius-lg;
      padding: $spacing-lg;
      margin-bottom: $spacing-md;

      .card-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: $spacing-md;

        .product-name {
          font-size: $font-md;
          font-weight: 500;
          color: $text-primary;
        }

        .product-brand {
          font-size: $font-sm;
          color: $text-secondary;
        }
      }

      .sku-list {
        .sku-row {
          display: flex;
          justify-content: space-between;
          padding: $spacing-sm 0;
          border-bottom: 1px solid $border-light;

          &:last-child {
            border-bottom: none;
          }

          .sku-info {
            font-size: $font-sm;
            color: $text-secondary;
          }

          .sku-stock {
            font-size: $font-sm;
            font-weight: 500;
            color: $text-primary;

            &.warning {
              color: $warning-color;
            }
          }

          .sku-price {
            font-size: $font-sm;
            color: $primary-color;
          }
        }
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: $spacing-md;
        padding-top: $spacing-md;
        border-top: 1px solid $border-light;

        .total-stock {
          font-size: $font-sm;
          color: $text-secondary;
        }
      }
    }
  }

  .quick-actions {
    padding: $spacing-lg;
  }
}
</style>

