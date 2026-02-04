# AI Coding Rules for linx-app

## 项目概述

- **项目类型**: 基于 uni-app 的跨平台小程序/APP 项目
- **支持平台**: 微信小程序、Android、iOS、鸿蒙
- **技术栈**: Vue 3 + TypeScript + Pinia + Vite
- **包管理**: pnpm
- **开发工具**: Cursor (主要开发) / HBuilderX (发布打包)

## AI Skills 说明

项目配置了以下 AI 技能，开发时可以参考：

### 1. uniapp-project
- **位置**: `.agents/skills/uniapp-project/`
- **用途**: uni-app 组件和 API 使用指南
- **包含内容**:
  - `examples/components/built-in/` - 内置组件示例
  - `examples/uni-ui/` - uni-ui 组件示例
  - `examples/api/` - uni-app API 示例 (网络、存储、设备、UI 等)
  - `references/` - 组件和 API 的详细文档
- **何时使用**: 
  - 需要使用 uni-app 内置组件或 API
  - 需要查看组件/API 的平台兼容性
  - 需要官方示例代码

### 2. typescript
- **位置**: `.agents/skills/typescript/`
- **用途**: TypeScript 性能优化和最佳实践
- **包含内容**:
  - 类型系统性能优化
  - 编译器配置优化
  - 异步模式最佳实践
  - 模块组织规范
  - 类型安全模式
- **何时使用**:
  - 编写复杂类型定义
  - 优化 TypeScript 编译性能
  - 处理类型错误
  - 异步代码优化

**使用建议**: 
- 遇到 uni-app 相关问题时，优先查阅 `uniapp-project` skill
- 编写 TypeScript 代码时，参考 `typescript` skill 的最佳实践

## 代码规范

### 1. 平台兼容性

- **优先使用 uni-app API**: 避免使用平台特定 API

- **条件编译**: 使用 `#ifdef`/`#ifndef`/`#endif` 处理平台差异
  ```vue
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
  ```
  
  **常用条件编译标识**:
  - `MP-WEIXIN` - 微信小程序
  - `APP-PLUS` - App (Android/iOS)
  - `APP-ANDROID` - Android App
  - `APP-IOS` - iOS App  
  - `APP-HARMONY` - 鸿蒙 App
  - `H5` - H5

- **平台判断 (运行时)**: 使用 `src/const/index.ts` 中的 `AppInfo` 对象
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
  console.log(AppInfo.platform);      // 平台标识
  console.log(AppInfo.os);            // 操作系统
  console.log(AppInfo.osVersion);     // 系统版本
  console.log(AppInfo.androidApiLevel); // Android API Level
  ```

- **原生 API 使用 (App 平台)**:
  ```typescript
  // ✅ 正确: 使用平台检测
  if (typeof plus !== 'undefined') {
    // Android
    const activity = plus.android.runtimeMainActivity();
    
    // iOS
    const result = plus.ios.invoke(obj, 'methodName');
  }
  
  // ❌ 错误: 直接使用 (在非 App 平台会报错)
  const activity = plus.android.runtimeMainActivity();
  ```

- **兼容性注释**: 涉及平台特定功能必须注明兼容性
  ```typescript
  // 仅支持: APP-PLUS, H5
  // 不支持: 微信小程序 (无蓝牙 API)
  ```

### 2. TypeScript 要求

- **严格类型**: 启用 `strict: true`，禁止使用 `any`
  - ⚠️ **历史遗留问题**: 项目中存在 `.js` 文件和 `// @ts-nocheck` 文件
  - 🔧 **迁移计划**: 逐步将 `.js` 迁移为 `.ts`，移除 `@ts-nocheck`
  - ✅ **新代码要求**: 所有新文件必须使用 TypeScript，严禁 `any`
- **类型定义位置**:
  - API 响应类型: `src/api/types/`
  - 全局类型: `src/types/`
  - 组件 Props: 组件文件内定义
- **必须定义类型的场景**:
  - 所有导出的函数参数和返回值
  - 组件 props 和 emits
  - API 请求和响应
  - Pinia store state
- **类型导入**: 使用 `import type` 导入仅类型引用
  ```typescript
  import type { User } from '@/api/types/user';
  ```

