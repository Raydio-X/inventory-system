<template>
  <div class="page purchase-add-page">
    <!-- 顶部导航栏 -->
    <navbar title="新增采购" />

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <t-icon name="loading" class="loading-icon" />
      <span class="loading-text">加载中...</span>
    </div>

    <template v-else>
      <!-- 供应商选择 -->
      <div class="info-card">
        <div class="card-header">
          <t-icon name="store" class="header-icon" />
          <span class="header-title">供应商</span>
        </div>
        <div class="form-group">
          <div class="form-item">
            <label class="form-label">选择供应商</label>
            <t-select
              v-model="order.supplierId"
              :options="supplierOptions"
              placeholder="请选择供应商（可选）"
              clearable
              class="category-select"
            />
          </div>
          <div class="form-item">
            <label class="form-label">备注</label>
            <input
              v-model="order.remark"
              type="text"
              class="form-input"
              placeholder="备注信息（可选）"
            />
          </div>
        </div>
      </div>

      <!-- 采购商品 -->
      <div class="info-card">
        <div class="card-header">
          <t-icon name="cart" class="header-icon" />
          <span class="header-title">采购商品</span>
        </div>

        <div v-if="order.items.length === 0" class="empty-items">
          <t-icon name="inbox" class="empty-icon" />
          <span class="empty-text">暂未添加采购商品</span>
          <t-button
            theme="primary"
            size="small"
            variant="outline"
            class="add-product-btn"
            @click="showProductPicker = true"
          >
            <template #icon><t-icon name="add" /></template>
            选择商品
          </t-button>
        </div>

        <div v-else class="items-list">
          <div
            v-for="(item, index) in order.items"
            :key="index"
            class="item-card"
          >
            <div class="item-header">
              <span class="item-name">{{ item.productName }}</span>
              <t-icon
                name="close-circle-filled"
                class="item-delete-icon"
                @click="removeItem(index)"
              />
            </div>
            <div class="item-spec">
              <span class="spec-tag">{{ item.color }}</span>
              <span class="spec-tag">{{ item.size }}</span>
              <span class="spec-stock">库存: {{ item.currentStock }}件</span>
            </div>
            <div class="item-row">
              <div class="item-field">
                <label class="item-label">采购数量</label>
                <input
                  v-model.number="item.quantity"
                  type="number"
                  class="item-input"
                  placeholder="0"
                  min="1"
                />
              </div>
              <div class="item-field">
                <label class="item-label">采购单价</label>
                <div class="price-wrapper">
                  <span class="price-prefix">¥</span>
                  <input
                    v-model.number="item.costPrice"
                    type="number"
                    class="item-input price-input"
                    placeholder="0.00"
                    min="0"
                  />
                </div>
              </div>
              <div class="item-field total-field">
                <label class="item-label">小计</label>
                <span class="item-total">¥{{ formatAmount(item.quantity * item.costPrice) }}</span>
              </div>
            </div>
          </div>

          <div class="add-more-row">
            <t-button
              theme="primary"
              size="small"
              variant="outline"
              @click="showProductPicker = true"
            >
              <template #icon><t-icon name="add" /></template>
              继续添加
            </t-button>
          </div>
        </div>
      </div>

      <!-- 金额汇总 -->
      <div v-if="order.items.length > 0" class="info-card summary-card">
        <div class="summary-row">
          <span class="summary-label">采购商品数</span>
          <span class="summary-value">{{ order.items.length }} 项</span>
        </div>
        <div class="summary-row total-row">
          <span class="summary-label">采购总金额</span>
          <span class="summary-value total-amount">¥{{ formatAmount(totalAmount) }}</span>
        </div>
      </div>
    </template>

    <!-- 商品选择弹窗 -->
    <t-dialog
      v-model:visible="showProductPicker"
      header="选择采购商品"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="480px"
      class="product-picker-dialog"
    >
      <div class="picker-container">
        <!-- 搜索 -->
        <div class="picker-search">
          <t-input
            v-model="productSearchKeyword"
            placeholder="搜索商品名称"
            clearable
          />
        </div>

        <!-- 商品列表 -->
        <div class="picker-list">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="picker-product"
          >
            <div class="picker-product-name">{{ product.name }}</div>
            <div class="picker-sku-list">
              <div
                v-for="sku in product.skus"
                :key="sku.id"
                class="picker-sku-item"
                :class="{ selected: isSkuSelected(sku.id) }"
                @click="addSkuToItems(product, sku)"
              >
                <span class="sku-color">{{ sku.color }}</span>
                <span class="sku-size">{{ sku.size }}</span>
                <span class="sku-stock">库存:{{ sku.stock }}</span>
                <t-icon v-if="isSkuSelected(sku.id)" name="check-circle-filled" class="sku-check" />
              </div>
            </div>
          </div>

          <div v-if="filteredProducts.length === 0" class="picker-empty">
            <t-icon name="search" class="picker-empty-icon" />
            <span>暂无匹配商品</span>
          </div>
        </div>

        <div class="picker-footer">
          <t-button theme="default" size="large" @click="showProductPicker = false">完成</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 底部操作按钮 -->
    <div class="action-bar">
      <t-button
        theme="default"
        size="large"
        class="cancel-btn"
        @click="goBack"
      >
        取消
      </t-button>
      <t-button
        theme="primary"
        size="large"
        class="save-btn"
        :disabled="!canSave"
        @click="submitOrder"
      >
        <t-icon name="check" />
        <span>创建采购单</span>
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useProductStore } from '@/store/product'
import { usePurchaseStore } from '@/store/purchase'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const purchaseStore = usePurchaseStore()

