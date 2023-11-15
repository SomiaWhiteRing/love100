import VueCropper from 'vue-cropper'; 
import 'vue-cropper/dist/index.css'
import { inject } from '@vercel/analytics';

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
inject();

createApp(App).use(VueCropper).mount('#app')
