import request from '@/utils/request';

export const common = {
  // 获取配置信息
  getConfig() {
    return request.get('/app/comm/param?key=config');
  },

  // 通用文件上传
  uploadFile(filePath: string) {
    return request.upload({
      url: '/app/comm/upload',
      filePath: filePath
    });
  },

  // 音频文件上传（专用于音色复刻）
  uploadAudioFile(filePath: string) {
    return request.uploadAudio('/app/voice/uploadAudio', filePath);
  }
};

export default common;