### 3. 样式规范

- **单位使用**:
  - 响应式布局: 使用 `rpx` (750rpx = 屏幕宽度)
  - 固定尺寸: 使用 `px`
  - 字体大小: 优先使用 `rpx`
- **全局样式**: 放在 `src/styles/` 目录
- **组件样式**: 必须使用 `scoped`
  ```vue
  <style lang="scss" scoped>
  .container {
    padding: 20rpx;
  }
  </style>
  ```
- **颜色变量**: 使用 `src/uni.scss` 中定义的颜色变量
- **避免原生组件层级问题**: 使用 `cover-view` 覆盖 video、map 等原生组件

### 4. 组件开发

- **组件优先级**:
  1. uni-app 内置组件 (view, text, button 等)
  2. **wot-design-uni** 组件库 (项目主要使用)
  3. uni-ui 组件库 (备选)
  4. 自定义组件
  
- **wot-design-uni 使用**:
  ```vue
  <template>
    <!-- 页面顶部声明 toast -->
    <wd-toast />
    
    <!-- 使用组件 -->
    <wd-icon name="arrow-left" size="44rpx" />
    <wd-button type="primary">按钮</wd-button>
  </template>
  
  <script setup lang="ts">
  import { useToast } from '@/uni_modules/wot-design-uni';
  const toast = useToast();
  
  function showMessage() {
    toast.success('操作成功');
    toast.error('操作失败');
  }
  </script>
  ```
- **组件命名**: 使用 PascalCase
  ```
  ✅ AgentCard.vue
  ✅ VoiceSelector.vue
  ❌ agent-card.vue
  ❌ voiceSelector.vue
  ```
- **组件位置**:
  - 公共组件: `src/components/`
  - 页面专用组件: `src/pages/[page-name]/components/`
- **页面组件化原则** (重要):
  - **组件放置**: 页面专用组件放在 `src/pages/[page-name]/components/`
  - **主文件职责**: `index.vue` 只负责组合组件和页面级逻辑，保持简洁
  - **应当抽离的代码块**:
    - 弹窗/抽屉 (Modal/Drawer)
    - 卡片组件 (Card)
    - 列表项 (ListItem)
    - 循环渲染的元素 (如商品卡片、用户卡片)
    - 表单模块 (Form)
    - 独立功能模块 (如搜索栏、筛选器)
  - **示例结构**:
    ```
    src/pages/home/
    ├── index.vue                  # 主页面，组合各个组件
    ├── components/
    │   ├── AgentCard.vue          # 智能体卡片 (循环渲染)
    │   ├── FilterDrawer.vue       # 筛选抽屉 (弹窗)
    │   ├── SearchBar.vue          # 搜索栏
    │   └── BindDeviceModal.vue    # 绑定设备弹窗
    ```
  - **拆分好处**:
    - 提高代码可读性和可维护性
    - 组件职责单一，便于测试
    - 便于在同一页面内复用
- **Props 定义**: 使用 TypeScript + 默认值
  ```vue
  <script setup lang="ts">
  interface Props {
    title: string;
    count?: number;
  }
  
  const props = withDefaults(defineProps<Props>(), {
    count: 0
  });
  </script>
  ```

- **Composables (组合式函数)**:
  - **位置**: `src/pages/[page]/composables/useXxx.ts`
  - **命名**: 使用 `use` 前缀
  - **何时使用**:
    - 页面内多个组件共享的逻辑
    - 可复用的状态管理逻辑
    - 复杂的业务逻辑抽离
  - **示例**:
    ```typescript
    // src/pages/agent/composables/useTemplateSelector.ts
    import { ref, type Ref } from 'vue';
    
    export function useTemplateSelector(
      formData: Ref<{ langCode: string }>,
      $t: (key: string) => string,
      toast: any
    ) {
      const templateModalVisible = ref(false);
      const allTemplates = ref<any[]>([]);
      
      async function loadTemplates() {
        // 逻辑实现
      }
      
      return {
        templateModalVisible,
        allTemplates,
        loadTemplates
      };
    }
    ```
    
    ```vue
    <!-- 在组件中使用 -->
    <script setup lang="ts">
    import { useTemplateSelector } from './composables/useTemplateSelector';
    
    const { templateModalVisible, loadTemplates } = useTemplateSelector(
      formData, $t, toast
    );
    </script>
    ```

