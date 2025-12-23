const STORAGE_KEY = 'userGuideState';

interface UserGuideState {
  squareBindGuideCompleted?: boolean;
}

function readState(): UserGuideState {
  try {
    const stored = uni.getStorageSync(STORAGE_KEY);
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
    uni.setStorageSync(STORAGE_KEY, state);
  } catch (error) {
    console.warn('[userGuide] write state failed', error);
  }
}

export function completeSquareBindGuide(): void {
  const state = readState();
  state.squareBindGuideCompleted = true;
  writeState(state);
}

