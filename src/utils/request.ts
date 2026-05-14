import { useTokenStore } from '@/store/token';
import { useUserStore } from '@/store/user';
import type { BaseResponse, UploadOptions, UploadResponse } from '@/types/request';
import { PageMap, Pages } from './route';
import { getLocale } from '@/locale/index';
import i18n from '@/locale';
import { createRequestHandledError, emitGlobalRequestError } from './request-feedback';

const $t = i18n.global.t;

/**
 * 请求配置接口
 */
interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  showLoading?: boolean;
  timeout?: number;
}

/**
 * 请求响应接口
 */
interface RequestResponse<T = any> extends BaseResponse<T> { }

/**
 * 网络请求封装类
 * 重构后的版本，使用token store管理认证状态
 */
class Request {
  private baseURL: string;
  private timeout: number;
  private retryCount: Map<string, number>;
  private tokenStore: ReturnType<typeof useTokenStore> | null;

  constructor() {
    this.baseURL = APP_CONFIG.BASE_API_URL;
    this.timeout = 10000;
    this.retryCount = new Map();
    this.tokenStore = null;
  }

  /**
   * 更新BASE_URL的方法（用于扫码后更新地址）
   */
  updateBaseURL(newURL: string): void {
    if (newURL) {
      uni.setStorageSync('scannedBaseURL', newURL);
      this.baseURL = newURL;
    }
  }

  private rejectWithGlobalError(options: {
    message: string;
    requestId?: string;
    code?: number;
    statusCode?: number;
    response?: unknown;
    reject: (reason?: unknown) => void;
  }): void {
    emitGlobalRequestError({
      message: options.message,
      requestId: options.requestId
    });

    options.reject(
      createRequestHandledError({
        message: options.message,
        requestId: options.requestId,
        code: options.code,
        statusCode: options.statusCode,
        response: options.response
      })
    );
  }