- **页面文件组织**:
  - **推荐结构**:
    ```
    src/pages/[page-name]/
    ├── index.vue           # 主页面 (推荐使用 index.vue)
    ├── components/         # 页面专用组件
    ├── composables/        # 页面级可复用逻辑 (可选)
    ├── store.ts            # 页面级状态 (可选，非 Pinia)
    ├── types.ts            # 页面类型定义 (可选)
    └── utils/              # 页面工具函数 (可选)
    ```
  - **历史命名**: 部分页面使用 `[page-name].vue` 而非 `index.vue`，逐步迁移中
  - **页面级状态**: 使用 Vue `ref()`/`reactive()`，不使用 Pinia

### 5. 状态管理

- **Pinia Store**:
  - 位置: `src/store/`
  - 命名: 功能模块名 (user.ts, token.ts)
  - 必须启用持久化 (已配置 `pinia-plugin-persistedstate`)
- **Store 结构**:
  ```typescript
  import { defineStore } from 'pinia';
  
  export const useUserStore = defineStore('user', {
    state: () => ({
      userInfo: null as User | null,
    }),
    
    getters: {
      isLoggedIn: (state) => !!state.userInfo,
    },
    
    actions: {
      async fetchUser() {
        // ...
      },
    },
    
    persist: true, // 启用持久化
  });
  ```
- **何时使用 Store**:
  - ✅ 跨页面共享的状态 (用户信息、token)
  - ✅ 需要持久化的数据
  - ❌ 页面内部状态 (使用 reactive/ref)
  - ❌ 临时数据

### 6. API 调用

- **调用层级** (重要):
  ```
  页面/组件 → src/api/*.ts → src/utils/request.ts → uni.request
  ```
  - ✅ 页面/组件: 调用 `src/api/` 中定义的方法
  - ✅ `src/api/*.ts`: 封装业务接口，调用 `utils/request.ts`
  - ✅ `utils/request.ts`: 底层请求封装，调用 `uni.request`
  - ❌ 页面/组件: 禁止直接调用 `utils/request.ts` 或 `uni.request`

- **API 文件组织**: 按功能模块拆分
  - ⚠️ **当前状态**: `src/api/index.ts` 包含大部分 API (历史遗留)
  - 🔧 **重构目标**: 逐步拆分为独立模块文件
  - ✅ **目标结构**:
    ```
    src/api/
    ├── login.ts        # 登录/注册相关
    ├── voice.ts        # 音色接口
    ├── device.ts       # 设备接口
    ├── agent.ts        # 智能体接口
    ├── user.ts         # 用户信息接口
    ├── common.ts       # 通用接口
    └── types/          # 类型定义
        ├── login.ts
        ├── voice.ts
        ├── device.ts
        └── agent.ts
    ```
  - **当前使用**: 从 `src/api/index.ts` 导入对象形式 API
    ```typescript
    import { authApi, agentApi, voiceApi, deviceApi } from '@/api';
    
    // 使用
    const userInfo = await authApi.login(data);
    const agents = await agentApi.getList();
    ```

- **API 文件结构** (目标格式):
  ```typescript
  // src/api/voice.ts (未来拆分后)
  import request from '@/utils/request';
  import type { Voice, VoiceListResponse } from './types/voice';
  
  /**
   * 获取音色列表
   */
  export function getVoiceList() {
    return request.get<VoiceListResponse>('/api/voices');
  }
  
  /**
   * 获取音色详情
   */
  export function getVoiceDetail(id: string) {
    return request.get<Voice>(`/api/voices/${id}`);
  }
  
  /**
   * 创建音色
   */
  export function createVoice(data: Partial<Voice>) {
    return request.post<Voice>('/api/voices', data);
  }
  ```

- **错误处理**: 
  - 通用错误: 在 `request.ts` 中统一处理 (如 401、500)
  - 业务错误: 在页面调用处处理 (如表单验证失败)

### 7. 环境配置

