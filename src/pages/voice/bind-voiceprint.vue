<template>
  <wd-toast></wd-toast>
  <wd-notify />
  <wd-gap></wd-gap>

  <wd-card :title="$t('bind_voiceprint.title')">
    <wd-divider>
      <text class="duration">
        {{ $t('voice_clone.record_duration') }}:
        {{ AudioRecorderManager.formatDuration(recordDuration) }}
      </text>
    </wd-divider>

    <wd-gap></wd-gap>
    <wd-row :gutter="24">
      <wd-col :span="12">
        <wd-button :type="isRecording ? 'error' : 'primary'" @click="toggleRecording">
          {{
            isRecording
              ? $t('bind_voiceprint.stop_recording')
              : $t('bind_voiceprint.start_recording')
          }}
        </wd-button>
      </wd-col>
      <wd-col :span="12">
        <wd-button
          outline
          :disabled="!lastUploadUrl || isRecording"
          :type="isPlaying ? 'warning' : 'default'"
          @click="togglePlay">
          {{ isPlaying ? $t('bind_voiceprint.stop_play') : $t('bind_voiceprint.play') }}
        </wd-button>
      </wd-col>
    </wd-row>
    <wd-gap></wd-gap>
    <wd-row :gutter="24">
      <wd-col>
        <wd-button
          block
          :disabled="!recordFile || uploading"
          type="primary"
          @click="bindVoiceprint">
          {{ $t('bind_voiceprint.bind') }}
        </wd-button>
      </wd-col>
    </wd-row>
  </wd-card>
</template>

<script setup lang="ts">
// todo
// @ts-ignore
import { deviceApi, commonApi } from '@/api/index';
import AudioPlayerManager from '@/utils/audioPlayer';
import AudioRecorderManager from '@/utils/audioRecorder';
import { PageMap, Pages } from '@/utils/route';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';
import { requestRecordPermission } from '@/utils/permission';

const toast = useToast();
useGlobalRequestErrorToast(toast);
const { showNotify, closeNotify } = useNotify();
const { t: $t } = useI18n();

// 需要绑定声纹的设备ID
const deviceId = ref<number | null>(null);

// 录音相关
const audioRecorder = ref<AudioRecorderManager | null>(null);
const isRecording = ref(false);
const recordDuration = ref(0);
const recordFile = ref<string | null>(null);
const recordFileName = ref<string | null>(null);
const recordFileSize = ref<string | null>(null);

// 音频播放相关
const audioPlayer = ref<AudioPlayerManager | null>(null);
const isPlaying = ref(false);

// 执行状态
const uploading = ref(false);
const lastUploadUrl = ref('');
const lastUploadFile = ref('');

onLoad((options: any) => {
  initManagers();

  if (options.deviceId) {
    if (typeof options.deviceId === 'string') {
      deviceId.value = Number(options.deviceId);
    } else {
      deviceId.value = options.deviceId;
    }
  } else {
    uni.redirectTo({ url: PageMap[Pages.DeviceManage].url });
  }
});

onUnload(() => {
  cleanup();
});

// 切换录音状态
async function toggleRecording() {
  if (!audioRecorder.value) {
    return;
  }

  // 如果正在录音，直接停止
  if (isRecording.value) {
    audioRecorder.value.toggle();
    isRecording.value = false;
    return;
  }

  // 开始录音前请求权限
  const permissionResult = await requestRecordPermission({
    show: showNotify,
    close: closeNotify
  });
  if (!permissionResult.granted) {
    // 权限请求工具已经显示了相应的提示
    return;
  }

  audioRecorder.value.toggle();
  isRecording.value = true;
}

function togglePlay() {
  if (recordFile.value && audioPlayer.value) {
    audioPlayer.value.toggle(recordFile.value);
  }
}

