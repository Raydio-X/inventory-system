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

    <!-- 客户选择卡片 -->
    <div class="customer-card" @click="showCustomerPopup = true">
      <div class="card-header">
        <div class="card-icon-wrapper">
          <t-icon name="user" class="card-icon" />
        </div>
        <div class="card-title-area">
          <span class="card-title">退货客户</span>
          <span v-if="!selectedCustomer" class="card-hint">请选择</span>
          <span v-else class="card-hint selected-hint">已选择</span>
        </div>
      </div>
      <div class="card-body">
        <div v-if="selectedCustomer" class="customer-selected">
          <div class="customer-avatar">
            <t-icon name="user" />
          </div>
          <div class="customer-details">
            <div class="customer-name">{{ selectedCustomer.name }}</div>
            <div class="customer-phone">{{ selectedCustomer.phone }}</div>
          </div>
          <div class="customer-check">
            <t-icon name="check-circle" />
          </div>
        </div>
        <div v-else class="customer-empty">
          <t-icon name="plus-circle" class="empty-icon" />
          <span class="empty-text">点击选择退货客户</span>
        </div>
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
              <t-icon name="inventory" />
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

    <!-- SKU 选择弹窗 -->
    <t-dialog
      v-model:visible="showSkuPopup"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="95%"
      :attach="false"
      class="sku-dialog"
    >
      <div class="sku-popup" v-if="selectedProduct">
        <!-- 弹窗头部 -->
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
          <div class="header-close" @click="closeSkuPopup">
            <t-icon name="close" />
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
          <div class="footer-info">
            <div class="info-item">
              <span class="info-label">已选</span>
              <span class="info-value">{{ totalQuantity }}件</span>
            </div>
            <div class="info-item">
              <span class="info-label">退货金额</span>
              <span class="info-value price">¥{{ selectedTotalPrice }}</span>
            </div>
          </div>
          <t-button
            theme="primary"
            size="large"
            block
            @click="addToReturnList"
            class="confirm-btn"
            :disabled="totalQuantity === 0"
          >
            <span class="btn-content">
              <t-icon name="add" />
              <span>添加退货商品</span>
            </span>
          </t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 客户选择弹窗 -->
    <t-dialog
      v-model:visible="showCustomerPopup"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="90%"
      :attach="false"
      class="customer-dialog"
    >
      <div class="customer-popup">
        <!-- 弹窗头部 -->
        <div class="popup-header">
          <div class="header-title">
            <t-icon name="user" />
            <span>选择客户</span>
          </div>
          <div class="header-close" @click="showCustomerPopup = false">
            <t-icon name="close" />
          </div>
        </div>

        <!-- 搜索栏 -->
        <div class="customer-search">
          <t-input
            v-model="customerSearchKeyword"
            placeholder="搜索客户姓名、手机号"
            clearable
            class="search-input"
          >
            <template #prefix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </div>

        <!-- 客户列表 -->
        <div class="customer-list">
          <div
            v-for="customer in filteredCustomers"
            :key="customer.id"
            :class="['customer-item', { selected: selectedCustomer?.id === customer.id }]"
            @click="selectCustomer(customer)"
          >
            <div class="customer-avatar">
              <t-icon name="user" />
            </div>
            <div class="customer-info">
              <div class="customer-name">{{ customer.name }}</div>
              <div class="customer-phone">{{ customer.phone }}</div>
            </div>
            <div class="customer-check">
              <t-icon v-if="selectedCustomer?.id === customer.id" name="check-circle" class="selected-icon" />
              <div v-else class="check-border"></div>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 退货清单浮动按钮 -->
    <div v-if="returnItems.length > 0" class="return-fab" @click="showReturnList = true">
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

    <!-- 退货清单弹窗 -->
    <t-dialog
      v-model:visible="showReturnList"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="95%"
      :attach="false"
      class="return-list-dialog"
    >
      <div class="return-list-popup">
        <!-- 单据头部 -->
        <div class="receipt-header">
          <div class="receipt-title">退货单</div>
          <div class="receipt-close" @click="showReturnList = false">
            <t-icon name="close" />
          </div>
        </div>

        <!-- 客户信息 -->
        <div v-if="selectedCustomer" class="receipt-customer">
          <div class="customer-row">
            <span class="label">客户</span>
            <span class="value">{{ selectedCustomer.name }}</span>
            <span class="phone">{{ selectedCustomer.phone }}</span>
          </div>
        </div>

        <!-- 商品明细表 -->
        <div class="receipt-body">
          <div class="table-header">
            <span class="col-name">商品</span>
            <span class="col-spec">规格</span>
            <span class="col-price">单价</span>
            <span class="col-qty">数量</span>
            <span class="col-action"></span>
          </div>
          <div class="table-body">
            <div v-for="(item, index) in returnItems" :key="item.skuId" class="table-row">
              <span class="col-name">{{ item.productName }}</span>
              <span class="col-spec">
                <span class="spec-tag">{{ item.color }}</span>
                <span class="spec-tag">{{ item.size }}</span>
              </span>
              <span class="col-price">¥{{ item.price }}</span>
              <span class="col-qty">{{ item.quantity }}</span>
              <span class="col-action" @click="removeItem(item.skuId)">
                <t-icon name="close-circle" />
              </span>
            </div>
          </div>
        </div>

        <!-- 合计栏 -->
        <div class="receipt-footer">
          <div class="footer-row">
            <span class="footer-label">退货数量</span>
            <span class="footer-value">{{ returnTotalQuantity }} 件</span>
          </div>
          <div class="footer-total">
            <span class="total-label">退货金额</span>
            <span class="total-value">¥{{ returnTotalAmount }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="receipt-actions">
          <div class="btn-cancel" @click="showReturnList = false">继续添加</div>
          <div class="btn-confirm" @click="confirmReturn">确认退货</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Dialog, Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import { useProductStore } from '@/store/product'
import { useCustomerStore } from '@/store/customer'
import { useInventoryStore } from '@/store/inventory'
import { useAccountStore } from '@/store/account'
import { useBillingStore } from '@/store/billing'
import SkuMatrix from '@/components/SkuMatrix.vue'

const router = useRouter()
const productStore = useProductStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const accountStore = useAccountStore()
const billingStore = useBillingStore()

const searchKeyword = ref('')
const customerSearchKeyword = ref('')

const selectedCustomer = ref(null)
const showCustomerPopup = ref(false)

const showSkuPopup = ref(false)
const selectedProduct = ref(null)
const selectedQuantities = ref({})

const returnItems = ref([])
const showReturnList = ref(false)

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

const filteredCustomers = computed(() => {
  if (!customerSearchKeyword.value) return customerStore.customers
  const keyword = customerSearchKeyword.value.toLowerCase()
  return customerStore.customers.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    c.phone.includes(keyword)
  )
})

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

const totalQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

const selectedTotalPrice = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
)

const returnTotalQuantity = computed(() =>
  returnItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

const returnTotalAmount = computed(() =>
  returnItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
)

const getTotalStock = (product) =>
  product.skus?.reduce((sum, sku) => sum + sku.stock, 0) || 0

const selectProduct = (product) => {
  selectedProduct.value = product
  selectedQuantities.value = {}
  showSkuPopup.value = true
}

const closeSkuPopup = () => {
  showSkuPopup.value = false
  selectedProduct.value = null
  selectedQuantities.value = {}
}

const selectCustomer = (customer) => {
  selectedCustomer.value = customer
  showCustomerPopup.value = false
}

const updateQuantities = (quantities) => {
  selectedQuantities.value = quantities
}

const onSkuSelect = (sku, quantity) => {}

const addToReturnList = () => {
  if (!selectedProduct.value || totalQuantity.value === 0) {
    MessagePlugin.warning('请选择退货商品和数量')
    return
  }

  selectedItems.value.forEach(item => {
    if (item.quantity > 0) {
      const sku = selectedProduct.value.skus.find(s => s.id === item.skuId)
      if (sku) {
        returnItems.value.push({
          skuId: sku.id,
          productId: selectedProduct.value.id,
          productName: selectedProduct.value.name,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.price
        })
      }
    }
  })

  closeSkuPopup()
  MessagePlugin.success('已添加到退货清单')
}

const removeItem = (skuId) => {
  returnItems.value = returnItems.value.filter(item => item.skuId !== skuId)
}

const confirmReturn = () => {
  if (!selectedCustomer.value) {
    MessagePlugin.warning('请选择客户')
    showReturnList.value = false
    showCustomerPopup.value = true
    return
  }

  if (returnItems.value.length === 0) {
    MessagePlugin.warning('请添加退货商品')
    return
  }

  const returnOrder = {
    id: Date.now(),
    orderNo: `RT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(billingStore.returnOrders.length + 1).padStart(4, '0')}`,
    customerId: selectedCustomer.value.id,
    customerName: selectedCustomer.value.name,
    items: returnItems.value,
    totalAmount: parseFloat(returnTotalAmount.value),
    status: 'returned',
    createdAt: new Date().toISOString()
  }

  returnItems.value.forEach(item => {
    productStore.updateSkuStock(item.skuId, item.quantity)
    inventoryStore.addSalesReturnLog(item.skuId, item.quantity, returnOrder.id, returnOrder.orderNo)
  })

  billingStore.addReturnOrder(returnOrder)

  accountStore.addAccountRecord({
    type: 'expense',
    category: 'return',
    amount: parseFloat(returnTotalAmount.value),
    orderId: returnOrder.id,
    orderNo: returnOrder.orderNo,
    remark: `客户退货 - ${selectedCustomer.value.name}`
  })

  MessagePlugin.success('退货成功')

  returnItems.value = []
  selectedCustomer.value = null
  showReturnList.value = false

  router.push('/')
}

onMounted(() => {
  productStore.initData()
  customerStore.initData()
  inventoryStore.initData()
})
</script>

<style lang="scss" scoped>
.return-page {
  min-height: 100%;
  background: $bg-page;
  padding-bottom: 120px;

  // 导航栏 - 负margin抵消.page的左右padding实现全屏宽度
  .nav-bar {
    background: linear-gradient(135deg, $primary-color, $primary-dark);
    padding-top: $safe-area-top;
    position: sticky;
    top: 0;
    z-index: 100;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    box-sizing: border-box;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
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

  // 客户选择卡片
  .customer-card {
    margin: 20px $spacing-lg $spacing-md;
    background: $bg-white;
    border-radius: $radius-md;
    padding: $spacing-md;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: $shadow-sm;
    border: 1px solid $border-light;

    &:hover {
      box-shadow: $shadow-md;
      border-color: rgba($primary-color, 0.2);
    }

    &:active {
      transform: scale(0.99);
    }

    &.selected {
      border-color: rgba($primary-color, 0.3);
      background: rgba($primary-color, 0.02);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: $spacing-sm;

      .card-icon-wrapper {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba($primary-color, 0.1);
        border-radius: $radius-sm;

        .card-icon {
          font-size: 14px;
          color: $primary-color;
        }
      }

      .card-title-area {
        display: flex;
        align-items: center;
        gap: $spacing-xs;

        .card-title {
          font-size: $font-sm;
          font-weight: 600;
          color: $text-primary;
        }

        .card-hint {
          padding: 1px 6px;
          background: rgba($warning-color, 0.1);
          color: $warning-color;
          font-size: $font-xs;
          border-radius: $radius-sm;
          font-weight: 500;

          &.selected-hint {
            background: rgba($success-color, 0.1);
            color: $success-color;
          }
        }
      }
    }

    .card-body {
      .customer-selected {
        display: flex;
        align-items: center;
        gap: $spacing-sm;

        .customer-avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba($primary-color, 0.15), rgba($primary-color, 0.05));
          border-radius: 50%;

          .t-icon {
            font-size: 18px;
            color: $primary-color;
          }
        }

        .customer-details {
          flex: 1;

          .customer-name {
            font-size: $font-md;
            font-weight: 600;
            color: $text-primary;
            margin-bottom: 2px;
          }

          .customer-phone {
            font-size: $font-xs;
            color: $text-secondary;
          }
        }

        .customer-check {
          .t-icon {
            font-size: 20px;
            color: $success-color;
          }
        }
      }

      .customer-empty {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: $spacing-xs;
        padding: $spacing-sm 0;
        color: $text-placeholder;

        .empty-icon {
          font-size: 24px;
        }

        .empty-text {
          font-size: $font-md;
        }
      }
    }
  }

  // 搜索区域
  .search-section {
    padding: 0 $spacing-lg;
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

  // SKU 弹窗
  :deep(.sku-dialog) {
    .t-dialog {
      margin: 20px auto;
      width: 95% !important;
      border-radius: $radius-lg;
      overflow: visible;
      box-sizing: border-box;

      .t-dialog__header,
      .t-dialog__footer {
        display: none !important;
        padding: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        overflow: hidden;
      }

      .t-dialog__close {
        display: none !important;
      }

      .t-dialog__body {
        padding: 0 !important;
        margin: 0;
        overflow: visible;
      }
    }

    .sku-popup {
      background: $bg-white;
      border-radius: $radius-lg;
      display: flex;
      flex-direction: column;
      max-height: 550px;
      overflow: hidden;
      box-sizing: border-box;

      // 弹窗头部
      .popup-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: $spacing-md;
        border-bottom: 1px solid $border-light;
        background: $bg-white;
        flex-shrink: 0;
        box-sizing: border-box;

        .header-left {
          display: flex;
          gap: $spacing-sm;
          flex: 1;
          align-items: flex-start;

          .product-image {
            width: 60px;
            height: 60px;
            border-radius: $radius-md;
            overflow: hidden;
            background: $bg-page;
            flex-shrink: 0;

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
              }
            }
          }

          .product-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            text-align: left;
            padding-top: 2px;

            .product-name {
              font-size: $font-md;
              font-weight: 600;
              color: $text-primary;
              margin-bottom: 4px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .product-meta {
              font-size: $font-xs;
              color: $text-secondary;
              margin-bottom: 4px;
            }

            .product-price {
              display: flex;
              align-items: baseline;

              .price-symbol {
                font-size: $font-sm;
                color: $primary-color;
                font-weight: 600;
              }

              .price-value {
                font-size: $font-lg;
                color: $primary-color;
                font-weight: 700;
                margin-left: 1px;
              }
            }
          }
        }

        .header-close {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          background: $bg-page;

          .t-icon {
            font-size: 20px;
            color: $text-secondary;
          }

          &:hover {
            background: rgba($error-color, 0.1);

            .t-icon {
              color: $error-color;
            }
          }
        }
      }

      // SKU 选择器
      .sku-selector-section {
        flex: 1;
        overflow-y: auto;
        padding: $spacing-sm $spacing-md;
        background: $bg-page;
        box-sizing: border-box;
      }

      // 底部操作
      .popup-footer {
        display: flex;
        flex-direction: column;
        gap: $spacing-sm;
        padding: 12px 12px 20px;
        border-top: 1px solid $border-light;
        background: $bg-white;
        flex-shrink: 0;
        box-sizing: border-box;

        .footer-info {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .info-item {
            display: flex;
            align-items: center;
            gap: 4px;

            .info-label {
              font-size: $font-xs;
              color: $text-placeholder;
            }

            .info-value {
              font-size: $font-md;
              font-weight: 600;
              color: $text-primary;

              &.price {
                color: $primary-color;
              }
            }
          }
        }

        .confirm-btn {
          width: 100%;

          .btn-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: $spacing-xs;

            .t-icon {
              font-size: 16px;
            }
          }

          &:disabled {
            opacity: 0.5;
          }
        }
      }
    }
  }

  // 客户选择弹窗
  :deep(.customer-dialog) {
    .t-dialog {
      max-height: calc(100vh - 40px);
      margin: 20px auto;

      .t-dialog__header {
        display: none;
        padding: 0;
        height: 0;
      }

      .t-dialog__close {
        display: none;
      }

      .t-dialog__body {
        padding: 0;
        max-height: none;
      }
    }

    .customer-popup {
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 60px);

      // 弹窗头部
      .popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid $border-light;
        flex-shrink: 0;

        .header-title {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;

          .t-icon {
            font-size: 20px;
            color: $primary-color;
          }
        }

        .header-close {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: $text-secondary;
          background: $bg-page;
          border-radius: 50%;
          transition: all 0.2s;

          .t-icon {
            font-size: 16px;
          }

          &:active {
            background: $border-lighter;
          }
        }
      }

      .customer-search {
        padding: 10px 16px;
        border-bottom: 1px solid $border-light;
        flex-shrink: 0;

        .search-input {
          width: 100%;
        }
      }

      .customer-list {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;

        .customer-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid $border-lighter;
          cursor: pointer;
          transition: all 0.2s;

          &:active {
            background: $bg-hover;
          }

          &.selected {
            background: rgba($primary-color, 0.05);
          }

          &:last-child {
            border-bottom: none;
          }

          .customer-avatar {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba($primary-color, 0.1);
            color: $primary-color;
            border-radius: 50%;
            margin-right: 12px;
            flex-shrink: 0;

            .t-icon {
              font-size: 18px;
            }
          }

          .customer-info {
            flex: 1;
            text-align: left;

            .customer-name {
              font-size: 14px;
              font-weight: 500;
              color: $text-primary;
              margin-bottom: 2px;
            }

            .customer-phone {
              font-size: 13px;
              color: $text-secondary;
            }
          }

          .customer-check {
            flex-shrink: 0;

            .check-border {
              width: 22px;
              height: 22px;
              border: 2px solid $border-color;
              border-radius: 50%;
            }

            .selected-icon {
              color: $primary-color;
              font-size: 22px;
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

  // 退货清单弹窗
  :deep(.return-list-dialog) {
    .t-dialog {
      max-height: calc(100vh - 40px);
      border-radius: 12px;
      overflow: hidden;

      .t-dialog__body {
        padding: 0;
        max-height: none;
      }

      .t-dialog__header, .t-dialog__footer {
        display: none;
      }
    }

    .return-list-popup {
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 60px);

      // 单据头部
      .receipt-header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        position: relative;
        border-bottom: 2px solid #333;

        .receipt-title {
          font-size: 18px;
          font-weight: 700;
          color: #333;
          letter-spacing: 4px;
        }

        .receipt-close {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;

          .t-icon {
            font-size: 18px;
            color: #999;
          }

          &:active {
            .t-icon {
              color: #333;
            }
          }
        }
      }

      // 客户信息
      .receipt-customer {
        padding: 10px 16px;
        border-bottom: 1px dashed #ccc;
        background: #fafafa;

        .customer-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;

          .label {
            color: #999;
            flex-shrink: 0;
          }

          .value {
            color: #333;
            font-weight: 600;
          }

          .phone {
            color: #999;
            font-size: 12px;
          }
        }
      }

      // 商品明细表
      .receipt-body {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;

        .table-header {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          background: #f5f5f5;
          font-size: 12px;
          color: #999;
          font-weight: 500;
          border-bottom: 1px solid #e5e5e5;
        }

        .table-body {
          .table-row {
            display: flex;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
            transition: background 0.15s;

            &:active {
              background: #f9f9f9;
            }
          }
        }

        .col-name {
          flex: 2;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #333;
          font-weight: 500;
        }

        .col-spec {
          flex: 1.5;
          display: flex;
          gap: 3px;
          min-width: 0;

          .spec-tag {
            font-size: 11px;
            color: #666;
            background: #f0f0f0;
            padding: 1px 5px;
            border-radius: 3px;
            white-space: nowrap;
          }
        }

        .col-price {
          flex: 1.2;
          text-align: right;
          color: #666;
        }

        .col-qty {
          flex: 0.8;
          text-align: center;
          color: #333;
          font-weight: 600;
        }

        .col-amount {
          flex: 1.2;
          text-align: right;
          color: #e34d59;
          font-weight: 600;
        }

        .col-action {
          flex: 0.6;
          text-align: center;
          cursor: pointer;

          .t-icon {
            font-size: 16px;
            color: #ccc;
            transition: color 0.15s;
          }

          &:active {
            .t-icon {
              color: #e34d59;
            }
          }
        }
      }

      // 合计栏
      .receipt-footer {
        padding: 12px 16px;
        border-top: 1px solid #e5e5e5;
        background: #fafafa;

        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 13px;

          .footer-label {
            color: #999;
          }

          .footer-value {
            color: #333;
            font-weight: 500;
          }
        }

        .footer-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px dashed #ccc;

          .total-label {
            font-size: 14px;
            font-weight: 600;
            color: #333;
          }

          .total-value {
            font-size: 20px;
            font-weight: 700;
            color: $primary-color;
          }
        }
      }

      // 操作按钮
      .receipt-actions {
        display: flex;
        gap: 10px;
        padding: 10px 16px;
        border-top: 1px solid #e5e5e5;
        background: white;

        .btn-cancel {
          flex: 1;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 13px;
          color: #666;
          cursor: pointer;

          &:active {
            background: #f5f5f5;
          }
        }

        .btn-confirm {
          flex: 2;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, $primary-color, $primary-light);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: white;
          cursor: pointer;

          &:active {
            opacity: 0.9;
          }
        }
      }
    }
  }
}
</style>