import { createPinia, setActivePinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate'; // 数据持久化

const store = createPinia();
store.use(
  createPersistedState({
    storage: {
      getItem: uni.getStorageSync,
      setItem: uni.setStorageSync
    }
  })
);
// 立即激活 Pinia 实例, 这样即使在 app.use(store)之前调用 store 也能正常工作 （解决APP端白屏问题）
setActivePinia(store);

// 导出store实例
export default store;

// 导出各个store
export { useTokenStore } from './token';
export { useUserStore } from './user';
export { usePrivacyStore } from './privacy';
