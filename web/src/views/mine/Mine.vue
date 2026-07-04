<template>
  <div class="page mine-page">
    <!-- 用户信息 -->
    <div class="user-card">
      <div class="user-avatar">
        <t-icon name="user-circle" />
      </div>
      <div class="user-info">
        <div class="user-name">店主</div>
        <div class="user-phone">138****8888</div>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="logout-section" @click="showLogoutDialog">
      <t-icon name="logout" />
      <span>退出登录</span>
    </div>

    <!-- 退出登录确认弹窗 -->
    <t-dialog
      v-model:visible="logoutDialogVisible"
      :header="null"
      :close-btn="false"
      :footer="false"
      class="logout-dialog"
      placement="center"
    >
      <div class="logout-confirm">
        <div class="logout-icon-wrap">
          <t-icon name="error-circle" class="logout-icon" />
        </div>
        <div class="logout-text">确定要退出登录吗？</div>
        <div class="logout-warning">退出后将需要重新登录</div>
        <div class="logout-footer">
          <t-button variant="outline" @click="logoutDialogVisible = false" :disabled="logoutLoading">取消</t-button>
          <t-button theme="danger" @click="confirmLogout" :loading="logoutLoading">确认退出</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 版本信息 -->
    <div class="version-info">
      <span>服装进销存系统 v1.0.0</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon, Dialog, Button, MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()

const goTo = (path) => {
  router.push(path)
}

const logoutDialogVisible = ref(false)
const logoutLoading = ref(false)

const showLogoutDialog = () => {
  logoutDialogVisible.value = true
}

const confirmLogout = () => {
  logoutLoading.value = true
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  MessagePlugin.success('已退出登录')
  setTimeout(() => {
    router.push('/login')
    logoutDialogVisible.value = false
    logoutLoading.value = false
  }, 500)
}
</script>

<style lang="scss" scoped>
.mine-page {
  .user-card {
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: white;
    padding: $spacing-xl;
    border-radius: $radius-lg;
    margin-bottom: $spacing-xl;

    .user-avatar {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(white, 0.2);
      border-radius: 32px;
      margin-right: $spacing-lg;

      .t-icon {
        font-size: 32px;
      }
    }

    .user-info {
      .user-name {
        font-size: $font-xl;
        font-weight: 600;
      }

      .user-phone {
        font-size: $font-sm;
        opacity: 0.9;
      }
    }
  }

  .menu-list {
    .menu-group {
      background: $bg-card;
      border-radius: $radius-lg;
      margin-bottom: $spacing-lg;

      .menu-item {
        display: flex;
        align-items: center;
        padding: $spacing-lg;
        border-bottom: 1px solid $border-light;

        &:last-child {
          border-bottom: none;
        }

        &:active {
          background: $bg-hover;
        }

        .menu-icon {
          font-size: 20px;
          color: $primary-color;
          margin-right: $spacing-md;
        }

        .menu-label {
          flex: 1;
          font-size: $font-md;
          color: $text-primary;
        }

        .menu-arrow {
          color: $text-placeholder;
        }
      }
    }
  }

  .logout-section {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #e34d59;
    font-size: $font-md;
    padding: $spacing-lg 0;
    margin-top: $spacing-xl;
    cursor: pointer;

    .t-icon {
      font-size: 18px;
    }
  }

  .logout-confirm {
    text-align: center;

    .logout-icon-wrap {
      margin-bottom: 12px;

      .logout-icon {
        font-size: 48px;
        color: $warning-color;
      }
    }

    .logout-text {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 16px;
    }

    .logout-warning {
      font-size: 13px;
      color: $error-color;
      margin-bottom: 20px;
    }

    .logout-footer {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
  }

  .version-info {
    text-align: center;
    padding: $spacing-xl;
    font-size: $font-xs;
    color: $text-placeholder;
  }
}
</style>

<style lang="scss">
/* 弹窗响应式适配 */
.logout-dialog {
  width: 320px !important;

  @media (max-width: 480px) {
    width: 280px !important;
  }
}
</style>

