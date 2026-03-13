<template>
  <wd-notify />
  <view class="voice-clone-page">
    <!-- Tab 切换 -->
    <view class="tab-wrapper">
      <view
        class="tab-item"
        :class="{ active: curAudioSrc === audioSrc.Upload }"
        @click="curAudioSrc = audioSrc.Upload">
        {{ $t('voice_clone.select_file') }}
      </view>
      <view
        class="tab-item"
        :class="{ active: curAudioSrc === audioSrc.Record }"
        @click="curAudioSrc = audioSrc.Record">
        {{ $t('voice_clone.record') }}
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="content-area">
      <!-- 选择文件模式 -->
      <view v-if="curAudioSrc === audioSrc.Upload" class="upload-section">
        <!-- 未选择文件时显示上传区域 -->
        <view v-if="!audioFile" class="upload-area" @click="selectAudioFile">
          <view class="upload-icon">
            <text class="plus-icon">+</text>
          </view>
          <text class="upload-text">{{ $t('voice_clone.click_to_upload') }}</text>
          <text class="upload-hint">{{ $t('voice_clone.audio_format_hint') }}</text>
        </view>

        <!-- 已选择文件时显示文件信息 -->
        <view v-else class="file-preview-card">
          <view class="file-info">
            <view class="file-name-row">
              <text class="file-name">{{ audioFileName }}</text>
              <view class="audio-wave-icon" @click.stop="togglePlayDemo">
                <!-- 静态图标 -->
                <image v-if="!isPlaying" src="/static/icons/voice-play.svg" class="wave-img" mode="aspectFit" />
                <!-- 播放中的声波动画 -->
                <view v-else class="wave-animation">
                  <view class="wave-bar" style="animation-delay: 0s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.15s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.3s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.45s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.6s;"></view>
                </view>
              </view>
            </view>
            <text class="file-size">{{ audioFileSize }}</text>
          </view>
          <button class="reselect-btn" @click="resetAudio">
            {{ $t('voice_clone.reselect') }}
          </button>
        </view>
      </view>

      <!-- 录音模式 -->
      <view v-else-if="curAudioSrc === audioSrc.Record" class="record-section">
        <!-- 未录音时显示录音提示 -->
        <view v-if="!recordedAudio" class="record-card">
          <text class="record-title">{{ $t('voice_clone.record_voice') }}</text>
          <text class="record-desc">{{ $t('voice_clone.record_hint') }}</text>
          <button class="record-btn primary" @click="openRecordPopup">
            {{ $t('voice_clone.start_recording') }}
          </button>
        </view>

        <!-- 已录音时显示录音信息 -->
        <view v-else class="file-preview-card">
          <view class="file-info">
            <view class="file-name-row">
              <text class="file-name">{{ audioFileName }}</text>
              <view class="audio-wave-icon" @click.stop="togglePlayDemo">
                <!-- 静态图标 -->
                <image v-if="!isPlaying" src="/static/icons/voice-play.svg" class="wave-img" mode="aspectFit" />
                <!-- 播放中的声波动画 -->
                <view v-else class="wave-animation">
                  <view class="wave-bar" style="animation-delay: 0s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.15s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.3s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.45s;"></view>
                  <view class="wave-bar" style="animation-delay: 0.6s;"></view>
                </view>
              </view>
            </view>
            <text class="file-size">{{ audioFileSize }}</text>
          </view>
          <button class="reselect-btn" @click="resetAudio">
            {{ $t('voice_clone.re_record') }}
          </button>
        </view>
      </view>

      <!-- 音色名称输入 -->
      <view class="name-input-card">
        <text class="input-label">{{ $t('voice_clone.voice_name') }}</text>
        <input
          class="name-input"
          v-model="voiceName"
          :placeholder="$t('voice_clone.voice_name_placeholder')"
          :maxlength="20" />
        <view v-if="voiceName" class="clear-icon" @click="voiceName = ''">
          <wd-icon name="close-fill" size="32rpx" color="#c8c9cc" />
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-action">
      <button
        class="submit-btn"
        :class="{ active: canSubmit, loading: uploading }"
        :disabled="uploading || !canSubmit"
        @click="uploadAndCreateVoice">
        {{
          uploading
            ? isEditMode
              ? $t('voice_clone.updating')
              : $t('voice_clone.creating')
            : isEditMode
              ? $t('voice_clone.update_voice')
              : $t('voice_clone.create_voice')
        }}
      </button>
    </view>

    <!-- 录音弹窗 -->
    <view v-if="showRecordPopup" class="record-popup-overlay" @click.self="closeRecordPopup">
      <view class="record-popup">
        <view class="popup-header">
          <text class="popup-title">{{ $t('voice_clone.record_voice') }}</text>
          <view class="popup-close" @click="closeRecordPopup">
            <wd-icon name="close" size="40rpx" color="#333" />
          </view>
        </view>

        <view class="popup-content">
          <!-- 波形动画 -->
          <view class="waveform-container">
            <view class="waveform">
              <view
                v-for="i in 30"
                :key="i"
                class="wave-bar"
                :class="{ active: isRecording }"
                :style="{ animationDelay: `${i * 0.05}s`, height: getWaveHeight(i) }" />
            </view>
          </view>

          <!-- 录音时间 -->
          <text class="record-time">{{ formatDuration(recordDuration) }}</text>
        </view>

        <view class="popup-action">
          <button class="popup-btn" :class="{ stop: isRecording }" @click="toggleRecording">
            {{ isRecording ? $t('voice_clone.stop_recording') : $t('voice_clone.start_recording') }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { audioSrc, audioSrcName, audioSrcOptions, curAudioSrc } from './clone-store';
import { ref, computed, nextTick } from 'vue';
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
const showRecordPopup = ref(false);

// 音频时长（毫秒）- 用于上传的音频文件
const audioDuration = ref(0);

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

// 获取波形高度（模拟动画）
function getWaveHeight(index: number) {
  const heights = [20, 35, 25, 45, 30, 50, 35, 40, 25, 55, 30, 45, 35, 50, 25, 40, 30, 55, 35, 45, 25, 50, 30, 40, 35, 55, 25, 45, 30, 35];
  return `${heights[index % heights.length]}rpx`;
}

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
  // 注意：最长录制时间（duration）与创建音色的有效时长限制不同
  // - 录制时长限制：180秒（可根据需求调整，给用户足够的录制空间）
  // - 创建音色有效时长：10-120秒（固定限制，在 uploadAndCreateVoice 函数中验证）
  // 如需修改最长录制时间，只需修改下方 duration 值（单位：毫秒）
  audioRecorder.value = AudioRecorderManager.getInstance(
    {
      duration: 180000,// 最长录制时间，单位毫秒（180秒 = 180000ms）
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
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
        audioFileName.value = `录音_${new Date().getTime()}.${result.fileExtension || 'mp3'}`;
        audioFileSize.value = AudioRecorderManager.formatFileSize(result.fileSize);
        // 保存录音时长（单位：秒）
        recordDuration.value = result.duration;
        console.log('录音时长:', recordDuration.value, '秒');
        // 关闭录音弹窗
        showRecordPopup.value = false;
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

// 打开录音弹窗
async function openRecordPopup() {
  // 请求权限
  const permissionResult = await requestRecordPermission({
    show: showNotify,
    close: closeNotify
  });
  if (!permissionResult.granted) {
    return;
  }
  showRecordPopup.value = true;
  
  // 弹窗显示后自动开始录制
  await nextTick();
  if (audioRecorder.value && !isRecording.value) {
    audioRecorder.value.toggle();
  }
}

// 关闭录音弹窗
function closeRecordPopup() {
  if (isRecording.value && audioRecorder.value) {
    audioRecorder.value.stop();
  }
  showRecordPopup.value = false;
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

// 重置音频（重新选择/重新录制）
function resetAudio() {
  audioFile.value = null;
  recordedAudio.value = null;
  audioFileName.value = '';
  audioFileSize.value = '';
  audioDuration.value = 0;
  isPlaying.value = false;

  if (audioPlayer.value) {
    audioPlayer.value.stop();
  }
  if (audioRecorder.value) {
    audioRecorder.value.clearRecordResult();
  }

  // 如果是录音模式，打开录音弹窗
  if (curAudioSrc.value === audioSrc.Record) {
    openRecordPopup();
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
        throw err;
      }
    }
  });
}
// #endif

// #ifdef APP-PLUS || APP-HARMONY
function chooseAudioForApp() {
  // APP端文件选择逻辑
  // @ts-ignore - plus API 类型定义不完整
  plus.io.chooseFile(
    {
      filter: 'audio',
      multiple: false
    },
    (e: any) => {
      console.log('APP选择文件成功:', e);
      if (e.files && e.files.length > 0) {
        const filePath = e.files[0];
        
        // Android content:// URI 需要特殊处理
        if (filePath.startsWith('content://')) {
          // 使用 compressImage 作为中转来获取真实路径（这是个 workaround）
          // 或者直接将文件复制到本地临时目录
          console.log('检测到 content:// URI，尝试复制文件');
          
          // 生成临时文件名
          const timestamp = Date.now();
          const tempFileName = `audio_${timestamp}.mp3`;
          const tempPath = `_doc/temp/${tempFileName}`;
          
          // 确保临时目录存在
          // @ts-ignore
          plus.io.resolveLocalFileSystemURL(
            '_doc/',
            (docEntry: any) => {
              docEntry.getDirectory(
                'temp',
                { create: true },
                () => {
                  // 复制文件到临时目录
                  // @ts-ignore
                  plus.io.resolveLocalFileSystemURL(
                    filePath,
                    (srcEntry: any) => {
                      // @ts-ignore
                      plus.io.resolveLocalFileSystemURL(
                        '_doc/temp/',
                        (destDir: any) => {
                          srcEntry.copyTo(
                            destDir,
                            tempFileName,
                            (newEntry: any) => {
                              console.log('文件复制成功:', newEntry.fullPath);
                              newEntry.file((file: any) => {
                                handleChooseAudio({
                                  filename: tempFileName,
                                  filesize: file.size || 0,
                                  filepath: newEntry.fullPath
                                });
                              });
                            },
                            (copyErr: any) => {
                              console.error('文件复制失败:', copyErr);
                              // 复制失败时直接使用原路径
                              handleChooseAudioDirect(filePath, tempFileName);
                            }
                          );
                        },
                        (destErr: any) => {
                          console.error('获取目标目录失败:', destErr);
                          handleChooseAudioDirect(filePath, tempFileName);
                        }
                      );
                    },
                    (srcErr: any) => {
                      console.error('解析源文件失败:', srcErr);
                      handleChooseAudioDirect(filePath, tempFileName);
                    }
                  );
                },
                (dirErr: any) => {
                  console.error('创建临时目录失败:', dirErr);
                  handleChooseAudioDirect(filePath, `audio_${timestamp}.mp3`);
                }
              );
            },
            (docErr: any) => {
              console.error('获取_doc目录失败:', docErr);
              handleChooseAudioDirect(filePath, `audio_${timestamp}.mp3`);
            }
          );
        } else {
          // 普通文件路径
          // @ts-ignore
          plus.io.resolveLocalFileSystemURL(
            filePath,
            (entry: any) => {
              entry.file((file: any) => {
                console.log('APP文件信息:', file);
                handleChooseAudio({
                  filename: file.name || filePath.split('/').pop() || 'audio.mp3',
                  filesize: file.size,
                  filepath: filePath
                });
              });
            },
            (err: any) => {
              console.error('获取文件信息失败:', err);
              handleChooseAudio({
                filename: filePath.split('/').pop() || 'audio.mp3',
                filesize: 0,
                filepath: filePath
              });
            }
          );
        }
      }
    },
    (err: any) => {
      if (err.code !== 12) {
        // 12 是用户取消
        console.error('APP选择文件失败:', err);
        uni.showToast({
          title: $t('voice_clone.select_file_failed'),
          icon: 'none'
        });
      }
    }
  );
}

// 直接使用 content:// URI（跳过文件信息获取）
function handleChooseAudioDirect(filePath: string, defaultFileName: string) {
  console.log('使用直接路径处理:', filePath);
  audioFile.value = filePath;
  audioFileName.value = defaultFileName;
  recordedAudio.value = null;
  
  // 尝试通过 Android 原生 API 获取文件大小
  try {
    // @ts-ignore - plus.android API
    const main = plus.android.runtimeMainActivity();
    // @ts-ignore
    plus.android.importClass('android.content.ContentResolver');
    // @ts-ignore
    const Uri = plus.android.importClass('android.net.Uri');
    // @ts-ignore
    plus.android.importClass('android.database.Cursor');
    // @ts-ignore
    const OpenableColumns = plus.android.importClass('android.provider.OpenableColumns');
    
    // @ts-ignore
    const resolver = main.getContentResolver();
    // @ts-ignore
    const uri = Uri.parse(filePath);
    // @ts-ignore
    const cursor = resolver.query(uri, null, null, null, null);
    
    // @ts-ignore
    if (cursor && cursor.moveToFirst()) {
      // @ts-ignore
      const sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
      // @ts-ignore
      const nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
      
      if (sizeIndex >= 0) {
        // @ts-ignore
        const fileSize = cursor.getLong(sizeIndex);
        audioFileSize.value = formatFileSize(fileSize);
        console.log('获取到文件大小:', fileSize, audioFileSize.value);
      }
      
      if (nameIndex >= 0) {
        // @ts-ignore
        const displayName = cursor.getString(nameIndex);
        if (displayName) {
          audioFileName.value = displayName;
          console.log('获取到文件名:', displayName);
        }
      }
      
      // @ts-ignore
      cursor.close();
    } else {
      audioFileSize.value = '';
    }
  } catch (err) {
    console.error('获取文件信息失败:', err);
    audioFileSize.value = '';
  }
  
  // 获取音频时长
  getAudioDuration(filePath);
}
// #endif

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
  const maxSize = 10 * 1024 * 1024;
  console.log('文件大小:', filesize, '最大限制:', maxSize);
  if (filesize > maxSize) {
    console.error('文件过大:', filesize);
    throw new Error($t('voice_clone.file_too_large'));
  }

  audioFile.value = filepath;
  audioFileName.value = filename;
  audioFileSize.value = formatFileSize(filesize);
  recordedAudio.value = null;
  
  // 获取音频时长
  getAudioDuration(filepath);

  console.log('音频文件设置完成:', {
    audioFile: audioFile.value,
    audioFileName: audioFileName.value,
    audioFileSize: audioFileSize.value
  });
}

