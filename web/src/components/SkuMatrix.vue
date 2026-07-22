<template>
  <div class="sku-selector">
    <!-- 规格筛选区 -->
    <div class="filter-section">
      <!-- 颜色筛选 -->
      <div class="filter-group">
        <div class="filter-label">颜色</div>
        <div class="filter-options">
          <div
            v-for="color in colors"
            :key="color"
            :class="['filter-option', { active: activeColor === color }]"
            @click="toggleColorFilter(color)"
          >
            {{ color }}
          </div>
        </div>
      </div>

      <!-- 尺码筛选 -->
      <div class="filter-group">
        <div class="filter-label">尺码</div>
        <div class="filter-options">
          <div
            v-for="size in sizes"
            :key="size"
            :class="['filter-option', { active: activeSize === size }]"
            @click="toggleSizeFilter(size)"
          >
            {{ size }}
          </div>
        </div>
      </div>
    </div>

    <!-- SKU卡片网格 -->
    <div class="sku-grid">
      <div
        v-for="sku in filteredSkus"
        :key="sku.id"
        :class="['sku-card', getStockStatus(sku.stock), { selected: getQuantity(sku) > 0 }]"
        @click="handleCardClick(sku)"
      >
        <!-- 左侧信息 -->
        <div class="card-left">
          <!-- 规格信息 -->
          <div class="card-header">
            <div class="sku-spec">
              <span class="spec-color">{{ sku.color }}</span>
              <span class="spec-divider">/</span>
              <span class="spec-size">{{ sku.size }}</span>
            </div>
          </div>

          <!-- 价格与库存 -->
          <div class="card-detail">
            <div class="card-price">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ sku.price }}</span>
            </div>
            <div class="card-stock">
              <span class="stock-label">库存</span>
              <span class="stock-value">{{ sku.stock }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧：库存预警 + 数量控制 -->
        <div class="card-right">
          <div class="stock-status" :class="getStockStatus(sku.stock)">
            <t-icon :name="getStockIcon(sku.stock)" />
            <span>{{ getStockText(sku.stock) }}</span>
          </div>

          <!-- 数量控制 -->
          <div class="quantity-control" @click.stop>
            <!-- 减少按钮 -->
            <div
              v-if="getQuantity(sku) > 0"
              class="control-btn decrease-btn"
              @click.stop="quickAdd(sku, -1)"
            >
              <t-icon name="remove" />
            </div>

            <!-- 数量输入框 -->
            <t-input-number
              :value="getQuantity(sku)"
              :min="0"
              :max="props.mode === 'sale' ? sku.stock : 9999"
              size="small"
              theme="normal"
              class="quantity-input"
              @change="(value) => handleQuantityChange(sku, value)"
              @click.stop
            />

            <!-- 增加按钮 -->
            <div class="control-btn increase-btn" @click.stop="quickAdd(sku, 1)">
              <t-icon name="add" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计信息 -->
    <div class="summary-section">
      <div class="summary-item">
        <t-icon name="view-module" />
        <span class="summary-label">SKU总数</span>
        <span class="summary-value">{{ skus.length }}</span>
      </div>
      <div class="summary-item">
        <t-icon name="check-circle" />
        <span class="summary-label">已选SKU</span>
        <span class="summary-value">{{ selectedSkuCount }}</span>
      </div>
      <div class="summary-item">
        <t-icon name="inventory" />
        <span class="summary-label">已选数量</span>
        <span class="summary-value">{{ totalQuantity }}</span>
      </div>
    </div>

    <!-- 批量操作区 -->
    <div class="batch-actions">
      <t-button theme="default" size="small" @click="clearAll" class="clear-btn">
        <span class="btn-content">
          <t-icon name="delete" />
          <span class="btn-text">清空全部</span>
        </span>
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Button, Icon, InputNumber } from 'tdesign-vue-next'

const props = defineProps({
  // SKU 列表
  skus: {
    type: Array,
    default: () => []
  },
  // 已选数量
  selectedQuantities: {
    type: Object,
    default: () => ({})
  },
  // 模式：sale-销售（限制库存），return-退货（不限制库存）
  mode: {
    type: String,
    default: 'sale',
    validator: (value) => ['sale', 'return'].includes(value)
  }
})

const emit = defineEmits(['update:selectedQuantities', 'select'])

// 颜色列表
const colors = computed(() => {
  const colorSet = new Set(props.skus.map(s => s.color))
  return Array.from(colorSet)
})

// 尺码列表
const sizes = computed(() => {
  const sizeSet = new Set(props.skus.map(s => s.size))
  return Array.from(sizeSet)
})

// 筛选状态
const activeColor = ref(null)
const activeSize = ref(null)

