import { useUserStore } from '@/store';

const STORAGE_KEY_PREFIX = 'userGuideState';

interface UserGuideState {
  squareBindGuideCompleted?: boolean;
  // 是否已经看过首次蒙层提示（点击了"知道了"按钮）
  squareOverlayDismissed?: boolean;
}

/**
 * 获取当前用户的存储 key
 * 格式：userGuideState_${userId}
 */
function getStorageKey(): string {
  const userStore = useUserStore();
  const userId = userStore.userId;
  console.log('[userGuide] getStorageKey - userId:', userId);
  if (userId && userId > 0) {
    return `${STORAGE_KEY_PREFIX}_${userId}`;
  }
  // 未登录时使用默认 key
  return STORAGE_KEY_PREFIX;
}

function readState(): UserGuideState {
  try {
    const key = getStorageKey();
    const stored = uni.getStorageSync(key);
    console.log('[userGuide] readState - key:', key, 'stored:', stored);
    if (stored && typeof stored === 'object') {
      return { ...stored } as UserGuideState;
    }
  } catch (error) {
    console.warn('[userGuide] read state failed', error);
  }
  return {};
}

function writeState(state: UserGuideState) {
  try {
    const key = getStorageKey();
    uni.setStorageSync(key, state);
  } catch (error) {
    console.warn('[userGuide] write state failed', error);
  }
}

export function completeSquareBindGuide(): void {
  const state = readState();
  state.squareBindGuideCompleted = true;
  writeState(state);
}

/**
 * 检查是否已经关闭过首次蒙层提示
 */
export function isSquareOverlayDismissed(): boolean {
  const state = readState();
  return state.squareOverlayDismissed === true;
}

/**
 * 标记首次蒙层提示已关闭（点击了"知道了"按钮）
 */
export function dismissSquareOverlay(): void {
  const state = readState();
  state.squareOverlayDismissed = true;
  writeState(state);
}

/**
 * 重置用户引导状态（用于测试）
 */
export function resetUserGuideState(): void {
  const key = getStorageKey();
  console.log('[userGuide] 重置用户引导状态, key:', key);
  uni.removeStorageSync(key);
}