// 获取音频文件时长
function getAudioDuration(filepath: string) {
  audioDuration.value = 0;
  const innerAudioContext = uni.createInnerAudioContext();
  innerAudioContext.src = filepath;
  innerAudioContext.onCanplay(() => {
    // duration 单位为秒，转换为毫秒
    audioDuration.value = Math.round(innerAudioContext.duration * 1000);
    console.log('音频时长:', audioDuration.value, 'ms');
    innerAudioContext.destroy();
  });
  innerAudioContext.onError((err) => {
    console.error('获取音频时长失败:', err);
    audioDuration.value = 0;
    innerAudioContext.destroy();
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
    // #ifdef H5
    chooseAudioForH5();
    // #endif
  } catch (err) {
    console.error('选择音频文件失败', err);
    uni.showToast({
      title: $t('voice_clone.select_file_failed'),
      icon: 'none'
    });
  }
}

// #ifdef H5
function chooseAudioForH5() {
  // H5端使用 input 文件选择
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = supportedAudioFormats.map((ext) => `.${ext}`).join(',');
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      console.log('H5选择文件成功:', file);
      const fileUrl = URL.createObjectURL(file);
      handleChooseAudio({
        filename: file.name,
        filesize: file.size,
        filepath: fileUrl
      });
      // 保存原始文件对象，用于后续上传
      (window as any).__selectedAudioFile = file;
    }
  };
  input.click();
}
// #endif

