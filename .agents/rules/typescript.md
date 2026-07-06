# TypeScript 规范

## 严格类型要求

- **严格类型**: 启用 `strict: true`，禁止使用 `any`
  - ⚠️ **历史遗留问题**: 项目中存在 `.js` 文件和 `// @ts-nocheck` 文件
  - 🔧 **迁移计划**: 逐步将 `.js` 迁移为 `.ts`，移除 `@ts-nocheck`
  - ✅ **新代码要求**: 所有新文件必须使用 TypeScript，严禁 `any`

## 类型定义位置

- API 响应类型: `src/api/types/`
- 全局类型: `src/types/`
- 组件 Props: 组件文件内定义

## 必须定义类型的场景

- 所有导出的函数参数和返回值
- 组件 props 和 emits
- API 请求和响应
- Pinia store state

## 类型导入

使用 `import type` 导入仅类型引用：

```typescript
import type { User } from '@/api/types/user';
```

## Props 定义示例

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
