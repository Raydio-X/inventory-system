<template>
  <div class="page page-with-navbar profit-detail-page">
    <!-- 顶部导航栏 -->
    <navbar title="利润详情" />

    <!-- 商品列表 -->
    <div class="product-list">
      <div class="list-header">
        <t-icon name="layers" class="header-icon" />
        <span>商品盈亏明细</span>
      </div>

      <div v-if="loading" class="loading-state">
        <t-icon name="loading" class="loading-icon" />
        <span>加载中...</span>
      </div>

      <div v-else-if="products.length === 0" class="empty-state">
        <t-icon name="inbox" class="empty-icon" />
        <span>暂无数据</span>
      </div>

      <div v-else class="product-items">
        <div
          v-for="product in products"
          :key="product.productName"
          class="product-card"
        >
          <div class="product-header" @click="toggleProduct(product.productName)">
            <div class="product-main">
              <span class="product-name">{{ product.productName }}</span>
              <span :class="['product-profit', { negative: product.totalProfit < 0 }]">
                ¥{{ formatAmount(product.totalProfit) }}
              </span>
              <t-icon :class="['expand-icon', { expanded: expandedProducts[product.productName] }]" name="chevron-down" />
            </div>
            <div class="product-summary">
              <span>销量 {{ product.totalSalesCount }}件</span>
              <span class="divider">|</span>
              <span>销售额 ¥{{ formatAmount(product.totalSalesAmount) }}</span>
              <span class="divider">|</span>
              <span>成本 ¥{{ formatAmount(product.totalCostAmount) }}</span>
            </div>
          </div>

          <transition name="expand">
            <div v-if="expandedProducts[product.productName]" class="spec-list">
              <div v-for="spec in product.specs" :key="`${spec.color}-${spec.size}`" class="spec-item">
                <div class="spec-info">
                  <span class="spec-tags">
                    <span class="spec-tag">{{ spec.color || '-' }}</span>
                    <span class="spec-tag">{{ spec.size || '-' }}</span>
                  </span>
                  <span class="spec-count">{{ spec.salesCount }}件</span>
                </div>
                <div class="spec-amounts">
                  <span class="spec-sales">¥{{ formatAmount(spec.salesAmount) }}</span>
                  <span class="spec-cost">成本 ¥{{ formatAmount(spec.costAmount) }}</span>
                  <span :class="['spec-profit', { negative: spec.profit < 0 }]">
                    ¥{{ formatAmount(spec.profit) }}
                  </span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Navbar from '@/components/Navbar.vue'
import api from '@/utils/api'

// 数据
const loading = ref(false)
const products = ref([])

// 展开状态
const expandedProducts = reactive({})

// 初始化
onMounted(() => {
  fetchProfitDetail()
})

// 获取利润详情
const fetchProfitDetail = async () => {
  loading.value = true
  try {
    const res = await api.get('/accounts/profit-detail')
    if (res.success && res.data) {
      products.value = res.data.products || []
    }
  } catch (error) {
    console.error('获取利润详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 展开/收起商品
const toggleProduct = (name) => {
  expandedProducts[name] = !expandedProducts[name]
}

// 格式化金额
const formatAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
  return Number(amount).toFixed(2)
}
</script>

<style lang="scss" scoped>
.profit-detail-page {
  .product-list {
    padding: 0 $spacing-md;

    .list-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: $spacing-md;

      .header-icon {
        font-size: 18px;
        color: $primary-color;
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 0;
      color: $text-placeholder;

      .loading-icon,
      .empty-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
    }

    .product-items {
      .product-card {
        background: $bg-card;
        border-radius: $radius-lg;
        margin-bottom: $spacing-md;
        overflow: hidden;

        .product-header {
          padding: $spacing-md;
          cursor: pointer;

          &:active {
            background: $bg-hover;
          }

          .product-main {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;

            .product-name {
              flex: 1;
              font-size: 15px;
              font-weight: 600;
              color: $text-primary;
            }

            .product-profit {
              font-size: 16px;
              font-weight: 700;
              color: $success-color;

              &.negative {
                color: $error-color;
              }
            }

            .expand-icon {
              font-size: 18px;
              color: $text-secondary;
              transition: transform 0.2s;

              &.expanded {
                transform: rotate(180deg);
              }
            }
          }

          .product-summary {
            font-size: 12px;
            color: $text-secondary;

            .divider {
              margin: 0 6px;
              color: $border-color;
            }
          }
        }

        .spec-list {
          border-top: 1px solid $border-light;

          .spec-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: $spacing-sm $spacing-md;
            border-bottom: 1px solid $border-light;

            &:last-child {
              border-bottom: none;
            }

            .spec-info {
              display: flex;
              align-items: center;
              gap: 8px;

              .spec-tags {
                display: flex;
                gap: 4px;

                .spec-tag {
                  display: inline-block;
                  padding: 2px 6px;
                  background: $bg-color;
                  border-radius: 3px;
                  font-size: 11px;
                  color: $text-secondary;
                }
              }

              .spec-count {
                font-size: 12px;
                color: $text-secondary;
              }
            }

            .spec-amounts {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;

              .spec-sales {
                color: $text-primary;
              }

              .spec-cost {
                color: $text-secondary;
              }

              .spec-profit {
                font-weight: 600;
                color: $success-color;

                &.negative {
                  color: $error-color;
                }
              }
            }
          }
        }
      }
    }
  }
}

// 展开动画
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>