// 上传音频文件
async function upload(audioPath: string): Promise<string> {
  uni.showLoading({ title: $t('voice_clone.uploading_audio') });
  console.log('开始上传音频文件，路径:', audioPath);

  const uploadResult = await commonApi.uploadAudioFile(audioPath);
  console.log('上传结果:', uploadResult);

  if (uploadResult.code !== 1000) {
    throw new Error(uploadResult.message || '文件上传失败');
  }

return uploadResult.data.url;
}

// 创建音色栏位
async function createVoice() {
  uni.showLoading({
    title: $t('voice_clone.creating_voice')
  });
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

  const audioPath = audioFile.value || recordedAudio.value;
  if (!audioPath) {
    uni.showToast({
      title: $t('voice_clone.select_audio_or_record'),
      icon: 'none'
    });
    return;
  }

  // 验证音频时长（10-120秒）
  // recordDuration 单位是秒，audioDuration 单位是毫秒，统一转换为秒
  const durationInSeconds = recordedAudio.value 
    ? recordDuration.value 
    : Math.round(audioDuration.value / 1000);
  const minDuration = 10; // 10秒
  const maxDuration = 120; // 120秒
  
  console.log('音频时长验证:', durationInSeconds, '秒，范围:', minDuration, '-', maxDuration);
  
  if (durationInSeconds > 0 && (durationInSeconds < minDuration || durationInSeconds > maxDuration)) {
    console.log('音频时长不符合要求，弹出提示');
    uni.showToast({
      title: $t('voice_clone.audio_duration_invalid'),
      icon: 'none',
      duration: 3000
    });
    return;
  }

  uploading.value = true;
  try {
    if (lastUploadFile.value !== audioPath) {
      lastUploadUrl.value = await upload(audioPath);
      lastUploadFile.value = audioPath;
    }

    if (!voiceId.value) {
      voiceId.value = await createVoice();
    }

    try {
      await trainVoice();
      console.log('训练任务已提交');
    } catch (trainError) {
      console.warn('训练任务提交失败，可稍后在音色管理页面重试:', trainError);
    }

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
  audioDuration.value = 0;
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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}

// 格式化时长
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped lang="scss">
.voice-clone-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* Tab 切换 - 按设计稿样式 */
.tab-wrapper {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 8rpx;
  gap: 8rpx;
  margin: 32rpx;
  background: #F5F7FA;
  border-radius: 20rpx;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 14rpx 8rpx;
  border-radius: 12rpx;
  font-weight: 500;
  font-size: 28rpx;
  line-height: 40rpx;
  text-align: center;
  letter-spacing: -0.006em;
  color: #99A0AE;
  transition: all 0.25s ease;

  &.active {
    background: #FFFFFF;
    box-shadow: 0px 12rpx 20rpx rgba(14, 18, 27, 0.06), 0px 4rpx 8rpx rgba(14, 18, 27, 0.03);
    color: #0E121B;
  }
}

/* 内容区域 */
.content-area {
  padding: 20rpx 32rpx 0;
}

/* 上传区域 */
.upload-section {
  margin-bottom: 32rpx;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 32rpx;
  background: #FFFFFF;
  box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border-radius: 32rpx;
  transition: all 0.3s;

  &:active {
    transform: scale(0.99);
    box-shadow: 0px 2rpx 12rpx rgba(0, 0, 0, 0.08);
  }
}

.upload-icon {
  position: relative;
  width: 108rpx;
  height: 108rpx;
  margin-bottom: 24rpx;

  /* 横线 */
  &::before {
    content: '';
    position: absolute;
    width: 67rpx;
    height: 0;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-top: 8rpx solid #335CFF;
  }

  /* 竖线 */
  &::after {
    content: '';
    position: absolute;
    width: 0;
    height: 67rpx;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-left: 8rpx solid #335CFF;
  }
}

.plus-icon {
  display: none;
}

.upload-text {
  font-weight: 400;
  font-size: 28rpx;
  line-height: 40rpx;
  color: #717784;
  margin-bottom: 8rpx;
}

.upload-hint {
  font-weight: 400;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #99A0AE;
}

/* 文件预览卡片 */
.file-preview-card {
  background: #FFFFFF;
  box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
}

.file-info {
  margin-bottom: 32rpx;
}

.file-name-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.file-name {
  font-weight: 500;
  font-size: 28rpx;
  line-height: 40rpx;
  color: #0E121B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-wave-icon {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wave-img {
  width: 40rpx;
  height: 40rpx;
}

/* 播放中的声波动画 */
.wave-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 40rpx;
}

