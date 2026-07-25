<template>
  <div class="page return-select-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="goBack">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">选择退货商品</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 商品信息 -->
    <div v-if="product" class="product-card">
      <div class="product-header">
        <div class="product-image">
          <img v-if="product.image" :src="product.image" alt="" />
          <div v-else class="image-placeholder">
            <t-icon name="image" />
          </div>
        </div>
        <div class="product-info">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-meta">
            <span class="meta-brand">{{ product.brand || '无品牌' }}</span>
            <span class="meta-sku">{{ product.skus?.length || 0 }}种规格</span>
          </div>
          <div class="product-price">
            <span class="price-symbol">¥</span>
            <span class="price-value">{{ product.price }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- SKU 选择器 -->
    <div class="sku-section">
      <div class="section-header">
        <t-icon name="swatch" class="section-icon" />
        <span class="section-title">选择规格和数量</span>
      </div>
      <sku-matrix
        v-if="product"
        :skus="product.skus"
        :selected-quantities="selectedQuantities"
        mode="return"
        @update:selected-quantities="updateQuantities"
      />
    </div>

    <!-- 底部固定栏 -->
    <div class="bottom-bar">
      <div class="bar-summary">
        <div class="bar-row">
          <span class="bar-label">已选</span>
          <span class="bar-value">{{ totalQuantity }}件</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">退货金额</span>
          <span class="bar-value price">¥{{ formatAmount(totalPrice) }}</span>
        </div>
      </div>
      <div class="bar-actions">
        <div class="btn-confirm" :class="{ disabled: totalQuantity === 0 }" @click="addToReturnList">
          <t-icon name="add" />
          <span>添加退货商品</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { useProductStore } from '@/store/product'
import { useBillingStore } from '@/store/billing'
import SkuMatrix from '@/components/SkuMatrix.vue'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const billingStore = useBillingStore()

const productId = route.params.productId
const product = ref(null)
const selectedQuantities = ref({})

// 计算总数量
const totalQuantity = computed(() => {
  return Object.values(selectedQuantities.value).reduce((sum, q) => sum + q, 0)
})

// 计算总价格
const totalPrice = computed(() => {
  if (!product.value) return 0
  let total = 0
  Object.entries(selectedQuantities.value).forEach(([key, quantity]) => {
    if (quantity > 0) {
      const [color, size] = key.split('-')
      const sku = product.value.skus?.find(s => s.color === color && s.size === size)
      if (sku) {
        total += quantity * product.value.price
      }
    }
  })
  return total
})

// 格式化金额
const formatAmount = (amount) => {
  if (!amount || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 更新数量
const updateQuantities = (quantities) => {
  selectedQuantities.value = quantities
}

// 添加到退货清单
const addToReturnList = () => {
  if (!product.value || totalQuantity.value === 0) {
    MessagePlugin.warning('请选择退货商品和数量')
    return
  }

  const items = []
  Object.entries(selectedQuantities.value).forEach(([key, quantity]) => {
    if (quantity > 0) {
      const [color, size] = key.split('-')
      const sku = product.value.skus?.find(s => s.color === color && s.size === size)
      if (sku) {
        items.push({
          skuId: sku.id,
          productId: product.value.id,
          productName: product.value.name,
          color,
          size,
          quantity,
          price: product.value.price
        })
      }
    }
  })

  // 合并到现有退货清单
  const existingItems = [...billingStore.returnCartItems]
  items.forEach(newItem => {
    const existIndex = existingItems.findIndex(i => i.skuId === newItem.skuId)
    if (existIndex >= 0) {
      existingItems[existIndex].quantity += newItem.quantity
    } else {
      existingItems.push(newItem)
    }
  })
  billingStore.returnCartItems = existingItems

  // 清空当前选择
  selectedQuantities.value = {}

  MessagePlugin.success('已添加到退货清单')
  router.push('/return')
}

// 返回
const goBack = () => {
  router.push('/return')
}

onMounted(() => {
  productStore.initData()
  const found = productStore.products.find(p => p.id === productId && p.status === 'active')
  if (found) {
    product.value = found
  } else {
    MessagePlugin.error('商品不存在')
    router.push('/return')
  }
})
</script>

<style lang="scss" scoped>
.return-select-page {
  min-height: 100%;
  background: $bg-page;
  padding-top: calc(56px + #{$safe-area-top});
  padding-bottom: 120px;

  // ========== 导航栏 ==========
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    box-sizing: border-box;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: calc(12px + #{$safe-area-top}) 16px 12px;
      height: 48px;
      box-sizing: border-box;
    }

    .nav-back {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      .t-icon { font-size: 22px; color: white; }
    }

    .nav-title {
      font-size: 17px; font-weight: 600; color: white;
    }

    .nav-placeholder {
      width: 32px;
    }
  }

  // ========== 商品卡片 ==========
  .product-card {
    background: white;
    margin: 20px 16px 12px;
    border-radius: 10px;
    box-shadow: $shadow-sm;
    overflow: hidden;

    .product-header {
      display: flex;
      padding: 14px;

      .product-image {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        overflow: hidden;
        background: $bg-page;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          .t-icon {
            font-size: 32px;
            color: $text-placeholder;
          }
        }
      }

      .product-info {
        flex: 1;
        margin-left: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .product-name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 4px;
        }

        .product-meta {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: $text-secondary;
          margin-bottom: 6px;

          .meta-brand { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .meta-sku { flex-shrink: 0; }
        }

        .product-price {
          display: flex;
          align-items: baseline;

          .price-symbol {
            font-size: 14px;
            color: $error-color;
            font-weight: 500;
          }

          .price-value {
            font-size: 20px;
            font-weight: 700;
            color: $error-color;
            margin-left: 2px;
          }
        }
      }
    }
  }

  // ========== SKU 选择区域 ==========
  .sku-section {
    background: white;
    margin: 0 16px 12px;
    border-radius: 10px;
    box-shadow: $shadow-sm;
    padding: 14px;

    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;

      .section-icon {
        font-size: 18px;
        color: $primary-color;
      }

      .section-title {
        font-size: 15px;
        font-weight: 600;
        color: $text-primary;
      }
    }
  }

  // ========== 底部固定栏 ==========
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: white;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);

    .bar-summary {
      padding: 10px 16px 6px;
      border-bottom: 1px solid $border-lighter;

      .bar-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;

        .bar-label { font-size: 12px; color: $text-secondary; }
        .bar-value {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          &.price { color: $error-color; }
        }
      }
    }

    .bar-actions {
      padding: 10px 16px;
      padding-bottom: calc(10px + #{$safe-area-bottom});

      .btn-confirm {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px 0;
        background: $primary-color;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba($primary-color, 0.3);

        &:active { transform: scale(0.98); }

        &.disabled {
          background: $border-lighter;
          color: $text-placeholder;
          cursor: not-allowed;
          box-shadow: none;
        }
      }
    }
  }
}
</style>