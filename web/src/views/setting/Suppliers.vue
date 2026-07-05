<template>
  <div class="page suppliers-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索供应商名称、电话"
        clearable
      />
    </div>

    <!-- 供应商列表 -->
    <div class="supplier-list">
      <div
        v-for="item in filteredSuppliers"
        :key="item.id"
        class="supplier-card"
        @click="goToDetail(item.id)"
      >
        <div class="supplier-avatar">
          <t-icon name="store" />
        </div>
        <div class="supplier-info">
          <div class="supplier-name">{{ item.name }}</div>
          <div class="supplier-phone">{{ item.phone || '未填写' }}</div>
          <div v-if="item.remark" class="supplier-remark">{{ item.remark }}</div>
        </div>
        <div class="supplier-actions">
          <div class="action-btn edit-btn" @click.stop="openEditDialog(item)">
            <t-icon name="edit" />
          </div>
          <div class="action-btn delete-btn" @click.stop="openDeleteDialog(item)">
            <t-icon name="delete" />
          </div>
        </div>
      </div>

      <div v-if="filteredSuppliers.length === 0" class="empty-state">
        <t-icon name="store" class="empty-icon" />
        <div class="empty-text">暂无供应商</div>
        <div class="empty-hint">点击右下角按钮添加供应商</div>
      </div>
    </div>

    <!-- 添加供应商按钮 -->
    <div class="add-btn" @click="openCreateDialog">
      <t-icon name="add" />
    </div>

    <!-- 新建/编辑弹窗 -->
    <t-dialog
      v-model:visible="showFormDialog"
      :header="isEditing ? '编辑供应商' : '添加供应商'"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="480px"
      class="supplier-dialog"
    >
      <div class="popup-container">
        <div class="popup-body">
          <div class="form-item">
            <div class="form-label required">名称</div>
            <input v-model="formData.name" type="text" class="form-input" placeholder="供应商名称" />
          </div>
          <div class="form-item">
            <div class="form-label">电话</div>
            <input v-model="formData.phone" type="tel" class="form-input" placeholder="手机号（可选）" />
          </div>
          <div class="form-item">
            <div class="form-label">备注</div>
            <input v-model="formData.remark" type="text" class="form-input" placeholder="备注信息（可选）" />
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="default" size="large" @click="showFormDialog = false">取消</t-button>
          <t-button theme="primary" size="large" :loading="submitting" :disabled="!canSubmit" @click="submitForm">{{ isEditing ? '保存' : '添加' }}</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 删除确认弹窗 -->
    <t-dialog
      v-model:visible="showDeleteDialog"
      header="确认删除"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="480px"
      class="supplier-dialog delete-dialog"
    >
      <div class="popup-container">
        <div class="popup-body">
          <div class="delete-message">
            <t-icon name="error-circle" class="delete-icon" />
            <p>确定要删除供应商 "{{ deleteTarget?.name }}" 吗？</p>
            <p class="delete-warning">删除后无法恢复</p>
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="default" size="large" @click="showDeleteDialog = false">取消</t-button>
          <t-button theme="danger" size="large" :loading="deleting" @click="confirmDelete">确认删除</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Input, Dialog, Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()

// 跳转到详情
const goToDetail = (id) => {
  router.push(`/suppliers/${id}`)
}

// 供应商数据
const suppliers = ref([])
const searchKeyword = ref('')

// 弹窗状态
const showFormDialog = ref(false)
const showDeleteDialog = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const deleting = ref(false)
const deleteTarget = ref(null)

// 表单数据
const createEmptyForm = () => ({
  name: '',
  phone: '',
  remark: ''
})

const formData = ref(createEmptyForm())

// 搜索过滤
const filteredSuppliers = computed(() => {
  if (!searchKeyword.value) return suppliers.value
  const kw = searchKeyword.value.toLowerCase()
  return suppliers.value.filter(s =>
    s.name.toLowerCase().includes(kw) ||
    (s.phone && s.phone.includes(kw))
  )
})

const canSubmit = computed(() => formData.value.name && formData.value.name.trim())

// 加载供应商列表
const fetchSuppliers = async () => {
  try {
    const res = await api.get('/suppliers')
    if (res.success) {
      suppliers.value = res.data
    }
  } catch (error) {
    MessagePlugin.error('获取供应商列表失败')
  }
}

// 新建弹窗
const openCreateDialog = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = createEmptyForm()
  showFormDialog.value = true
}

// 编辑弹窗
const openEditDialog = (item) => {
  isEditing.value = true
  editingId.value = item.id
  formData.value = {
    name: item.name || '',
    phone: item.phone || '',
    remark: item.remark || ''
  }
  showFormDialog.value = true
}