const loading = ref(false)
const showProductPicker = ref(false)
const productSearchKeyword = ref('')

// 供应商列表
const suppliers = ref([])

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({
    label: s.name,
    value: s.id
  }))
)

// 采购订单数据
const order = ref({
  supplierId: null,
  remark: '',
  items: []
})

// 计算总金额
const totalAmount = computed(() =>
  order.value.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.costPrice || 0), 0)
)

// 是否可保存
const canSave = computed(() =>
  order.value.items.length > 0 &&
  order.value.items.every(item => item.quantity > 0 && item.costPrice > 0)
)

// 搜索过滤商品
const filteredProducts = computed(() => {
  let products = productStore.products.filter(p => p.status === 'active')
  if (productSearchKeyword.value) {
    const keyword = productSearchKeyword.value.toLowerCase()
    products = products.filter(p => p.name.toLowerCase().includes(keyword))
  }
  return products
})

// 判断SKU是否已被选中
const isSkuSelected = (skuId) => {
  return order.value.items.some(item => item.skuId === skuId)
}

// 添加SKU到采购列表
const addSkuToItems = (product, sku) => {
  const existIndex = order.value.items.findIndex(item => item.skuId === sku.id)
  if (existIndex >= 0) {
    // 已存在则移除
    order.value.items.splice(existIndex, 1)
  } else {
    // 添加新项
    order.value.items.push({
      productId: product.id,
      skuId: sku.id,
      productName: product.name,
      color: sku.color,
      size: sku.size,
      currentStock: sku.stock,
      quantity: 1,
      costPrice: product.costPrice || 0
    })
  }
}

// 移除采购项
const removeItem = (index) => {
  order.value.items.splice(index, 1)
}

