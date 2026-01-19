import { ref } from 'vue';
// @ts-ignore
import { deviceApi } from '@/api/index';
import { isSquareOverlayDismissed } from './userGuide';

// 广场 Tab 的索引（从 0 开始）
const SQUARE_TAB_INDEX = 2;

// 响应式状态，供自定义 TabBar 使用
export const showSquareBadge = ref(false);

/**
 * 检查是否有未绑定智能体的设备，并更新广场 Tab 的红点状态
 * 红点显示逻辑：
 * - 有未绑定智能体的设备 且 用户未点击过"知道了"按钮时显示红点
 * - 点击"知道了"后红点消失
 */
export async function updateSquareTabBadge(): Promise<void> {
    try {
        const result = await deviceApi.getList();
        if (result.code === 1000 && Array.isArray(result.data)) {
            const hasUnboundDevice = result.data.some((device: any) => !device.agentName);
            // 只有在有未绑定设备 且 用户未点击过"知道了"时才显示红点
            const overlayDismissed = isSquareOverlayDismissed();
            const shouldShowBadge = hasUnboundDevice && !overlayDismissed;
            showSquareBadge.value = shouldShowBadge;

            // 同时更新原生 TabBar（兼容性）
            if (shouldShowBadge) {
                uni.showTabBarRedDot({ index: SQUARE_TAB_INDEX });
            } else {
                uni.hideTabBarRedDot({ index: SQUARE_TAB_INDEX });
            }
        }
    } catch (error) {
        console.warn('[updateSquareTabBadge] 获取设备列表失败:', error);
        showSquareBadge.value = false;
        uni.hideTabBarRedDot({ index: SQUARE_TAB_INDEX });
    }
}
