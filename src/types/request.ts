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
