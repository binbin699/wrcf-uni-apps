# 平台兼容性规范

## 优先使用 uni-app API

避免使用平台特定 API

## 条件编译

### 常用平台标识

- `MP-WEIXIN` - 微信小程序
- `APP-PLUS` - App (Android/iOS)
- `APP-ANDROID` - Android App
- `APP-IOS` - iOS App
- `APP-HARMONY` - 鸿蒙 App
- `H5` - H5

### 模板中使用

```vue
<template>
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="getPhoneNumber">获取手机号</button>
  <!-- #endif -->
  
  <!-- #ifdef APP-PLUS -->
  <button @click="nativeGetPhone">获取手机号</button>
  <!-- #endif -->
  
  <!-- #ifdef APP-PLUS || APP-HARMONY -->
  <view>仅 APP 平台显示</view>
  <!-- #endif -->
  
  <!-- #ifndef MP-WEIXIN -->
  <view>除微信小程序外的平台</view>
  <!-- #endif -->
</template>
```

### 脚本中使用

```typescript
// #ifdef MP-WEIXIN
import { wechatLogin } from '@/utils/wechat';
// #endif

// #ifdef APP-PLUS
import { appLogin } from '@/utils/app';
// #endif
```

## 运行时判断 (AppInfo)

```typescript
import { AppInfo } from '@/const';

// 平台类型判断
if (AppInfo.isWeixin) {
  // 微信小程序特定逻辑
}

if (AppInfo.isApp) {
  // App 平台 (Android/iOS/HarmonyOS)
}

if (AppInfo.isAndroid) {
  // Android 特定逻辑
}

if (AppInfo.isIOS) {
  // iOS 特定逻辑
}

// 系统信息
console.log(AppInfo.platform);           // 平台标识
console.log(AppInfo.os);                 // 操作系统
console.log(AppInfo.osVersion);          // 系统版本
console.log(AppInfo.androidApiLevel);    // Android API Level
```

## 原生 API 使用 (App 平台)

**必须检查 plus 是否存在**:

```typescript
// ✅ 正确
if (typeof plus !== 'undefined') {
  // Android
  const activity = plus.android.runtimeMainActivity();
  
  // iOS
  const result = plus.ios.invoke(obj, 'methodName');
}

// ❌ 错误 - 直接使用会在非 App 平台报错
const activity = plus.android.runtimeMainActivity();
```

## 兼容性注释

涉及平台特定功能必须注明：

```typescript
/**
 * 获取设备蓝牙列表
 * 
 * 仅支持: APP-PLUS, H5
 * 不支持: 微信小程序 (无蓝牙 API)
 */
export function getBluetoothDevices() {
  // ...
}
```
