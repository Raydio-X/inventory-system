<template>
  <div class="page products-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索商品名称、品牌"
        clearable
      />
    </div>

    <!-- 分类筛选 -->
    <div class="category-tabs">
      <t-tabs
        v-model="activeCategory"
        :list="categoryList"
      />
    </div>

    <!-- 商品列表 -->
    <div class="product-list">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card"
      >
        <div class="product-image" @click="goToDetail(product.id)">
          <img v-if="product.image" :src="product.image" alt="" />
          <div v-else class="image-placeholder">
            <t-icon name="image" />
          </div>
        </div>
        <div class="product-info" @click="goToDetail(product.id)">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-meta">
            <span class="product-brand">{{ product.brand }}</span>
            <span class="product-season">{{ product.season }}</span>
          </div>
          <div class="product-price-row">
            <span class="product-price">¥{{ product.price }}</span>
            <span class="product-cost">成本: ¥{{ product.costPrice }}</span>
          </div>
          <div class="product-stock">
            总库存: {{ getTotalStock(product) }}件
          </div>
        </div>
        <div class="product-actions">
          <div class="action-btn edit-btn" @click.stop="goToEdit(product.id)">
            <t-icon name="edit" />
          </div>
          <div class="action-btn delete-btn" @click.stop="showDeleteConfirm(product)">
            <t-icon name="delete" />
          </div>
        </div>
      </div>
    </div>

    <!-- 添加商品按钮 -->
    <div class="add-btn" @click="goToAdd">
      <t-icon name="add" />
    </div>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="showDelete"
      header="确认删除"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="60%"
      class="product-dialog delete-dialog"
    >
      <div class="popup-container">
        <div class="popup-body">
          <div class="delete-message">
            <t-icon name="error-circle" class="delete-icon" />
            <p>确定要删除商品 "{{ deleteProductInfo.name }}" 吗？</p>
            <p class="delete-warning">删除后无法恢复</p>
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="default" size="large" @click="showDelete = false">取消</t-button>
          <t-button theme="danger" size="large" @click="confirmDelete">确认删除</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Tabs, Button, Icon, Dialog, MessagePlugin } from 'tdesign-vue-next'
import { useProductStore } from '@/store/product'

const router = useRouter()
const productStore = useProductStore()

const searchKeyword = ref('')
const activeCategory = ref('all')
const showDelete = ref(false)
const deleteProductInfo = ref({ id: '', name: '' })

const categoryList = computed(() => [
  { value: 'all', label: '全部' },
  ...productStore.categories.map(c => ({ value: c.id.toString(), label: c.name }))
])

const filteredProducts = computed(() => {
  let products = productStore.products

  if (activeCategory.value !== 'all') {
    products = products.filter(p =>
      p.categoryId?.toString() === activeCategory.value ||
      productStore.categories.find(c =>
        c.id.toString() === activeCategory.value &&
        c.children?.some(sc => sc.id === p.categoryId)
      )
    )
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    products = products.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.brand?.toLowerCase().includes(keyword)
    )
  }

  return products
})

const getTotalStock = (product) => {
  return product.skus?.reduce((sum, sku) => sum + sku.stock, 0) || 0
}

const goToDetail = (id) => {
  router.push(`/products/${id}`)
}

const goToAdd = () => {
  router.push('/products/add')
}

const goToEdit = (id) => {
  router.push(`/products/edit/${id}`)
}

const showDeleteConfirm = (product) => {
  deleteProductInfo.value = {
    id: product.id,
    name: product.name
  }
  showDelete.value = true
}

const confirmDelete = async () => {
  try {
    await productStore.deleteProduct(deleteProductInfo.value.id)
    MessagePlugin.success('删除成功')
    showDelete.value = false
  } catch (error) {
    console.error('删除失败:', error)
    MessagePlugin.error(error.message || '删除失败，请检查网络连接')
  }
}

onMounted(() => {
  productStore.initData()
})
</script>

<style lang="scss" scoped>
.products-page {
  padding-bottom: 80px;

  .search-bar {
    padding: $spacing-sm $spacing-lg;
    background: $bg-white;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: $shadow-sm;
  }

  .category-tabs {
    background: $bg-white;
    padding-bottom: $spacing-sm;
  }

  .product-list {
    padding: $spacing-md $spacing-lg;

    .product-card {
      display: flex;
      background: $bg-card;
      border-radius: $radius-lg;
      padding: $spacing-md;
      margin-bottom: $spacing-md;
      cursor: pointer;

      &:active {
        background: $bg-hover;
      }

      .product-image {
        width: 80px;
        height: 80px;
        border-radius: $radius-md;
        overflow: hidden;
        margin-right: $spacing-md;

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
          background: $border-light;
          color: $text-placeholder;
        }
      }

      .product-info {
        flex: 1;

        .product-name {
          font-size: $font-md;
          font-weight: 500;
          color: $text-primary;
          margin-bottom: $spacing-xs;
        }

        .product-meta {
          font-size: $font-xs;
          color: $text-secondary;
          margin-bottom: $spacing-xs;
        }

        .product-price-row {
          .product-price {
            font-size: $font-lg;
            font-weight: 600;
            color: $primary-color;
          }

          .product-cost {
            font-size: $font-xs;
            color: $text-placeholder;
            margin-left: $spacing-sm;
          }
        }

        .product-stock {
          font-size: $font-xs;
          color: $text-secondary;
          margin-top: $spacing-xs;
        }
      }

      .product-actions {
        display: flex;
        gap: $spacing-sm;
        margin-left: $spacing-sm;

        .action-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.2s ease;

          .t-icon {
            font-size: 18px;
          }

          &:hover {
            transform: scale(1.1);
          }

          &:active {
            transform: scale(0.95);
          }
        }

        .edit-btn {
          background: rgba($primary-color, 0.1);
          color: $primary-color;

          &:hover {
            background: rgba($primary-color, 0.2);
          }
        }

        .delete-btn {
          background: rgba($error-color, 0.1);
          color: $error-color;

          &:hover {
            background: rgba($error-color, 0.2);
          }
        }
      }
    }
  }

  .add-btn {
    position: fixed;
    bottom: 60px;
    right: $spacing-lg;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $primary-color;
    color: white;
    border-radius: 24px;
    box-shadow: $shadow-lg;
    cursor: pointer;
    z-index: 50;

    .t-icon {
      font-size: 24px;
    }
  }

  .delete-dialog {
    .delete-message {
      text-align: center;
      padding: $spacing-lg;

      .delete-icon {
        font-size: 48px;
        color: $error-color;
        margin-bottom: $spacing-md;
      }

      p {
        font-size: $font-md;
        color: $text-primary;
        margin-bottom: $spacing-sm;
      }

      .delete-warning {
        font-size: $font-sm;
        color: $text-secondary;
      }
    }
  }
}
</style>