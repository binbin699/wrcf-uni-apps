import { ref } from 'vue';

// 广场 Tab 小红点已移除（设备状态页已有绑定入口引导）
// 保留导出以兼容残留引用，后续可安全删除此文件
export const showSquareBadge = ref(false);

export async function updateSquareTabBadge(): Promise<void> {
  // no-op: 小红点功能已移除
}
