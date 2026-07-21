<template>
  <div class="page customer-detail-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">客户详情</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 客户信息卡片 -->
    <div class="customer-card">
      <div class="card-top">
        <div class="avatar">
          <span>{{ customer?.name?.charAt(0) || '?' }}</span>
        </div>
        <div class="info">
          <div class="name">{{ customer?.name }}</div>
          <div class="phone">{{ customer?.phone }}</div>
        </div>
        <div class="action-btn" @click="goToBilling">
          <t-icon name="add" />
          <span>开单</span>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat">
          <div class="stat-value">¥{{ formatAmount(totalSpent) }}</div>
          <div class="stat-label">总消费</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <div class="stat-value">{{ orderCount }}</div>
          <div class="stat-label">订单数</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <div class="stat-value debt">¥{{ formatAmount(totalDebt) }}</div>
          <div class="stat-label">欠款</div>
        </div>
      </div>
    </div>

    <!-- 备注 -->
    <div v-if="customer?.remark" class="remark-card">
      <div class="section-header">
        <div class="section-title">
          <t-icon name="chat" />
          <span>备注</span>
        </div>
      </div>
      <div class="remark-content">{{ customer.remark }}</div>
    </div>

    <!-- 订单历史 -->
    <div class="orders-section">
      <div class="section-header">
        <div class="section-title">
          <t-icon name="order" />
          <span>订单记录</span>
        </div>
        <span class="section-count">{{ allOrders.length }}笔</span>
      </div>

      <div v-if="allOrders.length === 0" class="empty-state">
        <t-icon name="inbox" class="empty-icon" />
        <div class="empty-text">暂无订单记录</div>
      </div>

      <div v-else class="order-list">
        <div
          v-for="order in allOrders"
          :key="order.id"
          class="receipt-card"
          :class="{ 'return-card': order.orderType === 'return' }"
        >
          <!-- 单据标题栏 -->
          <div class="receipt-title-bar" @click="toggleOrder(order.id)">
            <div class="title-left">
              <span class="receipt-label">{{ order.typeLabel }}</span>
            </div>
            <div class="title-right">
              <span v-if="order.orderType === 'sales'" :class="['status-tag', getPaymentStatusClass(order.paymentStatus)]">
                {{ getStatusText(order.paymentStatus) }}
              </span>
              <span v-else class="status-tag returned">已退货</span>
              <t-icon name="chevron-down" :class="['expand-icon', { expanded: expandedOrders[order.id] }]" />
            </div>
          </div>

          <!-- 单据基本信息 -->
          <div class="receipt-info" @click="toggleOrder(order.id)">
            <div class="info-row">
              <span class="info-label">单号</span>
              <span class="info-value mono">{{ order.orderNo }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">日期</span>
              <span class="info-value">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>

          <!-- 金额摘要 -->
          <div class="receipt-amount-bar" @click="toggleOrder(order.id)">
            <span class="amount-label">{{ order.orderType === 'return' ? '退款金额' : '订单金额' }}</span>
            <span :class="['amount-value', { 'return-amount': order.orderType === 'return' }]">
              {{ order.orderType === 'return' ? '-' : '' }}¥{{ formatAmount(order.totalAmount) }}
            </span>
          </div>

          <!-- 虚线分割线 -->
          <div class="receipt-divider">
            <span class="dot"></span>
            <span class="line"></span>
            <span class="dot"></span>
          </div>

          <!-- 展开的商品明细 -->
          <transition name="expand">
            <div v-if="expandedOrders[order.id]" class="receipt-detail">
              <!-- 商品列表表头 -->
              <div class="detail-table-header">
                <span class="col-name">商品</span>
                <span class="col-spec">规格</span>
                <span class="col-price">单价</span>
                <span class="col-qty">数量</span>
                <span class="col-sub">小计</span>
              </div>

              <!-- 商品列表 -->
              <div class="detail-items">
                <div v-for="group in groupItemsByProduct(getOrderItems(order))" :key="group.productName" class="product-group">
                  <!-- 商品名称行 -->
                  <div class="product-group-header">
                    <span class="group-name">{{ group.productName }}</span>
                    <span class="group-count">{{ group.items.length }}个规格</span>
                  </div>
                  <!-- 规格明细 -->
                  <div v-for="item in group.items" :key="item.skuId" class="detail-item">
                    <span class="col-name"></span>
                    <span class="col-spec">
                      <span class="sku-tag">{{ item.color || '-' }}</span>
                      <span class="sku-tag">{{ item.size || '-' }}</span>
                    </span>
                    <span class="col-price">¥{{ item.price }}</span>
                    <span class="col-qty">{{ item.quantity }}</span>
                    <span class="col-sub">¥{{ formatAmount(item.price * item.quantity) }}</span>
                  </div>
                </div>
              </div>

              <!-- 付款明细（仅销售单） -->
              <div v-if="order.orderType === 'sales'" class="payment-summary">
                <div class="payment-row">
                  <span class="payment-label">实付金额</span>
                  <span class="payment-value paid">¥{{ formatAmount(order.paidAmount) }}</span>
                </div>
                <div v-if="order.debtAmount > 0" class="payment-row">
                  <span class="payment-label">欠款金额</span>
                  <span class="payment-value debt">¥{{ formatAmount(order.debtAmount) }}</span>
                </div>
              </div>

              <!-- 操作按钮（仅销售单） -->
              <div v-if="order.orderType === 'sales'" class="order-actions">
                <t-button variant="outline" size="small" @click="goToEditOrder(order)">
                  <template #icon><t-icon name="edit" /></template>
                  修改
                </t-button>
                <t-button variant="outline" size="small" theme="danger" @click="openDeleteDialog(order)">
                  <template #icon><t-icon name="delete" /></template>
                  删除
                </t-button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <t-dialog
      v-model:visible="deleteDialogVisible"
      header="确认删除"
      :close-btn="false"
      :footer="false"
      width="80%"
      placement="center"
    >
      <div class="delete-confirm" v-if="deletingOrder">
        <div class="delete-icon-wrap">
          <t-icon name="error-circle" class="delete-icon" />
        </div>
        <div class="delete-text">确定要删除此订单吗？</div>
        <div class="delete-info">
          <div class="delete-info-row">
            <span>单号</span>
            <span>{{ deletingOrder.orderNo }}</span>
          </div>
          <div class="delete-info-row">
            <span>金额</span>
            <span>¥{{ formatAmount(deletingOrder.totalAmount) }}</span>
          </div>
          <div class="delete-info-row">
            <span>商品数</span>
            <span>{{ (deletingOrder.items || []).length }}件</span>
          </div>
        </div>
        <div class="delete-warning">删除后库存将回滚，此操作不可恢复</div>
        <div class="delete-footer">
          <t-button variant="outline" @click="deleteDialogVisible = false" :disabled="deleteLoading">取消</t-button>
          <t-button theme="danger" @click="confirmDelete" :loading="deleteLoading">确认删除</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCustomerStore } from '@/store/customer'
