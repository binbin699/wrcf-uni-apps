# 组件开发规范

## 组件库优先级

1. **uni-app 内置组件** (view, text, button, image, scroll-view)
2. **wot-design-uni** (主要) - `<wd-toast />`, `<wd-button>`, `<wd-icon>`
3. **uni-ui** (备选)
4. **自定义组件**

## wot-design-uni 使用

```vue
<template>
  <!-- 页面顶部声明 toast -->
  <wd-toast />
  
  <!-- 使用组件 -->
  <wd-icon name="arrow-left" size="44rpx" />
  <wd-button type="primary" :loading="submitting">
    提交
  </wd-button>
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

## 页面组件化原则

### 必须拆分的场景

- 弹窗/抽屉 (Modal/Drawer)
- 卡片组件 (Card)
- 列表项 (ListItem)
- 循环渲染的元素
- 表单模块
- 独立功能模块

### 组件位置

- **公共组件**: `src/components/`
- **页面专用组件**: `src/pages/[page]/components/`

### 示例结构

```
src/pages/agent/
├── index.vue                  # 主页面，组合组件
├── components/
│   ├── AgentCard.vue          # 智能体卡片 (循环渲染)
│   ├── FilterDrawer.vue       # 筛选抽屉 (弹窗)
│   ├── SearchBar.vue          # 搜索栏
│   └── CreateModal.vue        # 创建弹窗
├── composables/               # 可复用逻辑
│   └── useTemplateSelector.ts
├── store.ts                   # 页面级状态 (可选)
└── types.ts                   # 页面类型 (可选)
```

### 主文件职责

`index.vue` 只负责：
- 组合各个组件
- 页面级逻辑和状态
- 路由参数处理

**保持简洁，避免臃肿！**

## Composables 模式

- **位置**: `src/pages/[page]/composables/useXxx.ts`
- **命名**: 使用 `use` 前缀
- **用途**: 页面内多个组件共享的逻辑、可复用的状态管理

**示例**:
```typescript
// src/pages/agent/composables/useTemplateSelector.ts
import { ref, type Ref } from 'vue';

export function useTemplateSelector(
  formData: Ref<{ langCode: string }>,
  $t: (key: string) => string
) {
  const modalVisible = ref(false);
  const templates = ref<any[]>([]);
  
  async function loadTemplates() {
    // 逻辑实现
  }
  
  return {
    modalVisible,
    templates,
    loadTemplates
  };
}
```

**使用**:
```vue
<script setup lang="ts">
import { useTemplateSelector } from './composables/useTemplateSelector';

const { modalVisible, loadTemplates } = useTemplateSelector(formData, $t);
</script>
```

## 组件命名

使用 PascalCase：

```
✅ AgentCard.vue
✅ VoiceSelector.vue
❌ agent-card.vue
❌ voiceSelector.vue
```

## 样式规范

- **必须使用 scoped**
- **单位**: 响应式用 `rpx`，固定尺寸用 `px`
- **颜色变量**: 使用 `src/uni.scss` 中定义的变量

```vue
<style lang="scss" scoped>
.container {
  padding: 20rpx;
  background: var(--wd-color-white);
}
</style>
```