// 筛选后的SKU列表
const filteredSkus = computed(() => {
  let skus = props.skus

  if (activeColor.value) {
    skus = skus.filter(s => s.color === activeColor.value)
  }

  if (activeSize.value) {
    skus = skus.filter(s => s.size === activeSize.value)
  }

  return skus
})

// 获取已选数量
const getQuantity = (sku) => {
  const key = `${sku.color}-${sku.size}`
  return props.selectedQuantities[key] || 0
}

// 获取库存状态
const getStockStatus = (stock) => {
  if (stock === 0) return 'empty'
  if (stock <= 10) return 'warning'
  return 'normal'
}

// 获取库存图标
const getStockIcon = (stock) => {
  if (stock === 0) return 'error-circle'
  if (stock <= 10) return 'info-circle'
  return 'check-circle'
}

// 获取库存文本
const getStockText = (stock) => {
  if (stock === 0) return '缺货'
  if (stock <= 10) return '库存预警'
  return '库存正常'
}

// 已选SKU数量
const selectedSkuCount = computed(() => {
  return Object.values(props.selectedQuantities).filter(q => q > 0).length
})

// 总数量
const totalQuantity = computed(() => {
  return Object.values(props.selectedQuantities).reduce((sum, q) => sum + q, 0)
})

// 总金额
const totalPrice = computed(() => {
  return Object.entries(props.selectedQuantities)
    .filter(([_, q]) => q > 0)
    .reduce((sum, [key, quantity]) => {
      const [color, size] = key.split('-')
      const sku = props.skus.find(s => s.color === color && s.size === size)
      return sum + (sku?.price || 0) * quantity
    }, 0)
})

// 切换颜色筛选
const toggleColorFilter = (color) => {
  activeColor.value = activeColor.value === color ? null : color
}

// 切换尺码筛选
const toggleSizeFilter = (size) => {
  activeSize.value = activeSize.value === size ? null : size
}

// 处理数量输入变化
const handleQuantityChange = (sku, value) => {
  const maxQuantity = props.mode === 'sale' ? sku.stock : 9999
  const quantity = Math.max(0, Math.min(value || 0, maxQuantity))
  const key = `${sku.color}-${sku.size}`

  const newQuantities = { ...props.selectedQuantities }
  if (quantity === 0) {
    delete newQuantities[key]
  } else {
    newQuantities[key] = quantity
  }

  emit('update:selectedQuantities', newQuantities)
  emit('select', sku, quantity)
}

// 点击卡片
const handleCardClick = (sku) => {
  // 销售模式下，库存为0时不允许点击
  if (props.mode === 'sale' && sku.stock === 0) return
  quickAdd(sku, 1)
}

// 快捷添加数量
const quickAdd = (sku, quantity) => {
  // 销售模式下，库存为0时不允许添加
  if (props.mode === 'sale' && sku.stock === 0) return

  const key = `${sku.color}-${sku.size}`
  const currentQuantity = props.selectedQuantities[key] || 0
  const maxQuantity = props.mode === 'sale' ? sku.stock : 9999
  const newQuantity = Math.min(currentQuantity + quantity, maxQuantity)

  const newQuantities = { ...props.selectedQuantities }
  newQuantities[key] = newQuantity

  emit('update:selectedQuantities', newQuantities)
  emit('select', sku, newQuantity)
}

// 清空全部
const clearAll = () => {
  emit('update:selectedQuantities', {})
}
</script>

