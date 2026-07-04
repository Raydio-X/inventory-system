<template>
  <div class="page login-page">
    <div class="login-content">
      <!-- Logo -->
      <div class="logo-section">
        <t-icon name="shop" class="logo-icon" />
        <div class="logo-title">服装进销存</div>
        <div class="logo-subtitle">个人服装店管理系统</div>
      </div>

      <!-- 登录表单 -->
      <div class="login-form">
        <div class="form-item">
          <t-icon name="user" class="input-icon" />
          <input
            v-model="username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            @keyup.enter="handleLogin"
          />
        </div>
        <div class="form-item">
          <t-icon name="lock-on" class="input-icon" />
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </div>

        <t-button
          theme="primary"
          block
          size="large"
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </t-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import api from '@/utils/api'

const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    MessagePlugin.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    })

    if (res.success && res.data) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      MessagePlugin.success('登录成功')
      router.push('/')
    } else {
      MessagePlugin.error(res.message || '登录失败')
    }
  } catch (err) {
    MessagePlugin.error(err.message || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, $primary-color, $primary-light);

  .login-content {
    width: 100%;
    max-width: 320px;
    padding: $spacing-xl;

    .logo-section {
      text-align: center;
      color: white;
      margin-bottom: $spacing-xxl;

      .logo-icon {
        font-size: 64px;
        margin-bottom: $spacing-lg;
      }

      .logo-title {
        font-size: $font-xxl;
        font-weight: 700;
        margin-bottom: $spacing-sm;
      }

      .logo-subtitle {
        font-size: $font-sm;
        opacity: 0.9;
      }
    }

    .login-form {
      background: $bg-white;
      border-radius: $radius-xl;
      padding: $spacing-xl;

      .form-item {
        display: flex;
        align-items: center;
        background: $bg-color;
        border-radius: $radius-md;
        margin-bottom: $spacing-lg;

        .input-icon {
          font-size: 20px;
          color: $text-placeholder;
          margin-left: $spacing-md;
        }

        .form-input {
          flex: 1;
          height: 48px;
          padding: $spacing-md;
          border: none;
          background: transparent;
          font-size: $font-md;

          &:focus {
            outline: none;
          }

          &::placeholder {
            color: $text-placeholder;
          }
        }
      }
    }
  }
}
</style>
