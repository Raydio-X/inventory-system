<template>
  <div class="page supplier-detail-page">
    <!-- 顶部导航栏 -->
    <div class="nav-bar">
      <div class="nav-content">
        <div class="nav-back" @click="router.back()">
          <t-icon name="chevron-left" />
        </div>
        <div class="nav-title">供应商详情</div>
        <div class="nav-placeholder"></div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <t-icon name="loading" class="loading-icon" />
      <span class="loading-text">加载中...</span>
    </div>

    <template v-else-if="supplier">
      <!-- 供应商信息卡片 -->
      <div class="supplier-card">
        <div class="card-top">
          <div class="avatar">
            <span>{{ supplier.name?.charAt(0) || '?' }}</span>
          </div>
          <div class="info">
            <div class="name">{{ supplier.name }}</div>
            <div class="phone">{{ supplier.phone || '未填写' }}</div>
          </div>
        </div>
        <div class="card-stats">
          <div class="stat">
            <div class="stat-value">{{ supplier.totalOrders || 0 }}</div>
            <div class="stat-label">采购次数</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <div class="stat-value">¥{{ formatAmount(supplier.totalAmount) }}</div>
            <div class="stat-label">采购总额</div>
          </div>
        </div>
      </div>

      <!-- 备注 -->
      <div v-if="supplier.remark" class="remark-card">
        <div class="section-header">
          <div class="section-title">
            <t-icon name="chat" />
            <span>备注</span>
          </div>
        </div>
        <div class="remark-content">{{ supplier.remark }}</div>
      </div>

      <!-- 采购记录 -->
      <div class="orders-section">
        <div class="section-header">
          <div class="section-title">
            <t-icon name="order" />
            <span>采购记录</span>
          </div>
          <div class="section-actions">
            <span class="section-count">{{ supplier.orders?.length || 0 }}笔</span>
            <t-button theme="primary" size="small" @click="goToPurchase">
              <template #icon><t-icon name="add" /></template>
              新增采购
            </t-button>
          </div>
        </div>

        <div v-if="!supplier.orders || supplier.orders.length === 0" class="empty-state">
          <t-icon name="inbox" class="empty-icon" />
          <div class="empty-text">暂无采购记录</div>
        </div>

        <div v-else class="order-list">
          <div
            v-for="order in supplier.orders"
            :key="order.id"
            class="receipt-card"
          >
            <!-- 单据标题栏 -->
            <div class="receipt-title-bar" @click="toggleOrder(order.id)">
              <div class="title-left">
                <span class="receipt-label">采购单</span>
              </div>
              <div class="title-right">
                <span :class="['status-tag', getOrderStatusClass(order.status)]">
                  {{ getOrderStatusText(order.status) }}
                </span>
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
              <span class="amount-label">采购金额</span>
              <span class="amount-value">¥{{ formatAmount(order.totalAmount) }}</span>
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
                  <div v-for="item in order.items" :key="item.id" class="detail-item">
                    <span class="col-name">{{ item.productName }}</span>
                    <span class="col-spec">
                      <span class="sku-tag">{{ item.color || '-' }}</span>
                      <span class="sku-tag">{{ item.size || '-' }}</span>
                    </span>
                    <span class="col-price">¥{{ item.costPrice }}</span>
                    <span class="col-qty">{{ item.quantity }}</span>
                    <span class="col-sub">¥{{ formatAmount(item.costPrice * item.quantity) }}</span>
                  </div>
                </div>

                <!-- 备注 -->
                <div v-if="order.remark" class="order-remark">
                  <span class="remark-label">备注：</span>
                  <span>{{ order.remark }}</span>
                </div>

                <!-- 操作按钮 -->
                <div class="order-actions">
                  <!-- 待入库状态：显示确认入库、修改、删除 -->
                  <template v-if="order.status === 'pending'">
                    <t-button theme="success" size="small" @click="openConfirmDialog(order)">
                      <template #icon><t-icon name="check" /></template>
                      确认入库
                    </t-button>
                    <t-button theme="warning" size="small" variant="outline" @click="editPurchaseOrder(order)">
                      <template #icon><t-icon name="edit" /></template>
                      修改
                    </t-button>
                  </template>
                  <!-- 所有状态都可以删除 -->
                  <t-button theme="danger" size="small" variant="outline" @click="openDeleteDialog(order)">
                    <template #icon><t-icon name="delete" /></template>
                    删除
                  </t-button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </template>

    <!-- 供应商不存在 -->
    <div v-else class="empty-wrapper">
      <t-icon name="error-circle" class="empty-icon" />
      <span class="empty-text">供应商不存在或已删除</span>
      <t-button theme="primary" @click="router.back()">返回</t-button>
    </div>

    <!-- 删除确认弹窗 -->
    <t-dialog
      v-model:visible="deleteDialogVisible"
      header="确认删除"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="400px"
      class="delete-dialog"
    >
      <div class="delete-dialog-content">
        <div class="delete-icon-wrapper">
          <t-icon name="error-circle" class="delete-icon" />
        </div>
        <p class="delete-title">确定要删除此采购订单吗？</p>
        <p class="delete-hint">删除后无法恢复，但不会影响商品库存</p>
        <div class="delete-actions">
          <t-button theme="default" size="large" @click="deleteDialogVisible = false">取消</t-button>
          <t-button theme="danger" size="large" :loading="deleting" @click="confirmDeleteOrder">确认删除</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 入库确认弹窗 -->
    <t-dialog
      v-model:visible="confirmDialogVisible"
      :header="null"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="450px"
      class="confirm-dialog"
    >
      <div class="confirm-dialog-content">
        <div class="confirm-icon-wrapper">
          <t-icon name="inbox" class="confirm-icon" />
        </div>
        <div class="confirm-title">确认将此采购订单入库？</div>
        <div class="confirm-hint">入库后将增加商品库存并更新成本价</div>

        <!-- 入库预览 -->
        <div class="confirm-preview">
          <div class="preview-header">入库商品明细</div>
          <div class="preview-items">
            <div v-for="item in confirmOrderItems" :key="item.skuId" class="preview-item">
              <span class="preview-name">{{ item.productName }}</span>
              <span class="preview-spec">{{ item.color }}/{{ item.size }}</span>
              <span class="preview-qty">+{{ item.quantity }}件</span>
            </div>
          </div>
          <div class="preview-total">
            <span>入库总金额</span>
            <span class="preview-amount">¥{{ formatAmount(confirmOrderAmount) }}</span>
          </div>
        </div>

        <div class="confirm-actions">
          <t-button theme="default" size="large" @click="confirmDialogVisible = false">取消</t-button>
          <t-button theme="success" size="large" :loading="confirming" @click="doConfirmPurchase">确认入库</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import api from '@/utils/api'