- **版本控制**: 通过 `VITE_APP_EDITION` 环境变量
  - `full`: 全功能版本
  - `cn`: 国内版
  - `intl`: 国际版
- **配置定义**: 所有版本配置在 `app.config.ts`
- **配置使用**:
  ```typescript
  // 编译时注入，可直接使用
  declare const APP_CONFIG: AppConfig;
  
  console.log(APP_CONFIG.BASE_API_URL);
  console.log(APP_CONFIG.LOGIN_METHODS.wechatPhone);
  ```
- **环境变量**:
  - 开发环境: `.env` 文件
  - 敏感信息: 不要提交到 git

### 8. 路由和页面

- **页面配置**: `src/pages.json`
- **路由跳转**: 使用 `src/utils/route.ts` 工具
  ```typescript
  import { navigateTo, redirectTo } from '@/utils/route';
  
  navigateTo('/pages/detail/detail', { id: '123' });
  ```
- **页面路径**: 遵循 uni-app 约定
  ```
  src/pages/
  ├── index/
  │   └── index.vue
  ├── login/
  │   └── login.vue
  └── user/
      └── user.vue
  ```

### 9. 国际化

- **配置位置**: `src/locale/`
- **使用方式**:
  ```vue
  <template>
    <text>{{ t('common.confirm') }}</text>
  </template>
  
  <script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  const { t } = useI18n();
  </script>
  ```
- **添加翻译**: 在 `zh-Hans.json` 和 `en.json` 中同步添加

### 10. 工具函数

- **位置**: `src/utils/`
- **核心工具**:
  - `request.ts`: HTTP 请求封装
  - `storage.ts`: 统一存储接口
  - `permission.ts`: 权限管理
  - `audioRecorder.ts`: 录音功能
  - `audioPlayer.ts`: 音频播放
  - `wifiConfig.ts`: WiFi 配网
  - `soundWave.ts`: 声波配网
- **工具函数规范**:
  - 必须有 JSDoc 注释
  - 必须定义 TypeScript 类型
  - 单一职责原则

### 11. 加载状态与错误处理

#### 加载状态 (选择合适的方式)

| 场景 | 推荐方式 | 示例 |
|------|---------|------|
| 页面初始加载数据 | 局部 `loading = ref(false)` | `<view v-if="loading">加载中...</view>` |
| 表单提交/登录 | 按钮 `:loading` 属性 | `<wd-button :loading="submitting">提交</wd-button>` |
| 全局操作 (文件上传) | `uni.showLoading()` | `uni.showLoading({ title: '上传中' })` |
| Store 异步操作 | Store 状态 `isLoading` | `userStore.isLoading` |

#### 错误处理标准模式

```typescript
// ✅ 推荐: 统一的错误处理模式
try {
  uni.showLoading({ title: $t('common.loading'), mask: true });
  const result = await someApi();
  toast.success($t('common.success'));
} catch (error: any) {
  console.error('[操作名称] 失败:', error);
  toast.error(error.message || $t('common.error'));
} finally {
  uni.hideLoading();
}
```

**错误提示选择**:
- ✅ 用户操作失败: `toast.error()` (wot-design-uni)
- ✅ 成功提示: `toast.success()`
- ✅ 需要用户确认的错误: `uni.showModal()`
- ✅ 网络/系统错误: 在 `request.ts` 中统一处理
- ❌ 避免: 静默失败 (必须给用户反馈)

**日志规范**:
```typescript
// 错误日志格式
console.error('[模块名/操作名] 失败:', error);
console.error('[AgentAPI/创建智能体] 失败:', error);
```

### 12. 代码格式化

- **工具**: Prettier (配置文件 `.prettierrc`)
- **关键规范**:
  - 单引号 (`singleQuote: true`)
  - 行宽 100 字符 (`printWidth: 100`)
  - 使用分号 (`semi: true`)
  - 不使用尾随逗号 (`trailingComma: "none"`)
  - 标签闭合同行 (`bracketSameLine: true`)
- **执行**: 提交前必须运行 `pnpm fmt`

### 13. uni-app 配置文件

#### pages.json (页面配置)

- **条件编译支持**: JSON 中也支持条件编译
  ```json
  {
    "pages": [
      // #ifdef MP-WEIXIN
      {
        "path": "pages/mp-landing/mp-landing"
      },
      // #endif
    ]
  }
  ```

