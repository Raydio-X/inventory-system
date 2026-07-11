<template>
  <div class="page billing-page">
    <!-- 顶部搜索和筛选区 -->
    <div class="header-section">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <t-input
          v-model="searchKeyword"
          placeholder="搜索商品名称、品牌、SKU"
          clearable
          class="search-input"
        >
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
      </div>

      <!-- 分类筛选 -->
      <div class="category-filter">
        <div class="category-tabs">
          <div
            v-for="category in categoryList"
            :key="category.value"
            :class="['category-tab', { active: activeCategory === category.value }]"
            @click="onCategoryChange(category.value)"
          >
            {{ category.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- 商品列表 -->
    <div class="product-section">
      <!-- 空状态 -->
      <div v-if="filteredProducts.length === 0" class="empty-state">
        <t-icon name="inbox" class="empty-icon" />
        <span class="empty-text">暂无商品</span>
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
          <div class="product-image" @click.stop="showImagePreview(product.image)">
            <img v-if="product.image" :src="product.image" alt="" loading="lazy" />
            <div v-else class="image-placeholder">
              <t-icon name="image" />
            </div>
            <div v-if="product.image" class="image-zoom-icon">
              <t-icon name="zoom-in" />
            </div>
          </div>

          <!-- 商品信息 -->
          <div class="product-info">
            <div class="product-header">
              <div class="product-name">{{ product.name }}</div>
              <div class="product-status" :class="product.status">
                {{ product.status === 'active' ? '在售' : '停售' }}
              </div>
            </div>

            <div class="product-meta">
              <span class="meta-item">
                <t-icon name="shop" />
                {{ product.brand || '无品牌' }}
              </span>
            </div>

            <div class="product-footer">
              <div class="product-price">
                <span class="price-symbol">¥</span>
                <span class="price-value">{{ product.price }}</span>
              </div>
              <div class="product-sku">
                <t-icon name="view-module" />
                <span>{{ product.skus?.length || 0 }}个SKU</span>
              </div>
            </div>
          </div>

          <!-- 添加按钮 -->
          <div class="product-action">
            <div class="add-button">
              <t-icon name="add" />
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- 图片预览弹窗 -->
    <t-dialog
      v-model:visible="showImagePreviewDialog"
      :header="null"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="90%"
      class="image-preview-dialog"
      @click="showImagePreviewDialog = false"
    >
      <div class="image-preview-container" @click="showImagePreviewDialog = false">
        <img :src="previewImageUrl" alt="商品图片" class="preview-image" />
        <div class="preview-close">
          <t-icon name="close" />
        </div>
      </div>
    </t-dialog>

    <!-- 购物车浮动按钮 -->
    <div v-if="cartItemCount > 0" class="cart-fab" @click="goToCart">
      <div class="fab-content">
        <div class="fab-icon">
          <t-icon name="cart" />
          <span class="fab-badge">{{ cartItemCount }}</span>
        </div>
        <div class="fab-info">
          <span class="fab-label">购物车</span>
          <span class="fab-total">¥{{ cartTotal }}</span>
        </div>
      </div>
      <div class="fab-arrow">
        <t-icon name="chevron-right" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Dialog, Button, Icon } from 'tdesign-vue-next'
import { useProductStore } from '@/store/product'
import { useBillingStore } from '@/store/billing'

const router = useRouter()
const productStore = useProductStore()
const billingStore = useBillingStore()

// 搜索关键词
const searchKeyword = ref('')
const activeCategory = ref('all')

// 分类列表
const categoryList = computed(() => [
  { value: 'all', label: '全部' },
  ...productStore.categories.map(c => ({ value: c.id.toString(), label: c.name }))
])

// 筛选后的商品
const filteredProducts = computed(() => {
  let products = productStore.products.filter(p => p.status === 'active')

  if (activeCategory.value !== 'all') {
    products = products.filter(p =>
      p.categoryId?.toString() === activeCategory.value ||
      productStore.categories.find(c =>
        c.id.toString() === activeCategory.value &&
        c.children?.some(sc => sc.id === p.categoryId)
      )
    )
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    products = products.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.brand?.toLowerCase().includes(keyword)
    )
  }

  return products
})

