<template>
  <div class="page return-cart-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="goBack">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">退货清单</div>
        <div v-if="items.length > 0" class="nav-action" @click="clearAll">
          <span class="clear-text">清空</span>
        </div>
      </div>
    </div>

    <!-- 客户信息卡片 -->
    <div class="customer-card" @click="showCustomerPopup = true">
      <div class="customer-left">
        <t-icon name="user" class="customer-icon" />
        <div class="customer-info">
          <span v-if="customer" class="customer-name">{{ customer.name }}</span>
          <span v-else class="customer-placeholder">请选择客户</span>
          <span v-if="customer" class="customer-phone">{{ customer.phone }}</span>
        </div>
      </div>
      <div class="customer-right">
        <span class="customer-change">{{ customer ? '修改' : '选择' }}</span>
        <t-icon name="chevron-right" class="customer-arrow" />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="items.length === 0" class="empty-state">
      <t-icon name="rollback" class="empty-icon" />
      <div class="empty-text">退货清单为空</div>
      <div class="empty-hint">返回退货页面选择商品</div>
      <div class="empty-btn" @click="goBack">去退货</div>
    </div>

    <!-- 退货商品列表 -->
    <div v-if="items.length > 0" class="cart-list">
      <div v-for="group in groupedItems" :key="group.productId" class="cart-group">
        <!-- 商品组标题 -->
        <div class="group-header">
          <div class="group-top-row">
            <div class="group-name">{{ group.productName }}</div>
            <div class="group-price-row">
              <span class="group-price-label">单价</span>
              <div class="price-input-wrap">
                <span class="price-prefix">¥</span>
                <input
                  :value="getGroupPrice(group.productId)"
                  type="number"
                  step="0.01"
                  min="0"
                  class="price-input"
                  @focus="$event.target.select()"
                  @input="updateGroupPrice(group.productId, Number($event.target.value) || 0)"
                />
              </div>
              <span class="group-spec-count">{{ getGroupQuantity(group) }}件</span>
            </div>
          </div>
          <!-- 价格参考 -->
          <div v-if="customer" class="price-reference">
            <div class="ref-item">
              <span class="ref-label">当前售价</span>
              <span class="ref-value">¥{{ getProductStandardPrice(group.productId) }}</span>
            </div>
            <div class="ref-divider"></div>
            <div class="ref-item">
              <span class="ref-label">客户历史购买价</span>
              <span class="ref-value" :class="{ highlight: getCustomerHistoryPrice(group.productId) }">
                {{ getCustomerHistoryPrice(group.productId) ? '¥' + getCustomerHistoryPrice(group.productId) : '暂无记录' }}
              </span>
            </div>
          </div>
        </div>
        <!-- 规格明细列表 -->
        <div v-for="item in group.items" :key="item.skuId" class="cart-item">
          <!-- 第一行：规格标签 + 删除 -->
          <div class="item-top">
            <div class="item-spec">
              <span class="spec-tag">{{ item.color }}</span>
              <span class="spec-tag">{{ item.size }}</span>
            </div>
            <div class="item-del" @click="removeItem(item.skuId)">
              <t-icon name="close" />
            </div>
          </div>
          <!-- 第二行：单价 + 数量 -->
          <div class="item-mid">
            <div class="item-price">
              退货价 ¥{{ formatAmount(item.price) }}
            </div>
            <div class="item-amount-row">
              <span class="amount-x">×</span>
              <span class="qty-value">{{ item.quantity }}</span>
            </div>
          </div>
          <!-- 第三行：小计金额 -->
          <div class="item-bottom">
            <span class="subtotal-label">小计</span>
            <span class="item-subtotal">¥{{ formatAmount(item.price * item.quantity) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部固定栏 -->
    <div v-if="items.length > 0" class="bottom-bar">
      <div class="bar-summary">
        <div class="bar-row">
          <span class="bar-label">{{ totalQuantity }}件商品</span>
        </div>
        <div class="bar-total">
          <span class="bar-total-label">退货金额</span>
          <span class="bar-total-amount">¥{{ formatAmount(totalAmount) }}</span>
        </div>
      </div>
      <div class="bar-actions">
        <div class="btn-add" @click="goToSelect">
          <t-icon name="add" />
          <span>继续添加</span>
        </div>
        <div class="btn-confirm" @click="confirmReturn">
          <span>确认退货</span>
        </div>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <t-dialog
      v-model:visible="showConfirm"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="70%"
      :attach="false"
      class="confirm-dialog"
    >
      <div class="confirm-popup">
        <div class="confirm-title">确认删除</div>
        <div class="confirm-msg">{{ confirmMsg }}</div>
        <div class="confirm-actions">
          <div class="confirm-cancel" @click="showConfirm = false">取消</div>
          <div class="confirm-ok" @click="doConfirm">删除</div>
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
        <div class="popup-header">
          <span class="popup-title">选择客户</span>
          <div class="popup-close" @click="showCustomerPopup = false">
            <t-icon name="close" />
          </div>
        </div>
        <div class="popup-search">
          <t-input v-model="customerKeyword" placeholder="搜索客户姓名、手机号" clearable size="small">
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
        </div>
        <div class="popup-list">
          <div
            v-for="c in filteredCustomers"
            :key="c.id"
            :class="['popup-customer-item', { selected: customer?.id === c.id }]"
            @click="selectCustomer(c)"
          >
            <div class="popup-customer-avatar">
              <t-icon name="user" />
            </div>
            <div class="popup-customer-info">
              <span class="popup-customer-name">{{ c.name }}</span>
              <span class="popup-customer-phone">{{ c.phone }}</span>
            </div>
            <div v-if="customer?.id === c.id" class="check-icon">
              <t-icon name="check-circle" />
            </div>
            <div v-else class="check-placeholder"></div>
          </div>
        </div>
      </div>
    </t-dialog>

    <!-- 退货确认弹窗 -->
    <t-dialog
      v-model:visible="showReturnConfirm"
      :header="null"
      :footer="false"
      :close-btn="false"
      placement="center"
      width="80%"
      :attach="false"
      class="return-dialog"
    >
      <div class="return-popup">
        <div class="return-header">
          <t-icon name="rollback" class="return-icon" />
          <span class="return-title">确认退货</span>
        </div>
        <div class="return-body">
          <div class="return-row">
            <span class="return-label">退货数量</span>
            <span class="return-value">{{ totalQuantity }}件</span>
          </div>
          <div class="return-row">
            <span class="return-label">退货金额</span>
            <span class="return-value amount">¥{{ formatAmount(totalAmount) }}</span>
          </div>
          <div class="return-row">
            <span class="return-label">客户</span>
            <span class="return-value">{{ customer?.name || '未选择' }}</span>
          </div>
        </div>
        <div class="return-actions">
          <div class="return-cancel" @click="showReturnConfirm = false">取消</div>
          <div class="return-ok" @click="doReturn">确认退货</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { useBillingStore } from '@/store/billing'
import { useCustomerStore } from '@/store/customer'
import { useInventoryStore } from '@/store/inventory'
import { useAccountStore } from '@/store/account'
import { useProductStore } from '@/store/product'
import api from '@/utils/api'

const router = useRouter()
const billingStore = useBillingStore()
const customerStore = useCustomerStore()
const inventoryStore = useInventoryStore()
const accountStore = useAccountStore()
const productStore = useProductStore()

const items = computed(() => billingStore.returnCartItems)
const customer = computed(() => billingStore.returnCustomer)

// 客户选择弹窗
const showCustomerPopup = ref(false)
const customerKeyword = ref('')
const customers = computed(() => customerStore.customers)

const filteredCustomers = computed(() => {
  if (!customerKeyword.value) return customers.value
  const kw = customerKeyword.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(kw) || (c.phone && c.phone.includes(kw))
  )
})

const selectCustomer = (c) => {
  billingStore.returnCustomer = c
  showCustomerPopup.value = false
}

// 按商品分组
const groupedItems = computed(() => {
  const groups = {}
  items.value.forEach(item => {
    const key = item.productId
    if (!groups[key]) {
      groups[key] = {
        productId: item.productId,
        productName: item.productName,
        items: []
      }
    }
    groups[key].items.push(item)
  })
  return Object.values(groups)
})

// 获取商品组单价
const getGroupPrice = (productId) => {
  const group = groupedItems.value.find(g => g.productId === productId)
  return group && group.items.length > 0 ? group.items[0].price : 0
}

// 更新商品组统一单价
const updateGroupPrice = (productId, newPrice) => {
  const group = groupedItems.value.find(g => g.productId === productId)
  if (group) {
    group.items.forEach(item => {
      item.price = newPrice
    })
  }
}

// 获取商品组总数量
const getGroupQuantity = (group) => {
  return group.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
}

// 客户历史购买价格缓存
const customerHistoryPrices = ref({})

// 获取商品标准售价
const getProductStandardPrice = (productId) => {
  const product = productStore.products.find(p => p.id === productId)
  return product ? product.price : 0
}

// 获取客户历史购买此商品的价格
const getCustomerHistoryPrice = (productId) => {
  if (!customer.value || !productId) return null
  return customerHistoryPrices.value[`${customer.value.id}_${productId}`] || null
}

// 加载客户历史购买价格
const loadCustomerHistoryPrices = async () => {
  if (!customer.value || items.value.length === 0) {
    customerHistoryPrices.value = {}
    return
  }

  try {
    const productIds = [...new Set(items.value.map(item => item.productId))]
    const res = await api.get('/billing/history-prices', {
      params: {
        customerId: customer.value.id,
        productIds: productIds.join(',')
      }
    })
    if (res) {
      const priceMap = {}
      Object.entries(res).forEach(([productId, price]) => {
        priceMap[`${customer.value.id}_${productId}`] = price
      })
      customerHistoryPrices.value = priceMap
    }
  } catch (e) {
    console.error('加载历史价格失败', e)
  }
}

// 监听客户和商品列表变化，加载历史价格
watch(
  [customer, items],
  () => {
    loadCustomerHistoryPrices()
  },
  { immediate: true, deep: true }
)

// 总数量
const totalQuantity = computed(() =>
  items.value.reduce((sum, item) => sum + (item.quantity || 0), 0)
)

// 总金额
const totalAmount = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}

