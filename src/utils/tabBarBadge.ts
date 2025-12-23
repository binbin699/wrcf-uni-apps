import { ref } from 'vue';
// @ts-ignore
import { deviceApi } from '@/api/index.js';

// 广场 Tab 的索引（从 0 开始）
const SQUARE_TAB_INDEX = 2;

// 响应式状态，供自定义 TabBar 使用
export const showSquareBadge = ref(false);

/**
 * 检查是否有未绑定智能体的设备，并更新广场 Tab 的红点状态
 */
export async function updateSquareTabBadge(): Promise<void> {
    try {
        const result = await deviceApi.getList();
        if (result.code === 1000 && Array.isArray(result.data)) {
            const hasUnboundDevice = result.data.some((device: any) => !device.agentName);
            showSquareBadge.value = hasUnboundDevice;

            // 同时更新原生 TabBar（兼容性）
            if (hasUnboundDevice) {
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
