<template>
  <div class="page return-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">
          <t-icon name="rollback" class="nav-icon" />
          <span class="nav-text">客户退货</span>
        </div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-section">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索商品名称、品牌"
        clearable
        class="search-input"
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>
    </div>

    <!-- 商品列表 -->
    <div class="product-section">
      <div class="section-header">
        <span class="section-title">选择退货商品</span>
        <span class="section-count">共 {{ filteredProducts.length }} 件</span>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredProducts.length === 0" class="empty-state">
        <div class="empty-icon-wrapper">
          <t-icon name="inbox" class="empty-icon" />
        </div>
        <span class="empty-text">暂无商品</span>
        <span class="empty-hint">请先添加商品</span>
      </div>

      <!-- 商品网格 -->
      <div v-else class="product-grid">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card"
          @click="selectProduct(product)"
        >
          <!-- 商品图片 -->
          <div class="product-image-wrapper">
            <div class="product-image">
              <img v-if="product.image" :src="product.image" alt="" loading="lazy" />
              <div v-else class="image-placeholder">
                <t-icon name="image" />
              </div>
            </div>
            <div class="product-badge">
              <t-icon name="rollback" />
              <span class="badge-text">退货</span>
            </div>
            <div class="product-stock-badge" :class="{ low: getTotalStock(product) <= 10 }">
              <t-icon name="shop" />
              <span>{{ getTotalStock(product) }}件</span>
            </div>
          </div>

          <!-- 商品信息 -->
          <div class="product-info">
            <div class="product-name">{{ product.name }}</div>
            <div class="product-meta">
              <span class="meta-brand">{{ product.brand || '无品牌' }}</span>
              <span class="meta-sku">{{ product.skus?.length || 0 }}种规格</span>
            </div>
            <div class="product-footer">
              <div class="product-price">
                <span class="price-symbol">¥</span>
                <span class="price-value">{{ product.price }}</span>
              </div>
              <div class="select-button">
                <t-icon name="add" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 退货清单浮动按钮 -->
    <div v-if="returnItems.length > 0" class="return-fab" @click="goToReturnCart">
      <div class="fab-left">
        <div class="fab-icon">
          <t-icon name="rollback" />
        </div>
      </div>
      <div class="fab-center">
        <span class="fab-label">退货清单</span>
        <span class="fab-total">¥{{ returnTotalAmount }}</span>
      </div>
      <div class="fab-right">
        <t-icon name="chevron-right" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Dialog, Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import { useProductStore } from '@/store/product'
import { useInventoryStore } from '@/store/inventory'
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const productStore = useProductStore()
const inventoryStore = useInventoryStore()
const billingStore = useBillingStore()

const searchKeyword = ref('')

const returnItems = computed(() => billingStore.returnCartItems)

const filteredProducts = computed(() => {
  let products = productStore.products.filter(p => p.status === 'active')
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    products = products.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.brand?.toLowerCase().includes(keyword)
    )
  }
  return products
})

