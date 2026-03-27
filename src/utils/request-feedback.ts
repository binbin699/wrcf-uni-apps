export const GLOBAL_REQUEST_ERROR_EVENT = 'linx:request-error';
export const GLOBAL_REQUEST_ERROR_SELECTOR = 'global-request-error';

let globalRequestErrorPresenterCount = 0;

export interface GlobalRequestErrorPayload {
  message: string;
  requestId?: string;
}

export interface RequestHandledError extends Error {
  handledByRequest: true;
  requestId?: string;
  code?: number;
  statusCode?: number;
  response?: unknown;
}

interface RequestHandledErrorOptions {
  message: string;
  requestId?: string;
  code?: number;
  statusCode?: number;
  response?: unknown;
}

export function emitGlobalRequestError(payload: GlobalRequestErrorPayload): void {
  if (globalRequestErrorPresenterCount === 0) {
    uni.showToast({
      title: buildGlobalRequestErrorMessage(payload),
      icon: 'none',
      duration: 3500
    });
    return;
  }

  uni.$emit(GLOBAL_REQUEST_ERROR_EVENT, payload);
}

export function registerGlobalRequestErrorPresenter(): () => void {
  globalRequestErrorPresenterCount += 1;

  return () => {
    globalRequestErrorPresenterCount = Math.max(0, globalRequestErrorPresenterCount - 1);
  };
}

export function createRequestHandledError(
  options: RequestHandledErrorOptions
): RequestHandledError {
  const error = new Error(options.message) as RequestHandledError;
  error.name = 'RequestHandledError';
  error.handledByRequest = true;
  error.requestId = options.requestId;
  error.code = options.code;
  error.statusCode = options.statusCode;
  error.response = options.response;
  return error;
}

export function isRequestHandledError(error: unknown): error is RequestHandledError {
  return error instanceof Error && 'handledByRequest' in error && error.handledByRequest === true;
}

export function buildGlobalRequestErrorMessage(payload: GlobalRequestErrorPayload): string {
  if (!payload.requestId) {
    return payload.message;
  }

  return `${payload.message}\nID: ${payload.requestId}`;
}
