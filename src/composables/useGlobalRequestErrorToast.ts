import { onMounted, onUnmounted } from 'vue';
import { onHide, onShow, onUnload } from '@dcloudio/uni-app';
import {
  buildGlobalRequestErrorMessage,
  GLOBAL_REQUEST_ERROR_EVENT,
  registerGlobalRequestErrorPresenter,
  type GlobalRequestErrorPayload
} from '@/utils/request-feedback';

interface ToastLike {
  show: (options: {
    msg: string;
    iconName: 'error';
    direction: 'horizontal';
    position: 'middle-top';
    duration: number;
    zIndex: number;
  }) => void;
}

function resolveDuration(message: string): number {
  const duration = 2600 + message.length * 22;
  return Math.min(5200, Math.max(3200, duration));
}

export function useGlobalRequestErrorToast(toast: ToastLike): void {
  let isActive = false;
  let unregisterPresenter: (() => void) | null = null;

  const activatePresenter = () => {
    if (isActive) {
      return;
    }

    isActive = true;
    unregisterPresenter = registerGlobalRequestErrorPresenter();
  };

  const deactivatePresenter = () => {
    if (!isActive) {
      return;
    }

    isActive = false;
    unregisterPresenter?.();
    unregisterPresenter = null;
  };

  const handleGlobalRequestError = (payload: GlobalRequestErrorPayload) => {
    if (!isActive) {
      return;
    }

    const message = buildGlobalRequestErrorMessage(payload);
    toast.show({
      msg: message,
      iconName: 'error',
      direction: 'horizontal',
      position: 'middle-top',
      duration: resolveDuration(message),
      zIndex: 3000
    });
  };

  onMounted(() => {
    activatePresenter();
    uni.$on(GLOBAL_REQUEST_ERROR_EVENT, handleGlobalRequestError);
  });

  onUnmounted(() => {
    uni.$off(GLOBAL_REQUEST_ERROR_EVENT, handleGlobalRequestError);
    deactivatePresenter();
  });

  onShow(() => {
    activatePresenter();
  });

  onHide(() => {
    deactivatePresenter();
  });

  onUnload(() => {
    deactivatePresenter();
  });
}
