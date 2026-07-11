<template>
  <div class="page warning-page">
    <!-- 顶部导航 -->
    <div class="page-header">
      <div class="header-left" @click="goBack">
        <t-icon name="chevron-left" />
        <span>返回</span>
      </div>
      <div class="header-title">库存预警</div>
      <div class="header-right"></div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-card">
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value warning">{{ warningProducts.length }}</div>
          <div class="stat-label">预警商品</div>
        </div>
        <div class="stat-item">
          <div class="stat-value danger">{{ outOfStockCount }}</div>
          <div class="stat-label">缺货SKU</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ lowStockCount }}</div>
          <div class="stat-label">低库存SKU</div>
        </div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索商品名称、规格"
        clearable
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>
    </div>

    <!-- 预警列表 -->
    <div class="list-section">
      <!-- 空状态 -->
      <div v-if="filteredProducts.length === 0" class="empty-state">
        <t-icon name="check-circle-filled" class="empty-icon" />
        <div class="empty-title">{{ searchKeyword ? '未找到相关商品' : '库存充足' }}</div>
        <div class="empty-desc">{{ searchKeyword ? '请尝试其他关键词' : '暂无库存预警商品' }}</div>
      </div>

      <!-- 商品列表 -->
      <div v-else class="product-list">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card"
          @click="goToProduct(product.id)"
        >
          <div class="card-main">
            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>
              <div class="product-meta">
                <span v-if="product.brand" class="meta-tag">{{ product.brand }}</span>
                <span class="meta-count">{{ product.skus.length }}个规格</span>
              </div>
            </div>
            <t-icon name="chevron-right" class="arrow-icon" />
          </div>
          
          <div class="sku-list">
            <div v-for="sku in product.skus" :key="sku.id" class="sku-item">
              <div class="sku-left">
                <span class="sku-spec">{{ sku.color }}/{{ sku.size }}</span>
                <span class="sku-price">¥{{ sku.price }}</span>
              </div>
              <div class="sku-right">
                <span v-if="sku.stock === 0" class="stock-tag danger">缺货</span>
                <span v-else class="stock-tag warning">{{ sku.stock }}件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Icon } from 'tdesign-vue-next'
import { useInventoryStore } from '@/store/inventory'
import { useProductStore } from '@/store/product'

const router = useRouter()
const inventoryStore = useInventoryStore()
const productStore = useProductStore()

const searchKeyword = ref('')

// 库存预警商品（stock <= 10）
const warningProducts = computed(() => {
  const products = productStore.products.filter(p => p.status === 'active')
  return products
    .map(product => {
      const lowStockSkus = (product.skus || []).filter(sku => sku.stock <= 10)
      if (lowStockSkus.length === 0) return null
      return { ...product, skus: lowStockSkus }
    })
    .filter(Boolean)
})

// 搜索过滤
const filteredProducts = computed(() => {
  if (!searchKeyword.value) return warningProducts.value
  const keyword = searchKeyword.value.toLowerCase()
  return warningProducts.value.filter(product =>
    product.name.toLowerCase().includes(keyword) ||
    product.brand?.toLowerCase().includes(keyword) ||
    product.skus?.some(sku =>
      sku.color.toLowerCase().includes(keyword) ||
      sku.size.toLowerCase().includes(keyword)
    )
  )
})

// 缺货数量
const outOfStockCount = computed(() =>
  warningProducts.value.reduce((sum, p) =>
    sum + p.skus.filter(s => s.stock === 0).length, 0
  )
)

// 低库存数量（不包括缺货）
const lowStockCount = computed(() =>
  warningProducts.value.reduce((sum, p) =>
    sum + p.skus.filter(s => s.stock > 0 && s.stock <= 10).length, 0
  )
)

// 返回
const goBack = () => {
  router.back()
}

// 跳转商品详情
const goToProduct = (productId) => {
  router.push(`/products/${productId}`)
}

// 初始化
onMounted(() => {
  productStore.initData()
  inventoryStore.initData()
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.warning-page {
  min-height: 100vh;
  background: $bg-page;

  // 顶部导航
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-md $spacing-lg;
    background: $bg-white;
    border-bottom: 1px solid $border-light;
    position: sticky;
    top: 0;
    z-index: 100;

    .header-left,
    .header-right {
      width: 60px;
      display: flex;
      align-items: center;
      font-size: $font-md;
      color: $text-secondary;
      cursor: pointer;

      .t-icon {
        font-size: 18px;
        margin-right: 4px;
      }
    }

    .header-title {
      font-size: $font-lg;
      font-weight: 600;
      color: $text-primary;
    }
  }

  // 统计区域
  .stats-card {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin: $spacing-lg;

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

          &.danger {
            color: $error-color;
          }
        }

        .stat-label {
          font-size: $font-xs;
          color: $text-secondary;
        }
      }
    }
  }

  // 搜索区域
  .search-bar {
    padding: $spacing-sm $spacing-lg;
    background: $bg-white;
    margin-bottom: $spacing-md;
    box-shadow: $shadow-sm;
  }

  // 列表区域
  .list-section {
    padding: $spacing-md $spacing-lg;
    padding-bottom: 100px;

    // 空状态
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px $spacing-lg;
      background: $bg-white;
      border-radius: $radius-lg;

      .empty-icon {
        font-size: 56px;
        color: $success-color;
        margin-bottom: $spacing-md;
      }

      .empty-title {
        font-size: $font-lg;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: $spacing-xs;
      }

      .empty-desc {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }

    // 商品列表
    .product-list {
      .product-card {
        background: $bg-white;
        border-radius: $radius-lg;
        margin-bottom: $spacing-md;
        overflow: hidden;
        box-shadow: $shadow-sm;

        .card-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: $spacing-lg;
          border-bottom: 1px solid $border-light;

          .product-info {
            flex: 1;
            min-width: 0;

            .product-name {
              font-size: $font-md;
              font-weight: 600;
              color: $text-primary;
              margin-bottom: $spacing-xs;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .product-meta {
              display: flex;
              align-items: center;
              gap: $spacing-sm;

              .meta-tag {
                font-size: $font-xs;
                color: $text-secondary;
                background: $bg-page;
                padding: 2px 8px;
                border-radius: $radius-sm;
              }

              .meta-count {
                font-size: $font-xs;
                color: $text-placeholder;
              }
            }
          }

          .arrow-icon {
            font-size: 18px;
            color: $text-placeholder;
            flex-shrink: 0;
          }
        }

        .sku-list {
          padding: $spacing-sm $spacing-lg;

          .sku-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: $spacing-sm 0;

            &:not(:last-child) {
              border-bottom: 1px solid $border-lighter;
            }

            .sku-left {
              display: flex;
              align-items: center;
              gap: $spacing-lg;

              .sku-spec {
                font-size: $font-sm;
                color: $text-primary;
                font-weight: 500;
              }

              .sku-price {
                font-size: $font-sm;
                color: $primary-color;
                font-weight: 500;
              }
            }

            .sku-right {
              .stock-tag {
                font-size: $font-xs;
                font-weight: 600;
                padding: 2px 10px;
                border-radius: $radius-sm;

                &.danger {
                  background: rgba($error-color, 0.1);
                  color: $error-color;
                }

                &.warning {
                  background: rgba($warning-color, 0.1);
                  color: $warning-color;
                }
              }
            }
          }
        }
      }
    }
  }
}
</style>