  private resolveRequestId(headers: unknown): string | undefined {
    if (!headers || typeof headers !== 'object') {
      return undefined;
    }

    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (key.toLowerCase() !== 'x-request-id') {
        continue;
      }

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private async getHeader(
    header?: Record<string, string>,
    skipToken: boolean = false
  ): Promise<Record<string, string>> {
    // 构建基础请求头
    // Accept-Language: UI 界面语言（用于展示类接口的 i18n）
    // System-Language: 设备系统语言（用于匹配用户母语相关的业务逻辑，如绑定默认 Agent）
    const headers: Record<string, string> = {
      'Accept-Language': getLocale(),
      'System-Language': uni.getSystemInfoSync().language || '',
      ...header
    };

    // 某些开放接口（登录/刷新token等）不需要携带鉴权头，避免递归阻塞
    if (skipToken) {
      // 强制移除可能存在的 Authorization
      if ('Authorization' in headers) delete headers.Authorization;
      return headers;
    }

    // 获取有效的访问token
    let token: string | null = null;
    try {
      token = await this.tokenStore!.getValidAccessToken();
    } catch (error) {
      console.error('获取访问token失败:', error);
      this.handleAuthError();
      throw error;
    }

    // 添加token到请求头
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 判断是否为免鉴权接口（登录/刷新token等）
   */
  private isAuthFreeUrl(url: string): boolean {
    // 统一认为 /app/user/login/* 下的接口为免鉴权
    // 另留有 /admin/open/* 作为后台开放接口（当前项目未在小程序侧使用，可保守处理）
    return url.startsWith('/app/user/login/');
  }

  /**
   * 生成请求唯一标识
   */
  private generateRequestKey(options: RequestOptions): string {
    return `${options.method || 'GET'}_${options.url}_${JSON.stringify(options.data || {})}`;
  }

  /**
   * 处理认证错误
   */
  private handleAuthError(): void {
    // 在清除 token 前，检查是否是曾经登录过的用户
    const userStore = useUserStore();
    const wasLoggedIn = userStore.userId > 0;

    this.tokenStore!.clearTokens();

    uni.showToast({
      title: $t('common.login_expired'),
      icon: 'none',
      duration: 2000
    });

    // #ifdef MP-WEIXIN
    if (wasLoggedIn) {
      // 返回用户：直接跳登录页，跳过设备引导
      uni.reLaunch({
        url: PageMap[Pages.Login].url
      });
    } else {
      // 全新用户：走正常的落地页流程
      uni.reLaunch({
        url: PageMap[Pages.MpLanding].url
      });
    }
    // #endif

    // #ifndef MP-WEIXIN
    // 非小程序端：直接跳转登录页
    uni.redirectTo({
      url: PageMap[Pages.Login].url
    });
    // #endif
  }

  /**
   * 核心请求方法
   */
  async request<T = any>(options: RequestOptions): Promise<RequestResponse<T>> {
    if (!this.tokenStore) {
      this.tokenStore = useTokenStore();
    }

    const requestKey = this.generateRequestKey(options);
    const currentRetry = this.retryCount.get(requestKey) || 0;

    // 如果重试次数超过3次，直接拒绝
    if (currentRetry >= 3) {
      this.retryCount.delete(requestKey);
      throw new Error('请求重试次数过多');
    }

    const skipToken = this.isAuthFreeUrl(options.url);
    const header: Record<string, string> = await this.getHeader(options.header, skipToken);

    header['Content-Type'] = 'application/json';

    // 显示加载提示
    if (options.showLoading !== false) {
      uni.showLoading({
        title: $t('common.loading'),
        mask: true
      });
    }

    return new Promise<RequestResponse<T>>((resolve, reject) => {
      console.log('request', this.baseURL + options.url, options.data);
      uni.request({
        url: this.baseURL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: header,
        timeout: options.timeout || this.timeout,
        success: (res) => {
          if (options.showLoading !== false) {
            uni.hideLoading();
          }

          const response = res.data as RequestResponse<T>;
          if (res.statusCode === 200) {
            // 成功
            if (response.code === 1000 || response.code === 200) {
              // 请求成功，清除重试计数
              this.retryCount.delete(requestKey);
              resolve(response);
              // 通用错误，直接抛出错误
            } else if (response.code === 1001) {
              // Token过期，尝试刷新token再重试
              if (
                response.message.includes('登录失效') ||
                (this.tokenStore!.shouldRefreshToken && !this.tokenStore!.isRefreshing)
              ) {
                this.tokenStore!.preRefreshToken()
                  .then((refreshSuccess) => {
                    if (refreshSuccess) {
                      // 增加重试计数
                      this.retryCount.set(requestKey, currentRetry + 1);
                      // 重新执行当前请求
                      this.request<T>(options).then(resolve).catch(reject);
                    } else {
                      this.handleAuthError();
                      reject(response);
                      return;
                    }
                  })
                  .catch(() => {
                    this.handleAuthError();
                    reject(response);
                  });
              } else {
                // 否则直接抛出错误
                reject(new Error(response.message));
                return;
              }
              // 验证异常
            } else if (response.code === 1002) {
              // 验证异常，直接抛出错误
              reject(new Error(response.message));
              return;
            } else if (response.code === 2003 || response.code === 2002) {
              // Token无效或权限不足，跳转到登录页
              this.handleAuthError();
              reject(response);
            } else {
              const reqId = this.resolveRequestId(res.header);
              const msg = response.message || $t('common.request_failed');
              this.rejectWithGlobalError({
                message: msg,
                requestId: reqId,
                code: response.code,
                statusCode: res.statusCode,
                response,
                reject
              });
            }
          } else {
            const reqId = this.resolveRequestId(res.header);
            const msg = response.message || $t('common.network_error');
            this.rejectWithGlobalError({
              message: msg,
              requestId: reqId,
              statusCode: res.statusCode,
              response: res,
              reject
            });
          }
        },
        fail: (err) => {
          if (options.showLoading !== false) {
            uni.hideLoading();
          }
          this.rejectWithGlobalError({
            message: $t('common.network_error'),
            response: err,
            reject
          });
        }
      });
    });
  }

  /**
   * GET请求
   * @param url 请求地址
   * @param options 可选参数，可以是 data 或者 { data, headers }
   */
  get<T = any>(url: string, options: any = {}): Promise<RequestResponse<T>> {
    // 兼容旧调用方式：request.get(url, data)
    // 新调用方式：request.get(url, { data, headers })
    const hasHeaders =
      options && typeof options === 'object' && ('headers' in options || 'data' in options);

    if (hasHeaders) {
      return this.request<T>({
        url,
        method: 'GET',
        data: options.data || {},
        header: options.headers
      });
    } else {
      return this.request<T>({
        url,
        method: 'GET',
        data: options
      });
    }
  }

  /**
   * POST请求
   * @param url 请求地址
   * @param data 请求数据
   * @param options 可选参数，包括 timeout、showLoading 等
   */
  post<T = any>(
    url: string,
    data: any = {},
    options?: { timeout?: number; showLoading?: boolean }
  ): Promise<RequestResponse<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      data,
      timeout: options?.timeout,
      showLoading: options?.showLoading
    });
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data: any = {}): Promise<RequestResponse<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      data
    });
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string, data: any = {}): Promise<RequestResponse<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      data
    });
  }

  /**
   * 通用文件上传方法
   */
  async upload(options: UploadOptions): Promise<UploadResponse> {
    if (!this.tokenStore) {
      this.tokenStore = useTokenStore();
    }

    const skipToken = this.isAuthFreeUrl(options.url);
    const header = await this.getHeader(options.header, skipToken);

    // 显示加载提示
    if (options.showLoading !== false) {
      uni.showLoading({
        title: $t('common.uploading'),
        mask: true
      });
    }

    return new Promise<UploadResponse>((resolve, reject) => {
      const uploadTask = uni.uploadFile({
        url: this.baseURL + options.url,
        filePath: options.filePath,
        name: options.name || `${options.filePath.split('/').pop()}-${Date.now()}`,
        header: header,
        timeout: options.timeout || this.timeout,
        success: (res) => {
          if (options.showLoading !== false) {
            uni.hideLoading();
          }

          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(res.data) as UploadResponse;

              if (response.code === 1000) {
                resolve(response);
              } else if (response.code === 1001) {
                // Token过期，尝试刷新token再重试
                if (
                  response.message.includes('登录失效') ||
                  (this.tokenStore!.shouldRefreshToken && !this.tokenStore!.isRefreshing)
                ) {
                  this.tokenStore!.preRefreshToken()
                    .then((refreshSuccess) => {
                      if (refreshSuccess) {
                        this.upload(options).then(resolve).catch(reject);
                      } else {
                        this.handleAuthError();
                        reject(response);
                      }
                    })
                    .catch(() => {
                      this.handleAuthError();
                      reject(response);
                    });
                }
              } else {
                this.rejectWithGlobalError({
                  message: $t('common.upload_failed'),
                  code: response.code,
                  statusCode: res.statusCode,
                  response,
                  reject
                });
              }
            } catch (e) {
              console.error('上传解析响应失败:', e);
              this.rejectWithGlobalError({
                message: $t('common.upload_failed'),
                statusCode: res.statusCode,
                response: e,
                reject
              });
            }
          } else {
            if (options.showLoading !== false) {
              uni.hideLoading();
            }
            this.rejectWithGlobalError({
              message: $t('common.upload_failed'),
              statusCode: res.statusCode,
              response: res,
              reject
            });
          }
        },
        fail: (err) => {
          if (options.showLoading !== false) {
            uni.hideLoading();
          }
          this.rejectWithGlobalError({
            message: $t('common.upload_failed'),
            response: err,
            reject
          });
        }
      });

      // 监听上传进度
      if (options.onProgress) {
        uploadTask.onProgressUpdate((res) => {
          const progress = Math.round((res.progress / 100) * 100);
          options.onProgress!(progress);
        });
      }
    });
  }

  /**
   * 上传音频文件
   */
  async uploadAudio(
    url: string,
    filePath: string,
    options?: Partial<UploadOptions>
  ): Promise<UploadResponse> {
    const fileName = filePath
      .split('/')
      .pop()
      ?.replace(/\.durationTime=\d+/g, '');

    return this.upload({
      url,
      filePath,
      name: fileName,
      ...options
    });
  }
}

// 导出请求实例
export default new Request();