<style lang="scss" scoped>
.sku-selector {
  // 规格筛选区
  .filter-section {
    padding: $spacing-md $spacing-lg;
    background: $bg-page;
    border-bottom: 1px solid $border-light;

    .filter-group {
      margin-bottom: $spacing-md;

      &:last-child {
        margin-bottom: 0;
      }

      .filter-label {
        font-size: $font-sm;
        color: $text-secondary;
        margin-bottom: $spacing-sm;
        font-weight: 500;
        text-align: left;
      }

      .filter-options {
        display: flex;
        gap: $spacing-sm;
        flex-wrap: wrap;

        .filter-option {
          padding: $spacing-xs $spacing-md;
          border-radius: $radius-md;
          background: $bg-white;
          color: $text-secondary;
          font-size: $font-sm;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid $border-light;

          &:hover {
            background: rgba($primary-color, 0.05);
            border-color: rgba($primary-color, 0.2);
          }

          &.active {
            background: rgba($primary-color, 0.1);
            color: $primary-color;
            border-color: $primary-color;
            font-weight: 500;
          }
        }
      }
    }
  }

  // SKU卡片列表（纵向排列）
  .sku-grid {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    padding: $spacing-md $spacing-lg;
    max-height: 400px;
    overflow-y: auto;

    .sku-card {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: $spacing-md $spacing-lg;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid $border-light;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $spacing-md;

      &:hover {
        box-shadow: $shadow-md;
      }

      &:active {
        transform: translateY(0);
      }

      // 库存状态样式
      &.empty {
        background: $bg-page;
        opacity: 0.6;
        cursor: not-allowed;

        &:hover {
          box-shadow: none;
        }
      }

      &.low {
        border-color: rgba($error-color, 0.3);

        .card-stock .stock-value {
          color: $error-color;
        }
      }

      &.warning {
        border-color: rgba($warning-color, 0.3);

        .card-stock .stock-value {
          color: $warning-color;
        }
      }

      &.normal {
        border-color: rgba($success-color, 0.3);

        .card-stock .stock-value {
          color: $success-color;
        }
      }

      // 已选状态
      &.selected {
        border-color: $primary-color;
        background: rgba($primary-color, 0.05);
      }

      // 左侧信息区
      .card-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;

        .card-header {
          display: flex;
          align-items: center;

          .sku-spec {
            font-size: $font-md;
            color: $text-primary;
            font-weight: 600;
            white-space: nowrap;
            flex-shrink: 0;

            .spec-divider {
              color: $text-placeholder;
              margin: 0 2px;
            }
          }
        }

        .card-detail {
          display: flex;
          align-items: center;
          gap: $spacing-lg;

          .card-price {
            display: flex;
            align-items: center;

            .price-symbol {
              font-size: 14px;
              color: $primary-color;
              font-weight: 500;
            }

            .price-value {
              font-size: 14px;
              color: $primary-color;
              font-weight: 600;
              margin-left: 2px;
            }
          }

          .card-stock {
            display: flex;
            align-items: center;
            gap: 4px;

            .stock-label {
              font-size: 14px;
              color: $text-secondary;
            }

            .stock-value {
              font-size: 14px;
              color: $text-primary;
              font-weight: 600;
            }
          }
        }
      }

      // 右侧：库存预警 + 数量控制
      .card-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        flex-shrink: 0;

        .stock-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: $font-xs;
          padding: 2px 8px;
          border-radius: $radius-sm;
          white-space: nowrap;
          flex-shrink: 0;

          .t-icon {
            font-size: 12px;
          }

          &.empty {
            background: rgba($error-color, 0.1);
            color: $error-color;
          }

          &.low {
            background: rgba($error-color, 0.1);
            color: $error-color;
          }

          &.warning {
            background: rgba($warning-color, 0.1);
            color: $warning-color;
          }

          &.normal {
            background: rgba($success-color, 0.1);
            color: $success-color;
          }
        }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 4px;
          background: $bg-page;
          padding: 4px;
          border-radius: $radius-md;
          border: 1px solid $border-light;
          flex-shrink: 0;

          .control-btn {
            width: 28px;
            height: 28px;
            border-radius: $radius-sm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;

            &:active {
              transform: scale(0.95);
            }

            &.decrease-btn {
              background: $bg-white;
              color: $text-secondary;
              border: 1px solid $border-light;

              &:hover {
                background: rgba($error-color, 0.1);
                color: $error-color;
                border-color: rgba($error-color, 0.3);
              }
            }

            &.increase-btn {
              background: $primary-color;
              color: white;
              border: 1px solid transparent;

              &:hover {
                background: rgba($primary-color, 0.85);
              }
            }

            .t-icon {
              font-size: 14px;
            }
          }

          .quantity-input {
            width: 50px;

            :deep(.t-input-number__input) {
              width: 100%;
              text-align: center;
              font-size: $font-sm;
              font-weight: 600;
              color: $text-primary;
              padding: 0 2px;
            }

            :deep(.t-input-number__increase),
            :deep(.t-input-number__decrease) {
              display: none;
            }
          }
        }
      }

      // 隐藏旧的快捷操作按钮样式
      .quick-actions {
        display: none;
      }
    }
  }

  // 底部统计信息
  .summary-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: linear-gradient(135deg, rgba($primary-color, 0.05), rgba($primary-color, 0.02));
    border-top: 1px solid $border-light;

    @media (min-width: 768px) {
      grid-template-columns: repeat(4, 1fr);
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .t-icon {
        font-size: 16px;
        color: $primary-color;
      }

      .summary-label {
        font-size: $font-xs;
        color: $text-secondary;
      }

      .summary-value {
        font-size: $font-md;
        color: $text-primary;
        font-weight: 600;
      }
    }
  }

  // 批量操作区
  .batch-actions {
    display: flex;
    justify-content: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    background: $bg-page;
    border-top: 1px solid $border-light;

    .t-button {
      // 使用自定义包装容器确保对齐
      :deep(.btn-content) {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px;

        .t-icon,
        [class*="t-icon"],
        svg {
          font-size: 14px;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .btn-text {
          line-height: 1;
          display: flex !important;
          align-items: center !important;
        }
      }
    }
  }
}
</style>