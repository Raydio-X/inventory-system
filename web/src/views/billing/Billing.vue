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
          <div class="product-image">
            <img v-if="product.image" :src="product.image" alt="" loading="lazy" />
            <div v-else class="image-placeholder">
              <t-icon name="image" />
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

    <!-- SKU 选择弹窗 -->
    <t-dialog
      v-model:visible="showSkuPopup"
      :header="null"
      :footer="false"
      placement="center"
      width="95%"
      :attach="false"
      class="sku-dialog"
    >
      <div class="sku-popup" v-if="selectedProduct">
        <!-- 商品信息头部 -->
        <div class="popup-header">
          <div class="header-left">
            <div class="product-image">
              <img v-if="selectedProduct.image" :src="selectedProduct.image" alt="" />
              <div v-else class="image-placeholder">
                <t-icon name="image" />
              </div>
            </div>
            <div class="product-info">
              <div class="product-name">{{ selectedProduct.name }}</div>
              <div class="product-meta">
                <span class="meta-brand">{{ selectedProduct.brand || '无品牌' }}</span>
              </div>
              <div class="product-price">
                <span class="price-symbol">¥</span>
                <span class="price-value">{{ selectedProduct.price }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SKU 选择器 -->
        <div class="sku-selector-section">
          <sku-matrix
            :skus="selectedProduct.skus"
            :selected-quantities="selectedQuantities"
            @update:selected-quantities="updateQuantities"
            @select="onSkuSelect"
          />
        </div>

        <!-- 底部操作 -->
        <div class="popup-footer">
          <div class="footer-summary">
            <div class="summary-item">
              <span class="summary-label">已选数量</span>
              <span class="summary-value">{{ totalQuantity }}件</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总金额</span>
              <span class="summary-value">¥{{ selectedTotalPrice }}</span>
            </div>
          </div>
          <div class="footer-actions">
            <t-button
              theme="primary"
              size="large"
              @click="addToCart"
              class="confirm-btn"
              :disabled="totalQuantity === 0"
            >
              <span class="btn-content">
                <t-icon name="cart" />
                <span class="btn-text">加入购物车</span>
              </span>
            </t-button>
          </div>
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
import SkuMatrix from '@/components/SkuMatrix.vue'

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

// SKU 选择弹窗
const showSkuPopup = ref(false)
const selectedProduct = ref(null)
const selectedQuantities = ref({})

const selectedItems = computed(() => {
  return Object.entries(selectedQuantities.value)
    .filter(([_, q]) => q > 0)
    .map(([key, quantity]) => {
      const [color, size] = key.split('-')
      const sku = selectedProduct.value?.skus.find(s => s.color === color && s.size === size)
      return {
        skuId: sku?.id,
        color,
        size,
        quantity,
        price: sku?.price || selectedProduct.value?.price
      }
    })
})

// 总数量
const totalQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

// 已选商品总金额
const selectedTotalPrice = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// 购物车
const cartItemCount = computed(() => billingStore.cartItemCount)
const cartTotal = computed(() => billingStore.cartTotal)

// 分类切换
const onCategoryChange = (value) => {
  activeCategory.value = value
}

// 选择商品
const selectProduct = (product) => {
  selectedProduct.value = product
  selectedQuantities.value = {}
  showSkuPopup.value = true
}

// 关闭 SKU 弹窗
const closeSkuPopup = () => {
  showSkuPopup.value = false
  selectedProduct.value = null
  selectedQuantities.value = {}
}

// 更新数量
const updateQuantities = (quantities) => {
  selectedQuantities.value = quantities
}

// SKU 选择回调
const onSkuSelect = (sku, quantity) => {
  // 可以在这里处理单个 SKU 的选择逻辑
}

// 增减商品数量
const decreaseItem = (item) => {
  const key = `${item.color}-${item.size}`
  if (selectedQuantities.value[key] > 1) {
    selectedQuantities.value[key]--
  } else {
    selectedQuantities.value[key] = 0
  }
}

const increaseItem = (item) => {
  const key = `${item.color}-${item.size}`
  const sku = selectedProduct.value?.skus.find(s => s.id === item.skuId)
  if (sku && selectedQuantities.value[key] < sku.stock) {
    selectedQuantities.value[key]++
  }
}

// 加入购物车
const addToCart = () => {
  selectedItems.value.forEach(item => {
    const sku = selectedProduct.value?.skus.find(s => s.id === item.skuId)
    if (sku && item.quantity > 0) {
      billingStore.addToCart(selectedProduct.value, sku, item.quantity, item.price)
    }
  })

  closeSkuPopup()
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

          @media (min-width: 768px) {
            height: 180px;
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
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

  // SKU 选择弹窗
  .sku-dialog {
    :deep(.t-dialog) {
      max-width: 600px;
      border-radius: $radius-xl;
      overflow: hidden;

      @media (max-width: 767px) {
        max-width: 95%;
        border-radius: $radius-lg $radius-lg 0 0;
        margin-bottom: 0;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 85vh;
      }
    }

    .sku-popup {
      max-height: 85vh;
      overflow-y: auto;

      @media (min-width: 768px) {
        max-height: 70vh;
      }

      // 商品信息头部
      .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: $spacing-md $spacing-lg;
        background: linear-gradient(135deg, rgba($primary-color, 0.08), rgba($primary-color, 0.03));
        border-bottom: 1px solid $border-light;

        @media (min-width: 768px) {
          padding: $spacing-lg;
        }

        .header-left {
          display: flex;
          gap: $spacing-md;
          flex: 1;

          .product-image {
            width: 60px;
            height: 60px;
            border-radius: $radius-md;
            overflow: hidden;
            background: $bg-page;

            @media (min-width: 768px) {
              width: 80px;
              height: 80px;
            }

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .image-placeholder {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: $text-placeholder;

              .t-icon {
                font-size: 24px;

                @media (min-width: 768px) {
                  font-size: 32px;
                }
              }
            }
          }

          .product-info {
            flex: 1;

            .product-name {
              font-size: $font-md;
              font-weight: 600;
              color: $text-primary;
              margin-bottom: $spacing-xs;
              line-height: 1.4;
              text-align: left;

              @media (min-width: 768px) {
                font-size: $font-lg;
              }
            }

            .product-meta {
              font-size: $font-sm;
              color: $text-secondary;
              margin-bottom: $spacing-xs;
              text-align: left;

              @media (min-width: 768px) {
                margin-bottom: $spacing-sm;
              }

              .meta-divider {
                margin: 0 $spacing-xs;
                color: $text-placeholder;
              }
            }

            .product-price {
              display: flex;
              align-items: baseline;

              .price-symbol {
                font-size: $font-sm;
                color: $primary-color;
                font-weight: 500;
              }

              .price-value {
                font-size: $font-lg;
                color: $primary-color;
                font-weight: 600;
                margin-left: 2px;

                @media (min-width: 768px) {
                  font-size: $font-xl;
                }
              }
            }
          }
        }
      }

      // SKU选择器区域
      .sku-selector-section {
        // 无需额外样式，SkuMatrix组件自带样式
      }

      // 底部操作区
      .popup-footer {
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
        padding: $spacing-md $spacing-lg;
        background: white;
        border-top: 1px solid $border-light;
        position: sticky;
        bottom: 0;
        z-index: 10;

        @media (min-width: 768px) {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
        }

        .footer-summary {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          justify-content: flex-start;
          gap: $spacing-md;
          flex-wrap: nowrap;

          @media (min-width: 768px) {
            gap: $spacing-lg;
          }

          .summary-item {
            display: flex !important;
            flex-direction: row !important;
            align-items: center;
            gap: $spacing-xs;
            flex-shrink: 0;

            .summary-label {
              font-size: 16px;
              color: $text-secondary;

              @media (min-width: 768px) {
                font-size: $font-sm;
              }
            }

            .summary-value {
              font-size: 16px;
              color: $primary-color;
              font-weight: 600;
            }
          }
        }

        .footer-actions {
          display: flex;
          justify-content: center;
          width: 100%;

          @media (min-width: 768px) {
            width: auto;
          }

          .confirm-btn {
            width: 100%;
            max-width: 300px;

            @media (min-width: 768px) {
              width: auto;
            }

            :deep(.btn-content) {
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 6px;

              .t-icon,
              [class*="t-icon"],
              svg {
                font-size: 18px;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }

              .btn-text {
                line-height: 1;
                display: flex !important;
                align-items: center !important;
                font-size: $font-md;
              }
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
}
</style>