<template>
  <wd-notify />
  <view class="voice-clone-container">
    <!-- 合并的Tab切换和音频预览区域 -->
    <view class="combined-section">
      <view class="section-title-container mt-20" v-if="audioSrcOptions.length > 1">
        <text class="section-title">{{ $t('voice_clone.select_audio_source') }}</text>
        <text class="section-desc">{{ $t('voice_clone.select_audio_desc') }}</text>
      </view>
      <view class="tab-container" v-if="audioSrcOptions.length > 1">
        <wd-segmented
          :options="audioSrcOptions"
          v-model:value="curAudioSrc"
          @change="onAudioSrcChange"
          size="large"
          class="tab-segmented">
          <template #label="{ option }">
            <view class="tab-item">{{ audioSrcName[option.value as audioSrc] }}</view>
          </template>
        </wd-segmented>
      </view>
      <!-- 当没有选择音频文件或录音时显示Tab切换 -->
      <view v-if="!audioFile && !recordedAudio">
        <!-- 选择文件内容 -->
        <view v-if="curAudioSrc === audioSrc.Upload" class="tab-content">
          <view class="upload-card">
            <text class="upload-title">{{ $t('voice_clone.select_audio_file') }}</text>
            <text class="upload-desc">{{ $t('voice_clone.audio_format_desc') }}</text>
            <button class="action-btn primary" @click="selectAudioFile">
              <text class="btn-text">{{ $t('voice_clone.select_file') }}</text>
            </button>
          </view>
        </view>

        <!-- 录音内容 -->
        <view v-else-if="curAudioSrc === audioSrc.Record" class="tab-content">
          <text class="record-title">{{ $t('voice_clone.record_voice') }}</text>
          <text class="record-desc">{{ $t('voice_clone.record_desc') }}</text>

          <!-- 录音控制 -->
          <view class="record-controls">
            <button
              class="action-btn"
              :class="{ primary: !isRecording, danger: isRecording }"
              @click="toggleRecording">
              <text class="btn-text">
                {{
                  isRecording ? $t('voice_clone.stop_recording') : $t('voice_clone.start_recording')
                }}
              </text>
            </button>

            <view v-if="recordDuration > 0" class="record-info">
              <text class="duration">
                {{ $t('voice_clone.record_duration') }}: {{ formatDuration(recordDuration) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 当已选择音频文件或录音时显示预览模式 -->
      <view v-else class="preview-card">
        <wd-card :title="$t('voice_clone.audio_preview')">
          <view class="audio-info">
            <view class="file-info-row">
              <text class="file-name">
                {{ audioFileName }}
              </text>
              <wd-icon name="/static/icons/voice-play.svg" @click.stop="togglePlayDemo"></wd-icon>
            </view>
            <text class="file-size">{{ audioFileSize }}</text>
          </view>

          <view class="reselect-controls">
            <button class="action-btn secondary" @click="resetForm">
              <text class="btn-text">{{ $t('voice_clone.reselect_audio') }}</text>
            </button>
          </view>
        </wd-card>
      </view>

      <wd-divider color="#335CFF"></wd-divider>

      <!-- 音色名称输入 -->
      <wd-card :title="$t('voice_clone.voice_name')">
        <wd-input
          v-model="voiceName"
          :maxlength="20"
          show-word-limit
          :placeholder="$t('voice_clone.voice_name_placeholder')"></wd-input>
      </wd-card>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <view v-if="!canSubmit" class="submit-tip">
          <text class="tip-text">{{ $t('voice_clone.complete_form_tip') }}</text>
        </view>
        <button
          class="action-btn primary"
          :class="{ loading: uploading, disabled: !canSubmit }"
          :disabled="uploading || !canSubmit"
          @click="uploadAndCreateVoice">
          <text class="btn-text">
            {{
              uploading
                ? isEditMode
                  ? $t('voice_clone.updating')
                  : $t('voice_clone.creating')
                : isEditMode
                  ? $t('voice_clone.update_voice')
                  : $t('voice_clone.create_voice')
            }}
          </text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { audioSrc, audioSrcName, audioSrcOptions, curAudioSrc } from './clone-store';
import { ref, computed } from 'vue';
import { AudioPlayerManager } from '@/utils/audioPlayer';
import { AudioRecorderManager } from '@/utils/audioRecorder';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { requestRecordPermission } from '@/utils/permission';
import { useNotify } from '@/uni_modules/wot-design-uni';

// todo
// @ts-ignore
import { voiceApi, commonApi } from '@/api';

const { t: $t } = useI18n();
const { showNotify, closeNotify } = useNotify();

// 音频文件相关
const audioFile = ref<string | null>(null);
const audioFileName = ref('');
const audioFileSize = ref('');

// 录音相关
const recordedAudio = ref<string | null>(null);
const isRecording = ref(false);
const recordDuration = ref(0);

const isPlaying = ref(false);

// 音色信息
const voiceName = ref('');
const voiceId = ref<string | null>(null);

// 上传状态
const uploading = ref(false);
const lastUploadFile = ref('');
const lastUploadUrl = ref('');

// 编辑模式
const isEditMode = ref(false);

// 单例管理器实例
const audioPlayer = ref<AudioPlayerManager | null>(null);
const audioRecorder = ref<AudioRecorderManager | null>(null);

const supportedAudioFormats = ['mp3', 'wav', 'm4a', 'aac', 'flac'];

// 是否可以提交表单
const canSubmit = computed(() => {
  return (
    voiceName.value.trim().length >= 3 &&
    (audioFile.value || recordedAudio.value) &&
    !isRecording.value
  );
});

onLoad((options: any) => {
  // 检查是否为编辑模式
  if (options.mode === 'edit' && options.voiceId) {
    isEditMode.value = true;
    voiceId.value = options.voiceId;
    voiceName.value = decodeURIComponent(options.voiceName || '');

    // 设置页面标题
    uni.setNavigationBarTitle({
      title: $t('voice_clone.update_voice')
    });
  } else {
    uni.setNavigationBarTitle({
      title: $t('voice_clone.create_voice')
    });
  }

  initManagers();
});

onUnload(() => {
  cleanup();
});

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
        uni.showToast({
          title: $t('voice_clone.play_failed'),
          icon: 'none'
        });
      }
    }
  );

  // 初始化录音管理器
  audioRecorder.value = AudioRecorderManager.getInstance(
    {
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'wav'
    },
    {
      onStart: () => {
        console.log('录音开始');
        // 清除之前的音频文件
        recordDuration.value = 0;
        audioFile.value = null;
        recordedAudio.value = null;
        isRecording.value = true;
      },
      onStop: (result) => {
        console.log('录音结束', result);
        isRecording.value = false;
        recordedAudio.value = result.tempFilePath;
        audioFileName.value = `${new Date().getTime()}.${result.fileExtension || 'wav'}`;
        audioFileSize.value = AudioRecorderManager.formatFileSize(result.fileSize);
      },
      onError: (error) => {
        isRecording.value = false;
        recordDuration.value = 0;
        console.error('录音错误', error);
        uni.showToast({
          title: $t('voice_clone.record_failed'),
          icon: 'none'
        });
      },
      onDurationUpdate: (duration) => {
        recordDuration.value = duration;
      }
    }
  );
}