// 提交表单
const submitForm = async () => {
  if (!formData.value.name.trim()) {
    MessagePlugin.warning('请输入供应商名称')
    return
  }

  submitting.value = true
  try {
    if (isEditing.value) {
      await api.put(`/suppliers/${editingId.value}`, formData.value)
      MessagePlugin.success('修改成功')
    } else {
      await api.post('/suppliers', formData.value)
      MessagePlugin.success('添加成功')
    }
    showFormDialog.value = false
    await fetchSuppliers()
  } catch (error) {
    MessagePlugin.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 删除弹窗
const openDeleteDialog = (item) => {
  deleteTarget.value = item
  showDeleteDialog.value = true
}

// 确认删除
const confirmDelete = async () => {
  deleting.value = true
  try {
    await api.delete(`/suppliers/${deleteTarget.value.id}`)
    MessagePlugin.success('删除成功')
    showDeleteDialog.value = false
    await fetchSuppliers()
  } catch (error) {
    MessagePlugin.error(error.response?.data?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchSuppliers()
})
</script>

<style lang="scss" scoped>
.suppliers-page {
  padding-bottom: 80px;

  .search-bar {
    padding: $spacing-sm 16px;
    background: $bg-white;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: $shadow-sm;
    margin-left: -16px;
    margin-right: -16px;
    width: calc(100% + 32px);
  }

  .supplier-list {
    padding: $spacing-md $spacing-lg;

    .supplier-card {
      display: flex;
      align-items: center;
      background: $bg-card;
      border-radius: $radius-lg;
      padding: $spacing-md;
      margin-bottom: $spacing-md;
      cursor: pointer;

      &:active {
        background: $bg-hover;
      }

      .supplier-avatar {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba($warning-color, 0.1);
        color: $warning-color;
        border-radius: 24px;
        margin-right: $spacing-md;
        flex-shrink: 0;

        .t-icon {
          font-size: 20px;
        }
      }

      .supplier-info {
        flex: 1;
        min-width: 0;

        .supplier-name {
          font-size: $font-md;
          font-weight: 500;
          color: $text-primary;
        }

        .supplier-phone {
          font-size: $font-sm;
          color: $text-secondary;
        }

        .supplier-remark {
          font-size: $font-xs;
          color: $text-placeholder;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .supplier-actions {
        display: flex;
        gap: $spacing-sm;
        margin-left: $spacing-sm;
        flex-shrink: 0;

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

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 0;

      .empty-icon {
        font-size: 40px;
        color: $text-placeholder;
        margin-bottom: 10px;
      }

      .empty-text {
        font-size: 15px;
        color: $text-primary;
        margin-bottom: 4px;
      }

      .empty-hint {
        font-size: 13px;
        color: $text-placeholder;
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

  .supplier-dialog {
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

  .popup-container {
    background: $bg-white;
    border-radius: $radius-lg;
    width: 100%;

    .popup-body {
      padding: $spacing-lg;

      .form-item {
        margin-bottom: $spacing-lg;

        &:last-child {
          margin-bottom: 0;
        }

        .form-label {
          font-size: $font-sm;
          color: $text-secondary;
          margin-bottom: $spacing-sm;
          font-weight: 500;
          text-align: left;

          &.required::after {
            content: '*';
            color: $primary-color;
            margin-left: 2px;
          }
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: $spacing-sm $spacing-md;
          border: 1px solid $border-color;
          border-radius: $radius-md;
          font-size: $font-md;
          color: $text-primary;
          background: $bg-color;
          transition: all 0.2s ease;

          &:focus {
            border-color: $primary-color;
            outline: none;
            background: $bg-white;
            box-shadow: 0 0 0 2px rgba($primary-color, 0.1);
          }

          &::placeholder {
            color: $text-placeholder;
          }
        }
      }
    }

    .popup-footer {
      display: flex;
      gap: $spacing-md;
      padding: $spacing-md $spacing-lg;
      background: transparent;

      .t-button {
        flex: 1;
        border-radius: $radius-md;
      }
    }

    .delete-message {
      text-align: center;
      padding: $spacing-md 0;

      .delete-icon {
        font-size: 36px;
        color: $warning-color;
        margin-bottom: $spacing-sm;
      }

      p {
        font-size: $font-md;
        color: $text-primary;
        margin-bottom: $spacing-xs;
      }

      .delete-warning {
        font-size: $font-xs;
        color: $text-placeholder;
      }
    }
  }

  // 移动端适配
  @media (max-width: 480px) {
    .supplier-dialog {
      :deep(.t-dialog__content) {
        width: calc(100vw - 48px) !important;
        max-width: calc(100vw - 48px) !important;
      }
    }
  }
}
</style>
