# Linx-App AI Agent Instructions

## 📚 规则模块导航

项目规则已模块化，根据不同场景参考对应文件：

| 场景                | 参考文件                         |
| ------------------- | -------------------------------- |
| **核心规范**        | `.agents/rules/core.md`          |
| **TypeScript 类型** | `.agents/rules/typescript.md`    |
| **API 开发**        | `.agents/rules/api.md`           |
| **组件开发**        | `.agents/rules/components.md`    |
| **平台兼容**        | `.agents/rules/platform.md`      |
| **加载/错误处理**   | `.agents/rules/loading-error.md` |
| **主题/颜色**       | `src/styles/theme.css`           |

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

### 涉及样式/颜色时

**强制参考**: `src/styles/theme.css`

- 品牌色/功能色必须使用 `theme.css` 中的 CSS Variables（如 `var(--color-primary)`），禁止硬编码十六进制色值
- 新增色值时先在 `theme.css` 定义变量，再引用
- 中性色（黑/白/灰）不受此限制

### 涉及 App UI 或用户可见流程时

**自动参考**: `test/README.md` + `test/flows/**`

涉及 `src/pages/**`、`src/components/**`、`src/pages.json`、路由、Tab、弹窗、表单、用户可见文案、设备管理、智能体管理、登录态相关交互时，完成代码改动后需要评估 Maestro UI 回归测试是否需要同步更新。

最终回复需要说明评估结果：

- 影响已有 flow：更新对应 `test/flows/**`。
- 新增稳定主流程：新增对应 flow。
- 涉及扫码、蓝牙、Wi-Fi、声纹、音频、真实硬件状态：记录为专项人工验证项。
- UI 变动影响选择器或断言文案：同步更新 flow 和 `test/.env.example` 中的测试数据说明。
- 当前一期 flow 面向中文 App 环境；国际化版本或非中文文案变动需要补充对应 locale 的 flow 或稳定测试标识。

运行前置条件：测试人已用 HBuilderX 将 App 真机运行到 Android 测试机，并停留在已登录后的 App 主界面，底部 TabBar 可见。

---

## 🛠️ 可用的技能 (Skills)

需要查阅官方文档和示例时参考：

- **uniapp-project** (`.agents/skills/uniapp-project/`)
  - uni-app 组件和 API 官方示例
  - 平台兼容性参考文档
- **typescript** (`.agents/skills/typescript/`)
  - TypeScript 性能优化
  - 类型系统最佳实践
- **i18n** (`.agents/skills/i18n/`)
  - 多语言 locale 维护、术语表、品牌 sync（mengdian / HiKbao）
  - 修改 `src/locale` 或 `linx-app-brand-configs` 下 locale 时必读

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
- ❌ 硬编码品牌色（必须使用 `theme.css` 中的 CSS Variables）
- ❌ 提交敏感信息
- ❌ 删除或省略正确的与改动无关的代码注释

---

## ✅ 提交前检查

- `pnpm lint` (检查代码质量问题)
- `pnpm lint:fix` (自动修复可修复的 lint 问题)
- `pnpm type-check`

> **注意**: 每次修改代码后必须运行 `pnpm lint` 确保无新增 lint 错误。提交前运行 `pnpm lint:fix` 自动修复，再运行 `pnpm type-check` 确认类型正确。