// Tab切换 - 不清理音频相关状态
function onAudioSrcChange(tab: { value: audioSrc }) {
  console.log('onAudioSrcChange', tab);

  // // 切换tab时只清除音频相关状态，保留音色名称
  // audioFile.value = null;
  // recordedAudio.value = null;
  // audioFileName.value = '';
  // audioFileSize.value = '';

  // // 清除录音结果
  // if (audioRecorder.value) {
  //   audioRecorder.value.clearRecordResult();
  // }
}

// 切换录音状态
async function toggleRecording() {
  if (!audioRecorder.value) {
    return;
  }

  // 如果正在录音，直接停止
  if (isRecording.value) {
    audioRecorder.value.toggle();
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
}

// 切换播放演示音频
function togglePlayDemo() {
  const audioPath = audioFile.value || recordedAudio.value;
  if (audioPath && audioPlayer.value) {
    audioPlayer.value.toggle({ src: audioPath, name: audioFileName.value });
  }
}

// #ifdef MP-WEIXIN
function chooseAudioForWX() {
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: supportedAudioFormats,
    success: (res) => {
      console.log('选择文件成功:', res);
      const file = res.tempFiles[0];
      console.log('选中的文件:', file);
      handleChooseAudio({
        filename: file.name,
        filesize: file.size,
        filepath: file.path
      });
    },
    fail: (err: any) => {
      if (!err.errMsg.includes('fail cancel')) {
        console.error('选择文件失败', err);
        // 不是用户取消的情况才显示错误提示
        throw err;
      }
    }
  });
}
// #endif

