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
        <!-- 规格信息 -->
        <div class="card-header">
          <div class="sku-spec">
            <span class="spec-color">{{ sku.color }}</span>
            <span class="spec-divider">/</span>
            <span class="spec-size">{{ sku.size }}</span>
          </div>
          <div class="stock-status" :class="getStockStatus(sku.stock)">
            <t-icon :name="getStockIcon(sku.stock)" />
            <span>{{ getStockText(sku.stock) }}</span>
          </div>
        </div>

        <!-- 价格信息 -->
        <div class="card-price">
          <span class="price-symbol">¥</span>
          <span class="price-value">{{ sku.price }}</span>
        </div>

        <!-- 库存信息 -->
        <div class="card-stock">
          <span class="stock-label">库存</span>
          <span class="stock-value">{{ sku.stock }}</span>
        </div>

        <!-- 数量控制区 -->
        <div class="quantity-control">
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
            :max="sku.stock"
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
  const quantity = Math.max(0, Math.min(value || 0, sku.stock))
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
  if (sku.stock === 0) return
  quickAdd(sku, 1)
}

// 快捷添加数量
const quickAdd = (sku, quantity) => {
  if (sku.stock === 0) return

  const key = `${sku.color}-${sku.size}`
  const currentQuantity = props.selectedQuantities[key] || 0
  const newQuantity = Math.min(currentQuantity + quantity, sku.stock)

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

  // SKU卡片网格
  .sku-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: $spacing-md;
    padding: $spacing-lg;
    max-height: 400px;
    overflow-y: auto;

    @media (min-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .sku-card {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: $spacing-md;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid $border-light;
      position: relative;
      overflow: hidden;

      &:hover {
        transform: translateY(-2px);
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
          transform: none;
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

        .quick-actions {
          opacity: 1;
        }
      }

      // 卡片头部
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: $spacing-sm;

        .sku-spec {
          font-size: $font-sm;
          color: $text-primary;
          font-weight: 500;

          .spec-divider {
            color: $text-placeholder;
            margin: 0 2px;
          }
        }

        .stock-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: $font-xs;
          padding: 2px 6px;
          border-radius: $radius-sm;

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
      }

      // 价格信息
      .card-price {
        display: flex;
        align-items: baseline;
        margin-bottom: $spacing-sm;

        .price-symbol {
          font-size: $font-sm;
          color: $primary-color;
          font-weight: 500;
        }

        .price-value {
          font-size: $font-lg;
          color: $primary-color;
          font-weight: 600;
          margin-left: 2px;
        }
      }

      // 库存信息
      .card-stock {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: $font-xs;

        .stock-label {
          color: $text-secondary;
        }

        .stock-value {
          color: $text-primary;
          font-weight: 500;
        }
      }

      // 数量控制区
      .quantity-control {
        position: absolute;
        bottom: $spacing-sm;
        right: $spacing-sm;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.95);
        padding: 4px;
        border-radius: $radius-md;
        box-shadow: $shadow-sm;
        border: 1px solid $border-light;

        .control-btn {
          width: 26px;
          height: 26px;
          border-radius: $radius-sm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            transform: scale(1.08);
          }

          &:active {
            transform: scale(0.95);
          }

          &.decrease-btn {
            background: $bg-page;
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
          width: 60px;

          :deep(.t-input-number__input) {
            width: 100%;
            text-align: center;
            font-size: $font-sm;
            font-weight: 600;
            color: $text-primary;
            padding: 0 4px;
          }

          :deep(.t-input-number__increase),
          :deep(.t-input-number__decrease) {
            display: none;
          }
        }
      }

      // 移除原来的快捷操作按钮样式
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