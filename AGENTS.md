# Linx-App AI Agent Instructions

## 📚 规则模块导航

项目规则已模块化，根据不同场景参考对应文件：

| 场景 | 参考文件 |
|------|---------|
| **核心规范** | `.agents/rules/core.md` |
| **TypeScript 类型** | `.agents/rules/typescript.md` |
| **API 开发** | `.agents/rules/api.md` |
| **组件开发** | `.agents/rules/components.md` |
| **平台兼容** | `.agents/rules/platform.md` |
| **加载/错误处理** | `.agents/rules/loading-error.md` |

---

## 🎯 智能规则应用

### 工作在 API 文件时 (`src/api/**`)
**自动参考**: `.agents/rules/api.md` + `.agents/rules/typescript.md`

- 严格遵守 API 调用层级
- 必须定义类型（向用户索取类型定义）
- 当前状态: `src/api/index.ts` 单文件 (逐步拆分)

### 工作在组件文件时 (`src/components/**`, `src/pages/**/components/**`)
**自动参考**: `.agents/rules/components.md`

- 使用 wot-design-uni 组件库
- 页面组件化原则
- Composables 模式

### 涉及平台兼容时
**自动参考**: `.agents/rules/platform.md`

- 条件编译 (`#ifdef`)
- AppInfo 运行时判断
- 原生 API 使用

### 处理加载和错误时
**自动参考**: `.agents/rules/loading-error.md`

- 加载状态选择
- 统一错误处理模式

---

## 🛠️ 可用的技能 (Skills)

需要查阅官方文档和示例时参考：

- **uniapp-project** (`.agents/skills/uniapp-project/`)
  - uni-app 组件和 API 官方示例
  - 平台兼容性参考文档
  
- **typescript** (`.agents/skills/typescript/`)
  - TypeScript 性能优化
  - 类型系统最佳实践

---

## ⚡ 快速参考

### TypeScript
- ✅ 禁止 `any` (新代码)
- ⚠️ 历史遗留: `.js` 和 `@ts-nocheck` 逐步迁移

### API 调用层级
```
页面/组件 → src/api/*.ts → request.ts → uni.request
```

### 组件库
1. uni-app 内置
2. **wot-design-uni** (主要)
3. uni-ui (备选)

### 页面组件化
必须拆分: 弹窗、卡片、列表项、表单

### 添加新 API
1. 定义类型（无类型→索取）
2. 在 `src/api/types/` 定义
3. 在 `src/api/` 创建函数

### 错误处理
```typescript
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

### 平台兼容
```vue
<!-- #ifdef MP-WEIXIN -->
<button open-type="getPhoneNumber">获取手机号</button>
<!-- #endif -->

<!-- #ifdef APP-PLUS -->
<button @click="nativeGetPhone">获取手机号</button>
<!-- #endif -->
```

```typescript
import { AppInfo } from '@/const';

if (AppInfo.isWeixin) {
  // 微信小程序逻辑
}
```

---

## 🚫 禁止操作

- ❌ 手动修改 `manifest.json`
- ❌ 绕过 API 层直接用 request
- ❌ 新代码使用 `any`
- ❌ 提交敏感信息

---

## ✅ 提交前检查

- `pnpm fmt`
- `pnpm type-check`
