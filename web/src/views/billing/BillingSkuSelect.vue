<template>
  <div class="sku-select-page">
    <!-- 顶部导航 -->
    <div class="page-header">
      <div class="header-left" @click="goBack">
        <t-icon name="chevron-left" />
        <span>返回</span>
      </div>
      <div class="header-title">选择规格</div>
      <div class="header-right"></div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <t-icon name="loading" class="loading-icon" />
      <span>加载中...</span>
    </div>

    <!-- 商品不存在 -->
    <div v-else-if="!product" class="empty-container">
      <t-icon name="error-circle" class="empty-icon" />
      <span>商品不存在</span>
      <t-button theme="primary" size="large" @click="goBack">返回</t-button>
    </div>

    <!-- 商品信息 -->
    <template v-else>
      <div class="product-header">
        <div class="product-image" @click="showImagePreview(product.image)">
          <img v-if="product.image" :src="product.image" alt="" />
          <div v-else class="image-placeholder">
            <t-icon name="image" />
          </div>
          <div v-if="product.image" class="image-zoom-icon">
            <t-icon name="zoom-in" />
          </div>
        </div>
        <div class="product-info">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-meta">
            <span class="meta-item">{{ product.brand || '无品牌' }}</span>
            <span class="meta-item">库存: {{ totalStock }}件</span>
          </div>
          <div class="product-price">
            <span class="price-symbol">¥</span>
            <span class="price-value">{{ minPrice }}</span>
            <span v-if="maxPrice !== minPrice" class="price-range">- {{ maxPrice }}</span>
          </div>
        </div>
      </div>

      <!-- SKU 选择器 -->
      <div class="sku-section">
        <sku-matrix
          :skus="product.skus"
          :selected-quantities="selectedQuantities"
          @update:selected-quantities="updateQuantities"
          @select="onSkuSelect"
        />
      </div>

      <!-- 已选商品列表 -->
      <div v-if="selectedItems.length > 0" class="selected-section">
        <div class="section-header">
          <span class="section-title">已选商品</span>
          <span class="section-count">{{ selectedItems.length }}种</span>
        </div>
        <div class="selected-list">
          <div
            v-for="item in selectedItems"
            :key="`${item.color}-${item.size}`"
            class="selected-item"
          >
            <div class="item-info">
              <span class="item-color">{{ item.color }}</span>
              <span class="item-size">{{ item.size }}</span>
              <span class="item-price">¥{{ item.price }}</span>
            </div>
            <div class="item-actions">
              <div class="quantity-control">
                <div class="qty-btn minus" @click="decreaseItem(item)">
                  <t-icon name="remove" />
                </div>
                <input
                  type="number"
                  class="qty-input"
                  :value="item.quantity"
                  @input="updateItemQuantity(item, $event)"
                  min="0"
                />
                <div class="qty-btn plus" @click="increaseItem(item)">
                  <t-icon name="add" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="bottom-bar">
        <div class="bar-summary">
          <div class="summary-row">
            <span class="summary-label">已选</span>
            <span class="summary-value">{{ totalQuantity }}件</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">合计</span>
            <span class="summary-price">¥{{ selectedTotalPrice }}</span>
          </div>
        </div>
        <div class="bar-actions">
          <div class="btn-add" @click="addToCart">
            <t-icon name="cart" />
            <span>加入购物车</span>
          </div>
        </div>
      </div>
    </template>

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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductStore } from '@/store/product'
import { useBillingStore } from '@/store/billing'
import { MessagePlugin } from 'tdesign-vue-next'
import SkuMatrix from '@/components/SkuMatrix.vue'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const billingStore = useBillingStore()

// 商品ID
const productId = computed(() => route.params.id)

// 商品数据
const product = ref(null)
const loading = ref(true)

// 选择的数量
const selectedQuantities = ref({})

// 图片预览
const showImagePreviewDialog = ref(false)
const previewImageUrl = ref('')

