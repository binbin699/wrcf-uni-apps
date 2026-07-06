import { createSSRApp } from 'vue';
import App from './App.vue';
import i18n from './locale';
import store from './store';

export function createApp() {
  // 打印全局配置
  console.log('----------- APP_CONFIG -----------');
  Object.entries(APP_CONFIG).forEach(([key, value]) => {
    console.log(key + '=' + value);
  });
  console.log('----------- APP_CONFIG -----------');

  const app = createSSRApp(App);
  app.use(i18n);
  app.use(store);
  return {
    app
  };
}
