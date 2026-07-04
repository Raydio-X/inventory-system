<template>
  <div class="page customers-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索客户姓名、手机号"
        clearable
      />
    </div>

    <!-- 客户列表 -->
    <div class="customer-list">
      <div
        v-for="customer in filteredCustomers"
        :key="customer.id"
        class="customer-card"
      >
        <div class="customer-avatar" @click="goToDetail(customer.id)">
          <t-icon name="user" />
        </div>
        <div class="customer-info" @click="goToDetail(customer.id)">
          <div class="customer-name">{{ customer.name }}</div>
          <div class="customer-phone">{{ customer.phone || '未填写' }}</div>
          <div class="customer-stats">
            <span class="stat-item">{{ customer.orderCount || 0 }}笔订单</span>
          </div>
        </div>
        <div class="customer-actions">
          <div class="action-btn edit-btn" @click.stop="showEditPopup(customer)">
            <t-icon name="edit" />
          </div>
          <div class="action-btn delete-btn" @click.stop="showDeleteConfirm(customer)">
            <t-icon name="delete" />
          </div>
        </div>
      </div>
    </div>

    <!-- 添加客户按钮 -->
    <div class="add-btn" @click="showAddPopup">
      <t-icon name="add" />
    </div>

    <!-- 添加客户弹窗 -->
    <t-dialog
      v-model:visible="showAdd"
      header="添加客户"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="60%"
      class="customer-dialog"
    >
      <div class="popup-container">
        <div class="popup-body">
          <div class="form-item">
            <div class="form-label required">姓名</div>
            <input v-model="newCustomer.name" type="text" class="form-input" placeholder="输入客户姓名" />
          </div>
          <div class="form-item">
            <div class="form-label">手机号</div>
            <input v-model="newCustomer.phone" type="tel" class="form-input" placeholder="输入手机号（可选）" />
          </div>
          <div class="form-item">
            <div class="form-label">备注</div>
            <input v-model="newCustomer.remark" type="text" class="form-input" placeholder="输入备注（可选）" />
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="default" size="large" @click="showAdd = false">取消</t-button>
          <t-button theme="primary" size="large" @click="addCustomer" :disabled="!canAdd">添加</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 编辑客户弹窗 -->
    <t-dialog
      v-model:visible="showEdit"
      header="编辑客户"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="60%"
      class="customer-dialog"
    >
      <div class="popup-container">
        <div class="popup-body">
          <div class="form-item">
            <div class="form-label required">姓名</div>
            <input v-model="editCustomer.name" type="text" class="form-input" placeholder="输入客户姓名" />
          </div>
          <div class="form-item">
            <div class="form-label">手机号</div>
            <input v-model="editCustomer.phone" type="tel" class="form-input" placeholder="输入手机号（可选）" />
          </div>
          <div class="form-item">
            <div class="form-label">备注</div>
            <input v-model="editCustomer.remark" type="text" class="form-input" placeholder="输入备注（可选）" />
          </div>
        </div>
        <div class="popup-footer">
          <t-button theme="default" size="large" @click="showEdit = false">取消</t-button>
          <t-button theme="primary" size="large" @click="updateCustomer" :disabled="!canEdit">保存</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- 删除确认对话框 -->
    <t-dialog
      v-model:visible="showDelete"
      header="确认删除"
      :footer="false"
      :closeBtn="false"
      placement="center"
      :attach="false"
      width="60%"
      class="customer-dialog delete-dialog"
    >
      <div class="popup-container">
        <div class="popup-body">
          <div class="delete-message">
            <t-icon name="error-circle" class="delete-icon" />
            <p>确定要删除客户 "{{ deleteCustomerInfo.name }}" 吗？</p>
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
import { Input, Dialog, Button, Icon, MessagePlugin } from 'tdesign-vue-next'
import { useCustomerStore } from '@/store/customer'

const router = useRouter()
const customerStore = useCustomerStore()

