import type { BaseResponse } from '@/types/request';

/**
 * 教程资源数据结构
 */
export interface TutorialResource {
  /** 实际返回的语言码 */
  languageCode: string;
  /** 说明书 PDF 链接，后台未配置时为 null */
  manualUrl: string | null;
  /** 教程视频链接，后台未配置时为 null */
  tutorialVideoUrl: string | null;
  /** true 表示未命中请求语言，已降级到其他语言 */
  fallback: boolean;
}

export type TutorialResourceResponse = BaseResponse<TutorialResource>;
