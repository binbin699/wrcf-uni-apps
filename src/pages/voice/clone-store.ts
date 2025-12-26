import { ref } from 'vue';
import i18n from '@/locale';

const $t = i18n.global.t;

export enum audioSrc {
  Upload = 'upload',
  Record = 'record'
}

export const audioSrcName: Record<audioSrc, string> = {
  [audioSrc.Upload]: $t('voice_clone.select_file'),
  [audioSrc.Record]: $t('voice_clone.record')
};

// 音频源选项 - 始终显示两个Tab
export const audioSrcOptions = [audioSrc.Upload, audioSrc.Record];

// 当前选中的音频源tab - 默认选择文件
export const curAudioSrc = ref<audioSrc>(audioSrc.Upload);