function chooseAudioForApp() {
  // uni.chooseFile({
  //   count: 1,
  //   type: 'all',
  //   extension: supportedAudioExts,
  //   success: (res) => {
  //     console.log('选择文件成功:', res);
  //     const file = res.tempFiles[0];
  //     console.log('选中的文件:', file);
  //     handleChooseAudio({
  //       filename: file.name,
  //       filesize: file.size,
  //       filepath: file.path
  //     });
  //   },
  //   fail: (err: any) => {
  //     if (!err.errMsg.includes('fail cancel')) {
  //       console.error('选择文件失败', err);
  //       // 不是用户取消的情况才显示错误提示
  //       throw err;
  //     }
  //   }
  // });
}

function handleChooseAudio({
  filename,
  filesize,
  filepath
}: {
  filename: string;
  filesize: number;
  filepath: string;
}) {
  // 检查拓展名
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  console.log('文件名:', filename, '扩展名:', fileExtension);

  if (!fileExtension || !supportedAudioFormats.includes(fileExtension)) {
    console.error('不支持的文件格式:', fileExtension);
    throw new Error($t('voice_clone.unsupported_format'));
  }
  // 验证文件大小（限制10MB）
  const maxSize = 10 * 1024 * 1024; // 10MB
  console.log('文件大小:', filesize, '最大限制:', maxSize);
  if (filesize > maxSize) {
    console.error('文件过大:', filesize);
    throw new Error($t('voice_clone.file_too_large'));
  }

  audioFile.value = filepath;
  audioFileName.value = filename;
  audioFileSize.value = formatFileSize(filesize);
  recordedAudio.value = null; // 清除录音

  console.log('音频文件设置完成:', {
    audioFile: audioFile.value,
    audioFileName: audioFileName.value,
    audioFileSize: audioFileSize.value
  });
}

// 选择音频文件
function selectAudioFile() {
  console.log('开始选择音频文件');
  try {
    // #ifdef MP-WEIXIN
    chooseAudioForWX();
    // #endif
    // #ifdef APP-PLUS || APP-HARMONY
    chooseAudioForApp();
    // #endif
  } catch (err) {
    console.error('选择音频文件失败', err);
    // todo useToast
    uni.showToast({
      title: $t('voice_clone.select_file_failed'),
      icon: 'none'
    });
  }
}

// // 播放演示音频
// function playDemo(url: string, voiceId: string) {
//   if (!url) {
//     uni.showToast({
//       title: $t('voice_clone.invalid_audio_url'),
//       icon: 'none'
//     });
//     return;
//   }

//   if (audioPlayer.value) {
//     audioPlayer.value.play({ src: url, name: `demo_${voiceId}` });
//   }
// }

// // 停止播放
// function stopDemo() {
//   if (audioPlayer.value) {
//     audioPlayer.value.stop();
//   }
// }

