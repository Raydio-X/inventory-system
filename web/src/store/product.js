import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

// 商品管理 Store
export const useProductStore = defineStore('product', () => {
  // 商品列表
  const products = ref([])

  // 分类列表（男装类型）
  const categories = ref([
    { id: 1, name: '羽绒服' },
    { id: 2, name: '毛衣' },
    { id: 3, name: '外套' },
    { id: 4, name: '衬衫' },
    { id: 5, name: 'T恤' },
    { id: 9, name: '卫衣' },
    { id: 10, name: '夹克' }
  ])

  // 品牌列表
  const brands = ref([
    { id: 1, name: '品牌A' },
    { id: 2, name: '品牌B' },
    { id: 3, name: '品牌C' }
  ])

  // 颜色列表
  const colors = ref(['黑色', '白色', '灰色', '红色', '蓝色', '绿色', '黄色', '粉色', '紫色', '棕色'])

  // 尺码组
  const sizeGroups = ref([
    { id: 1, name: '标准尺码', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    { id: 2, name: '数字尺码', sizes: ['26', '27', '28', '29', '30', '31', '32'] },
    { id: 3, name: '童装尺码', sizes: ['100', '110', '120', '130', '140', '150'] }
  ])

  // 当前选中的商品（用于开单）
  const selectedProduct = ref(null)

  // 搜索关键词
  const searchKeyword = ref('')

  // 筛选后的商品列表
  const filteredProducts = computed(() => {
    if (!searchKeyword.value) return products.value
    const keyword = searchKeyword.value.toLowerCase()
    return products.value.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.brand?.toLowerCase().includes(keyword)
    )
  })

  // 从后端加载商品列表
  const fetchProducts = async () => {
    const res = await api.get('/products')
    products.value = res.data
  }

  // 从后端加载单个商品详情
  const fetchProduct = async (id) => {
    const res = await api.get(`/products/${id}`)
    return res.data
  }

  // 初始化数据
  const initData = async () => {
    try {
      await fetchProducts()
    } catch (error) {
      throw error
    }
  }

  // 添加商品
  const addProduct = async (product) => {
    try {
      await api.post('/products', product)
      await fetchProducts()
    } catch (error) {
      throw error
    }
  }

  // 更新商品
  const updateProduct = async (id, data) => {
    try {
      await api.put(`/products/${id}`, data)
      await fetchProducts()
    } catch (error) {
      throw error
    }
  }

  // 删除商品（软删除）
  const deleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`)
      await fetchProducts()
    } catch (error) {
      throw error
    }
  }

  // 更新 SKU 库存
  const updateSkuStock = async (productId, skuId, quantityDelta) => {
    try {
      await api.put(`/products/${productId}/skus/${skuId}/stock`, { quantityDelta })
    } catch (error) {
      throw error
    }
  }

  // 获取 SKU 信息（前端本地查找）
  const getSku = (skuId) => {
    const product = products.value.find(p => p.skus?.some(s => s.id === skuId))
    if (product) {
      return product.skus.find(s => s.id === skuId)
    }
    return null
  }

  // 设置选中的商品
  const setSelectedProduct = (product) => {
    selectedProduct.value = product
  }

  // 设置搜索关键词
  const setSearchKeyword = (keyword) => {
    searchKeyword.value = keyword
  }

  return {
    products,
    categories,
    brands,
    colors,
    sizeGroups,
    selectedProduct,
    searchKeyword,
    filteredProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateSkuStock,
    getSku,
    fetchProduct,
    fetchProducts,
    setSelectedProduct,
    setSearchKeyword,
    initData
  }
})
