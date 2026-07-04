<template>
  <div class="page page-with-navbar settings-page">
    <!-- 顶部导航栏 -->
    <navbar title="系统设置" />

    <!-- 设置列表 -->
    <div class="settings-list">
      <div class="settings-group">
        <div class="settings-item">
          <span class="item-label">店铺名称</span>
          <input v-model="settings.shopName" type="text" class="item-input" />
        </div>
        <div class="settings-item">
          <span class="item-label">联系电话</span>
          <input v-model="settings.phone" type="tel" class="item-input" />
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-item">
          <span class="item-label">库存预警阈值</span>
          <input v-model.number="settings.stockWarning" type="number" class="item-input" />
        </div>
        <div class="settings-item">
          <span class="item-label">默认折扣</span>
          <input v-model.number="settings.defaultDiscount" type="number" class="item-input" />
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-item">
          <span class="item-label">数据自动备份</span>
          <t-switch v-model="settings.autoBackup" />
        </div>
        <div class="settings-item">
          <span class="item-label">备份周期</span>
          <div class="backup-period-select" @click="showBackupPicker = true">
            <span class="period-value">{{ backupPeriodLabel }}</span>
            <t-icon name="chevron-right" class="select-arrow" />
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <t-button theme="primary" block @click="saveSettings">保存设置</t-button>
    </div>

    <!-- 备份周期选择弹窗 -->
    <t-popup
      v-model:visible="showBackupPicker"
      placement="bottom"
    >
      <div class="popup-container backup-popup">
        <div class="popup-header">
          <span class="popup-title">选择备份周期</span>
          <div class="popup-close" @click="showBackupPicker = false">
            <t-icon name="close" />
          </div>
        </div>
        <div class="backup-list">
          <div
            v-for="item in backupPeriodList"
            :key="item.value"
            :class="['backup-item', { active: settings.backupPeriod === item.value }]"
            @click="selectBackupPeriod(item)"
          >
            <span>{{ item.label }}</span>
            <t-icon v-if="settings.backupPeriod === item.value" name="check" class="check-icon" />
          </div>
        </div>
      </div>
    </t-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Popup, Switch, MessagePlugin } from 'tdesign-vue-next'
import Navbar from '@/components/Navbar.vue'

const router = useRouter()

const settings = ref({
  shopName: '我的服装店',
  phone: '13888888888',
  stockWarning: 5,
  defaultDiscount: 100,
  autoBackup: false,
  backupPeriod: 'daily'
})

const showBackupPicker = ref(false)

const backupPeriodList = [
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
]

const backupPeriodLabel = computed(() => {
  const item = backupPeriodList.find(p => p.value === settings.value.backupPeriod)
  return item?.label || '每天'
})

const selectBackupPeriod = (item) => {
  settings.value.backupPeriod = item.value
  showBackupPicker.value = false
}

const saveSettings = () => {
  MessagePlugin.success('设置已保存')
  router.push('/mine')
}
</script>

<style lang="scss" scoped>
.settings-page {
  .settings-list {
    .settings-group {
      background: $bg-card;
      border-radius: $radius-lg;
      margin-bottom: $spacing-lg;

      .settings-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: $spacing-lg;
        border-bottom: 1px solid $border-light;

        &:last-child {
          border-bottom: none;
        }

        .item-label {
          font-size: $font-sm;
          color: $text-primary;
        }

        .item-input {
          width: 150px;
          height: 36px;
          padding: $spacing-sm;
          border: 1px solid $border-color;
          border-radius: $radius-sm;
          font-size: $font-sm;
          text-align: right;

          &:focus {
            border-color: $primary-color;
            outline: none;
          }
        }
      }
    }
  }

  .action-section {
    padding: $spacing-lg;
  }

  .backup-period-select {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .period-value {
      font-size: $font-sm;
      color: $primary-color;
    }

    .select-arrow {
      font-size: 16px;
      color: $text-placeholder;
    }
  }

  .backup-popup {
    background: $bg-white;
    border-radius: $radius-xl $radius-xl 0 0;
    padding: $spacing-lg;

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-md;

      .popup-title {
        font-size: $font-lg;
        font-weight: 600;
        color: $text-primary;
      }

      .popup-close {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: $bg-page;
        cursor: pointer;

        .t-icon {
          font-size: 16px;
          color: $text-secondary;
        }
      }
    }

    .backup-list {
      .backup-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-md $spacing-sm;
        border-bottom: 1px solid $border-light;
        cursor: pointer;

        &:active {
          background: $bg-hover;
        }

        &.active {
          color: $primary-color;
        }

        .check-icon {
          font-size: 18px;
          color: $primary-color;
        }
      }
    }
  }
}
</style>