// 移除商品
const removeItem = (skuId) => {
  const item = items.value.find(i => i.skuId === skuId)
  const name = item ? item.productName : '该商品'
  showConfirmDialog(`确定要移除「${name}」吗？`, () => {
    billingStore.removeFromReturnCart(skuId)
  })
}

// 清空
const clearAll = () => {
  showConfirmDialog('确定要清空退货清单吗？', () => {
    billingStore.clearReturnCart()
    MessagePlugin.success('已清空退货清单')
  })
}

// 确认弹窗
const showConfirm = ref(false)
const confirmMsg = ref('')
const confirmAction = ref(null)

const showConfirmDialog = (msg, action) => {
  confirmMsg.value = msg
  confirmAction.value = action
  showConfirm.value = true
}

const doConfirm = () => {
  if (confirmAction.value) confirmAction.value()
  showConfirm.value = false
}

// 退货确认弹窗
const showReturnConfirm = ref(false)

const confirmReturn = () => {
  if (!customer.value) {
    MessagePlugin.warning('请先选择客户')
    return
  }
  if (items.value.length === 0) {
    MessagePlugin.warning('请添加退货商品')
    return
  }
  showReturnConfirm.value = true
}

// 执行退货
const doReturn = async () => {
  showReturnConfirm.value = false

  try {
    const returnOrder = {
      id: Date.now(),
      orderNo: `RT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(billingStore.returnOrders.length + 1).padStart(4, '0')}`,
      customerId: customer.value.id,
      customerName: customer.value.name,
      items: items.value,
      totalAmount: parseFloat(totalAmount.value.toFixed(2)),
      status: 'returned',
      createdAt: new Date().toISOString()
    }

    items.value.forEach(item => {
      inventoryStore.addSalesReturnLog(item.skuId, item.quantity, returnOrder.id, returnOrder.orderNo)
    })

    await billingStore.addReturnOrder(returnOrder)

    accountStore.addAccountRecord({
      type: 'expense',
      category: 'return',
      amount: parseFloat(totalAmount.value.toFixed(2)),
      orderId: returnOrder.id,
      orderNo: returnOrder.orderNo,
      remark: `客户退货 - ${customer.value.name}`
    })

    MessagePlugin.success('退货成功')
    billingStore.clearReturnCart()
    router.push('/')
  } catch (error) {
    MessagePlugin.error(error.message || '退货失败')
  }
}