- **国际化标题**: 使用 `%key%` 语法
  ```json
  {
    "style": {
      "navigationBarTitleText": "%pages.login%"
    }
  }
  ```

- **平台特定配置**: 
  ```json
  {
    "style": {
      "app-plus": {
        "bounce": "none",  // 禁用 iOS 回弹效果
        "titleNView": {
          "autoBackButton": true
        }
      }
    }
  }
  ```

- **SubPackages (分包)**: 优化首次加载速度
  ```json
  {
    "subPackages": [
      {
        "root": "pages/bluetooth-config",
        "pages": [...]
      }
    ]
  }
  ```

- **Custom TabBar**: 自定义 TabBar
  ```json
  {
    "tabBar": {
      "custom": true,  // 启用自定义 TabBar
      "list": [...]    // 保留配置作为 fallback
    }
  }
  ```

#### manifest.json (应用配置)

**重要**: 必须通过 HBuilderX 图形界面修改

- **App 模块配置**: `app-plus.modules`
  - Bluetooth、Camera、Geolocation、OAuth 等

- **权限声明**: `app-plus.permissions`
  - Android 需要声明所有权限

- **隐私描述**: `app-plus.distribute.ios.privacyDescription`
  - iOS 权限说明 (相机、位置、麦克风等)
  - 支持多语言: `app-plus.locales.zh.ios.privacyDescription`

- **OAuth 配置**: `app-plus.distribute.sdkConfigs.oauth`
  - Google/WeChat/Apple 登录配置

## 文件组织

```
/src
├── api/              # API 封装
│   ├── common.ts
│   ├── login.ts
│   └── types/        # API 类型定义
├── components/       # 公共组件
│   ├── AgentCard.vue
│   └── VoiceSelector.vue
├── const/            # 常量和配置
│   ├── env.ts        # 环境变量管理
│   └── index.ts      # 应用信息 (AppInfo)
├── locale/           # 国际化
│   ├── zh-Hans.json
│   └── en.json
├── pages/            # 页面
│   ├── index/
│   └── login/
├── static/           # 静态资源 (图片、字体)
├── store/            # Pinia 状态管理
│   ├── user.ts
│   └── token.ts
├── styles/           # 全局样式
├── types/            # 全局类型定义
├── utils/            # 工具函数
│   ├── request.ts
│   ├── storage.ts
│   └── permission.ts
└── uni_modules/      # uni-app 插件
```

## 禁止操作

### ❌ 绝对禁止

1. **不要手动修改 `manifest.json`**: 必须通过 HBuilderX 图形界面修改
2. **不要绕过 request.ts**: 禁止直接使用 `uni.request`
3. **不要使用 `any` 类型**: 使用 `unknown` 或明确类型
4. **不要提交敏感信息**: API keys、密码、证书等
5. **不要在 src/static/ 放大文件**: 单文件不超过 500KB

### ⚠️ 谨慎操作

1. **修改 pages.json**: 确保路径正确，避免重复
2. **修改 vite.config.ts**: 理解配置影响再修改
3. **全局样式**: 避免污染，优先使用 scoped
4. **使用平台特定 API**: 必须做兼容处理和注释

## 开发命令

### 日常开发

```bash
# 格式化代码
pnpm fmt

# 类型检查
pnpm type-check

# 开发运行 (需要在 HBuilderX 中)
# 工具栏 -> 运行 -> 运行到xxx平台
```

### 微信小程序

```bash
# 开发
pnpm dev:mp-weixin

# 构建
pnpm build:mp-weixin
```

### APP 打包

- 使用 HBuilderX 云打包: 发行 -> APP-云打包

## 常见场景

### 添加新页面

1. 在 `src/pages/` 创建页面目录和文件
2. 在 `src/pages.json` 添加页面配置
3. 配置页面标题、导航栏样式等

### 添加新 API

1. **定义类型** (必须): 在 `src/api/types/` 定义请求/响应类型
   - ⚠️ 如果对话中没有说明类型，必须向用户索取接口类型定义
   - 不允许使用 `any` 或跳过类型定义
