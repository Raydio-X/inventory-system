<template>
  <div class="page product-add-page">
    <!-- 顶部导航栏 -->
    <navbar :title="pageTitle" />

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <t-icon name="loading" class="loading-icon" />
      <span class="loading-text">加载中...</span>
    </div>

    <!-- 商品图片上传区域 -->
    <div v-else class="image-upload-section">
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style="display: none"
        @change="handleImageSelect"
      />
      <div class="image-upload-card" @click="selectImage">
        <div v-if="productImage" class="image-preview-wrapper">
          <img :src="productImage" alt="商品图片" class="preview-image" />
          <div class="image-overlay">
            <t-icon name="refresh" class="overlay-icon" />
            <span class="overlay-text">更换图片</span>
          </div>
        </div>
        <div v-else class="upload-placeholder">
          <div class="upload-icon-wrapper">
            <t-icon name="image-add" class="upload-icon" />
          </div>
          <div class="upload-text">
            <span class="upload-title">上传商品图片</span>
            <span class="upload-desc">点击此处选择图片</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 商品基本信息 -->
    <div class="info-card">
      <div class="card-header">
        <t-icon name="info-circle" class="header-icon" />
        <span class="header-title">基本信息</span>
      </div>

      <div class="form-group">
        <div class="form-item">
          <label class="form-label required">商品名称</label>
          <input
            v-model="product.name"
            type="text"
            class="form-input"
            placeholder="请输入商品名称"
          />
        </div>

        <div class="form-item">
          <label class="form-label">品牌</label>
          <input
            v-model="product.brand"
            type="text"
            class="form-input"
            placeholder="请输入品牌名称"
          />
        </div>

        <div class="form-item">
          <label class="form-label">成本</label>
          <div class="cost-input-box">
            <span class="cost-prefix">¥</span>
            <input
              v-model.number="product.costPrice"
              type="number"
              class="cost-field"
              placeholder="0.00"
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">分类</label>
          <t-select
            v-model="product.categoryId"
            :options="categoryOptions"
            placeholder="请选择分类"
            clearable
            class="category-select"
          />
        </div>

        <div class="form-item">
          <label class="form-label">供应商</label>
          <t-select
            v-model="product.supplierId"
            :options="supplierOptions"
            placeholder="请选择供应商"
            clearable
            class="category-select"
          />
        </div>
      </div>
    </div>

    <!-- SKU规格设置 -->
    <div class="info-card sku-card">
      <div class="card-header">
        <t-icon name="layers" class="header-icon" />
        <span class="header-title">规格库存</span>
        <t-button
          theme="primary"
          size="small"
          class="add-sku-btn"
          @click="addSku"
        >
          <t-icon name="add" />
          <span>添加</span>
        </t-button>
      </div>

      <div v-if="product.skus.length === 0" class="sku-empty">
        <t-icon name="inbox" class="empty-icon" />
        <span class="empty-text">暂无规格，点击上方按钮添加</span>
      </div>

      <div v-else class="sku-grid">
        <div
          v-for="(sku, index) in product.skus"
          :key="index"
          class="sku-item-card"
        >
          <div class="sku-header">
            <span class="sku-number">规格 {{ index + 1 }}</span>
            <t-icon
              name="close-circle-filled"
              class="sku-delete-icon"
              @click="removeSku(index)"
            />
          </div>

          <div class="sku-form">
            <div class="sku-row">
              <div class="sku-field">
                <label class="sku-label">颜色</label>
                <input
                  v-model="sku.color"
                  type="text"
                  class="sku-input"
                  placeholder="如：红色"
                />
              </div>

              <div class="sku-field">
                <label class="sku-label">尺码</label>
                <input
                  v-model="sku.size"
                  type="text"
                  class="sku-input"
                  placeholder="如：XL"
                />
              </div>
            </div>

            <div class="sku-row">
              <div class="sku-field">
                <label class="sku-label">库存</label>
                <input
                  v-model.number="sku.stock"
                  type="number"
                  class="sku-input"
                  placeholder="0"
                />
              </div>

              <div class="sku-field">
                <label class="sku-label">价格</label>
                <div class="sku-price-wrapper">
                  <span class="sku-price-prefix">¥</span>
                  <input
                    v-model.number="sku.price"
                    type="number"
                    class="sku-input"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
        @click="saveProduct"
      >
        <t-icon name="check" />
        <span>{{ saveButtonText }}</span>
      </t-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Select, Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useProductStore } from '@/store/product'