import { useProductStore } from '@/store/product'
import { usePurchaseStore } from '@/store/purchase'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const purchaseStore = usePurchaseStore()

const loading = ref(false)
const supplier = ref(null)

// 展开状态
const expandedOrders = ref({})
const toggleOrder = (orderId) => {
  expandedOrders.value[orderId] = !expandedOrders.value[orderId]
}

// 删除弹窗状态
const deleteDialogVisible = ref(false)
const deleteOrderId = ref(null)
const deleting = ref(false)

// 入库确认弹窗状态
const confirmDialogVisible = ref(false)
const confirmOrderId = ref(null)
const confirmOrderItems = ref([])
const confirming = ref(false)

// 入库总金额
const confirmOrderAmount = computed(() =>
  confirmOrderItems.value.reduce((sum, item) => sum + (item.costPrice || 0) * (item.quantity || 0), 0)
)

// 编辑采购订单（跳转到编辑页面）
const editPurchaseOrder = (order) => {
  router.push({
    path: '/purchases/add',
    query: { orderId: order.id }
  })
}

// 打开删除确认弹窗
const openDeleteDialog = (order) => {
  deleteOrderId.value = order.id
  deleteDialogVisible.value = true
}

// 确认删除
const confirmDeleteOrder = async () => {
  deleting.value = true
  try {
    await purchaseStore.deletePurchaseOrder(deleteOrderId.value)
    MessagePlugin.success('采购订单删除成功')
    deleteDialogVisible.value = false
    await fetchSupplier()
  } catch (error) {
    MessagePlugin.error(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

// 打开入库确认弹窗
const openConfirmDialog = (order) => {
  confirmOrderId.value = order.id
  confirmOrderItems.value = order.items.map(item => ({
    skuId: item.skuId,
    productName: item.productName,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    costPrice: item.costPrice
  }))
  confirmDialogVisible.value = true
}

// 执行入库确认
const doConfirmPurchase = async () => {
  confirming.value = true
  try {
    await purchaseStore.confirmPurchase(confirmOrderId.value)
    MessagePlugin.success('入库成功，库存已更新')
    confirmDialogVisible.value = false
    await fetchSupplier()
  } catch (error) {
    MessagePlugin.error(error.message || '入库失败')
  } finally {
    confirming.value = false
  }
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

const getOrderStatusText = (status) => {
  const texts = {
    pending: '待入库',
    completed: '已入库'
  }
  return texts[status] || status || '已完成'
}

const getOrderStatusClass = (status) => {
  if (status === 'completed') return 'completed'
  return 'pending'
}

const fetchSupplier = async () => {
  loading.value = true
  try {
    const res = await api.get(`/suppliers/${route.params.id}`)
    if (res.success) {
      supplier.value = res.data
    } else {
      MessagePlugin.error('加载供应商失败')
    }
  } catch (error) {
    MessagePlugin.error('加载供应商失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

const goToPurchase = () => {
  router.push({ path: '/purchases/add', query: { supplierId: route.params.id } })
}

onMounted(() => {
  productStore.initData()
  fetchSupplier()
})
</script>

<style lang="scss" scoped>
.supplier-detail-page {
  padding-bottom: 80px;

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

  // 导航栏
  .nav-bar {
    background: linear-gradient(135deg, $warning-color, rgba($warning-color, 0.8));
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

  // 供应商信息卡片
  .supplier-card {
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
        background: linear-gradient(135deg, $warning-color, rgba($warning-color, 0.7));
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
          color: $warning-color;
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

  // 采购记录区域
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
          color: $warning-color;
          position: relative;
          top: -1px;
        }
      }

      .section-count {
        margin-left: auto;
        font-size: 12px;
        color: $text-secondary;
        margin-right: $spacing-sm;
      }

      .section-actions {
        display: flex;
        align-items: center;
        margin-left: auto;
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

    // 单据式采购列表
    .order-list {
      .receipt-card {
        background: $bg-card;
        border-radius: $radius-lg;
        margin-bottom: 14px;
        overflow: hidden;
        border: 1px solid $border-lighter;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

        // 标题栏
        .receipt-title-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          background: linear-gradient(135deg, rgba($warning-color, 0.06), rgba($warning-color, 0.02));

          &:active {
            background: rgba($warning-color, 0.1);
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

              &.completed {
                background: rgba($success-color, 0.1);
                color: $success-color;
              }

              &.pending {
                background: rgba($warning-color, 0.1);
                color: $warning-color;
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
          background: rgba($warning-color, 0.02);
          border-top: 1px solid $border-lighter;

          .amount-label {
            font-size: 15px;
            color: $text-secondary;
            font-weight: 500;
          }

          .amount-value {
            font-size: 20px;
            font-weight: 700;
            color: $warning-color;
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

            .col-name { flex: 2; min-width: 0; }
            .col-spec { flex: 1.5; min-width: 0; text-align: center; }
            .col-price { width: 56px; text-align: right; }
            .col-qty { width: 36px; text-align: center; }
            .col-sub { width: 64px; text-align: right; }
          }

          // 商品行
          .detail-items {
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

          // 订单备注
          .order-remark {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed $border-light;
            font-size: 13px;
            color: $text-secondary;

            .remark-label {
              color: $text-placeholder;
            }
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

    // 订单操作按钮
    .order-actions {
      display: flex;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px dashed $border-light;
      margin-top: 12px;
    }
  }
}

// 弹窗样式
.delete-dialog,
.confirm-dialog {
  :deep(.t-dialog) {
    border-radius: $radius-lg;
  }

  :deep(.t-dialog__content) {
    background: $bg-white;
    border-radius: $radius-lg;
    padding: 0 !important;
  }

  :deep(.t-dialog__header) {
    display: none !important;
    padding: 0 !important;
    height: 0 !important;
    min-height: 0 !important;
  }

  :deep(.t-dialog__body) {
    padding: 0 !important;
  }

  :deep(.t-dialog__close) {
    display: none !important;
  }

  :deep(.t-dialog__position) {
    padding: 0 !important;
  }
}

// 删除确认弹窗
.delete-dialog-content {
  text-align: center;
  padding: $spacing-xl;

  .delete-icon-wrapper {
    margin-bottom: $spacing-md;

    .delete-icon {
      font-size: 48px;
      color: $error-color;
    }
  }

  .delete-title {
    font-size: $font-md;
    color: $text-primary;
    font-weight: 600;
    margin-bottom: $spacing-sm;
  }

  .delete-hint {
    font-size: $font-sm;
    color: $text-secondary;
    margin-bottom: $spacing-lg;
  }

  .delete-actions {
    display: flex;
    gap: $spacing-md;

    .t-button {
      flex: 1;
    }
  }
}

// 入库确认弹窗
.confirm-dialog-content {
  text-align: center;
  padding: $spacing-md $spacing-lg $spacing-lg;

  .confirm-icon-wrapper {
    margin-bottom: $spacing-xs;

    .confirm-icon {
      font-size: 40px;
      color: $success-color;
    }
  }

  .confirm-title {
    font-size: $font-md;
    color: $text-primary;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .confirm-hint {
    font-size: $font-sm;
    color: $text-secondary;
    margin-bottom: $spacing-sm;
  }

  .confirm-preview {
    background: #fafafa;
    border-radius: $radius-md;
    padding: $spacing-md;
    margin-bottom: $spacing-lg;
    text-align: left;

    .preview-header {
      font-size: $font-xs;
      color: $text-secondary;
      margin-bottom: $spacing-sm;
      padding-bottom: $spacing-xs;
      border-bottom: 1px solid $border-lighter;
    }

    .preview-items {
      max-height: 150px;
      overflow-y: auto;

      .preview-item {
        display: flex;
        align-items: center;
        padding: $spacing-xs 0;
        font-size: $font-sm;

        .preview-name {
          flex: 1;
          color: $text-primary;
        }

        .preview-spec {
          color: $text-secondary;
          margin-right: $spacing-sm;
        }

        .preview-qty {
          color: $success-color;
          font-weight: 600;
        }
      }
    }

    .preview-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: $spacing-sm;
      margin-top: $spacing-sm;
      border-top: 1px solid $border-lighter;
      font-size: $font-sm;

      .preview-amount {
        font-size: $font-lg;
        color: $success-color;
        font-weight: 700;
      }
    }
  }

  .confirm-actions {
    display: flex;
    gap: $spacing-md;

    .t-button {
      flex: 1;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
