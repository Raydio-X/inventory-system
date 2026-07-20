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
          <label class="form-label">{{ isEditMode ? '平均成本' : '成本' }}</label>
          <div class="cost-input-box">
            <span class="cost-prefix">¥</span>
            <input
              v-model.number="product.costPrice"
              type="number"
              class="cost-field"
              :class="{ 'input-disabled': isEditMode }"
              :disabled="isEditMode"
              :placeholder="isEditMode ? '（基于采购订单计算）' : '请输入成本价'"
            />
          </div>
          <span v-if="isEditMode" class="field-hint">成本由采购订单自动计算，不可修改</span>
        </div>

        <div class="form-item">
          <label class="form-label required">售价</label>
          <div class="cost-input-box">
            <span class="cost-prefix">¥</span>
            <input
              v-model.number="product.price"
              type="number"
              class="cost-field"
              placeholder="请输入售价"
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
      </div>

      <div v-if="product.skus.length === 0" class="sku-empty">
        <t-icon name="inbox" class="empty-icon" />
        <span class="empty-text">暂无规格</span>
        <div class="sku-empty-actions">
          <t-button
            theme="primary"
            size="small"
            variant="outline"
            class="sku-add-btn"
            @click="addSku"
          >
            <template #icon><t-icon name="add" /></template>
            添加规格
          </t-button>
          <t-button
            theme="warning"
            size="small"
            variant="outline"
            class="sku-add-btn"
            @click="openBatchAddDialog"
          >
            <template #icon><t-icon name="add-circle" /></template>
            批量添加
          </t-button>
        </div>
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
              @click="confirmRemoveSku(index)"
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

              <div class="sku-field">
                <label class="sku-label">库存</label>
                <input
                  v-model.number="sku.stock"
                  type="number"
                  class="sku-input"
                  placeholder="请输入库存"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 添加规格按钮 - 固定在所有规格项下方，仅显示一次 -->
        <div class="sku-add-row">
          <t-button
            theme="primary"
            size="small"
            variant="outline"
            class="sku-add-btn"
            @click="addSku"
          >
            <template #icon><t-icon name="add" /></template>
            添加规格
          </t-button>
          <t-button
            theme="warning"
            size="small"
            variant="outline"
            class="sku-add-btn"
            @click="openBatchAddDialog"
          >
            <template #icon><t-icon name="add-circle" /></template>
            批量添加
          </t-button>
        </div>
      </div>
    </div>

    <!-- 批量添加规格弹窗 -->
    <t-dialog
      v-model:visible="showBatchAddDialog"
      header="批量添加规格"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="420px"
      class="batch-add-dialog"
    >
      <div class="batch-add-content">
        <div class="batch-field">
          <label class="batch-label">颜色</label>
          <input
            v-model="batchData.color"
            type="text"
            class="batch-input"
            placeholder="如：白色"
          />
        </div>

        <div class="batch-field">
          <label class="batch-label">尺码（多个用逗号分隔）</label>
          <input
            v-model="batchData.sizes"
            type="text"
            class="batch-input"
            placeholder="如：S, M, L, XL"
          />
          <span class="batch-hint">例如输入 S, M, L, XL 将生成4条规格</span>
        </div>

        <div class="batch-field">
          <label class="batch-label">库存</label>
          <input
            v-model.number="batchData.stock"
            type="number"
            class="batch-input"
            placeholder="请输入库存"
          />
        </div>

        <div class="batch-preview" v-if="batchPreview.length > 0">
          <div class="batch-preview-title">将添加以下规格：</div>
          <div class="batch-preview-list">
            <span v-for="(item, index) in batchPreview" :key="index" class="batch-preview-item">
              {{ item.color }}/{{ item.size }}
            </span>
          </div>
        </div>

        <div class="batch-actions">
          <t-button theme="default" size="large" @click="showBatchAddDialog = false">取消</t-button>
          <t-button theme="primary" size="large" :disabled="batchPreview.length === 0" @click="confirmBatchAdd">
            确认添加
          </t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 删除规格确认弹窗 -->
    <t-dialog
      v-model:visible="showDeleteSkuDialog"
      header="确认删除"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="480px"
      class="delete-sku-dialog"
    >
      <div class="delete-sku-container">
        <div class="delete-sku-body">
          <t-icon name="error-circle" class="delete-sku-icon" />
          <p>确定要删除规格 {{ deleteSkuIndex + 1 }} 吗？</p>
          <p class="delete-sku-warning">删除后无法恢复</p>
        </div>
        <div class="delete-sku-footer">
          <t-button theme="default" size="large" @click="showDeleteSkuDialog = false">取消</t-button>
          <t-button theme="danger" size="large" @click="removeSku">确认删除</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 确认创建商品弹窗 -->
    <t-dialog
      v-model:visible="showConfirmDialog"
      :header="null"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="380px"
      class="confirm-dialog"
    >
      <div class="confirm-dialog-container">
        <div class="confirm-dialog-body">
          <t-icon name="file-add" class="confirm-dialog-icon" />
          <p class="confirm-dialog-title">确认创建商品？</p>
          <p class="confirm-dialog-hint">点击确认后将保存商品信息</p>
        </div>
        <div class="confirm-dialog-footer">
          <t-button theme="default" size="large" @click="showConfirmDialog = false">取消</t-button>
          <t-button theme="primary" size="large" :loading="saving" @click="confirmSaveProduct">确认创建</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 创建采购单弹窗（必填流程） -->
    <t-dialog
      v-model:visible="showPurchaseDialog"
      :header="null"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="480px"
      class="purchase-dialog"
    >
      <div class="purchase-dialog-container">
        <div class="purchase-dialog-header">
          <t-icon name="cart" class="purchase-dialog-icon" />
          <span class="purchase-dialog-title">创建采购订单</span>
        </div>
        <div class="purchase-dialog-body">
          <p class="purchase-dialog-tip">新商品已创建成功，请填写采购信息完成入库流程</p>
          
          <div class="purchase-form">
            <div class="purchase-form-item">
              <label class="purchase-form-label">供应商 <span class="required">*</span></label>
              <t-select
                v-model="purchaseForm.supplierId"
                :options="supplierOptions"
                placeholder="请选择供应商"
                clearable
                class="purchase-form-select"
              />
            </div>
            
            <div class="purchase-form-item">
              <label class="purchase-form-label">采购明细</label>
              <div class="purchase-detail-list">
                <div v-for="(sku, index) in product.skus" :key="index" class="purchase-detail-item">
                  <span class="purchase-detail-spec">{{ sku.color }} / {{ sku.size }}</span>
                  <span class="purchase-detail-stock">库存: {{ sku.stock || 0 }}件</span>
                </div>
              </div>
            </div>
            
            <div class="purchase-form-item">
              <label class="purchase-form-label">备注</label>
              <textarea
                v-model="purchaseForm.remark"
                class="purchase-form-remark"
                placeholder="请输入备注信息（选填）"
                rows="2"
              ></textarea>
            </div>
          </div>
        </div>
        <div class="purchase-dialog-footer">
          <t-button theme="default" size="large" @click="cancelPurchase">取消</t-button>
          <t-button theme="primary" size="large" :disabled="!purchaseForm.supplierId" :loading="submitting" @click="submitPurchase">提交</t-button>
        </div>
      </div>
    </t-dialog>

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
import { Select, Button, Icon, MessagePlugin, Dialog } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'
import { useProductStore } from '@/store/product'
import api from '@/utils/api'

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
  costPrice: null,
  price: null,
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
  product.value.name && product.value.price > 0 && product.value.skus.length > 0 &&
  product.value.skus.every(sku => sku.color && sku.size)
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
    const response = await api.post('/upload/product-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.success) {
      // 设置图片URL（使用相对路径，由nginx代理）
      productImage.value = response.data.url
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
    stock: null
  })
}