// 图片预览弹窗
const showImagePreviewDialog = ref(false)
const previewImageUrl = ref('')

const showImagePreview = (imageUrl) => {
  if (imageUrl) {
    previewImageUrl.value = imageUrl
    showImagePreviewDialog.value = true
  }
}

// 购物车
const cartItemCount = computed(() => billingStore.cartItemCount)
const cartTotal = computed(() => billingStore.cartTotal)

// 分类切换
const onCategoryChange = (value) => {
  activeCategory.value = value
}

// 选择商品
const selectProduct = (product) => {
  router.push(`/billing/product/${product.id}`)
}

// 跳转购物车
const goToCart = () => {
  router.push('/billing/cart')
}

// 初始化
onMounted(() => {
  productStore.initData()
})
</script>

<style lang="scss" scoped>
.billing-page {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 100px;

  // 顶部搜索和筛选区
  .header-section {
    background: $bg-white;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: $shadow-sm;

    // 搜索栏
    .search-bar {
      padding: $spacing-md $spacing-lg;

      .search-input {
        width: 100%;
        border-radius: $radius-lg;
        background: $bg-page;

        :deep(.t-input__inner) {
          padding-left: $spacing-lg;
        }
      }
    }

    // 分类筛选
    .category-filter {
      padding: 0 $spacing-lg $spacing-md;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar {
        display: none;
      }

      .category-tabs {
        display: flex;
        gap: $spacing-sm;
        white-space: nowrap;

        .category-tab {
          padding: $spacing-sm $spacing-lg;
          border-radius: $radius-md;
          font-size: $font-sm;
          color: $text-secondary;
          background: $bg-page;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;

          &:hover {
            background: rgba($primary-color, 0.05);
          }

          &.active {
            color: $primary-color;
            background: rgba($primary-color, 0.1);
            border-color: rgba($primary-color, 0.3);
            font-weight: 500;
          }
        }
      }
    }
  }

  // 商品区域
  .product-section {
    padding: $spacing-md $spacing-lg;

    // 空状态
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl * 2;

      .empty-icon {
        font-size: 64px;
        color: $text-placeholder;
        margin-bottom: $spacing-md;
      }

      .empty-text {
        font-size: $font-md;
        color: $text-secondary;
      }
    }

    // 商品网格
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: $spacing-md;

      // 响应式设计
      @media (min-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: $spacing-lg;
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: $spacing-lg;
      }

      // 商品卡片
      .product-card {
        background: $bg-white;
        border-radius: $radius-lg;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid $border-light;
        position: relative;

        &:hover {
          transform: translateY(-2px);
          box-shadow: $shadow-md;
          border-color: rgba($primary-color, 0.2);
        }

        &:active {
          transform: translateY(0);
        }

        // 商品图片
        .product-image {
          width: 100%;
          height: 140px;
          background: $bg-page;
          position: relative;
          overflow: hidden;
          cursor: pointer;

          @media (min-width: 768px) {
            height: 180px;
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: $bg-page;
          }

          .image-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: $text-placeholder;

            .t-icon {
              font-size: 48px;
            }
          }

          .image-zoom-icon {
            position: absolute;
            bottom: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;

            .t-icon {
              font-size: 14px;
            }
          }
        }

        // 商品信息
        .product-info {
          padding: $spacing-md;

          .product-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: $spacing-sm;

            .product-name {
              font-size: $font-sm;
              font-weight: 500;
              color: $text-primary;
              line-height: 1.4;
              flex: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }

            .product-status {
              font-size: $font-xs;
              padding: 2px 6px;
              border-radius: $radius-sm;
              background: rgba($success-color, 0.1);
              color: $success-color;
              margin-left: $spacing-xs;

              &.inactive {
                background: rgba($text-placeholder, 0.1);
                color: $text-placeholder;
              }
            }
          }

          .product-meta {
            display: flex;
            flex-wrap: wrap;
            gap: $spacing-xs;
            margin-bottom: $spacing-sm;

            .meta-item {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: $font-xs;
              color: $text-secondary;

              .t-icon {
                font-size: 12px;
              }
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
                font-size: $font-xs;
                color: $primary-color;
                font-weight: 500;
              }

              .price-value {
                font-size: $font-md;
                color: $primary-color;
                font-weight: 600;
                margin-left: 2px;
              }
            }

            .product-sku {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: $font-xs;
              color: $text-secondary;

              .t-icon {
                font-size: 12px;
              }
            }
          }
        }

        // 添加按钮
        .product-action {
          position: absolute;
          top: $spacing-sm;
          right: $spacing-sm;

          .add-button {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba($primary-color, 0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            box-shadow: $shadow-sm;

            .t-icon {
              font-size: 18px;
            }

            &:hover {
              background: $primary-color;
              transform: scale(1.1);
            }
          }
        }
      }
    }
  }

  // 购物车浮动按钮
  .cart-fab {
    position: fixed;
    bottom: 80px;
    right: $spacing-lg;
    background: linear-gradient(135deg, $primary-color, rgba($primary-color, 0.8));
    color: white;
    border-radius: $radius-xl;
    padding: $spacing-md $spacing-lg;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: $shadow-lg;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 180px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-xl;
    }

    &:active {
      transform: translateY(0);
    }

    .fab-content {
      display: flex;
      align-items: center;
      gap: $spacing-md;

      .fab-icon {
        position: relative;
        width: 40px;
        height: 40px;
        background: rgba(white, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        .t-icon {
          font-size: 20px;
        }

        .fab-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: $error-color;
          color: white;
          font-size: $font-xs;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: $radius-sm;
          min-width: 18px;
          text-align: center;
        }
      }

      .fab-info {
        display: flex;
        flex-direction: column;

        .fab-label {
          font-size: $font-sm;
          opacity: 0.9;
        }

        .fab-total {
          font-size: $font-lg;
          font-weight: 600;
        }
      }
    }

    .fab-arrow {
      .t-icon {
        font-size: 18px;
        opacity: 0.8;
      }
    }
  }

  // 响应式设计 - 桌面端优化
  @media (min-width: 768px) {
    .header-section {
      .search-bar {
        padding: $spacing-lg $spacing-xl;
      }

      .category-filter {
        padding: 0 $spacing-xl $spacing-lg;
      }
    }

    .product-section {
      padding: $spacing-lg $spacing-xl;
    }

    .cart-fab {
      bottom: 80px;
      right: $spacing-xl;
      min-width: 220px;
    }
  }

  @media (min-width: 1024px) {
    .header-section {
      .search-bar {
        max-width: 600px;
        margin: 0 auto;
      }

      .category-filter {
        max-width: 600px;
        margin: 0 auto;
      }
    }

    .product-section {
      max-width: 1200px;
      margin: 0 auto;
    }
  }

  // 图片预览弹窗
  .image-preview-dialog {
    :deep(.t-dialog) {
      background: transparent;
      border-radius: 0;
      box-shadow: none;
    }

    :deep(.t-dialog__content) {
      background: transparent;
      padding: 0;
    }

    :deep(.t-dialog__header) {
      display: none;
    }

    :deep(.t-dialog__close) {
      display: none;
    }

    .image-preview-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      cursor: pointer;

      .preview-image {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: $radius-md;
        background: $bg-page;
      }

      .preview-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;

        .t-icon {
          font-size: 20px;
        }
      }
    }
  }
}
</style>