.audio-wave-icon .wave-bar {
  width: 4rpx;
  height: 100%;
  background: #335CFF;
  border-radius: 4rpx;
  animation: wave-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes wave-pulse {
  0% {
    transform: scaleY(0.3);
  }
  100% {
    transform: scaleY(1);
  }
}

.file-size {
  font-weight: 400;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #717784;
}

.reselect-btn {
  width: 100%;
  height: 88rpx;
  background: #9DA4AE;
  border-radius: 16rpx;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: #8a919a;
  }
}

/* 录音区域 */
.record-section {
  margin-bottom: 32rpx;
}

.record-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 40rpx 32rpx;
  gap: 40rpx;
  background: #FFFFFF;
  box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border-radius: 32rpx;
}

.record-title {
  display: block;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #0E121B;
  margin-bottom: 8rpx;
}

.record-desc {
  display: block;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 40rpx;
  color: #717784;
}

.record-btn {
  width: 100%;
  min-height: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;

  &.primary {
    background: #335CFF;
    color: #FFFFFF;
  }
}

/* 音色名称输入 */
.name-input-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 32rpx;
  gap: 24rpx;
  height: 108rpx;
  box-sizing: border-box;
  background: #FFFFFF;
  box-shadow: 0px 4rpx 24rpx rgba(0, 0, 0, 0.1);
  border-radius: 32rpx;
  margin-bottom: 32rpx;
}

