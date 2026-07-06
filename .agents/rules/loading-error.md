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

> **核心原则：一次失败操作最多只出现一条错误提示**
>
> - **API 错误**：由 `request.ts` 请求封装层统一分发，由全局 Wot UI 错误提示组件展示
> - **业务层 catch**：❌ 不得重复弹错误 toast，只做日志记录和状态清理
> - **非 API 错误**（本地校验、蓝牙/文件系统错误）：业务层自行弹 toast

```typescript
// ✅ 推荐: 统一的错误处理模式（API 错误由 request.ts 统一弹 toast）
try {
  uni.showLoading({ title: $t('common.loading'), mask: true });
  const result = await someApi();
  toast.success($t('common.success'));
} catch (error: any) {
  // ✅ 只记录日志，不重复 showToast（request.ts 已弹过）
  console.error('[模块名/操作名] 失败:', error);
} finally {
  uni.hideLoading();
}

// ✅ 本地/非 API 错误：自行弹 toast
if (!audioPath) {
  uni.showToast({
    title: $t('voice_clone.select_audio_or_record'),
    icon: 'none'
  });
  return;
}
```

## 错误提示选择

- ✅ 用户操作失败 (API): 由 `request.ts` 统一触发全局 Wot UI 错误提示，可携带请求 ID
- ✅ 成功提示: `toast.success()` 或 `uni.showToast({ icon: 'success' })`
- ✅ 本地校验/非 API 错误: 业务层自行弹
- ✅ 需要用户确认的错误: `uni.showModal()`
- ❌ 避免: API 错误在业务层重复弹 toast（双重提示）
- ❌ 避免: 静默失败（必须给用户反馈）

## 日志规范

```typescript
// 错误日志格式
console.error('[模块名/操作名] 失败:', error);
console.error('[AgentAPI/创建智能体] 失败:', error);
```