import api from '@/utils/api'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()

// 判断是否是编辑模式
const isEditMode = computed(() => route.name === 'ProductEdit')
const productId = computed(() => route.params.id)

const fileInput = ref(null)
const productImage = ref('')
const uploading = ref(false)
const loading = ref(false)
const product = ref({
  name: '',
  brand: '',
  costPrice: 0,
  categoryId: null,
  supplierId: null,
  skus: []
})

// 供应商列表
const suppliers = ref([])

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({
    label: s.name,
    value: s.id
  }))
)

// 标题文本
const pageTitle = computed(() => isEditMode.value ? '编辑商品' : '添加商品')

// 保存按钮文本
const saveButtonText = computed(() => isEditMode.value ? '更新商品' : '保存商品')

// Select组件需要的选项列表
const categoryOptions = computed(() =>
  productStore.categories.map(c => ({
    label: c.name,
    value: c.id
  }))
)

const canSave = computed(() =>
  product.value.name && product.value.skus.length > 0 &&
  product.value.skus.every(sku => sku.color && sku.size && sku.price > 0)
)

const selectImage = () => {
  fileInput.value.click()
}

const handleImageSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    MessagePlugin.error('只支持上传图片文件（jpeg, jpg, png, gif, webp）')
    return
  }

  // 检查文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    MessagePlugin.error('图片大小不能超过5MB')
    return
  }

  uploading.value = true

  try {
    // 创建FormData
    const formData = new FormData()
    formData.append('image', file)

    // 上传到后端
    const response = await axios.post('http://localhost:3001/api/upload/product-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      // 设置图片URL（完整的URL）
      productImage.value = `http://localhost:3001${response.data.data.url}`
      MessagePlugin.success('图片上传成功')
    } else {
      MessagePlugin.error('图片上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    MessagePlugin.error('图片上传失败，请检查网络连接')
  } finally {
    uploading.value = false
    // 清空input，允许重新选择相同文件
    event.target.value = ''
  }
}

const addSku = () => {
  product.value.skus.push({
    color: '',
    size: '',
    stock: 0,
    price: 0
  })
}

const removeSku = (index) => {
  product.value.skus.splice(index, 1)
}

// 加载商品数据（编辑模式）
const loadProductData = async () => {
  if (!isEditMode.value || !productId.value) return
  
  loading.value = true
  try {
    const productData = await productStore.fetchProduct(productId.value)
    
    if (productData) {
      // 填充表单数据
      product.value = {
        name: productData.name,
        brand: productData.brand || '',
        costPrice: productData.costPrice || 0,
        categoryId: productData.categoryId || null,
        supplierId: productData.supplierId || null,
        skus: productData.skus ? productData.skus.map(sku => ({
          id: sku.id,
          color: sku.color,
          size: sku.size,
          stock: sku.stock,
          price: sku.price
        })) : []
      }
      
      // 设置图片
      if (productData.image) {
        productImage.value = productData.image
      }
      
      MessagePlugin.success('商品数据加载成功')
    } else {
      MessagePlugin.error('加载商品数据失败')
      router.push('/products')
    }
  } catch (error) {
    console.error('加载失败:', error)
    MessagePlugin.error('加载商品数据失败，请检查网络连接')
    router.push('/products')
  } finally {
    loading.value = false
  }
}

const saveProduct = async () => {
  // 前端表单验证
  if (!product.value.name || !product.value.name.trim()) {
    MessagePlugin.warning('请输入商品名称')
    return
  }
  if (product.value.skus.length === 0) {
    MessagePlugin.warning('请至少添加一个规格')
    return
  }
  for (let i = 0; i < product.value.skus.length; i++) {
    const sku = product.value.skus[i]
    if (!sku.color || !sku.color.trim()) {
      MessagePlugin.warning(`规格 #${i + 1}：请输入颜色`)
      return
    }
    if (!sku.size || !sku.size.trim()) {
      MessagePlugin.warning(`规格 #${i + 1}：请输入尺码`)
      return
    }
    if (!sku.price || sku.price <= 0) {
      MessagePlugin.warning(`规格 #${i + 1}：请输入有效的价格`)
      return
    }
  }

  try {
    // 构建商品数据
    const productData = {
      name: product.value.name.trim(),
      brand: product.value.brand || '',
      category: product.value.categoryId || null,
      supplierId: product.value.supplierId || null,
      image: productImage.value || '',
      price: product.value.skus[0]?.price || 0,
      costPrice: product.value.costPrice || 0,
      skus: product.value.skus.map(sku => ({
        color: sku.color.trim(),
        size: sku.size.trim(),
        stock: sku.stock || 0,
        price: sku.price
      }))
    }

    // 根据模式调用不同的API
    if (isEditMode.value) {
      await productStore.updateProduct(productId.value, productData)
    } else {
      await productStore.addProduct(productData)
    }

    MessagePlugin.success(isEditMode.value ? '商品更新成功' : '商品保存成功')
    router.push('/products')
  } catch (error) {
    console.error('保存失败:', error)
    MessagePlugin.error(isEditMode.value ? '商品更新失败，请检查网络连接' : '商品保存失败，请检查网络连接')
  }
}

const goBack = () => {
  router.push('/products')
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

onMounted(() => {
  productStore.initData()
  fetchSuppliers()

  // 编辑模式下加载商品数据
  if (isEditMode.value) {
    loadProductData()
  }
})
</script>

<style lang="scss" scoped>
.product-add-page {
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

  // 图片上传区域
  .image-upload-section {
    padding: $spacing-lg;
    margin-bottom: $spacing-md;

    .image-upload-card {
      position: relative;
      width: 100%;
      height: 220px;
      background: linear-gradient(135deg, #fff5f0 0%, #ffffff 100%);
      border-radius: $radius-lg;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 87, 34, 0.15);
      }

      .image-preview-wrapper {
        position: relative;
        width: 100%;
        height: 100%;

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;

          .overlay-icon {
            font-size: 32px;
            color: #fff;
            margin-bottom: $spacing-sm;
          }

          .overlay-text {
            font-size: $font-md;
            color: #fff;
          }
        }

        &:hover .image-overlay {
          opacity: 1;
        }
      }

      .upload-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: $spacing-xl;

        .upload-icon-wrapper {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, $primary-color 0%, $primary-light 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: $spacing-md;
          box-shadow: 0 4px 12px rgba(255, 87, 34, 0.3);

          .upload-icon {
            font-size: 32px;
            color: #fff;
          }
        }

        .upload-text {
          text-align: center;

          .upload-title {
            font-size: $font-lg;
            color: $text-primary;
            font-weight: 500;
            margin-bottom: $spacing-xs;
            display: block;
          }

          .upload-desc {
            font-size: $font-sm;
            color: $text-placeholder;
            display: block;
          }
        }
      }
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
        color: $primary-color;
        margin-right: $spacing-sm;
      }

      .header-title {
        font-size: $font-lg;
        color: $text-primary;
        font-weight: 600;
      }

      .add-sku-btn {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: $spacing-xs;
        border-radius: $radius-md;
        padding: $spacing-sm $spacing-md;
        font-size: $font-sm;

        :deep(.t-button__text) {
          display: flex;
          align-items: center;
          gap: $spacing-xs;
        }
      }
    }

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

          &.required::after {
            content: '*';
            color: $primary-color;
            margin-left: 2px;
          }
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

        .cost-input-box {
          width: 100%;
          height: 48px;
          display: flex;
          flex-direction: row;
          align-items: center;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: $radius-md;
          background: #fafafa;
          overflow: hidden;
          transition: all 0.3s ease;

          &:focus-within {
            border-color: $primary-color;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.1);
          }

          .cost-prefix {
            flex-shrink: 0;
            width: 40px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: $font-md;
            color: $text-secondary;
            font-weight: 500;
            padding-bottom: 3px;
          }

          .cost-field {
            flex: 1;
            min-width: 0;
            height: 48px;
            width: 100%;
            border: none;
            background: transparent;
            padding: 0 0 0 0px;
            font-size: $font-md;
            color: $text-primary;
            outline: none;
            -webkit-appearance: none;
            -moz-appearance: textfield;
            box-sizing: border-box;

            &::placeholder {
              color: $text-placeholder;
            }

            &:focus {
              border: none;
              box-shadow: none;
              outline: none;
            }

            // 隐藏数字输入框的上下箭头
            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          }
        }

        .picker-wrapper {
          width: 100%;
          height: 48px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: $radius-md;
          background: #fafafa;
          overflow: hidden;
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
  }

  // SKU卡片特殊样式
  .sku-card {
    .sku-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl;
      color: $text-placeholder;

      .empty-icon {
        font-size: 48px;
        margin-bottom: $spacing-md;
        opacity: 0.5;
      }

      .empty-text {
        font-size: $font-sm;
      }
    }

    .sku-grid {
      display: grid;
      gap: $spacing-md;

      .sku-item-card {
        background: #fafafa;
        border-radius: $radius-md;
        padding: $spacing-md;
        border: 1px solid rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;

        &:hover {
          border-color: rgba(255, 87, 34, 0.2);
          background: #fff5f0;
        }

        .sku-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: $spacing-md;

          .sku-number {
            font-size: $font-sm;
            color: $primary-color;
            font-weight: 600;
          }

          .sku-delete-icon {
            font-size: 20px;
            color: $text-placeholder;
            cursor: pointer;
            transition: color 0.3s ease;

            &:hover {
              color: $error-color;
            }
          }
        }

        .sku-form {
          .sku-row {
            display: flex;
            gap: $spacing-md;
            margin-bottom: $spacing-sm;

            &:last-child {
              margin-bottom: 0;
            }

            .sku-field {
              flex: 1;

              .sku-label {
                display: block;
                font-size: $font-xs;
                color: $text-secondary;
                margin-bottom: $spacing-xs;
              }

              .sku-input {
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

              .sku-price-wrapper {
                position: relative;
                display: flex;
                align-items: center;

                .sku-price-prefix {
                  position: absolute;
                  left: $spacing-sm;
                  font-size: $font-xs;
                  color: $primary-color;
                  font-weight: 600;
                }

                .sku-input {
                  padding-left: 28px;
                }
              }
            }
          }
        }
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
      background: linear-gradient(135deg, $primary-color 0%, $primary-light 100%);
      box-shadow: 0 2px 8px rgba(255, 87, 34, 0.3);
      transition: all 0.3s ease;

      :deep(.t-button__text) {
        display: flex;
        align-items: center;
        gap: $spacing-sm;
      }

      &:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 87, 34, 0.4);
      }

      &:disabled {
        opacity: 0.5;
        box-shadow: none;
      }
    }
  }
}
</style>

<style lang="scss">
// 下拉框样式美化（全局样式）
.t-select__dropdown,
.t-popup__content,
.t-select__panel-inner {
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  overflow: hidden !important;
  background: #FFFFFF !important;
}

.t-select-option,
.t-select__option {
  padding: 12px 16px !important;
  font-size: 14px !important;
  color: #333 !important;
  background: #FFFFFF !important;
  transition: all 0.2s ease !important;

  &:hover {
    background: #fff5f0 !important;
    color: #ff5722 !important;
  }

  &.t-is-selected,
  &.t-select__option--selected {
    background: linear-gradient(135deg, rgba(255, 87, 34, 0.1) 0%, rgba(255, 138, 101, 0.1) 100%) !important;
    color: #ff5722 !important;
    font-weight: 500 !important;
  }
}

// 确保下拉面板整体背景为白色
.t-select__panel,
.t-select__list {
  background: #FFFFFF !important;
}

// 加载动画
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>