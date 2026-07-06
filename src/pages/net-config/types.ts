import i18n from '@/locale';

const $t = i18n.global.t;

export type CnfigPageOptions = {
  /**
   * 配置WiFi的方式
   */
  method: ConfigWifiMethod;

  /**
   * 是否自动播放（声波配网）
   */
  autoplay: boolean;

  /**
   * 是否循环播放（声波配网）
   */
  loopPlay: boolean;

  /**
   * 播放音频URL（声波配网）
   */
  audioUrl: string | null;
};

export enum ConfigWifiMethod {
  SoundWave = 'soundwave'
}

export const methodName: Record<ConfigWifiMethod, string> = {
  [ConfigWifiMethod.SoundWave]: $t('net_config.soundwave')
};

export const methodOptions = Object.values(ConfigWifiMethod);

export type FileInfo = {
  dir: string;
  filePrefix: string;
  fileName: string;
  filePath: string;
};

export const DEFAULT_WIFI_CONFIG: CnfigPageOptions = {
  method: ConfigWifiMethod.SoundWave,
  autoplay: true,
  loopPlay: true,
  audioUrl: null
};
