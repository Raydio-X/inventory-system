import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// TDesign Vue Next (Web版本)
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'

// 全局样式
import './styles/global.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(TDesign)

app.mount('#app')

