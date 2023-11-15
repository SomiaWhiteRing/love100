import VueCropper from 'vue-cropper'; 
import 'vue-cropper/dist/index.css'

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).use(VueCropper).mount('#app')