import { useBillingStore } from '@/store/billing'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const customerStore = useCustomerStore()
const billingStore = useBillingStore()

const customerId = computed(() => route.params.id)
const customer = computed(() =>
  customerStore.customers.find(c => c.id.toString() === customerId.value)
)

// 销售订单
const customerSalesOrders = computed(() =>
  billingStore.salesOrders.filter(o => o.customerId?.toString() === customerId.value)
)

// 退货订单
const customerReturnOrders = computed(() =>
  billingStore.returnOrders.filter(o => o.customerId?.toString() === customerId.value)
)

// 合并订单列表（销售单 + 退货单），按时间倒序
const allOrders = computed(() => {
  const sales = customerSalesOrders.value.map(o => ({
    ...o,
    orderType: 'sales',
    typeLabel: '销售单'
  }))
  const returns = customerReturnOrders.value.map(o => ({
    ...o,
    orderType: 'return',
    typeLabel: '退货单',
    // 退货单的金额显示为负数（退款）
    displayAmount: -o.totalAmount
  }))
  return [...sales, ...returns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

// 统计 - 从数据库获取
const totalSpent = computed(() => customer.value?.totalSpent || 0)
const orderCount = computed(() => customer.value?.orderCount || 0)
const totalDebt = computed(() => customer.value?.totalDebt || 0)

// 展开状态
const expandedOrders = ref({})
const toggleOrder = (orderId) => {
  expandedOrders.value[orderId] = !expandedOrders.value[orderId]
}

// 获取订单商品明细
const getOrderItems = (order) => order.items || []

// 尺码排序辅助函数
const getSizeOrder = (size) => {
  if (!size) return 999
  const s = String(size).toUpperCase().trim()
  // 常见尺码映射
  const sizeMap = {
    'XS': 1, 'XSMALL': 1,
    'S': 2, 'SMALL': 2,
    'M': 3, 'MEDIUM': 3,
    'L': 4, 'LARGE': 4,
    'XL': 5, 'X-LARGE': 5,
    'XXL': 6, '2XL': 6, 'XX-LARGE': 6,
    'XXXL': 7, '3XL': 7, 'XXX-LARGE': 7,
    '4XL': 8, 'XXXXL': 8,
    '5XL': 9
  }
  if (sizeMap[s] !== undefined) return sizeMap[s]
  // 数字尺码（如 36, 38, 40 等）
  const num = parseInt(s)
  if (!isNaN(num)) return num
  // 其他情况按字符串排序
  return 999
}

// 按商品名称分组订单项，并按颜色+尺码排序
const groupItemsByProduct = (items) => {
  if (!items || items.length === 0) return []
  const groups = {}
  items.forEach(item => {
    const name = item.productName || '未知商品'
    if (!groups[name]) {
      groups[name] = {
        productName: name,
        items: []
      }
    }
    groups[name].items.push(item)
  })
  // 对每个分组内的规格进行排序：先按颜色，再按尺码升序
  Object.values(groups).forEach(group => {
    group.items.sort((a, b) => {
      const colorA = (a.color || '').toString().trim()
      const colorB = (b.color || '').toString().trim()
      // 先按颜色排序
      if (colorA !== colorB) {
        return colorA.localeCompare(colorB, 'zh-CN')
      }
      // 同颜色按尺码升序
      return getSizeOrder(a.size) - getSizeOrder(b.size)
    })
  })
  return Object.values(groups)
}

const getStatusText = (status) => {
  const texts = {
    paid: '已付清',
    partial: '部分付款',
    unpaid: '未付款',
    settled: '已结清',
    completed: '已完成',
    pending: '待付款'
  }
  return texts[status] || status || '已完成'
}

const getPaymentStatusClass = (status) => {
  if (status === 'paid' || status === 'settled' || status === 'completed') return 'paid'
  if (status === 'partial') return 'partial'
  if (status === 'unpaid' || status === 'pending') return 'unpaid'
  return 'paid'
}

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

const goToBilling = () => {
  billingStore.setCurrentCustomer(customer.value)
  router.push('/billing')
}

// 跳转到订单编辑页面
const goToEditOrder = (order) => {
  router.push(`/customers/${customerId.value}/order/${order.id}/edit`)
}

// ==================== 删除订单 ====================
const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deletingOrder = ref(null)

const openDeleteDialog = (order) => {
  deletingOrder.value = order
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  deleteLoading.value = true
  try {
    await billingStore.deleteSalesOrder(deletingOrder.value.id)
    deleteDialogVisible.value = false
    MessagePlugin.success('订单已删除')
    // 刷新客户数据
    await customerStore.initData()
  } catch (error) {
    MessagePlugin.error(error.message || '删除失败')
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => {
  customerStore.initData()
  billingStore.initData()
})
</script>

<style lang="scss" scoped>
.customer-detail-page {
  padding-top: calc(56px + #{$safe-area-top}); // 导航栏高度 + 安全区域
  padding-bottom: 80px;

  // 导航栏 - 固定置顶
  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: white;
    border-radius: 0 0 12px 12px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .nav-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      padding-top: calc(12px + #{$safe-area-top});
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

  // 客户信息卡片
  .customer-card {
    background: $bg-card;
    border-radius: $radius-lg;
    margin-top: 12px;
    overflow: hidden;

    .card-top {
      display: flex;
      align-items: center;
      padding: 16px;

      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, $primary-color, $primary-light);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-right: 12px;

        span {
          font-size: 20px;
          font-weight: 600;
          color: white;
        }
      }

      .info {
        flex: 1;

        .name {
          font-size: 16px;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 2px;
        }

        .phone {
          font-size: 13px;
          color: $text-secondary;
        }
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 14px;
        background: linear-gradient(135deg, $primary-color, $primary-light);
        color: white;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;

        .t-icon {
          font-size: 16px;
        }

        &:active {
          opacity: 0.85;
        }
      }
    }

    .card-stats {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid $border-lighter;

      .stat {
        flex: 1;
        text-align: center;

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: $text-primary;

          &.debt {
            color: #e34d59;
          }
        }

        .stat-label {
          font-size: 12px;
          color: $text-secondary;
          margin-top: 2px;
        }
      }

      .stat-divider {
        width: 1px;
        height: 28px;
        background: $border-lighter;
      }
    }
  }

  // 备注卡片
  .remark-card {
    background: $bg-card;
    border-radius: $radius-lg;
    padding: 14px 16px;
    margin-top: 12px;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;

        .t-icon {
          font-size: 18px;
          color: $primary-color;
          position: relative;
          top: -1px;
        }
      }
    }

    .remark-content {
      font-size: 13px;
      color: $text-secondary;
      line-height: 1.5;
      padding-left: 22px;
    }
  }

  // 订单区域
  .orders-section {
    margin-top: 12px;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
      margin-bottom: 10px;

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;

        .t-icon {
          font-size: 18px;
          color: $primary-color;
          position: relative;
          top: -1px;
        }
      }

      .section-count {
        margin-left: auto;
        font-size: 12px;
        color: $text-secondary;
      }
    }

    .empty-state {
      text-align: center;
      padding: 40px 0;

      .empty-icon {
        font-size: 40px;
        color: $text-placeholder;
        margin-bottom: 8px;
      }

      .empty-text {
        font-size: 14px;
        color: $text-secondary;
      }
    }

    // 单据式订单列表
    .order-list {
      .receipt-card {
        background: $bg-card;
        border-radius: $radius-lg;
        margin-bottom: 14px;
        overflow: hidden;
        border: 1px solid $border-lighter;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

        // 退货单样式
        &.return-card {
          border-color: rgba($primary-color, 0.3);

          .receipt-title-bar {
            background: linear-gradient(135deg, rgba($primary-color, 0.08), rgba($primary-color, 0.02));
          }

          .receipt-amount-bar {
            background: rgba($primary-color, 0.04);
          }
        }

        // 标题栏
        .receipt-title-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          background: linear-gradient(135deg, rgba($primary-color, 0.03), rgba($primary-color, 0.01));

          &:active {
            background: rgba($primary-color, 0.06);
          }

          .title-left {
            display: flex;
            align-items: center;

            .receipt-label {
              font-size: 16px;
              font-weight: 700;
              color: $text-primary;
            }
          }

          .title-right {
            display: flex;
            align-items: center;
            gap: 10px;

            .status-tag {
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 600;

              &.paid {
                background: rgba($success-color, 0.1);
                color: $success-color;
              }

              &.partial {
                background: rgba($warning-color, 0.1);
                color: $warning-color;
              }

              &.unpaid {
                background: rgba($error-color, 0.1);
                color: $error-color;
              }

              &.returned {
                background: rgba($primary-color, 0.1);
                color: $primary-color;
              }
            }

            .expand-icon {
              font-size: 18px;
              color: $text-placeholder;
              transition: transform 0.3s ease;

              &.expanded {
                transform: rotate(180deg);
              }
            }
          }
        }

        // 基本信息
        .receipt-info {
          padding: 10px 18px;
          cursor: pointer;

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

              &.mono {
                font-family: 'Courier New', monospace;
                color: $text-primary;
                font-weight: 600;
              }
            }
          }
        }

        // 金额摘要
        .receipt-amount-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px;
          cursor: pointer;
          background: rgba($primary-color, 0.02);
          border-top: 1px solid $border-lighter;

          .amount-label {
            font-size: 15px;
            color: $text-secondary;
            font-weight: 500;
          }

          .amount-value {
            font-size: 20px;
            font-weight: 700;
            color: $primary-color;

            &.return-amount {
              color: $primary-color;
            }
          }
        }

        // 虚线分割线
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

        // 展开的商品明细
        .receipt-detail {
          padding: 14px 18px 16px;

          // 表格表头
          .detail-table-header {
            display: flex;
            align-items: center;
            padding-bottom: 10px;
            border-bottom: 1px solid $border-light;
            margin-bottom: 6px;

            span {
              font-size: 13px;
              color: $text-placeholder;
              font-weight: 500;
            }

            .col-name {
              flex: 2;
              min-width: 0;
            }

            .col-spec {
              flex: 1.5;
              min-width: 0;
              text-align: center;
            }

            .col-price {
              width: 56px;
              text-align: right;
            }

            .col-qty {
              width: 36px;
              text-align: center;
            }

            .col-sub {
              width: 64px;
              text-align: right;
            }
          }

          // 商品行
          .detail-items {
            // 商品分组
            .product-group {
              margin-bottom: 12px;

              &:last-child {
                margin-bottom: 0;
              }

              .product-group-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 0;
                background: #f5f5f5;
                border-radius: 4px;
                margin-bottom: 4px;
                padding-left: 8px;
                padding-right: 8px;

                .group-name {
                  font-size: 14px;
                  font-weight: 600;
                  color: $text-primary;
                }

                .group-count {
                  font-size: 12px;
                  color: $text-placeholder;
                }
              }
            }

            .detail-item {
              display: flex;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid $border-lighter;

              &:last-child {
                border-bottom: none;
              }

              span {
                font-size: 14px;
              }

              .col-name {
                flex: 2;
                min-width: 0;
                color: $text-primary;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding-right: 6px;
              }

              .col-spec {
                flex: 1.5;
                min-width: 0;
                display: flex;
                justify-content: center;
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
                width: 56px;
                text-align: right;
                color: $text-secondary;
                font-size: 13px;
              }

              .col-qty {
                width: 36px;
                text-align: center;
                color: $text-primary;
                font-weight: 500;
              }

              .col-sub {
                width: 64px;
                text-align: right;
                color: $text-primary;
                font-weight: 600;
              }
            }
          }

          // 付款汇总
          .payment-summary {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed $border-light;

            .payment-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 5px 0;

              .payment-label {
                font-size: 14px;
                color: $text-secondary;
              }

              .payment-value {
                font-size: 15px;
                font-weight: 600;

                &.paid {
                  color: $success-color;
                }

                &.debt {
                  color: $error-color;
                }
              }
            }
          }

          // 操作按钮
          .order-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px solid $border-lighter;
          }
        }
      }
    }

    // 展开/折叠动画
    .expand-enter-active,
    .expand-leave-active {
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .expand-enter-from,
    .expand-leave-to {
      opacity: 0;
      max-height: 0;
      padding-top: 0;
      padding-bottom: 0;
    }

    .expand-enter-to,
    .expand-leave-from {
      opacity: 1;
      max-height: 800px;
    }
  }
}

// ==================== 删除弹窗样式 ====================
.delete-confirm {
  text-align: center;

  .delete-icon-wrap {
    margin-bottom: 12px;

    .delete-icon {
      font-size: 48px;
      color: $warning-color;
    }
  }

  .delete-text {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 16px;
  }

  .delete-info {
    background: $bg-page;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;

    .delete-info-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;

      span:first-child {
        color: $text-secondary;
      }

      span:last-child {
        color: $text-primary;
        font-weight: 500;
      }
    }
  }

  .delete-warning {
    font-size: 13px;
    color: $error-color;
    margin-bottom: 20px;
  }

  .delete-footer {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}
</style>