// 删除规格确认
const showDeleteSkuDialog = ref(false)
const deleteSkuIndex = ref(-1)

const confirmRemoveSku = (index) => {
  deleteSkuIndex.value = index
  showDeleteSkuDialog.value = true
}

const removeSku = () => {
  if (deleteSkuIndex.value >= 0) {
    product.value.skus.splice(deleteSkuIndex.value, 1)
    deleteSkuIndex.value = -1
    showDeleteSkuDialog.value = false
  }
}

// 批量添加规格
const showBatchAddDialog = ref(false)
const batchData = ref({
  color: '',
  sizes: '',
  stock: null
})

// 批量添加预览（计算属性）
const batchPreview = computed(() => {
  const color = batchData.value.color?.trim()
  const sizesStr = batchData.value.sizes?.trim()

  if (!color || !sizesStr) return []

  // 解析尺码（支持逗号、空格分隔）
  const sizes = sizesStr.split(/[,，\s]+/).map(s => s.trim()).filter(s => s)

  return sizes.map(size => ({
    color,
    size,
    stock: batchData.value.stock || null
  }))
})

// 打开批量添加弹窗
const openBatchAddDialog = () => {
  batchData.value = {
    color: '',
    sizes: '',
    stock: null
  }
  showBatchAddDialog.value = true
}

