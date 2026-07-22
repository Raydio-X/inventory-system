<template>
  <div class="page product-detail-page">
    <!-- 顶部导航栏 -->
    <navbar :title="product?.name || '商品详情'" />

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <t-icon name="loading" class="loading-icon" />
      <span class="loading-text">加载中...</span>
    </div>

    <!-- 商品详情内容 -->
    <div v-else-if="product" class="detail-content">
      <!-- 商品图片展示 -->
      <div class="image-section">
        <div class="image-container">
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="product-image"
            loading="lazy"
          />
          <div v-else class="image-placeholder">
            <t-icon name="image" />
            <span>暂无图片</span>
          </div>
        </div>
      </div>

      <!-- 商品基础信息区 -->
      <div class="info-section">
        <div class="section-header">
          <t-icon name="info-circle" />
          <span class="section-title">基础信息</span>
        </div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item">
              <label class="info-label">商品名称</label>
              <div class="info-value primary">{{ product.name }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">分类</label>
              <div class="info-value">{{ getCategoryName(product.category) }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">供应商</label>
              <div class="info-value">{{ getSupplierName(product.supplierId) }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">状态</label>
              <div class="info-value">
                <span class="status-tag" :class="product.status">
                  {{ product.status === 'active' ? '在售' : '停售' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 价格信息区 -->
      <div class="price-section">
        <div class="section-header">
          <t-icon name="currency-exchange" />
          <span class="section-title">价格信息</span>
        </div>
        <div class="section-body">
          <div class="price-grid">
            <div class="price-item main-price">
              <label class="price-label">销售价格</label>
              <div class="price-value">
                <span class="price-amount">¥{{ product.price }}</span>
                <span class="price-unit">/件</span>
              </div>
            </div>
            <div class="price-item">
              <label class="price-label">平均成本</label>
              <div class="price-value">
                <span class="price-amount secondary">¥{{ product.avgCost || 0 }}</span>
                <span class="price-hint">（基于采购订单计算）</span>
              </div>
            </div>
            <div class="price-item">
              <label class="price-label">利润率</label>
              <div class="price-value">
                <span class="profit-rate" :class="profitRateClass">
                  {{ profitRate }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 库存信息区 -->
      <div class="stock-section">
        <div class="section-header">
          <t-icon name="view-module" />
          <span class="section-title">库存信息</span>
        </div>
        <div class="section-body">
          <!-- 总库存概览 -->
          <div class="stock-overview">
            <div class="stock-card total">
              <div class="stock-number">{{ totalStock }}</div>
              <div class="stock-label">总库存</div>
            </div>
            <div class="stock-card warning">
              <div class="stock-number">{{ warningStock }}</div>
              <div class="stock-label">库存预警</div>
            </div>
            <div class="stock-card sku">
              <div class="stock-number">{{ product.skus?.length || 0 }}</div>
              <div class="stock-label">SKU数量</div>
            </div>
          </div>

          <!-- SKU库存详情 -->
          <div class="sku-table">
            <div class="table-header">
              <div class="table-row">
                <div class="table-cell spec-cell">规格</div>
                <div class="table-cell stock-cell">库存</div>
                <div class="table-cell price-cell">价格</div>
              </div>
            </div>
            <div class="table-body">
              <div
                v-for="sku in product.skus"
                :key="sku.id"
                class="table-row"
              >
                <div class="table-cell spec-cell">
                  <span class="sku-color">{{ sku.color }}</span>
                  <span class="sku-divider">/</span>
                  <span class="sku-size">{{ sku.size }}</span>
                </div>
                <div class="table-cell stock-cell">
                  <span class="stock-num" :class="{ warning: sku.stock <= 10 }">
                    {{ sku.stock }}
                  </span>
                </div>
                <div class="table-cell price-cell">
                  <span class="price-value">¥{{ sku.price }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品不存在 -->
    <div v-else class="empty-wrapper">
      <t-icon name="error-circle" class="empty-icon" />
      <span class="empty-text">商品不存在或已删除</span>
      <t-button theme="primary" @click="goBack">返回列表</t-button>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="product" class="action-bar">
      <t-button theme="default" size="large" class="action-btn" @click="goToEdit">
        编辑
      </t-button>
      <t-button theme="warning" variant="outline" size="large" class="action-btn" @click="goToPurchase">
        采购
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useProductStore } from '@/store/product'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()

const loading = ref(false)
const product = ref(null)
const suppliers = ref([])

const productId = computed(() => route.params.id)

// 计算属性
const totalStock = computed(() =>
  product.value?.skus?.reduce((sum, sku) => sum + sku.stock, 0) || 0
)

const warningStock = computed(() =>
  product.value?.skus?.filter(sku => sku.stock <= 10).length || 0
)

const profitRate = computed(() => {
  // 使用平均成本计算利润率
  const avgCost = product.value?.avgCost || 0
  if (!avgCost || avgCost === 0) return 0
  const rate = ((product.value.price - avgCost) / avgCost * 100)
  return Math.round(rate)
})

const profitRateClass = computed(() => {
  if (profitRate.value >= 50) return 'high'
  if (profitRate.value >= 30) return 'medium'
  return 'low'
})

// 方法
const getCategoryName = (categoryId) => {
  if (!categoryId) return '未分类'
  const category = productStore.categories.find(c => c.id === categoryId)
  return category?.name || '未分类'
}

const getSupplierName = (supplierId) => {
  if (!supplierId) return '未设置'
  const supplier = suppliers.value.find(s => s.id === supplierId)
  return supplier?.name || '未设置'
}

const fetchSuppliers = async () => {
  try {
    const res = await api.get('/suppliers')
    if (res.success) {
      suppliers.value = res.data
    }
  } catch (e) {
    // 静默处理
  }
}

const loadProduct = async () => {
  loading.value = true
  try {
    const data = await productStore.fetchProduct(productId.value)
    if (data) {
      product.value = data
    } else {
      MessagePlugin.error('加载商品失败')
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    MessagePlugin.error('加载商品失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

const goToEdit = () => {
  router.push(`/products/edit/${productId.value}`)
}

const goToPurchase = () => {
  const query = { productId: productId.value }
  if (product.value?.supplierId) {
    query.supplierId = product.value.supplierId
  }
  router.push({ path: '/purchases/add', query })
}

const goBack = () => {
  router.push('/products')
}

onMounted(() => {
  productStore.initData()
  fetchSuppliers()
  loadProduct()
})
</script>

<style lang="scss" scoped>
.product-detail-page {
  min-height: 100vh;
  background: $bg-color;
  padding-top: calc(44px + $safe-area-top);
  padding-bottom: calc(70px + $safe-area-bottom);

  // 加载状态
  .loading-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;

    .loading-icon {
      font-size: 48px;
      color: $primary-color;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-size: $font-md;
      color: $text-secondary;
      margin-top: $spacing-md;
    }
  }

  // 空状态
  .empty-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;

    .empty-icon {
      font-size: 64px;
      color: $text-placeholder;
      margin-bottom: $spacing-md;
    }

    .empty-text {
      font-size: $font-md;
      color: $text-secondary;
      margin-bottom: $spacing-lg;
    }
  }

  // 详情内容
  .detail-content {
    padding: $spacing-md;
  }

  // 图片区域
  .image-section {
    margin-bottom: $spacing-md;

    .image-container {
      width: 100%;
      height: 180px;
      background: $bg-white;
      border-radius: $radius-lg;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;

      .product-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .image-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: $text-placeholder;

        .t-icon {
          font-size: 48px;
          margin-bottom: $spacing-sm;
        }

        span {
          font-size: $font-sm;
        }
      }
    }
  }

  // 信息区块通用样式
  .info-section,
  .price-section,
  .stock-section,
  .extend-section {
    background: $bg-white;
    border-radius: $radius-lg;
    margin-bottom: $spacing-md;
    overflow: hidden;

    .section-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      padding: $spacing-md $spacing-lg;
      background: linear-gradient(135deg, rgba($primary-color, 0.05), rgba($primary-color, 0.02));
      border-bottom: 1px solid $border-light;

      // 强制所有图标组件为inline元素
      > * {
        display: inline-block !important;
        vertical-align: middle !important;
      }

      // 图标样式
      .t-icon,
      [class*="t-icon"],
      svg {
        display: inline-block !important;
        vertical-align: middle !important;
        font-size: 20px !important;
        color: $primary-color !important;
        margin-right: $spacing-sm !important;
        flex-shrink: 0 !important;
        width: 20px !important;
        height: 20px !important;
        line-height: 20px !important;
      }

      // 标题样式
      .section-title {
        display: inline-block !important;
        vertical-align: middle !important;
        font-size: $font-md !important;
        font-weight: 600 !important;
        color: $text-primary !important;
        flex-shrink: 0 !important;
        line-height: 20px !important;
        margin: 0 !important;
      }
    }

    .section-body {
      padding: $spacing-lg;
    }
  }

  // 基础信息区
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-md;

    .info-item {
      display: flex;
      flex-direction: column;

      .info-label {
        font-size: $font-xs;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      .info-value {
        font-size: $font-md;
        color: $text-primary;
        font-weight: 500;

        &.primary {
          font-size: $font-lg;
          font-weight: 600;
          color: $text-primary;
        }
      }

      .status-tag {
        display: inline-block;
        padding: 2px 8px;
        border-radius: $radius-sm;
        font-size: $font-xs;
        font-weight: 500;

        &.active {
          background: rgba($success-color, 0.1);
          color: $success-color;
        }

        &.inactive {
          background: rgba($text-placeholder, 0.1);
          color: $text-placeholder;
        }
      }
    }
  }

  // 价格信息区
  .price-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-lg;

    .price-item {
      display: flex;
      flex-direction: column;

      .price-label {
        font-size: $font-xs;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      .price-value {
        .price-amount {
          font-size: $font-xl;
          font-weight: 700;
          color: $primary-color;

          &.secondary {
            font-size: $font-lg;
            color: $text-secondary;
          }
        }

        .price-unit {
          font-size: $font-sm;
          color: $text-placeholder;
          margin-left: 2px;
        }

        .price-hint {
          font-size: $font-xs;
          color: $text-placeholder;
          margin-left: 4px;
        }

        .profit-rate {
          font-size: $font-lg;
          font-weight: 600;

          &.high {
            color: $success-color;
          }

          &.medium {
            color: $warning-color;
          }

          &.low {
            color: $text-secondary;
          }
        }
      }

      &.main-price {
        .price-value {
          .price-amount {
            font-size: 24px;
          }
        }
      }
    }
  }

  // 库存信息区
  .stock-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
    margin-bottom: $spacing-lg;

    .stock-card {
      background: $bg-color;
      border-radius: $radius-md;
      padding: $spacing-md;
      text-align: center;

      .stock-number {
        font-size: $font-xl;
        font-weight: 700;
        color: $text-primary;
        margin-bottom: $spacing-xs;
      }

      .stock-label {
        font-size: $font-xs;
        color: $text-secondary;
      }

      &.total {
        background: rgba($primary-color, 0.05);
        .stock-number {
          color: $primary-color;
        }
      }

      &.warning {
        background: rgba($warning-color, 0.05);
        .stock-number {
          color: $warning-color;
        }
      }

      &.sku {
        background: rgba($success-color, 0.05);
        .stock-number {
          color: $success-color;
        }
      }
    }
  }

  // SKU表格
  .sku-table {
    border: 1px solid $border-light;
    border-radius: $radius-md;
    overflow: hidden;

    .table-header {
      background: $bg-color;

      .table-row {
        font-weight: 600;
        color: $text-secondary;
      }
    }

    .table-body {
      .table-row {
        &:nth-child(even) {
          background: rgba($bg-color, 0.5);
        }
      }
    }

    .table-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1.2fr;
      padding: $spacing-sm $spacing-md;
      border-bottom: 1px solid $border-light;

      &:last-child {
        border-bottom: none;
      }

      // 移动端响应式设计
      @media (max-width: 768px) {
        grid-template-columns: 1.2fr 1fr 1fr;
        padding: $spacing-xs $spacing-sm;
        gap: $spacing-xs;
      }

      .table-cell {
        font-size: $font-sm;
        color: $text-primary;
        display: flex;
        align-items: center;

        // 移动端字体调整
        @media (max-width: 768px) {
          font-size: $font-xs;
        }

        // 规格列 - 左对齐
        &.spec-cell {
          justify-content: flex-start;

          .sku-color {
            color: $text-primary;
            font-weight: 500;
          }

          .sku-divider {
            color: $text-placeholder;
            margin: 0 4px;
          }

          .sku-size {
            color: $text-secondary;
          }
        }

        // 库存列 - 居中对齐
        &.stock-cell {
          justify-content: center;

          .stock-num {
            font-weight: 600;
            font-size: $font-md;

            @media (max-width: 768px) {
              font-size: $font-sm;
            }

            &.low {
              color: $warning-color;
            }

            &.warning {
              color: $error-color;
            }
          }
        }

        // 价格列 - 右对齐
        &.price-cell {
          justify-content: flex-end;
          color: $primary-color;
          font-weight: 500;

          .price-value {
            font-size: $font-md;

            @media (max-width: 768px) {
              font-size: $font-sm;
            }
          }
        }
      }
    }
  }

  // 底部操作栏
  .action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    padding-bottom: calc($spacing-md + $safe-area-bottom);
    background: $bg-white;
    border-top: 1px solid $border-light;
    z-index: 100;

    .action-btn {
      flex: 1;
      border-radius: $radius-md;
    }
  }
}

// 加载动画
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>