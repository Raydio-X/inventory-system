<template>
  <div class="page order-edit-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="goBack">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">修改订单</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 单据内容 -->
    <div class="receipt-card" v-if="order">
      <!-- 单据标题 -->
      <div class="receipt-header">
        <span class="receipt-title">销售单</span>
        <span class="receipt-no mono">{{ order.orderNo }}</span>
      </div>

      <!-- 基本信息 -->
      <div class="receipt-info">
        <div class="info-row">
          <span class="info-label">客户</span>
          <span class="info-value">{{ order.customerName || '散客' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">日期</span>
          <span class="info-value">{{ formatDate(order.createdAt) }}</span>
        </div>
      </div>

      <!-- 虚线分割 -->
      <div class="receipt-divider">
        <span class="dot"></span>
        <span class="line"></span>
        <span class="dot"></span>
      </div>

      <!-- 商品明细表头 -->
      <div class="table-header">
        <span class="col-product">商品</span>
        <span class="col-spec">规格</span>
        <span class="col-price">单价</span>
        <span class="col-qty">数量</span>
        <span class="col-sub">小计</span>
      </div>

      <!-- 商品明细列表 -->
      <div class="table-body">
        <div v-for="(item, index) in editForm.items" :key="index" class="table-row">
          <span class="col-product">
            <span class="product-name">{{ item.productName }}</span>
            <t-button variant="text" size="small" theme="danger" class="remove-btn" @click="removeItem(index)">
              <template #icon><t-icon name="close" /></template>
            </t-button>
          </span>
          <span class="col-spec">
            <span class="sku-tag">{{ item.color || '-' }}</span>
            <span class="sku-tag">{{ item.size || '-' }}</span>
          </span>
          <span class="col-price">
            <t-input-number v-model="item.price" size="small" :min="0" :decimal-places="2" theme="normal" />
          </span>
          <span class="col-qty">
            <t-input-number v-model="item.quantity" size="small" :min="1" theme="normal" />
          </span>
          <span class="col-sub">¥{{ formatAmount(item.price * item.quantity) }}</span>
        </div>
      </div>

      <!-- 虚线分割 -->
      <div class="receipt-divider">
        <span class="dot"></span>
        <span class="line"></span>
        <span class="dot"></span>
      </div>

      <!-- 金额汇总 -->
      <div class="receipt-summary">
        <div class="summary-row">
          <span class="summary-label">商品总数</span>
          <span class="summary-value">{{ totalQty }}件</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">订单总额</span>
          <span class="summary-value primary">¥{{ formatAmount(totalAmount) }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">实付金额</span>
          <span class="summary-value edit-input">
            <t-input-number v-model="editForm.paidAmount" size="small" :min="0" :decimal-places="2" theme="normal" />
          </span>
        </div>
        <div v-if="debtAmount > 0" class="summary-row debt">
          <span class="summary-label">欠款金额</span>
          <span class="summary-value danger">¥{{ formatAmount(debtAmount) }}</span>
        </div>
      </div>

      <!-- 备注 -->
      <div class="receipt-remark">
        <div class="remark-label">备注</div>
        <t-textarea v-model="editForm.remark" size="small" :maxlength="200" placeholder="可选" />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <t-button variant="outline" size="large" @click="goBack">取消</t-button>
      <t-button theme="primary" size="large" @click="submitEdit" :loading="loading" :disabled="loading">保存修改</t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBillingStore } from '@/store/billing'
import { useCustomerStore } from '@/store/customer'
import { useProductStore } from '@/store/product'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const billingStore = useBillingStore()
const customerStore = useCustomerStore()
const productStore = useProductStore()

const customerId = computed(() => route.params.customerId)
const orderId = computed(() => route.params.orderId)

const order = ref(null)
const loading = ref(false)
const editForm = ref({
  items: [],
  paidAmount: 0,
  remark: ''
})

const totalAmount = computed(() =>
  editForm.value.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

const totalQty = computed(() =>
  editForm.value.items.reduce((sum, item) => sum + item.quantity, 0)
)

const debtAmount = computed(() =>
  Math.max(0, totalAmount.value - editForm.value.paidAmount)
)

const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const goBack = () => {
  router.back()
}

const removeItem = (index) => {
  if (editForm.value.items.length <= 1) {
    MessagePlugin.warning('订单至少需要一件商品')
    return
  }
  editForm.value.items.splice(index, 1)
}

const loadOrder = async () => {
  await billingStore.initData()
  await productStore.initData()
  const found = billingStore.salesOrders.find(o => o.id.toString() === orderId.value)
  if (!found) {
    MessagePlugin.error('订单不存在')
    router.back()
    return
  }
  order.value = found
  editForm.value = {
    items: (found.items || []).map(item => {
      // 从商品列表中获取最新的平均成本价
      const product = productStore.products.find(p => p.skus?.some(s => s.id === item.skuId))
      const latestCostPrice = product ? (product.avgCost || product.costPrice || 0) : Number(item.costPrice || 0)
      return {
        skuId: item.skuId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        price: Number(item.price),
        quantity: item.quantity,
        costPrice: latestCostPrice
      }
    }),
    paidAmount: Number(found.paidAmount || 0),
    remark: found.remark || ''
  }
}

const submitEdit = async () => {
  // 数据验证
  if (editForm.value.items.length === 0) {
    MessagePlugin.warning('订单商品不能为空')
    return
  }
  for (const item of editForm.value.items) {
    if (!item.quantity || item.quantity < 1) {
      MessagePlugin.warning(`${item.productName} 数量不能小于1`)
      return
    }
    if (item.price === undefined || item.price === null || item.price < 0) {
      MessagePlugin.warning(`${item.productName} 价格不能为空或负数`)
      return
    }
  }

  const total = totalAmount.value
  if (editForm.value.paidAmount > total) {
    MessagePlugin.warning('实付金额不能大于订单总额')
    return
  }

  loading.value = true
  try {
    const debt = Math.round((total - editForm.value.paidAmount) * 100) / 100
    await billingStore.updateSalesOrder(orderId.value, {
      items: editForm.value.items,
      totalAmount: total,
      paidAmount: editForm.value.paidAmount,
      debtAmount: debt,
      discount: order.value.discount || 0,
      status: debt > 0 ? 'partial' : 'settled',
      remark: editForm.value.remark
    })
    MessagePlugin.success('订单修改成功')
    await customerStore.initData()
    router.back()
  } catch (error) {
    MessagePlugin.error(error.message || '修改失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>

<style lang="scss" scoped>
.order-edit-page {
  padding-bottom: 80px;

  // 导航栏
  .nav-bar {
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: white;
    border-radius: 0 0 12px 12px;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
    }

    .nav-back {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 50%;

      .t-icon {
        font-size: 20px;
        color: white;
      }

      &:active {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    .nav-placeholder {
      width: 32px;
    }

    .nav-title {
      font-size: 16px;
      font-weight: 600;
    }
  }

  // 单据卡片
  .receipt-card {
    background: $bg-card;
    border-radius: $radius-lg;
    margin-top: 12px;
    overflow: hidden;
    border: 1px solid $border-lighter;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    // 单据标题
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: linear-gradient(135deg, rgba($primary-color, 0.03), rgba($primary-color, 0.01));

      .receipt-title {
        font-size: 16px;
        font-weight: 700;
        color: $text-primary;
      }

      .receipt-no {
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: $text-secondary;
        font-weight: 500;
      }
    }

    // 基本信息
    .receipt-info {
      padding: 10px 18px;

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;

        .info-label {
          font-size: 14px;
          color: $text-placeholder;
        }

        .info-value {
          font-size: 14px;
          color: $text-secondary;
          font-weight: 500;
        }
      }
    }

    // 虚线分割
    .receipt-divider {
      display: flex;
      align-items: center;
      padding: 0 18px;
      height: 1px;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: $bg-page;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
      }

      .line {
        flex: 1;
        border-top: 1px dashed $border-light;
        margin: 0 -4px;
      }
    }

    // 商品表格表头
    .table-header {
      display: flex;
      align-items: center;
      padding: 12px 18px 8px;
      border-bottom: 1px solid $border-light;

      span {
        font-size: 13px;
        color: $text-placeholder;
        font-weight: 500;
      }

      .col-product {
        flex: 2;
        min-width: 0;
      }

      .col-spec {
        flex: 1.5;
        min-width: 0;
      }

      .col-price {
        width: 70px;
        text-align: center;
      }

      .col-qty {
        width: 60px;
        text-align: center;
      }

      .col-sub {
        width: 64px;
        text-align: right;
      }
    }

    // 商品表格内容
    .table-body {
      max-height: 320px;
      overflow-y: auto;

      .table-row {
        display: flex;
        align-items: center;
        padding: 10px 18px;
        border-bottom: 1px solid $border-lighter;

        &:last-child {
          border-bottom: none;
        }

        span {
          font-size: 14px;
        }

        .col-product {
          flex: 2;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;

          .product-name {
            color: $text-primary;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
          }

          .remove-btn {
            flex-shrink: 0;
            padding: 2px;
          }
        }

        .col-spec {
          flex: 1.5;
          min-width: 0;
          display: flex;
          gap: 3px;

          .sku-tag {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            background: $bg-page;
            color: $text-secondary;
            white-space: nowrap;
          }
        }

        .col-price {
          width: 70px;
          text-align: center;

          :deep(.t-input-number) {
            width: 60px;
          }
        }

        .col-qty {
          width: 60px;
          text-align: center;

          :deep(.t-input-number) {
            width: 50px;
          }
        }

        .col-sub {
          width: 64px;
          text-align: right;
          color: $text-primary;
          font-weight: 600;
        }
      }
    }

    // 金额汇总
    .receipt-summary {
      padding: 14px 18px;

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;

        .summary-label {
          font-size: 14px;
          color: $text-secondary;
        }

        .summary-value {
          font-size: 15px;
          color: $text-primary;
          font-weight: 500;

          &.primary {
            font-size: 18px;
            font-weight: 700;
            color: $primary-color;
          }

          &.danger {
            color: $error-color;
            font-weight: 600;
          }

          &.edit-input {
            :deep(.t-input-number) {
              width: 80px;
            }
          }
        }

        &.debt {
          background: rgba($error-color, 0.05);
          margin: 6px -18px;
          padding: 8px 18px;
          border-radius: 4px;
        }
      }
    }

    // 备注
    .receipt-remark {
      padding: 0 18px 14px;

      .remark-label {
        font-size: 14px;
        color: $text-secondary;
        margin-bottom: 6px;
      }
    }
  }

  // 底部操作栏
  .bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    background: $bg-card;
    border-top: 1px solid $border-lighter;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
    z-index: 100;

    :deep(.t-button) {
      flex: 1;
    }
  }
}
</style>