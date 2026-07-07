import {useTokenStore} from "@/store";

/**
 * 基础API响应结构
 */
export interface BaseResponse<T = any> {
  code: number;
  message: string;
  data: T;
}
/**
 * 上传文件配置接口
 */
export interface UploadOptions {
  url: string;
  filePath: string;
  name?: string;
  header?: Record<string, string>;
  showLoading?: boolean;
  onProgress?: (progress: number) => void;
  timeout?: number;
}

export interface UploadResponseData {
  filename: string;
  /**
   * 文件大小，不一定有，可能为0
   */
  size: number;
  /**
   * mimetype文件类型，例如"audio/wave"
   */
  type: string;
  /**
   * 上传后的文件访问URL
   */
  url: string;
}

/**
 * 上传响应接口
 */
export type UploadResponse = BaseResponse<UploadResponseData>;
// ... existing code ...
class Request {
  private baseURL: string;
  private timeout: number;
  private retryCount: Map<string, number>;
  private tokenStore: ReturnType<typeof useTokenStore> | null;
  private uploadDomain: string;

  constructor() {
    this.baseURL = APP_CONFIG.BASE_API_URL;
    this.timeout = 10000;
    this.retryCount = new Map();
    this.tokenStore = null;
    // 使用配置的上传域名，如果没有配置则使用 BASE_API_URL
    this.uploadDomain = APP_CONFIG.UPLOAD_DOMAIN || APP_CONFIG.BASE_API_URL;
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

  /**
   * 更新上传域名（用于动态配置）
   */
  updateUploadDomain(newDomain: string): void {
    if (newDomain) {
      this.uploadDomain = newDomain;
    }
  }
}