// 上传音频文件
async function upload(audioPath: string): Promise<string> {
  uni.showLoading({ title: $t('voice_clone.uploading_audio') });
  console.log('开始上传音频文件，路径:', audioPath);

  const uploadResult = await commonApi.uploadAudioFile(audioPath);
  console.log('上传结果:', uploadResult);

  if (uploadResult.code !== 1000) {
    throw new Error(uploadResult.message || '文件上传失败');
  }

  // 临时修复：替换 localhost 为实际服务器地址
  // 因为后端上传配置返回的是 localhost，训练服务无法访问
  const uploadUrl = uploadResult.data.url;
  // todo: ???
  // if (uploadUrl && uploadUrl.includes('localhost')) {
  //   const baseUrl = APP_CONFIG.BASE_API_URL;
  //   // 提取 baseUrl 的协议和主机部分
  //   const baseUrlMatch = baseUrl.match(/^(https?:\/\/[^/]+)/);
  //   if (baseUrlMatch) {
  //     uploadUrl = uploadUrl.replace(/https?:\/\/localhost(:\d+)?/, baseUrlMatch[1]);
  //     console.log('URL 已替换:', uploadUrl);
  //   }
  // }

  return uploadUrl;
}

// 创建音色栏位
async function createVoice() {
  // toast提示
  uni.showLoading({
    title: $t('voice_clone.creating_voice')
  });
  // 创建音色栏位
  const createResult = await voiceApi.createVoice({
    name: voiceName.value.trim(),
    description: `${$t('voice_clone.user_created_voice')}：${voiceName.value.trim()}`,
    isPublic: false
  });

  if (createResult.code !== 1000) {
    throw new Error(createResult.message || '创建音色失败');
  }

  return createResult.data.id;
}

// 训练音色
async function trainVoice() {
  // toast 提示
  if (isEditMode.value) {
    uni.showLoading({ title: $t('voice_clone.updating_voice') });
  } else {
    uni.showLoading({ title: $t('voice_clone.training_voice') });
  }
  console.log(
    '训练音色，音色ID:',
    voiceId.value,
    '音频URL:',
    lastUploadUrl.value,
    '音色名称:',
    voiceName.value.trim()
  );

  // 训练音色
  const trainResult = await voiceApi.trainVoice({
    voiceId: voiceId.value,
    audioUrl: lastUploadUrl.value,
    name: voiceName.value.trim()
  });

  if (trainResult.code !== 1000) {
    throw new Error(trainResult.message || isEditMode.value ? '更新音色失败' : '训练音色失败');
  }
}

// 上传并创建/更新音色
async function uploadAndCreateVoice() {
  if (!canSubmit.value) {
    uni.showToast({
      title: $t('voice_clone.complete_required_fields'),
      icon: 'none'
    });
    return;
  }

  // 检查是否有音频文件
  const audioPath = audioFile.value || recordedAudio.value;
  if (!audioPath) {
    uni.showToast({
      title: $t('voice_clone.select_audio_or_record'),
      icon: 'none'
    });
    return;
  }

  uploading.value = true;
  try {
    // 上传音频文件
    if (lastUploadFile.value !== audioPath) {
      lastUploadUrl.value = await upload(audioPath);
      lastUploadFile.value = audioPath;
    }

    // 创建模式：创建音色栏位
    if (!voiceId.value) {
      voiceId.value = await createVoice();
    }

    // 触发训练任务（异步，不阻塞主流程）
    // 训练状态通过音色列表 API 返回，用户可在音色管理页面查看
    try {
      await trainVoice();
      console.log('训练任务已提交');
    } catch (trainError) {
      // 训练任务提交失败不影响创建成功
      console.warn('训练任务提交失败，可稍后在音色管理页面重试:', trainError);
    }

    // 成功提示
    uni.hideLoading();
    resetForm();

    uni
      .showModal({
        title: isEditMode.value
          ? $t('voice_clone.update_success')
          : $t('voice_clone.create_success'),
        content: $t('voice_clone.success_confirm')
      })
      .then((res) => {
        if (res.confirm) {
          console.log('confirm navigateTo');
          uni.navigateTo({
            url: '/pages/voice/manage'
          });
        }
      });
  } catch (error: any) {
    console.error(isEditMode.value ? '更新音色失败:' : '创建音色失败:', error);
    uni.hideLoading();

    let errorMessage = isEditMode.value
      ? $t('voice_clone.update_failed')
      : $t('voice_clone.create_failed');

    // 根据错误类型提供更具体的提示
    if (error.errMsg && error.errMsg.includes('createUploadTask:fail')) {
      errorMessage = $t('voice_clone.upload_failed_check_network');
    } else if (error.message && error.message.includes('voice name already exists')) {
      errorMessage = $t('voice_clone.voice_name_exists');
    } else if (error.message) {
      errorMessage = error.message;
    }

    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 3000
    });
  } finally {
    uploading.value = false;
  }
}