// 返回退货界面
const goBack = () => {
  router.push('/return')
}

// 继续添加商品
const goToSelect = () => {
  router.push('/return')
}

onMounted(() => {
  customerStore.initData()
})
</script>

<style lang="scss" scoped>
.return-cart-page {
  min-height: 100%;
  background: $bg-page;
  padding-top: calc(56px + #{$safe-area-top});
  padding-bottom: 140px;

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

    .nav-action {
      cursor: pointer;
      .clear-text { font-size: 14px; color: rgba(255, 255, 255, 0.85); }
    }
  }

  // ========== 客户卡片 ==========
  .customer-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    border-radius: 10px;
    padding: 12px 14px;
    margin: 20px 0 12px;
    box-shadow: $shadow-sm;
    cursor: pointer;

    &:active { transform: scale(0.99); }

    .customer-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .customer-icon { font-size: 20px; color: $primary-color; }

      .customer-info {
        .customer-name {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
          display: block;
        }
        .customer-placeholder {
          font-size: 14px;
          color: $text-placeholder;
        }
        .customer-phone {
          font-size: 12px;
          color: $text-placeholder;
          margin-top: 2px;
          display: block;
        }
      }
    }

    .customer-right {
      display: flex;
      align-items: center;
      gap: 4px;
      .customer-change { font-size: 13px; color: $text-placeholder; }
      .customer-arrow { font-size: 16px; color: $text-placeholder; }
    }
  }

  // ========== 空状态 ==========
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 0;
    .empty-icon { font-size: 48px; color: $text-placeholder; margin-bottom: 12px; }
    .empty-text { font-size: 15px; color: $text-primary; margin-bottom: 4px; }
    .empty-hint { font-size: 13px; color: $text-placeholder; margin-bottom: 20px; }
    .empty-btn {
      padding: 8px 28px;
      background: $primary-color;
      color: white;
      font-size: 14px;
      font-weight: 600;
      border-radius: 20px;
      cursor: pointer;
    }
  }

  // ========== 商品列表 ==========
  .cart-list {
    .cart-group {
      background: white;
      border-radius: 10px;
      margin-bottom: 12px;
      box-shadow: $shadow-sm;
      overflow: hidden;

      .group-header {
        padding: 12px 14px;
        background: #f5f5f5;
        border-bottom: 1px solid $border-lighter;

        .group-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;

          .group-name {
            font-size: 16px;
            font-weight: 600;
            color: $text-primary;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .group-price-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;

            .group-price-label {
              font-size: 13px;
              color: $text-secondary;
              white-space: nowrap;
            }

            .price-input-wrap {
              display: flex;
              align-items: center;
              border: 1px solid $primary-color;
              border-radius: 6px;
              height: 28px;
              padding: 0 6px;
              background: white;

              .price-prefix {
                font-size: 13px;
                color: $primary-color;
                font-weight: 500;
              }

              .price-input {
                width: 60px;
                border: none;
                outline: none;
                font-size: 14px;
                font-weight: 500;
                color: $text-primary;
                text-align: center;
                background: transparent;

                &::placeholder { color: $text-placeholder; }
              }
            }

            .group-spec-count {
              font-size: 12px;
              color: $text-placeholder;
              white-space: nowrap;
            }
          }
        }

        // 价格参考样式
        .price-reference {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          padding: 8px 10px;
          background: rgba($primary-color, 0.05);
          border-radius: 6px;

          .ref-item {
            display: flex;
            align-items: center;
            gap: 4px;

            .ref-label {
              font-size: 11px;
              color: $text-placeholder;
            }

            .ref-value {
              font-size: 13px;
              font-weight: 500;
              color: $text-secondary;

              &.highlight {
                color: $primary-color;
              }
            }
          }

          .ref-divider {
            width: 1px;
            height: 12px;
            background: $border-lighter;
          }
        }
      }
    }

    .cart-item {
      background: white;
      padding: 10px 14px;
      border-bottom: 1px solid $border-lighter;

      &:last-child { border-bottom: none; }

      .item-top {
        display: flex;
        align-items: center;

        .item-spec {
          display: flex;
          gap: 4px;
          flex-shrink: 0;

          .spec-tag {
            display: inline-block;
            padding: 1px 6px;
            background: $bg-page;
            border-radius: 3px;
            font-size: 12px;
            color: $text-secondary;
          }
        }

        .item-del {
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
          margin-left: auto;
          .t-icon { font-size: 14px; color: $text-placeholder; }
          &:active .t-icon { color: $error-color; }
        }
      }

      .item-mid {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;

        .item-price {
          font-size: 13px;
          color: $text-placeholder;
          flex-shrink: 0;
        }

        .item-amount-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;

          .amount-x {
            font-size: 12px;
            color: $text-placeholder;
            flex-shrink: 0;
          }

          .qty-value {
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;
            min-width: 20px;
            text-align: center;
          }
        }
      }

      .item-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 8px;
        border-top: 1px dashed $border-lighter;

        .subtotal-label {
          font-size: 12px;
          color: $text-placeholder;
        }

        .item-subtotal {
          font-size: 15px;
          font-weight: 700;
          color: $error-color;
        }
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
      }

      .bar-total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        .bar-total-label { font-size: 13px; color: $text-secondary; }
        .bar-total-amount {
          font-size: 22px;
          font-weight: 700;
          color: $error-color;
        }
      }
    }

    .bar-actions {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      padding-bottom: calc(10px + #{$safe-area-bottom});
      gap: 10px;

      .btn-add {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 10px 16px;
        background: $bg-page;
        border: 1px solid $border-color;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: $text-secondary;
        cursor: pointer;

        .t-icon { font-size: 16px; }
        &:active { background: $border-lighter; }
      }

      .btn-confirm {
        flex: 1;
        text-align: center;
        padding: 10px 0;
        background: $error-color;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba($error-color, 0.3);
        &:active { transform: scale(0.98); }
      }
    }
  }

  // ========== 确认弹窗 ==========
  :deep(.confirm-dialog) {
    .t-dialog {
      margin: 0 auto;
      width: 70% !important;
      border-radius: 12px;
      overflow: visible;
      box-sizing: border-box;
      .t-dialog__header, .t-dialog__footer { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; overflow: hidden; }
      .t-dialog__close { display: none !important; }
      .t-dialog__body { padding: 0 !important; margin: 0; overflow: visible; }
    }
  }

  .confirm-popup {
    background: white;
    border-radius: 12px;
    padding: 24px 20px 16px;
    text-align: center;

    .confirm-title { font-size: 16px; font-weight: 600; color: $text-primary; margin-bottom: 8px; }
    .confirm-msg { font-size: 13px; color: $text-secondary; margin-bottom: 20px; line-height: 1.5; }

    .confirm-actions {
      display: flex;
      gap: 12px;

      .confirm-cancel {
        flex: 1; padding: 10px 0; border-radius: 8px; font-size: 14px; font-weight: 600;
        cursor: pointer; background: $bg-page; color: $text-secondary;
        &:active { background: $border-lighter; }
      }

      .confirm-ok {
        flex: 1; padding: 10px 0; border-radius: 8px; font-size: 14px; font-weight: 600;
        cursor: pointer; background: $error-color; color: white;
        &:active { opacity: 0.85; }
      }
    }
  }

  // ========== 客户选择弹窗 ==========
  :deep(.customer-dialog) {
    .t-dialog {
      margin: 20px auto;
      width: 90% !important;
      border-radius: 12px;
      overflow: visible;
      box-sizing: border-box;
      .t-dialog__header, .t-dialog__footer { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; overflow: hidden; }
      .t-dialog__close { display: none !important; }
      .t-dialog__body { padding: 0 !important; margin: 0; overflow: visible; }
    }
  }

  .customer-popup {
    background: white;
    border-radius: 12px;

    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid $border-lighter;

      .popup-title { font-size: 16px; font-weight: 600; color: $text-primary; }

      .popup-close {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; cursor: pointer; background: $bg-page;
        .t-icon { font-size: 16px; color: $text-secondary; }
      }
    }

    .popup-search {
      padding: 10px 16px;
    }

    .popup-list {
      max-height: 280px;
      overflow-y: auto;
      padding: 0 16px;

      .popup-customer-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid $border-lighter;
        cursor: pointer;

        &:last-child { border-bottom: none; }
        &:active { background: $bg-hover; }

        .popup-customer-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: $bg-page;
          display: flex; align-items: center; justify-content: center;
          margin-right: 10px; flex-shrink: 0;
          .t-icon { font-size: 16px; color: $text-placeholder; }
        }

        .popup-customer-info {
          flex: 1; min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          .popup-customer-name { font-size: 14px; color: $text-primary; font-weight: 500; display: block; }
          .popup-customer-phone { font-size: 12px; color: $text-placeholder; margin-top: 2px; display: block; }
        }

        .check-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
          color: $primary-color;
        }

        .check-placeholder {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        &.selected {
          .popup-customer-name { color: $primary-color; }
        }
      }
    }
  }

  // ========== 退货确认弹窗 ==========
  :deep(.return-dialog) {
    .t-dialog {
      margin: 0 auto;
      width: 80% !important;
      border-radius: 12px;
      overflow: visible;
      box-sizing: border-box;
      .t-dialog__header, .t-dialog__footer { display: none !important; padding: 0 !important; height: 0 !important; margin: 0 !important; overflow: hidden; }
      .t-dialog__close { display: none !important; }
      .t-dialog__body { padding: 0 !important; margin: 0; overflow: visible; }
    }
  }

  .return-popup {
    background: white;
    border-radius: 12px;

    .return-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid $border-lighter;

      .return-icon { font-size: 20px; color: $error-color; }
      .return-title { font-size: 16px; font-weight: 600; color: $text-primary; }
    }

    .return-body {
      padding: 16px 20px;

      .return-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;

        &:not(:last-child) { border-bottom: 1px dashed $border-lighter; }

        .return-label { font-size: 13px; color: $text-secondary; }
        .return-value {
          font-size: 14px; color: $text-primary; font-weight: 500;
          &.amount { font-size: 16px; font-weight: 700; color: $error-color; }
        }
      }
    }

    .return-actions {
      display: flex;
      gap: 12px;
      padding: 12px 20px 16px;

      .return-cancel {
        flex: 1; padding: 10px 0; border-radius: 8px; font-size: 14px; font-weight: 600;
        cursor: pointer; background: $bg-page; color: $text-secondary;
        &:active { background: $border-lighter; }
      }

      .return-ok {
        flex: 1; padding: 10px 0; border-radius: 8px; font-size: 14px; font-weight: 600;
        cursor: pointer; background: $error-color; color: white;
        box-shadow: 0 2px 8px rgba($error-color, 0.3);
        &:active { transform: scale(0.98); }
      }
    }
  }
}
</style>