const searchKeyword = ref('')
const showAdd = ref(false)
const showEdit = ref(false)
const showDelete = ref(false)
const newCustomer = ref({ name: '', phone: '', remark: '' })
const editCustomer = ref({ id: '', name: '', phone: '', remark: '' })
const deleteCustomerInfo = ref({ id: '', name: '' })

const filteredCustomers = computed(() => {
  if (!searchKeyword.value) return customerStore.customers
  const keyword = searchKeyword.value.toLowerCase()
  return customerStore.customers.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    c.phone.includes(keyword)
  )
})

const canAdd = computed(() => newCustomer.value.name)
const canEdit = computed(() => editCustomer.value.name)

const goToDetail = (id) => {
  router.push(`/customers/${id}`)
}

const showAddPopup = () => {
  newCustomer.value = { name: '', phone: '', remark: '' }
  showAdd.value = true
}

const showEditPopup = (customer) => {
  editCustomer.value = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone || '',
    remark: customer.remark || ''
  }
  showEdit.value = true
}

const showDeleteConfirm = (customer) => {
  deleteCustomerInfo.value = {
    id: customer.id,
    name: customer.name
  }
  showDelete.value = true
}

const addCustomer = async () => {
  if (!canAdd.value) return
  
  try {
    await customerStore.addCustomer({
      name: newCustomer.value.name,
      phone: newCustomer.value.phone || '',
      remark: newCustomer.value.remark || ''
    })
    MessagePlugin.success('添加成功')
    showAdd.value = false
    await customerStore.initData()
  } catch (error) {
    console.error('添加失败:', error)
    MessagePlugin.error(error.message || '添加失败，请检查网络连接')
  }
}

const updateCustomer = async () => {
  if (!canEdit.value) return
  
  try {
    await customerStore.updateCustomer(editCustomer.value.id, {
      name: editCustomer.value.name,
      phone: editCustomer.value.phone || '',
      remark: editCustomer.value.remark || ''
    })
    MessagePlugin.success('更新成功')
    showEdit.value = false
    await customerStore.initData()
  } catch (error) {
    console.error('更新失败:', error)
    MessagePlugin.error(error.message || '更新失败，请检查网络连接')
  }
}

const confirmDelete = async () => {
  try {
    await customerStore.deleteCustomer(deleteCustomerInfo.value.id)
    MessagePlugin.success('删除成功')
    showDelete.value = false
    await customerStore.initData()
  } catch (error) {
    console.error('删除失败:', error)
    MessagePlugin.error(error.message || '删除失败，请检查网络连接')
  }
}

onMounted(() => {
  customerStore.initData()
})
</script>

<style lang="scss" scoped>
.customers-page {
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

  .customer-list {
    padding: $spacing-md $spacing-lg;

    .customer-card {
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

      .customer-avatar {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: $primary-light;
        color: white;
        border-radius: 24px;
        margin-right: $spacing-md;

        .t-icon {
          font-size: 20px;
        }
      }

      .customer-info {
        flex: 1;

        .customer-name {
          font-size: $font-md;
          font-weight: 500;
          color: $text-primary;
        }

        .customer-phone {
          font-size: $font-sm;
          color: $text-secondary;
        }

        .customer-stats {
          font-size: $font-xs;
          color: $text-placeholder;

          .stat-item {
            margin-right: $spacing-sm;
          }
        }
      }

      .customer-actions {
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

  .customer-dialog {
    :deep(.t-dialog__content) {
      background: $bg-white;
      border-radius: $radius-lg;
      padding: 0;
      width: 320px;
      max-width: 320px;
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
      padding: $spacing-md $spacing-lg;

      .form-item {
        margin-bottom: $spacing-md;

        &:last-child {
          margin-bottom: 0;
        }

        .form-label {
          font-size: $font-sm;
          color: $text-secondary;
          margin-bottom: $spacing-xs;
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
          height: 40px;
          padding: $spacing-sm $spacing-md;
          border: 1px solid $border-color;
          border-radius: $radius-md;
          font-size: $font-sm;
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