.input-label {
  font-weight: 500;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #0E121B;
  flex-shrink: 0;
}

.name-input {
  flex: 1;
  height: 44rpx;
  font-weight: 400;
  font-size: 28rpx;
  line-height: 44rpx;
  color: #0E121B;

  &::placeholder {
    color: #717784;
  }
}

.clear-icon {
  padding: 8rpx;
  flex-shrink: 0;
}

/* 底部按钮 */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 200rpx;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 44rpx;
  border: none;
  background: #F5F7FA;
  color: #CACFD8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;

  &.active {
    background: #335CFF;
    color: #FFFFFF;
  }

  &.loading {
    opacity: 0.7;
  }
}

/* 录音弹窗 */
.record-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 9999;
}

.record-popup {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48rpx;
}

.popup-title {
  font-weight: 600;
  font-size: 36rpx;
  line-height: 50rpx;
  color: #0E121B;
}

.popup-close {
  padding: 8rpx;
}

.popup-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

/* 波形动画 */
.waveform-container {
  width: 100%;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}

.waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 100%;
}

.wave-bar {
  width: 6rpx;
  background: #E5E7EB;
  border-radius: 6rpx;
  transition: all 0.2s;

  &.active {
    background: linear-gradient(180deg, #335CFF 0%, #6B8CFF 100%);
    animation: wave 0.8s ease-in-out infinite alternate;
  }
}

@keyframes wave {
  0% {
    transform: scaleY(0.4);
  }
  100% {
    transform: scaleY(1);
  }
}

.record-time {
  font-weight: 600;
  font-size: 64rpx;
  line-height: 90rpx;
  color: #0E121B;
  font-variant-numeric: tabular-nums;
}

.popup-action {
  margin-top: 48rpx;
}

.popup-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 22rpx 40rpx;
  gap: 17rpx;
  width: 346rpx;
  height: 88rpx;
  background: #335CFF;
  border-radius: 16rpx;
  border: none;
  font-weight: 500;
  font-size: 32rpx;
  line-height: 44rpx;
  color: #FFFFFF;
  margin: 0 auto;
}
</style>