const returnTotalQuantity = computed(() =>
  returnItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

const returnTotalAmount = computed(() =>
  returnItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
)

const getTotalStock = (product) =>
  product.skus?.reduce((sum, sku) => sum + sku.stock, 0) || 0

const selectProduct = (product) => {
  router.push(`/return/select/${product.id}`)
}

const removeItem = (skuId) => {
  returnItems.value = returnItems.value.filter(item => item.skuId !== skuId)
}

// 跳转到退货清单页面
const goToReturnCart = () => {
  billingStore.addToReturnCart(returnItems.value, null)
  router.push('/return/cart')
}

onMounted(() => {
  productStore.initData()
  inventoryStore.initData()
})
</script>

<style lang="scss" scoped>
.return-page {
  min-height: 100%;
  background: $bg-page;
  padding-top: calc(56px + $safe-area-top);
  padding-bottom: 120px;

  // 导航栏 - 负margin抵消.page的左右padding实现全屏宽度
  .nav-bar {
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding-top: $safe-area-top;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    box-sizing: border-box;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: calc(12px + $safe-area-top) 16px 12px;
    }

    .nav-back {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;

      .t-icon {
        font-size: 24px;
        color: white;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    .nav-title {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .nav-icon {
        font-size: 20px;
        color: white;
      }

      .nav-text {
        font-size: $font-lg;
        font-weight: 600;
        color: white;
      }
    }

    .nav-placeholder {
      width: 36px;
    }
  }

  // 搜索区域
  .search-section {
    padding: 0 $spacing-lg;
    margin-top: 20px;
    margin-bottom: $spacing-lg;

    .search-input {
      width: 100%;
      border-radius: $radius-lg;
      background: $bg-white;
      box-shadow: $shadow-sm;

      :deep(.t-input__inner) {
        padding-left: $spacing-lg;
        height: 44px;
      }
    }
  }

  // 商品区域
  .product-section {
    padding: 0 $spacing-lg;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: $spacing-md;

      .section-title {
        font-size: $font-md;
        font-weight: 600;
        color: $text-primary;
      }

      .section-count {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }

    // 空状态
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl * 3;

      .empty-icon-wrapper {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba($text-placeholder, 0.05);
        border-radius: $radius-xl;
        margin-bottom: $spacing-md;

        .empty-icon {
          font-size: 40px;
          color: $text-placeholder;
        }
      }

      .empty-text {
        font-size: $font-md;
        color: $text-primary;
        margin-bottom: $spacing-xs;
      }

      .empty-hint {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }

    // 商品网格
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: $spacing-md;

      @media (min-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: $spacing-lg;
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: $spacing-lg;
      }

      // 商品卡片
      .product-card {
        background: $bg-white;
        border-radius: $radius-lg;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid $border-light;
        position: relative;

        &:hover {
          transform: translateY(-6px);
          box-shadow: $shadow-lg;
          border-color: rgba($primary-color, 0.3);
        }

        &:active {
          transform: translateY(-2px);
        }

        // 商品图片包装器
        .product-image-wrapper {
          position: relative;
          width: 100%;
          height: 120px;

          @media (min-width: 768px) {
            height: 150px;
          }

          .product-image {
            width: 100%;
            height: 100%;
            background: $bg-page;
            overflow: hidden;

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.3s ease;
            }

            .image-placeholder {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: $text-placeholder;

              .t-icon {
                font-size: 36px;
              }
            }
          }

          &:hover .product-image img {
            transform: scale(1.05);
          }

          .product-badge {
            position: absolute;
            top: $spacing-sm;
            left: $spacing-sm;
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba($primary-color, 0.95);
            padding: 4px 10px;
            border-radius: $radius-md;
            backdrop-filter: blur(4px);

            .t-icon {
              font-size: 12px;
              color: white;
            }

            .badge-text {
              font-size: $font-xs;
              color: white;
              font-weight: 600;
            }
          }

          .product-stock-badge {
            position: absolute;
            bottom: $spacing-sm;
            right: $spacing-sm;
            display: flex;
            align-items: center;
            gap: 3px;
            background: rgba(255, 255, 255, 0.9);
            padding: 3px 8px;
            border-radius: $radius-md;
            backdrop-filter: blur(4px);
            font-size: $font-xs;
            color: $text-secondary;

            .t-icon {
              font-size: 11px;
            }

            &.low {
              background: rgba($warning-color, 0.9);
              color: white;
            }
          }
        }

        // 商品信息
        .product-info {
          padding: $spacing-md;

          .product-name {
            font-size: $font-sm;
            font-weight: 600;
            color: $text-primary;
            line-height: 1.4;
            margin-bottom: $spacing-xs;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .product-meta {
            display: flex;
            align-items: center;
            gap: $spacing-sm;
            margin-bottom: $spacing-sm;

            .meta-brand {
              font-size: $font-xs;
              color: $text-secondary;
              padding: 2px 6px;
              background: $bg-page;
              border-radius: $radius-sm;
            }

            .meta-sku {
              font-size: $font-xs;
              color: $text-placeholder;
            }
          }

          .product-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;

            .product-price {
              display: flex;
              align-items: baseline;

              .price-symbol {
                font-size: $font-sm;
                color: $primary-color;
                font-weight: 600;
              }

              .price-value {
                font-size: $font-xl;
                color: $primary-color;
                font-weight: 700;
                margin-left: 1px;
              }
            }

            .select-button {
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, $primary-color, $primary-dark);
              color: white;
              border-radius: 50%;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: $shadow-sm;

              .t-icon {
                font-size: 16px;
              }

              &:hover {
                transform: scale(1.15);
                box-shadow: $shadow-md;
              }
            }
          }
        }
      }
    }
  }

  // 退货清单浮动按钮
  .return-fab {
    position: fixed;
    bottom: 80px;
    left: $spacing-lg;
    right: $spacing-lg;
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    border-radius: $radius-xl;
    box-shadow: 0 8px 24px rgba($primary-color, 0.4);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 999;
    padding: $spacing-md $spacing-lg;
    display: flex;
    align-items: center;

    &:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba($primary-color, 0.5);
    }

    &:active {
      transform: translateY(-2px);
    }

    .fab-left {
      display: flex;
      align-items: center;
      margin-right: $spacing-md;

      .fab-icon {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        backdrop-filter: blur(4px);

        .t-icon {
          font-size: 20px;
          color: white;
        }
      }
    }

    .fab-center {
      flex: 1;
      color: white;

      .fab-label {
        display: block;
        font-size: $font-sm;
        opacity: 0.85;
        margin-bottom: 2px;
        font-weight: 500;
      }

      .fab-total {
        display: block;
        font-size: $font-xxl;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
    }

    .fab-right {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .t-icon {
        font-size: 20px;
        color: white;
        opacity: 0.9;
      }
    }
  }
}
</style>