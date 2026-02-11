# 加载状态与错误处理

## 加载状态标准

选择合适的加载方式：

| 场景 | 推荐方式 | 示例 |
|------|---------|------|
| 页面初始加载数据 | 局部 `loading = ref(false)` | `<view v-if="loading">加载中...</view>` |
| 表单提交/登录 | 按钮 `:loading` 属性 | `<wd-button :loading="submitting">提交</wd-button>` |
| 全局操作 (文件上传) | `uni.showLoading()` | `uni.showLoading({ title: '上传中' })` |
| Store 异步操作 | Store 状态 `isLoading` | `userStore.isLoading` |

## 错误处理标准模式

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

## 错误提示选择

- ✅ 用户操作失败: `toast.error()` (wot-design-uni)
- ✅ 成功提示: `toast.success()`
- ✅ 需要用户确认的错误: `uni.showModal()`
- ✅ 网络/系统错误: 在 `request.ts` 中统一处理
- ❌ 避免: 静默失败 (必须给用户反馈)

## 日志规范

```typescript
// 错误日志格式
console.error('[模块名/操作名] 失败:', error);
console.error('[AgentAPI/创建智能体] 失败:', error);
```
