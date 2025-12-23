import { ref } from 'vue';
import i18n from '@/locale';

const $t = i18n.global.t;

export enum audioSrc {
  Record = 'record',
  // todo：当前仅小程序支持上传文件
  // #ifdef MP-WEIXIN
  Upload = 'upload'
  // #endif
}

export const audioSrcName = (() => {
  // @ts-ignore todo：当前仅小程序支持上传文件
  let name: Record<audioSrc, string> = {
    [audioSrc.Record]: $t('voice_clone.record_voice')
    // [audioSrcTab.Upload]: $t('voice_clone.select_file')
  };

  // #ifdef MP-WEIXIN
  name[audioSrc.Upload] = $t('voice_clone.select_file_wx');
  // #endif

  // // #ifdef APP-PLUS || APP-HARMONY
  // name[audioSrcTab.Upload] = $t('voice_clone.select_file_app');
  // // #endif
  return name;
})();

export const audioSrcOptions = Object.values(audioSrc);

// 当前选中的音频源tab
export const curAudioSrc = ref<audioSrc>(audioSrc.Record);