// 格式化金额
const formatAmount = (amount) => {
  if (!amount || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 提交采购订单
const submitOrder = async () => {
  if (order.value.items.length === 0) {
    MessagePlugin.warning('请添加采购商品')
    return
  }

  for (let i = 0; i < order.value.items.length; i++) {
    const item = order.value.items[i]
    if (!item.quantity || item.quantity <= 0) {
      MessagePlugin.warning(`第${i + 1}项采购数量必须大于0`)
      return
    }
    if (!item.costPrice || item.costPrice <= 0) {
      MessagePlugin.warning(`第${i + 1}项采购单价必须大于0`)
      return
    }
  }

  try {
    const orderData = {
      supplierId: order.value.supplierId || null,
      remark: order.value.remark || '',
      items: order.value.items.map(item => ({
        productId: item.productId,
        skuId: item.skuId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        costPrice: item.costPrice
      }))
    }

    await purchaseStore.createPurchaseOrder(orderData)
    MessagePlugin.success('采购订单创建成功')
    router.back()
  } catch (error) {
    MessagePlugin.error(error.message || '创建采购订单失败')
  }
}

const goBack = () => {
  router.back()
}

// 加载供应商列表
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

onMounted(async () => {
  loading.value = true
  try {
    await productStore.initData()
    await fetchSuppliers()

    // 如果路由带有预填充参数（从添加商品页面跳转）
    if (route.query.productId) {
      const productId = route.query.productId
      const product = productStore.products.find(p => p.id === productId)
      if (product && product.skus) {
        // 预填充供应商
        if (product.supplierId) {
          order.value.supplierId = product.supplierId
        }

        // 预填充SKU
        const preselectedSkuIds = route.query.skuIds ? route.query.skuIds.split(',') : []
        const preselectedStocks = route.query.stocks ? route.query.stocks.split(',') : []

        for (const sku of product.skus) {
          if (preselectedSkuIds.length === 0 || preselectedSkuIds.includes(sku.id)) {
            const stockIndex = preselectedSkuIds.indexOf(sku.id)
            const stock = stockIndex >= 0 && preselectedStocks[stockIndex]
              ? Number(preselectedStocks[stockIndex])
              : sku.stock

            if (stock > 0 || preselectedSkuIds.length > 0) {
              order.value.items.push({
                productId: product.id,
                skuId: sku.id,
                productName: product.name,
                color: sku.color,
                size: sku.size,
                currentStock: sku.stock,
                quantity: stock > 0 ? stock : 1,
                costPrice: product.costPrice || 0
              })
            }
          }
        }
      }
    }

    // 如果路由带有供应商ID参数（从供应商详情页跳转）
    if (route.query.supplierId && !order.value.supplierId) {
      order.value.supplierId = route.query.supplierId
    }
  } catch (error) {
    MessagePlugin.error('加载数据失败')
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.purchase-add-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f5f5 0%, #ffffff 100%);
  padding-top: calc(44px + $safe-area-top);
  padding-bottom: calc(80px + $safe-area-bottom);

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

  // 信息卡片通用样式
  .info-card {
    background: #fff;
    border-radius: $radius-lg;
    padding: $spacing-lg;
    margin: 0 $spacing-lg $spacing-md;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: $spacing-lg;
      padding-bottom: $spacing-md;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);

      .header-icon {
        font-size: 20px;
        color: $warning-color;
        margin-right: $spacing-sm;
      }

      .header-title {
        font-size: $font-lg;
        color: $text-primary;
        font-weight: 600;
      }
    }
  }

  // 表单样式
  .form-group {
    .form-item {
      margin-bottom: $spacing-lg;

      &:last-child {
        margin-bottom: 0;
      }

      .form-label {
        display: block;
        font-size: $font-sm;
        color: $text-secondary;
        margin-bottom: $spacing-sm;
        font-weight: 500;
      }

      .form-input {
        width: 100%;
        height: 48px;
        padding: $spacing-md $spacing-lg;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: $radius-md;
        font-size: $font-md;
        color: $text-primary;
        background: #fafafa;
        transition: all 0.3s ease;

        &:focus {
          border-color: $primary-color;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.1);
          outline: none;
        }

        &::placeholder {
          color: $text-placeholder;
        }
      }

      .category-select {
        width: 100%;

        :deep(.t-select) {
          width: 100%;
          height: 48px;
        }

        :deep(.t-input) {
          height: 48px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: $radius-md;
          background: #fafafa;
          transition: all 0.3s ease;
          padding: $spacing-md $spacing-lg;

          &:hover {
            border-color: rgba(0, 0, 0, 0.2);
          }

          &:focus-within {
            border-color: $primary-color;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.1);
          }
        }

        :deep(.t-input__inner) {
          font-size: $font-md;
          color: $text-primary;
        }

        :deep(.t-input__placeholder) {
          color: $text-placeholder;
        }
      }
    }
  }

  // 空状态
  .empty-items {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-xl;
    color: $text-placeholder;

    .empty-icon {
      font-size: 48px;
      margin-bottom: $spacing-md;
      opacity: 0.5;
    }

    .empty-text {
      font-size: $font-sm;
      margin-bottom: $spacing-md;
    }

    .add-product-btn {
      margin-top: $spacing-sm;
    }
  }

  // 采购商品列表
  .items-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    .item-card {
      background: #fafafa;
      border-radius: $radius-md;
      padding: $spacing-md;
      border: 1px solid rgba(0, 0, 0, 0.06);

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: $spacing-sm;

        .item-name {
          font-size: $font-md;
          color: $text-primary;
          font-weight: 500;
        }

        .item-delete-icon {
          font-size: 20px;
          color: $text-placeholder;
          cursor: pointer;

          &:hover {
            color: $error-color;
          }
        }
      }

      .item-spec {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
        margin-bottom: $spacing-md;

        .spec-tag {
          padding: 2px 8px;
          border-radius: 3px;
          font-size: $font-xs;
          background: rgba(0, 0, 0, 0.04);
          color: $text-secondary;
        }

        .spec-stock {
          font-size: $font-xs;
          color: $text-placeholder;
        }
      }

      .item-row {
        display: flex;
        gap: $spacing-md;

        .item-field {
          flex: 1;

          .item-label {
            display: block;
            font-size: $font-xs;
            color: $text-secondary;
            margin-bottom: $spacing-xs;
          }

          .item-input {
            width: 100%;
            height: 36px;
            padding: $spacing-sm $spacing-md;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: $radius-sm;
            font-size: $font-sm;
            color: $text-primary;
            background: #fff;
            transition: all 0.3s ease;

            &:focus {
              border-color: $primary-color;
              box-shadow: 0 0 0 2px rgba(255, 87, 34, 0.1);
              outline: none;
            }

            &::placeholder {
              color: $text-placeholder;
              font-size: $font-xs;
            }
          }

          .price-wrapper {
            position: relative;
            display: flex;
            align-items: center;

            .price-prefix {
              position: absolute;
              left: $spacing-sm;
              font-size: $font-xs;
              color: $warning-color;
              font-weight: 600;
            }

            .price-input {
              padding-left: 24px;
            }
          }
        }

        .total-field {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;

          .item-total {
            font-size: $font-md;
            color: $text-primary;
            font-weight: 600;
            text-align: right;
            height: 36px;
            line-height: 36px;
          }
        }
      }
    }

    .add-more-row {
      display: flex;
      justify-content: center;
      padding: $spacing-md 0;
    }
  }

  // 汇总卡片
  .summary-card {
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-sm 0;

      .summary-label {
        font-size: $font-sm;
        color: $text-secondary;
      }

      .summary-value {
        font-size: $font-md;
        color: $text-primary;
        font-weight: 500;
      }
    }

    .total-row {
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding-top: $spacing-md;
      margin-top: $spacing-sm;

      .total-amount {
        font-size: $font-xl;
        color: $warning-color;
        font-weight: 700;
      }
    }
  }

  // 底部操作栏
  .action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    padding: $spacing-md $spacing-lg;
    padding-bottom: calc($spacing-md + $safe-area-bottom);
    display: flex;
    gap: $spacing-md;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
    z-index: 100;

    .cancel-btn {
      flex: 1;
      border-radius: $radius-md;
      font-size: $font-md;
      font-weight: 500;
    }

    .save-btn {
      flex: 2;
      border-radius: $radius-md;
      font-size: $font-md;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: $spacing-sm;
      background: linear-gradient(135deg, $warning-color 0%, rgba($warning-color, 0.8) 100%);
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
      transition: all 0.3s ease;

      :deep(.t-button__text) {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
      }

      &:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      }

      &:disabled {
        opacity: 0.5;
        box-shadow: none;
      }
    }
  }

  // 商品选择弹窗
  .product-picker-dialog {
    :deep(.t-dialog__content) {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: 0;
    }

    :deep(.t-dialog__header) {
      padding: $spacing-md $spacing-lg;
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      border-bottom: 1px solid $border-light;
    }

    :deep(.t-dialog__body) {
      padding: 0;
    }

    :deep(.t-dialog__close) {
      display: none;
    }
  }

  .picker-container {
    width: 100%;

    .picker-search {
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid $border-lighter;
    }

    .picker-list {
      max-height: 400px;
      overflow-y: auto;
      padding: $spacing-md;

      .picker-product {
        margin-bottom: $spacing-md;

        .picker-product-name {
          font-size: $font-md;
          font-weight: 500;
          color: $text-primary;
          margin-bottom: $spacing-sm;
        }

        .picker-sku-list {
          display: flex;
          flex-wrap: wrap;
          gap: $spacing-sm;

          .picker-sku-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border-radius: $radius-md;
            border: 1px solid rgba(0, 0, 0, 0.08);
            background: #fafafa;
            cursor: pointer;
            transition: all 0.2s ease;

            .sku-color,
            .sku-size {
              font-size: $font-xs;
              color: $text-secondary;
            }

            .sku-stock {
              font-size: 10px;
              color: $text-placeholder;
            }

            .sku-check {
              font-size: 16px;
              color: $warning-color;
              margin-left: 4px;
            }

            &:active {
              background: rgba(255, 152, 0, 0.05);
            }

            &.selected {
              border-color: $warning-color;
              background: rgba(255, 152, 0, 0.05);
            }
          }
        }
      }

      .picker-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 0;
        color: $text-placeholder;
        font-size: $font-sm;

        .picker-empty-icon {
          font-size: 32px;
          margin-bottom: $spacing-sm;
          opacity: 0.5;
        }
      }
    }

    .picker-footer {
      display: flex;
      padding: $spacing-md $spacing-lg;
      border-top: 1px solid $border-lighter;

      .t-button {
        flex: 1;
        border-radius: $radius-md;
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
