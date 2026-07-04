<template>
  <div class="navbar-container">
    <div class="navbar">
      <div class="navbar-left" @click="goBack">
        <t-icon name="chevron-left" class="back-icon" />
        <span class="back-text">返回</span>
      </div>
      <div class="navbar-title">{{ title }}</div>
      <div class="navbar-right">
        <slot name="right"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Icon } from 'tdesign-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: ''
  }
})

const router = useRouter()

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.navbar-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: $bg-white;
  z-index: 99;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .navbar {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 $spacing-lg;
    padding-top: $safe-area-top;

    .navbar-left {
      display: flex;
      align-items: center;
      cursor: pointer;
      min-width: 60px;

      .back-icon {
        font-size: 20px;
        color: $text-primary;
      }

      .back-text {
        font-size: $font-sm;
        color: $text-primary;
        margin-left: $spacing-xs;
      }

      &:active {
        opacity: 0.7;
      }
    }

    .navbar-title {
      flex: 1;
      text-align: center;
      font-size: $font-md;
      font-weight: 600;
      color: $text-primary;
    }

    .navbar-right {
      min-width: 60px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
  }
}
</style>