// 初始化管理器
function initManagers() {
  // 初始化音频播放器
  audioPlayer.value = AudioPlayerManager.getInstance(
    {
      autoStop: true,
      loop: false,
      volume: 1
    },
    {
      onPlay: (audio) => {
        isPlaying.value = true;
        console.log('音频开始播放:', audio);
      },
      onStop: (audio) => {
        isPlaying.value = false;
        console.log('音频停止播放:', audio);
      },
      onEnded: (audio) => {
        isPlaying.value = false;
        console.log('音频播放结束:', audio);
      },
      onError: (error, audio) => {
        isPlaying.value = false;
        console.error('音频播放失败:', error);
        toast.warning({
          msg: $t('voice_clone.play_failed'),
          duration: 2000
        });
      }
    }
  );
  // 初始化录音管理器
  audioRecorder.value = AudioRecorderManager.getInstance(
    {
      duration: 10000, // 最长10秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    },
    {
      onStart: () => {
        console.log('录音开始');
        // 清除之前的音频文件
        cleanForm();
        isRecording.value = true;
      },
      onStop: (result) => {
        console.log('录音结束', result);
        isRecording.value = false;
        recordFile.value = result.tempFilePath;
        recordFileName.value = `${new Date().getTime()}.${result.fileExtension || 'mp3'}`;
        recordFileSize.value = AudioRecorderManager.formatFileSize(result.fileSize);
      },
      onError: (error) => {
        isRecording.value = false;
        recordDuration.value = 0;
        console.error('录音错误', error);
        toast.warning({
          msg: $t('voice_clone.record_failed'),
          duration: 2000
        });
      },
      onDurationUpdate: (duration) => {
        recordDuration.value = duration;
      }
    }
  );
}

// 上传音频文件
async function upload(audioPath: string) {
  toast.loading({
    loadingType: 'ring',
    msg: $t('voice_clone.uploading_audio')
  });
  console.log('开始上传音频文件，路径:', audioPath);

  const uploadResult = await commonApi.uploadAudioFile(audioPath);
  console.log('上传结果:', uploadResult);

  toast.close();

  if (uploadResult.code !== 1000) {
    throw new Error(uploadResult.message || $t('common.upload_failed'));
  }

  return uploadResult.data.url;
}

async function bindVoiceprint() {
  console.log('bindVoiceprint', deviceId.value, recordFile.value);
  // 检查设备ID和录音文件是否存在
  if (!deviceId.value || !recordFile.value) {
    toast.warning({
      msg: $t('bind_voiceprint.no_device_or_audio'),
      duration: 2000
    });
    return;
  }

  uploading.value = true;

  try {
    // 上传音频文件
    if (lastUploadFile.value !== recordFile.value) {
      lastUploadFile.value = recordFile.value;
      lastUploadUrl.value = await upload(recordFile.value);
    }

    // 绑定声纹
    const response = await deviceApi.bindVoiceprint({
      deviceId: deviceId.value,
      audioUrl: lastUploadUrl.value
    });

    console.log('绑定声纹响应:', response);

    if (response.code !== 1000) {
      throw new Error(response.message || $t('bind_voiceprint.bind_failed'));
    } else {
      toast.success({
        msg: $t('bind_voiceprint.bind_success'),
        duration: 2000,
        cover: true
      });
      setTimeout(() => {
        uni.redirectTo({ url: PageMap[Pages.DeviceManage].url });
      }, 2000);
    }
  } catch (error: any) {
    console.error('[声纹绑定/bindVoiceprint] 失败:', error);
  } finally {
    uploading.value = false;
  }
}

// 清理表单数据
function cleanForm() {
  recordFile.value = null;
  recordFileName.value = null;
  recordFileSize.value = null;
  recordDuration.value = 0;
}

// 清理资源
function cleanup() {
  cleanForm();
  if (audioRecorder.value) {
    audioRecorder.value.cleanup();
  }
  if (audioPlayer.value) {
    audioPlayer.value.cleanup();
  }
}
</script>

<style scoped>
.duration {
  font-size: 28rpx;
  color: #666;
}
</style>