// 重置表单
function resetForm() {
  audioFile.value = null;
  recordedAudio.value = null;
  audioFileName.value = '';
  audioFileSize.value = '';
  voiceName.value = '';
  voiceId.value = null;
  lastUploadFile.value = '';
  lastUploadUrl.value = '';
  isRecording.value = false;
  recordDuration.value = 0;
  isPlaying.value = false;

  if (audioRecorder.value) {
    audioRecorder.value.clearRecordResult();
  }
  if (audioPlayer.value) {
    audioPlayer.value.stop();
  }
}

// 清理资源
function cleanup() {
  if (audioRecorder.value) {
    audioRecorder.value.cleanup();
  }
  if (audioPlayer.value) {
    audioPlayer.value.cleanup();
  }
}

// 格式化文件大小
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时长
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.voice-clone-container {
  padding: 40rpx;
  background: #f8f9fa;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
}

/* 合并区域样式 */
.combined-section {
  margin-bottom: 40rpx;
  background: white;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.section-title-container {
  text-align: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.section-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

/* Tab切换区域 */
.tab-container {
  padding: 20rpx;
}

.is-active {
  background: #335CFF;
}

.tab-content {
  padding: 40rpx 20rpx;
  text-align: center;
}

/* 上传区域 */
.upload-card {
  text-align: center;
}

.upload-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
}

.upload-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.upload-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 40rpx;
  line-height: 1.5;
}

.action-btn {
  width: 100%;
  padding: 24rpx;
}

/* 录音区域 */
.record-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
  transition: all 0.3s ease;
}

.record-icon.recording {
  animation: pulse 1.5s infinite;
  color: #ff3b30;
}

.record-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.record-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 40rpx;
  line-height: 1.5;
}

.record-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.record-btn {
  padding: 24rpx;
  font-size: 32rpx;
  width: 100%;
  transition: all 0.3s ease;
}

.record-info {
  margin-top: 30rpx;
}

.duration {
  font-size: 28rpx;
  color: #666;
}

/* 预览模式区域 */
.preview-mode {
  padding: 30rpx;
}

.preview-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.preview-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.play-btn {
  background: transparent;
  border: none;
  font-size: 40rpx;
  padding: 0;
  margin: 0;
  line-height: 1;
}

.audio-info {
  padding: 30rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
}

.file-info-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 10rpx;
}

.file-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  word-break: break-all;
  /* padding-right: 20rpx; */
}

.file-size {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.reselect-controls {
  margin-top: 20rpx;
}

.no-audio-tip {
  padding: 60rpx 0;
  text-align: center;
}

.tip-icon {
  display: block;
  font-size: 60rpx;
  margin-bottom: 20rpx;
  color: #ccc;
}

.tip-text {
  font-size: 28rpx;
  color: #999;
}

/* 提交按钮区域 */
.submit-section {
  margin-top: 60rpx;
}

.submit-btn {
  padding: 30rpx;
  width: 100%;
  transition: all 0.3s ease;
}

.submit-btn.disabled {
  background: #ccc;
  opacity: 0.7;
}

.submit-btn.loading {
  opacity: 0.8;
}

.submit-tip {
  text-align: center;
  margin-top: 20rpx;
}

.tip-text {
  font-size: 26rpx;
  color: #ff3b30;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
</style>
