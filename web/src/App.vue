<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <keep-alive :include="cachedPages">
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 底部导航-->
    <div v-if="showTabBar" class="tab-bar-container">
      <div class="tab-bar">
        <div
          v-for="item in tabItems"
          :key="item.value"
          :class="['tab-item', { active: activeTab === item.value, special: item.value === 'billing' }]"
          @click="onTabChange(item.value)"
        >
          <div v-if="item.value === 'billing'" class="billing-btn">
            <t-icon name="add" class="billing-icon" />
          </div>
          <t-icon v-else :name="item.icon" class="tab-icon" />
          <span class="tab-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()

// 需要缓存的页面
const cachedPages = ['Home', 'Products', 'Customers']

// 底部导航配置
const tabItems = [
  { value: 'home', label: '首页', icon: 'home' },
  { value: 'products', label: '商品', icon: 'shop' },
  { value: 'billing', label: '开单', icon: 'add-circle' },
  { value: 'customers', label: '客户', icon: 'user' },
  { value: 'mine', label: '我的', icon: 'user-circle' }
]

// 当前激活的 tab
const activeTab = computed(() => {
  const path = route.path
  if (path.startsWith('/products')) return 'products'
  if (path.startsWith('/billing')) return 'billing'
  if (path.startsWith('/customers')) return 'customers'
  if (path.startsWith('/mine')) return 'mine'
  if (path.startsWith('/debt')) return 'home'
  if (path.startsWith('/accounts')) return 'home'
  if (path.startsWith('/inventory')) return 'home'
  if (path.startsWith('/suppliers')) return 'home'
  return 'home'
})

// 是否显示底部导航
const showTabBar = computed(() => {
  const hiddenRoutes = [
    '/billing/cart',
    '/billing/checkout',
    '/billing/success',
    '/products/add',
    '/inventory/check',
    '/accounts/record',
    '/mine/settings',
    '/login'
  ]
  return !hiddenRoutes.some(p => route.path.startsWith(p)) && !route.meta.hideTabBar
})

// Tab 切换
const onTabChange = (value) => {
  const routeMap = {
    home: '/',
    products: '/products',
    billing: '/billing',
    customers: '/customers',
    mine: '/mine'
  }
  router.push(routeMap[value])
}
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background-color: $bg-color;
}

.tab-bar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $bg-white;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);

  .tab-bar {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 50px;
    padding-bottom: $safe-area-bottom;

    .tab-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50px;
      cursor: pointer;
      transition: all 0.2s;

      .tab-icon {
        font-size: 22px;
        color: $text-secondary;
        margin-bottom: 2px;
      }

      .tab-label {
        font-size: $font-xs;
        color: $text-secondary;
      }

      &.active {
        .tab-icon {
          color: $primary-color;
        }

        .tab-label {
          color: $primary-color;
        }
      }

      &.special {
        position: relative;

        .billing-btn {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, $primary-color, $primary-light);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -20px;
          box-shadow: 0 4px 12px rgba($primary-color, 0.4);

          .billing-icon {
            font-size: 24px;
            color: white;
          }
        }

        .tab-label {
          margin-top: 4px;
          color: $primary-color;
        }
      }
    }
  }
}
</style>

