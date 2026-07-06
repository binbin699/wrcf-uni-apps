// 本地存储封装
class Storage {
  // 设置存储
  set(key: string, value: any) {
    try {
      uni.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.error('存储失败:', e);
      return false;
    }
  }

  // 获取存储
  get(key: string, defaultValue: any = null) {
    try {
      const value = uni.getStorageSync(key);
      return value !== '' ? value : defaultValue;
    } catch (e) {
      console.error('获取存储失败:', e);
      return defaultValue;
    }
  }

  // 删除存储
  remove(key: string) {
    try {
      uni.removeStorageSync(key);
      return true;
    } catch (e) {
      console.error('删除存储失败:', e);
      return false;
    }
  }

  // 清空存储
  clear() {
    try {
      uni.clearStorageSync();
      return true;
    } catch (e) {
      console.error('清空存储失败:', e);
      return false;
    }
  }

  // 获取存储信息
  getInfo() {
    try {
      return uni.getStorageInfoSync();
    } catch (e) {
      console.error('获取存储信息失败:', e);
      return null;
    }
  }

  clearAuth() {
    this.remove('token');
    this.remove('userInfo');
    this.remove('refreshToken');
    this.remove('expireTime');
    this.remove('refreshExpireTime');
  }
}

export default new Storage();