2. 在 `src/api/` 创建对应模块的 API 函数
3. 使用 `request.ts` 进行请求封装

### 处理权限

1. 使用 `src/utils/permission.ts` 工具
   - ⚠️ **注意**: 此文件较大 (2300+ 行)，后续需要拆分功能模块
   - 目前包含所有权限处理逻辑 (相机、位置、录音、蓝牙、相册等)
2. 在使用前检查权限状态
3. 处理权限拒绝的情况

```typescript
import { requestPermission } from '@/utils/permission';

const granted = await requestPermission('camera');
if (granted) {
  // 使用相机
}
```

**TODO**: 将 `permission.ts` 按功能拆分为：
- `permissions/camera.ts` - 相机权限
- `permissions/location.ts` - 位置权限
- `permissions/audio.ts` - 录音权限
- `permissions/bluetooth.ts` - 蓝牙权限
- `permissions/album.ts` - 相册权限
- `permissions/index.ts` - 统一导出

### 音频录制

```typescript
import AudioRecorder from '@/utils/audioRecorder';

const recorder = new AudioRecorder();
await recorder.start();
// 录制中...
const filePath = await recorder.stop();
```

### 配网功能

```typescript
import { WifiConfig } from '@/utils/wifiConfig';

const config = new WifiConfig();
await config.connect(ssid, password);
```

## 调试技巧

### 条件编译调试

```typescript
// #ifdef H5
console.log('H5 平台');
// #endif

// #ifdef MP-WEIXIN
console.log('微信小程序');
// #endif

// #ifdef APP-PLUS
console.log('APP 平台');
// #endif
```

### 平台判断

```typescript
import { AppInfo } from '@/const';

console.log('平台:', AppInfo.platform);
console.log('是否微信:', AppInfo.isWeixin);
console.log('是否 APP:', AppInfo.isApp);
console.log('是否安卓:', AppInfo.isAndroid);
console.log('是否 iOS:', AppInfo.isIOS);
```

### 环境配置调试

```typescript
declare const APP_CONFIG: AppConfig;

console.log('API 地址:', APP_CONFIG.BASE_API_URL);
console.log('版本:', APP_CONFIG.EDITION);
console.log('登录方式:', APP_CONFIG.LOGIN_METHODS);
```

## 性能优化

### 1. 长列表优化

使用虚拟列表组件，避免一次性渲染大量数据

### 2. 图片优化

- 使用合适的图片尺寸
- 启用图片懒加载
- 压缩图片资源

### 3. 组件懒加载

```typescript
const HeavyComponent = defineAsyncComponent(() => 
  import('./components/HeavyComponent.vue')
);
```

### 4. 避免过度嵌套

- 减少组件嵌套层级
- 合理使用 computed 缓存计算结果

## 参考资源

- **uni-app 官方文档**: https://uniapp.dcloud.net.cn/
- **Vue 3 文档**: https://cn.vuejs.org/
- **TypeScript 文档**: https://www.typescriptlang.org/
- **Pinia 文档**: https://pinia.vuejs.org/zh/
- **HBuilderX 文档**: https://hx.dcloud.net.cn/

## 项目特有说明

### 版本差异

不同版本 (full/cn/intl) 的主要差异:

- API 地址不同
- 登录方式不同 (微信/Google/Apple/邮箱/短信)
- 隐私政策和用户协议 URL 不同
- 监控配置不同 (ARMS)

### 关键配置文件

- `app.config.ts`: 版本配置核心
- `src/const/env.ts`: 环境变量管理
- `src/manifest.json`: 应用配置 (通过 HBuilderX 修改)
- `vite.config.ts`: 构建配置

### 特殊功能模块

- **配网**: WiFi 配网、声波配网、蓝牙配网
- **音频**: 录音、播放、音色选择
- **智能体**: 智能体卡片、设备绑定
- **多语言**: 中英文切换

## 注意事项

1. **开发前**: 确保配置好 `.env` 文件和 `VITE_APP_EDITION`
2. **打包前**: 检查 `manifest.json` 配置 (appid、包名、证书等)
3. **提交前**: 运行 `pnpm fmt` 格式化代码
4. **发布前**: 运行 `pnpm type-check` 检查类型错误