// 确认批量添加
const confirmBatchAdd = () => {
  if (batchPreview.value.length === 0) return

  // 批量添加到 SKU 列表
  batchPreview.value.forEach(sku => {
    product.value.skus.push({
      color: sku.color,
      size: sku.size,
      stock: sku.stock
    })
  })

  MessagePlugin.success(`已添加 ${batchPreview.value.length} 条规格`)
  showBatchAddDialog.value = false
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
        price: productData.price || 0,
        costPrice: productData.costPrice || 0,
        categoryId: productData.category ? Number(productData.category) : null,
        supplierId: productData.supplierId || null,
        skus: productData.skus ? productData.skus.map(sku => ({
          id: sku.id,
          color: sku.color,
          size: sku.size,
          stock: sku.stock
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

// ========== 两步弹窗流程 ==========

// 确认创建商品弹窗
const showConfirmDialog = ref(false)
const saving = ref(false)

// 创建采购单弹窗
const showPurchaseDialog = ref(false)
const submitting = ref(false)
const savedProductId = ref(null)

// 采购表单
const purchaseForm = ref({
  supplierId: null,
  remark: ''
})

// 点击保存按钮 -> 显示确认弹窗
const saveProduct = () => {
  // 前端表单验证
  if (!product.value.name || !product.value.name.trim()) {
    MessagePlugin.warning('请输入商品名称')
    return
  }
  if (!product.value.price || product.value.price <= 0) {
    MessagePlugin.warning('请输入商品售价')
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
  }

  // 编辑模式直接保存
  if (isEditMode.value) {
    doUpdateProduct()
    return
  }

  // 新建模式 -> 显示确认弹窗
  showConfirmDialog.value = true
}

// 确认创建商品 -> 保存商品 -> 显示采购单弹窗
const confirmSaveProduct = async () => {
  saving.value = true

  try {
    // 构建商品数据
    const productData = {
      name: product.value.name.trim(),
      category: product.value.categoryId || null,
      supplierId: product.value.supplierId || null,
      image: productImage.value || '',
      price: product.value.price || 0,
      costPrice: product.value.costPrice || 0,
      skus: product.value.skus.map(sku => ({
        id: sku.id || undefined,
        color: sku.color.trim(),
        size: sku.size.trim(),
        stock: sku.stock || 0
      }))
    }

    await productStore.addProduct(productData)
    MessagePlugin.success('商品创建成功')

    // 关闭确认弹窗
    showConfirmDialog.value = false
    saving.value = false

    // 获取新建商品的ID
    const newProduct = productStore.products.find(p => p.name === productData.name)
    if (newProduct) {
      savedProductId.value = newProduct.id
      // 预设供应商
      purchaseForm.value.supplierId = product.value.supplierId || null
      purchaseForm.value.remark = ''
      // 显示采购单弹窗
      showPurchaseDialog.value = true
    } else {
      router.push('/products')
    }
  } catch (error) {
    console.error('保存失败:', error)
    MessagePlugin.error(error.message || '商品保存失败')
    saving.value = false
  }
}

// 编辑模式更新商品
const doUpdateProduct = async () => {
  try {
    const productData = {
      name: product.value.name.trim(),
      category: product.value.categoryId || null,
      supplierId: product.value.supplierId || null,
      image: productImage.value || '',
      price: product.value.price || 0,
      costPrice: product.value.costPrice || 0,
      skus: product.value.skus.map(sku => ({
        id: sku.id || undefined,
        color: sku.color.trim(),
        size: sku.size.trim(),
        stock: sku.stock || 0
      }))
    }

    await productStore.updateProduct(productId.value, productData)
    MessagePlugin.success('商品更新成功')
    router.push('/products')
  } catch (error) {
    console.error('更新失败:', error)
    MessagePlugin.error(error.message || '商品更新失败')
  }
}

// 取消创建采购单 -> 删除已创建的商品，返回商品列表
const cancelPurchase = async () => {
  // 如果有已保存的商品，删除它
  if (savedProductId.value) {
    try {
      await productStore.deleteProduct(savedProductId.value)
      MessagePlugin.info('已取消创建采购订单，商品未保存')
    } catch (error) {
      console.error('删除商品失败:', error)
      MessagePlugin.warning('取消采购订单成功，但商品删除失败，请手动删除')
    }
  } else {
    MessagePlugin.info('已取消创建采购订单')
  }
  
  showPurchaseDialog.value = false
  router.push('/products')
}

// 提交采购订单
const submitPurchase = async () => {
  if (!purchaseForm.value.supplierId) {
    MessagePlugin.warning('请选择供应商')
    return
  }

  submitting.value = true

  try {
    // 构建采购订单数据
    const newProduct = productStore.products.find(p => p.id === savedProductId.value)
    if (!newProduct) {
      throw new Error('找不到新创建的商品')
    }

    const items = product.value.skus.map(sku => {
      const newSku = newProduct.skus?.find(s => s.color === sku.color.trim() && s.size === sku.size.trim())
      return {
        productId: savedProductId.value,
        skuId: newSku?.id || null,
        productName: product.value.name,
        color: sku.color,
        size: sku.size,
        quantity: sku.stock || 0,
        costPrice: product.value.costPrice || 0  // 使用商品成本价，而不是SKU售价
      }
    }).filter(item => item.quantity > 0)

    // 获取供应商名称
    const supplier = suppliers.value.find(s => s.id === purchaseForm.value.supplierId)

    const orderData = {
      supplierId: purchaseForm.value.supplierId,
      supplier: supplier?.name || '',
      items,
      remark: purchaseForm.value.remark || '',
      isNewProduct: true // 标识为新商品入库，自动完成入库操作
    }

    await api.post('/purchases', orderData)
    
    showPurchaseDialog.value = false
    MessagePlugin.success('采购订单创建成功，已自动入库')
    router.push('/products')
  } catch (error) {
    console.error('创建采购订单失败:', error)
    MessagePlugin.error(error.message || '创建采购订单失败')
  } finally {
    submitting.value = false
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

            // 禁用状态样式
            &.input-disabled {
              cursor: not-allowed;
              color: $text-secondary;
              background: transparent;
            }
          }
        }

        // 字段提示文字
        .field-hint {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: $text-placeholder;
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
        margin-bottom: $spacing-md;
      }

      .sku-empty-actions {
        display: flex;
        gap: $spacing-lg;

        .sku-add-btn {
          border-radius: $radius-md;
        }
      }
    }

    .sku-grid {
      display: flex;
      flex-direction: column;
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

      // 添加规格按钮 - 位于所有规格项下方
      .sku-add-row {
        display: flex;
        justify-content: center;
        gap: $spacing-lg;
        padding: $spacing-md 0;

        .sku-add-btn {
          border-radius: $radius-md;
          padding: $spacing-sm $spacing-lg;
          font-size: $font-md;
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

  // 批量添加规格弹窗
  .batch-add-dialog {
    :deep(.t-dialog__content) {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: 0;
    }

    :deep(.t-dialog__header) {
      padding: $spacing-md $spacing-lg;
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      border-bottom: 1px solid $border-light;
    }

    :deep(.t-dialog__body) {
      padding: 0;
    }

    :deep(.t-dialog__close) {
      display: none;
    }
  }

  .batch-add-content {
    padding: $spacing-lg;

    .batch-field {
      margin-bottom: $spacing-md;

      .batch-label {
        display: block;
        font-size: $font-sm;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      .batch-input {
        width: 100%;
        height: 40px;
        padding: 0 $spacing-sm;
        border: 1px solid $border-color;
        border-radius: $radius-sm;
        font-size: $font-md;
        color: $text-primary;
        background: $bg-white;
        outline: none;
        transition: border-color 0.2s;

        &:focus {
          border-color: $primary-color;
        }

        &::placeholder {
          color: $text-placeholder;
        }
      }

      .batch-hint {
        display: block;
        font-size: $font-xs;
        color: $text-placeholder;
        margin-top: 4px;
      }
    }

    .batch-row {
      display: flex;
      gap: $spacing-md;

      .batch-field-half {
        flex: 1;
      }
    }

    .batch-price-wrapper {
      display: flex;
      align-items: center;
      border: 1px solid $border-color;
      border-radius: $radius-sm;
      background: $bg-white;
      overflow: hidden;

      .batch-price-prefix {
        padding: 0 $spacing-sm;
        color: $text-secondary;
        font-size: $font-md;
      }

      .batch-input {
        border: none;
        border-radius: 0;
      }
    }

    .batch-preview {
      margin-top: $spacing-md;
      padding: $spacing-sm $spacing-md;
      background: rgba($primary-color, 0.05);
      border-radius: $radius-sm;

      .batch-preview-title {
        font-size: $font-xs;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      .batch-preview-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .batch-preview-item {
        display: inline-block;
        padding: 4px 8px;
        background: $bg-white;
        border-radius: $radius-sm;
        font-size: $font-xs;
        color: $primary-color;
      }
    }

    .batch-actions {
      display: flex;
      gap: $spacing-sm;
      margin-top: $spacing-lg;

      .t-button {
        flex: 1;
      }
    }
  }

  // 删除规格确认弹窗
  .delete-sku-dialog {
    :deep(.t-dialog__content) {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: 0;
    }

    :deep(.t-dialog__header) {
      padding: $spacing-md $spacing-lg;
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
      border-bottom: 1px solid $border-light;
    }

    :deep(.t-dialog__body) {
      padding: 0;
    }

    :deep(.t-dialog__close) {
      display: none;
    }
  }

  .delete-sku-container {
    width: 100%;

    .delete-sku-body {
      text-align: center;
      padding: $spacing-lg;

      .delete-sku-icon {
        font-size: 40px;
        color: $error-color;
        margin-bottom: $spacing-md;
      }

      p {
        font-size: $font-md;
        color: $text-primary;
        margin-bottom: $spacing-xs;
      }

      .delete-sku-warning {
        font-size: $font-sm;
        color: $text-placeholder;
      }
    }

    .delete-sku-footer {
      display: flex;
      gap: $spacing-md;
      padding: $spacing-md $spacing-lg;

      .t-button {
        flex: 1;
        border-radius: $radius-md;
      }
    }
  }

  // 确认创建商品弹窗
  .confirm-dialog {
    :deep(.t-dialog__content) {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: 0;
    }

    :deep(.t-dialog__body) {
      padding: 0;
    }

    :deep(.t-dialog__close) {
      display: none;
    }
  }

  .confirm-dialog-container {
    width: 100%;

    .confirm-dialog-body {
      text-align: center;
      padding: 24px 20px 16px;

      .confirm-dialog-icon {
        font-size: 40px;
        color: $primary-color;
        margin-bottom: 12px;
      }

      .confirm-dialog-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 6px;
      }

      .confirm-dialog-hint {
        font-size: 13px;
        color: $text-secondary;
      }
    }

    .confirm-dialog-footer {
      display: flex;
      gap: 12px;
      padding: 0 20px 16px;

      .t-button {
        flex: 1;
        border-radius: 8px;
      }
    }
  }

  // 创建采购单弹窗（必填流程）
  .purchase-dialog {
    :deep(.t-dialog__content) {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: 0;
    }

    :deep(.t-dialog__body) {
      padding: 0;
    }

    :deep(.t-dialog__close) {
      display: none;
    }
  }

  .purchase-dialog-container {
    width: 100%;

    .purchase-dialog-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 20px;
      border-bottom: 1px solid $border-lighter;

      .purchase-dialog-icon {
        font-size: 20px;
        color: $warning-color;
      }

      .purchase-dialog-title {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
      }
    }

    .purchase-dialog-body {
      padding: 16px 20px;

      .purchase-dialog-tip {
        font-size: 13px;
        color: $text-secondary;
        margin-bottom: 16px;
        text-align: center;
      }

      .purchase-form {
        .purchase-form-item {
          margin-bottom: 12px;

          .purchase-form-label {
            display: block;
            font-size: 13px;
            color: $text-secondary;
            margin-bottom: 6px;

            .required {
              color: $error-color;
              margin-left: 2px;
            }
          }

          .purchase-form-select {
            width: 100%;
          }

          .purchase-form-remark {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid $border-color;
            border-radius: 6px;
            font-size: 14px;
            color: $text-primary;
            resize: none;
            outline: none;

            &:focus {
              border-color: $primary-color;
            }

            &::placeholder {
              color: $text-placeholder;
            }
          }

          .purchase-detail-list {
            background: $bg-color;
            border-radius: 6px;
            padding: 8px 12px;
            max-height: 120px;
            overflow-y: auto;

            .purchase-detail-item {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 13px;

              .purchase-detail-spec {
                color: $text-primary;
              }

              .purchase-detail-stock {
                color: $text-secondary;
              }
            }
          }
        }
      }
    }

    .purchase-dialog-footer {
      display: flex;
      gap: 12px;
      padding: 12px 20px 16px;

      .t-button {
        flex: 1;
        border-radius: 8px;
      }
    }
  }

  // 移动端适配
  @media (max-width: 480px) {
    .delete-sku-dialog {
      :deep(.t-dialog__content) {
        width: calc(100vw - 48px) !important;
        max-width: calc(100vw - 48px) !important;
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