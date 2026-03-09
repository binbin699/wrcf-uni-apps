import request from '@/utils/request';
import type { TutorialResource } from './types/tutorial';

export const tutorialApi = {
  /**
   * 获取教程资源（说明书 + 教程视频）
   * @param languageCode 系统语言码，如 zh_CN、en_US，不传默认 en
   */
  getTutorialResource(languageCode?: string) {
    return request.get<TutorialResource>('/app/tutorial/resource', {
      data: languageCode ? { languageCode } : {}
    });
  }
};