// 已选商品
const selectedItems = computed(() => {
  return Object.entries(selectedQuantities.value)
    .filter(([_, q]) => q > 0)
    .map(([key, quantity]) => {
      const [color, size] = key.split('-')
      const sku = product.value?.skus.find(s => s.color === color && s.size === size)
      return {
        skuId: sku?.id,
        color,
        size,
        quantity,
        price: sku?.price || product.value?.price
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

// 总库存
const totalStock = computed(() =>
  product.value?.skus?.reduce((sum, sku) => sum + sku.stock, 0) || 0
)

// 价格范围
const minPrice = computed(() => {
  if (!product.value?.skus?.length) return product.value?.price || 0
  const prices = product.value.skus.map(s => s.price).filter(p => p > 0)
  return prices.length ? Math.min(...prices) : product.value?.price || 0
})

const maxPrice = computed(() => {
  if (!product.value?.skus?.length) return product.value?.price || 0
  const prices = product.value.skus.map(s => s.price).filter(p => p > 0)
  return prices.length ? Math.max(...prices) : product.value?.price || 0
})

// 加载商品数据
const loadProduct = async () => {
  loading.value = true
  try {
    const productData = await productStore.fetchProduct(productId.value)
    product.value = productData
  } catch (error) {
    console.error('加载商品失败:', error)
    MessagePlugin.error('加载商品失败')
  } finally {
    loading.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 图片预览
const showImagePreview = (imageUrl) => {
  if (imageUrl) {
    previewImageUrl.value = imageUrl
    showImagePreviewDialog.value = true
  }
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
  const sku = product.value?.skus.find(s => s.id === item.skuId)
  if (sku && selectedQuantities.value[key] < sku.stock) {
    selectedQuantities.value[key]++
  }
}

const updateItemQuantity = (item, event) => {
  const key = `${item.color}-${item.size}`
  let value = parseInt(event.target.value) || 0
  const sku = product.value?.skus.find(s => s.id === item.skuId)
  if (sku && value > sku.stock) {
    value = sku.stock
  }
  if (value < 0) {
    value = 0
  }
  selectedQuantities.value[key] = value
}

// 加入购物车
const addToCart = () => {
  if (selectedItems.value.length === 0) {
    MessagePlugin.warning('请选择商品规格')
    return
  }

  selectedItems.value.forEach(item => {
    const sku = product.value?.skus.find(s => s.id === item.skuId)
    if (sku && item.quantity > 0) {
      billingStore.addToCart(product.value, sku, item.quantity, item.price)
    }
  })

  MessagePlugin.success('已加入购物车')
  router.back()
}

// 初始化
onMounted(() => {
  loadProduct()
})
</script>

<style lang="scss" scoped>
.sku-select-page {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 100px;

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

  // 加载中
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px $spacing-lg;
    color: $text-placeholder;

    .loading-icon {
      font-size: 40px;
      margin-bottom: $spacing-md;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  }

  // 空状态
  .empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px $spacing-lg;
    color: $text-placeholder;

    .empty-icon {
      font-size: 48px;
      margin-bottom: $spacing-md;
    }

    .t-button {
      margin-top: $spacing-lg;
    }
  }

  // 商品头部
  .product-header {
    display: flex;
    gap: $spacing-lg;
    padding: $spacing-lg;
    background: $bg-white;
    margin-bottom: $spacing-md;

    .product-image {
      width: 100px;
      height: 100px;
      border-radius: $radius-md;
      overflow: hidden;
      background: $bg-page;
      position: relative;
      flex-shrink: 0;
      cursor: pointer;

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
          font-size: 32px;
        }
      }

      .image-zoom-icon {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 22px;
        height: 22px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;

        .t-icon {
          font-size: 12px;
        }
      }
    }

    .product-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .product-name {
        font-size: $font-lg;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: $spacing-sm;
        line-height: 1.4;
      }

      .product-meta {
        display: flex;
        flex-wrap: wrap;
        gap: $spacing-sm;
        margin-bottom: $spacing-sm;

        .meta-item {
          font-size: $font-xs;
          color: $text-secondary;
          background: $bg-page;
          padding: 2px 8px;
          border-radius: $radius-sm;
        }
      }

      .product-price {
        display: flex;
        align-items: center;
        gap: 2px;

        .price-symbol {
          font-size: 20px;
          color: $error-color;
          font-weight: 600;
        }

        .price-value {
          font-size: 20px;
          color: $error-color;
          font-weight: 600;
        }

        .price-range {
          font-size: 20px;
          color: $error-color;
          font-weight: 600;
          margin-left: 2px;
        }
      }
    }
  }

  // SKU 选择区域
  .sku-section {
    background: $bg-white;
    padding: $spacing-lg;
    margin-bottom: $spacing-md;
  }

  // 已选商品
  .selected-section {
    background: $bg-white;
    margin-bottom: $spacing-md;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid $border-light;

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

    .selected-list {
      .selected-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-md $spacing-lg;
        border-bottom: 1px solid $border-light;

        &:last-child {
          border-bottom: none;
        }

        .item-info {
          display: flex;
          align-items: center;
          gap: $spacing-sm;

          .item-color,
          .item-size {
            font-size: $font-sm;
            color: $text-primary;
            background: $bg-page;
            padding: 4px 10px;
            border-radius: $radius-sm;
          }

          .item-price {
            font-size: $font-sm;
            color: $error-color;
            font-weight: 500;
          }
        }

        .item-actions {
          .quantity-control {
            display: flex;
            align-items: center;
            background: $bg-page;
            border-radius: $radius-md;
            overflow: hidden;

            .qty-btn {
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: $text-secondary;
              cursor: pointer;
              transition: all 0.2s;

              &:active {
                background: $border-lighter;
              }

              .t-icon {
                font-size: 16px;
              }
            }

            .qty-input {
              width: 50px;
              height: 32px;
              text-align: center;
              border: none;
              background: transparent;
              font-size: $font-sm;
              color: $text-primary;
              font-weight: 500;

              &::-webkit-inner-spin-button,
              &::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }

              &:focus {
                outline: none;
              }
            }
          }
        }
      }
    }
  }

  // 底部操作栏
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: $bg-white;
    border-top: 1px solid $border-light;
    padding: $spacing-md $spacing-lg;
    padding-bottom: calc($spacing-md + #{$safe-area-bottom});
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    z-index: 100;

    .bar-summary {
      flex: 1;

      .summary-row {
        display: flex;
        align-items: baseline;
        gap: $spacing-xs;

        .summary-label {
          font-size: $font-xs;
          color: $text-secondary;
        }

        .summary-value {
          font-size: $font-md;
          color: $text-primary;
          font-weight: 500;
        }

        .summary-price {
          font-size: $font-lg;
          color: $error-color;
          font-weight: 600;
        }

        &:first-child {
          margin-bottom: 4px;
        }
      }
    }

    .bar-actions {
      .btn-add {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: $spacing-xs;
        background: linear-gradient(135deg, $primary-color, $primary-dark);
        color: white;
        padding: $spacing-md $spacing-xl;
        border-radius: $radius-lg;
        font-size: $font-md;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba($primary-color, 0.3);

        &:active {
          transform: scale(0.98);
        }

        .t-icon {
          font-size: 18px;
        }
      }
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