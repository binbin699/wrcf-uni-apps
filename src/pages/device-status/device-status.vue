<template>
  <wd-toast />
  <wd-notify />
  <view class="device-status-container">
    <!-- 渐变背景 -->
    <view class="gradient-bg"></view>

    <!-- 光晕装饰 -->
    <view class="halo-decoration">
      <view class="halo-line halo-line-1"></view>
      <view class="halo-line halo-line-2"></view>
      <view class="halo-line halo-line-3"></view>
    </view>
    <view class="halo-ellipse halo-ellipse-1"></view>
    <view class="halo-ellipse halo-ellipse-2"></view>

    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="navbar-content" :style="{ height: navBarHeight + 'px' }">
        <view
            class="switch-device-btn"
            v-if="deviceList.length > 1"
            @click.stop="toggleDeviceDropdown">
          <text class="switch-device-text">{{ $t('device_status.switch') }}</text>
          <view class="switch-device-icon">
            <image
                src="/static/icons/arrow-down.svg"
                mode="aspectFit"
                :class="{ rotated: showDeviceDropdown }"></image>
          </view>
        </view>
        <text class="navbar-title">{{ $t('tabbar.device') }}</text>
      </view>
    </view>

    <!-- 设备切换下拉菜单 -->
    <view
        class="device-dropdown-overlay"
        v-if="showDeviceDropdown"
        @click="showDeviceDropdown = false"></view>
    <view
        class="device-dropdown"
        v-if="showDeviceDropdown"
        :style="{ top: statusBarHeight + navBarHeight + 2 + 'px' }">
      <view class="device-dropdown-list">
        <view
            class="device-dropdown-item"
            v-for="(device, index) in deviceList"
            :key="device.id"
            :class="{ active: device.id === currentDevice?.id }"
            @click="selectDeviceFromDropdown(device)">
          <text
              class="device-dropdown-item-name"
              :class="{ active: device.id === currentDevice?.id }">
            {{ device.deviceName || $t('device_status.unknown_device') }}
          </text>
          <image
              v-if="device.id === currentDevice?.id"
              class="device-dropdown-item-check"
              src="/static/icons/check.svg"
              mode="aspectFit"></image>
        </view>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <view class="content-area" :style="{ paddingTop: statusBarHeight + navBarHeight + 16 + 'px' }">
      <!-- 加载状态 -->
      <view class="loading-state" v-if="loading">
        <text class="loading-text">{{ $t('common.loading') }}</text>
      </view>

      <!-- 内容布局 -->
      <view v-else class="content-layout">

        <!-- 顶部背景+文案+按钮 -->
        <view class="top-hero">

          <!-- 文字区域 -->
          <view class="hero-content">

            <view class="hero-title">
              Hi，我是白泽 ✨
            </view>

            <view class="hero-desc">
              你的专属AI小伙伴<br />
              快去绑定，和我一起玩吧！
            </view>

            <!-- 未绑定 -->
            <view v-if="!currentDevice" class="hero-btn-group">
              <view class="btn primary" @click="handleAddDeviceQrcode">
                扫码添加
              </view>
              <view class="btn ghost" @click="handleAddDeviceBluetooth">
                蓝牙添加
              </view>
            </view>

            <!-- 已绑定 -->
            <view v-else class="hero-bind">
              <view class="device-name">
                {{ currentDevice.deviceName || '我的设备' }}
              </view>

              <view class="btn small primary" @click="handleAddDeviceQrcode">
                再绑一个
              </view>
            </view>

            <!-- 白泽图 -->
            <image
                src="@/img/baize.png"
                class="baize-img"
                mode="aspectFit"
            />

          </view>

        </view>

        <!-- 中部：4个功能入口 -->
        <view class="module-functions">
          <view class="func-grid">
            <view class="func-item" @click="goToSquare">
              <image class="func-icon" src="@/img/img_2.png" mode="aspectFit" />
              <text class="func-name">智能体广场</text>
            </view>
            <view class="func-item" @click="goToCustomAgent">
              <image class="func-icon" src="@/img/img_3.png" mode="aspectFit" />
              <text class="func-name">创建智能体</text>
            </view>
            <view class="func-item" @click="goToVoiceManage">
              <image class="func-icon" src="@/img/img_4.png" mode="aspectFit" />
              <text class="func-name">音色管理</text>
            </view>
            <view class="func-item" @click="goToVoiceClone">
              <image class="func-icon" src="@/img/img_5.png" mode="aspectFit" />
              <text class="func-name">音色复刻</text>
            </view>
          </view>
        </view>

        <!-- 底部：玩法视频 + 九宝攻略 + 玩法提示 -->
        <view class="module-resources">
          <view class="resource-card" @click="goToVideoPlaylist">
            <image class="full-img" src="@/img/img.png" mode="aspectFill" />
          </view>
          <view class="resource-card" @click="goToGuidePage">
            <image class="full-img" src="@/img/img_1.png" mode="aspectFill" />
          </view>
        </view>

        <!-- 玩法提示 -->
        <view class="module-tips">
          <view class="tips-header">
            <text class="tips-title">玩法提示</text>
            <view class="tips-refresh" @click="handleRefreshTips">
              <image class="tips-refresh-icon" src="/static/icons/refresh.svg" mode="aspectFit" />
              <text class="tips-refresh-text">换一换</text>
            </view>
          </view>
          <scroll-view class="tips-list" scroll-y v-if="displayTips.length > 0">
            <view class="tip-item" v-for="(tip, index) in displayTips" :key="index">
              <text class="tip-icon">{{ tip.icon }}</text>
              <text class="tip-content">{{ tip.content || tip }}</text>
            </view>
          </scroll-view>
          <view class="tips-loading" v-else-if="tipsLoading">
            <text class="tips-loading-text">加载中...</text>
          </view>
          <view class="tips-empty" v-else>
            <text class="tips-empty-text">暂无玩法提示</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑设备名称弹窗 -->
    <wd-popup v-model="showEditName" position="center" custom-style="background: transparent;">
      <view class="edit-name-dialog">
        <view class="edit-name-header">
          <text class="edit-name-title">{{ $t('device_status.edit_device_name') }}</text>
          <view class="edit-name-input-wrapper">
            <input
                class="edit-name-input"
                v-model="editDeviceName"
                :placeholder="$t('device_status.enter_device_name')"
                maxlength="20" />
            <view class="edit-name-clear" v-if="editDeviceName" @click="editDeviceName = ''">
              <image class="clear-icon" src="/static/icons/icon-clear.svg" mode="aspectFit"></image>
            </view>
          </view>
        </view>
        <view class="edit-name-footer">
          <view class="edit-name-btn cancel" @click="showEditName = false">
            <text>{{ $t('common.cancel') }}</text>
          </view>
          <view class="edit-name-btn confirm" @click="handleSaveDeviceName">
            <text>{{ $t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </wd-popup>

    <!-- 设备选择弹窗 -->
    <wd-popup v-model="showDeviceSelector" position="bottom" custom-class="device-selector-popup">
      <view class="device-selector">
        <view class="device-selector-header">
          <text class="device-selector-title">{{ $t('device_status.select_device') }}</text>
          <view class="device-selector-close" @click="showDeviceSelector = false">
            <image src="/static/icons/close-circle.svg" mode="aspectFit"></image>
          </view>
        </view>
        <scroll-view class="device-selector-list" scroll-y>
          <view
              class="device-selector-item"
              v-for="device in deviceList"
              :key="device.id"
              :class="{ active: device.id === currentDevice?.id }"
              @click="handleSelectDevice(device)">
            <text class="device-selector-item-name">
              {{ device.deviceName || $t('device_status.unknown_device') }}
            </text>
            <view class="device-selector-item-check" v-if="device.id === currentDevice?.id">
              <image src="/static/icons/check.svg" mode="aspectFit"></image>
            </view>
          </view>
        </scroll-view>
      </view>
    </wd-popup>

    <!-- 底部插图 -->
    <image class="bottom-illustration" src="/static/bg_removal.png" mode="aspectFill"></image>

    <!-- 自定义 TabBar -->
    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { onShow } from '@dcloudio/uni-app';
import { deviceApi, agentApi, voiceApi } from '@/api/index';
import { PageMap, Pages } from '@/utils/route';
import { useDeviceScan } from '@/utils/useDeviceScan';
import { useToast, useNotify } from '@/uni_modules/wot-design-uni';
import {
  initLanguageDisplayNameCache,
  getLanguageDisplayNameByLangCode
} from '@/pages/agent/lang_opts';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useUserStore } from '@/store';
import { useGlobalRequestErrorToast } from '@/composables/useGlobalRequestErrorToast';
import { gameTipApi } from '@/api/index';

// 玩法提示相关状态
const tipsLoading = ref(false);
const allTips = ref<string[]>([]);
const currentTipIndex = ref(0);
const TIPS_PER_PAGE = 5;

// 计算当前显示的提示
const displayTips = computed(() => {
  if (allTips.value.length === 0) return [];
  const start = currentTipIndex.value;
  const end = start + TIPS_PER_PAGE;
  return allTips.value.slice(start, end);
});

// 加载玩法提示
const loadGameTips = async () => {
  if (tipsLoading.value) return; // 防止重复加载

  tipsLoading.value = true;
  try {
    const res = await gameTipApi.getAllTips();
    console.log('[玩法提示] 完整响应:', res);

    if (res && res.code === 200 && res.data && Array.isArray(res.data)) {
      allTips.value = res.data;
      currentTipIndex.value = 0;
      console.log('[玩法提示] 加载成功，共', allTips.value.length, '条提示');
    } else if (res && res.code === 1000 && res.data && Array.isArray(res.data)) {
      allTips.value = res.data;
      currentTipIndex.value = 0;
      console.log('[玩法提示] 加载成功(code:1000)，共', allTips.value.length, '条提示');
    } else if (res && Array.isArray(res)) {
      allTips.value = res;
      currentTipIndex.value = 0;
      console.log('[玩法提示] 加载成功(直接数组)，共', allTips.value.length, '条提示');
    } else {
      console.warn('[玩法提示] 数据格式异常:', res);
      allTips.value = getDefaultTips();
      currentTipIndex.value = 0;
    }
  } catch (error) {
    console.error('[玩法提示] 加载失败:', error);
    allTips.value = getDefaultTips();
    currentTipIndex.value = 0;
  } finally {
    tipsLoading.value = false;
  }
};

// 默认玩法提示
const getDefaultTips = (): string[] => {
  return [
    "🎮 K宝，来玩成语接龙吧！我说\"一帆风顺\"，你接下一个～",
    "📖 K宝，给我讲个童话故事吧，我想听关于勇敢的小动物的故事",
    "❓ K宝，我们猜谜语吧！我出题你来猜，或者你出题我来猜",
    "🇬🇧 K宝，教我学英语吧，今天想学习关于天气的单词",
    "🎵 K宝，一起唱首歌吧！你唱一句我跟一句",
    "🎯 K宝，我们来玩词语接龙，看谁接得又快又好",
    "😂 K宝，给我讲个笑话吧，我想开心一下",
    "📰 K宝，今天有什么新闻趣事吗？给我讲讲吧",
    "🎭 K宝，我们来玩\"我说你猜\"的游戏，描述一个东西让我猜",
    "🐱 K宝，你能模仿小动物的声音吗？我想听小猫怎么叫",
    "👀 K宝，看看我现在在做什么？分析一下我的学习状态吧",
    "📚 K宝，帮我看看书桌上的物品，用英文告诉我它们的名称",
    "☀️ K宝，看看窗外的天气，告诉我今天适合做什么活动",
    "🎨 K宝，帮我观察一下周围的环境，找出3种不同的颜色",
    "🖼️ K宝，看看我画的这幅画，猜猜我画的是什么场景",
    "🧮 K宝，陪我一起做这道数学题吧，给我讲解解题思路",
    "🎙️ K宝，我要背诵课文，你帮我纠正发音和语调",
    "🎮 K宝，我们来玩学习闯关游戏，答对题目可以获得奖励",
    "📅 K宝，帮我制定今天的学习计划吧，我想提高学习效率",
    "📖 K宝，一起预习明天的功课，帮我划出重点内容",
    "😴 K宝，我有点累了，陪我做个短暂的休息放松活动",
    "✅ K宝，检查一下我的作业，指出需要改进的地方",
    "📝 K宝，我们一起写日记吧，帮我记录今天的学习收获",
    "🏆 K宝，来场知识竞赛！问问我历史上的今天发生了什么",
    "💡 K宝，给我讲解这个知识点，用最简单易懂的方式"
  ];
};

// 换一换
const handleRefreshTips = () => {
  if (allTips.value.length === 0) return;
  let nextIndex = currentTipIndex.value + TIPS_PER_PAGE;
  if (nextIndex >= allTips.value.length) {
    nextIndex = 0;
  }
  currentTipIndex.value = nextIndex;
  console.log('[玩法提示] 换一换，当前起始索引:', currentTipIndex.value);
};

const { t: $t } = useI18n();
const toast = useToast();
useGlobalRequestErrorToast(toast);
const { showNotify, closeNotify } = useNotify();
const { scanAndBind, isNavigating } = useDeviceScan({ toast, showNotify, closeNotify });

// 导航栏高度
const statusBarHeight = ref(20);
const navBarHeight = ref(44);

function setNavBarHeight() {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 20;
  const isAndroid = systemInfo.platform === 'android';
  try {
    const menuButtonInfo =
        typeof uni.getMenuButtonBoundingClientRect === 'function'
            ? uni.getMenuButtonBoundingClientRect()
            : null;
    if (menuButtonInfo && menuButtonInfo.height) {
      const topGap = menuButtonInfo.top - statusBarHeight.value;
      navBarHeight.value = menuButtonInfo.height + Math.max(topGap, 0) * 2;
    } else {
      navBarHeight.value = isAndroid ? 48 : 44;
    }
  } catch {
    navBarHeight.value = isAndroid ? 48 : 44;
  }
}
setNavBarHeight();

const userStore = useUserStore();
const PENDING_BIND_KEY = 'pendingBindAction';
type PendingBindAction = 'qrcode' | 'bluetooth';

function isUserAuthenticated(): boolean {
  return userStore.isLoggedIn && userStore.userId > 0;
}

function resumePendingBindAction() {
  const pending = uni.getStorageSync(PENDING_BIND_KEY) as PendingBindAction | '';
  if (!pending) return;

  const maxAttempts = 20;
  let attempts = 0;
  const tryResume = () => {
    attempts += 1;
    if (isUserAuthenticated()) {
      uni.removeStorageSync(PENDING_BIND_KEY);
      if (pending === 'qrcode') {
        scanAndBind({ fromAddDevice: true });
      } else if (pending === 'bluetooth') {
        uni.navigateTo({
          url: PageMap[Pages.BluetoothConfig].url + '?fromAddDevice=1'
        });
      }
      return;
    }
    if (attempts < maxAttempts) {
      setTimeout(tryResume, 300);
    }
  };
  setTimeout(tryResume, 300);
}

// 状态
const loading = ref(true);
const deviceList = ref<any[]>([]);
const currentDevice = ref<any>(null);
const boundAgent = ref<any>(null);
const isPublicAgent = computed(() => boundAgent.value?.isPublic === 1);
const showDeviceSelector = ref(false);
const showEditName = ref(false);
const editDeviceName = ref('');
const isDescExpanded = ref(false);
const showDeviceDropdown = ref(false);
let loadDevicesVersion = 0;
const pendingSetupRedirect = ref(false);

// 加载设备列表
const loadDevices = async () => {
  const version = ++loadDevicesVersion;
  try {
    loading.value = true;
    const previousDeviceId = currentDevice.value?.id;

    const res = await deviceApi.getList();
    if (version !== loadDevicesVersion) {
      return;
    }
    if (res && res.code === 1000 && res.data) {
      deviceList.value = Array.isArray(res.data) ? res.data : [];

      if (deviceList.value.length > 0) {
        const previousDevice = previousDeviceId
            ? deviceList.value.find((d: any) => d.id === previousDeviceId)
            : null;

        if (previousDevice) {
          currentDevice.value = previousDevice;
        } else {
          currentDevice.value = deviceList.value[0];
        }
        await loadBoundAgent(version);
      } else {
        currentDevice.value = null;
        boundAgent.value = null;
      }
    } else {
      deviceList.value = [];
      currentDevice.value = null;
      boundAgent.value = null;
    }
  } catch (error) {
    if (version !== loadDevicesVersion) return;
    console.error('加载设备列表失败:', error);
    deviceList.value = [];
    currentDevice.value = null;
    boundAgent.value = null;
  } finally {
    if (version === loadDevicesVersion) {
      loading.value = false;
    }
  }
};

// 加载绑定的智能体
const loadBoundAgent = async (version?: number) => {
  if (!currentDevice.value?.agentId) {
    boundAgent.value = null;
    return;
  }
  try {
    const res = await agentApi.getInfo(currentDevice.value.agentId);
    if (version !== undefined && version !== loadDevicesVersion) {
      return;
    }
    if (res && res.code === 1000 && res.data) {
      const agentData = { ...res.data };

      if (agentData.config) {
        agentData.config = { ...agentData.config };

        if (agentData.config.langCode) {
          await initLanguageDisplayNameCache();
          const langDisplayName = getLanguageDisplayNameByLangCode(
              agentData.config.langCode,
              agentData.config.language
          );
          agentData.config.language = langDisplayName;
        }

        const promises: Promise<void>[] = [];

        if (agentData.config.ttsVoiceId) {
          promises.push(
              (async () => {
                try {
                  const voiceRes = await voiceApi.getList();
                  if (voiceRes && voiceRes.data) {
                    const voiceList = Array.isArray(voiceRes.data)
                        ? voiceRes.data
                        : voiceRes.data.list
                            ? voiceRes.data.list
                            : Object.values(voiceRes.data);
                    const voice = voiceList.find(
                        (v: any) =>
                            v.voiceId === agentData.config.ttsVoiceId ||
                            v.id === agentData.config.ttsVoiceId
                    );
                    if (voice) {
                      agentData.config.voiceName = voice.voiceName || voice.name;
                    }
                  }
                } catch (e) {
                  console.error('查询音色名称失败:', e);
                }
              })()
          );
        }

        if (agentData.config.llmModelId) {
          promises.push(
              (async () => {
                try {
                  const llmRes = await agentApi.getLLMlist();
                  if (llmRes && llmRes.data) {
                    const llmList =
                        llmRes.data.llm ||
                        llmRes.data.list ||
                        (Array.isArray(llmRes.data) ? llmRes.data : []);
                    const llm = llmList.find(
                        (l: any) =>
                            l.id === agentData.config.llmModelId ||
                            l.llmId === agentData.config.llmModelId ||
                            l.modelId === agentData.config.llmModelId
                    );
                    if (llm) {
                      agentData.config.llmModelName = llm.name || llm.llmName || llm.modelName;
                    }
                  }
                } catch (e) {
                  console.error('查询LLM名称失败:', e);
                }
              })()
          );
        }

        await Promise.all(promises);
      }

      if (version !== undefined && version !== loadDevicesVersion) {
        return;
      }
      boundAgent.value = agentData;
    } else {
      boundAgent.value = null;
    }
  } catch (error) {
    console.error('加载智能体失败:', error);
    boundAgent.value = null;
  }
};

const getAvatarText = (name: string) => {
  return name ? name.charAt(0) : '?';
};

const toggleDescExpand = () => {
  isDescExpanded.value = !isDescExpanded.value;
};

const handleAddDeviceQrcode = () => {
  pendingSetupRedirect.value = true;
  scanAndBind({
    fromAddDevice: true,
    onScanSuccess: () => {
      loadDevices();
    }
  });
};

const handleAddDeviceBluetooth = () => {
  pendingSetupRedirect.value = true;
  uni.navigateTo({
    url: PageMap[Pages.BluetoothConfig].url + '?fromAddDevice=1'
  });
};

const showEditNamePopup = () => {
  if (currentDevice.value) {
    editDeviceName.value = currentDevice.value.deviceName || '';
    showEditName.value = true;
  }
};

const handleSaveDeviceName = async () => {
  if (!editDeviceName.value.trim()) {
    uni.showToast({
      title: $t('device_status.name_required'),
      icon: 'none'
    });
    return;
  }

  try {
    await deviceApi.updateName({
      id: currentDevice.value.id,
      deviceName: editDeviceName.value.trim()
    });
    currentDevice.value.deviceName = editDeviceName.value.trim();
    showEditName.value = false;
    uni.showToast({
      title: $t('common.save_success'),
      icon: 'success'
    });
  } catch (error: any) {
    console.error('[设备状态/saveDeviceName] 失败:', error);
  }
};

const toggleDeviceDropdown = () => {
  showDeviceDropdown.value = !showDeviceDropdown.value;
};

const selectDeviceFromDropdown = async (device: any) => {
  currentDevice.value = device;
  showDeviceDropdown.value = false;
  await loadBoundAgent();
};

const handleSelectDevice = async (device: any) => {
  currentDevice.value = device;
  showDeviceSelector.value = false;
  await loadBoundAgent();
};

const handleAgentClick = () => {
  if (boundAgent.value && boundAgent.value.agentId) {
    if (isPublicAgent.value) {
      uni.showToast({
        title: $t('device_status.cannot_edit_public_agent'),
        icon: 'none'
      });
      return;
    }
    uni.navigateTo({
      url: `/pages/agent/edit?agentId=${boundAgent.value.agentId}`
    });
  }
};

const handleGoToSquare = () => {
  uni.switchTab({
    url: PageMap[Pages.Super_square].url
  });
};

const goToSquare = () => {
  uni.switchTab({
    url: PageMap[Pages.Super_square].url
  });
};

const goToCustomAgent = () => {
  uni.navigateTo({
    url: '/pages/agent/create'
  });
};

const goToVoiceManage = () => {
  uni.navigateTo({
    url: '/pages/voice/manage'
  });
};

const goToVoiceClone = () => {
  uni.navigateTo({
    url: '/pages/voice/clone'
  });
};

const goToVideoPlaylist = () => {
  uni.navigateTo({
    url: '/pages/guide/video-list'
  });
};

const goToGuidePage = () => {
  uni.navigateTo({
    url: '/pages/guide/tutorial-list'
  });
};

onShow(async () => {
  uni.hideTabBar({ animation: false });
  isNavigating.value = false;

  const shouldRedirect = pendingSetupRedirect.value;
  if (shouldRedirect) {
    pendingSetupRedirect.value = false;
  }

  await loadDevices();

  // 修复：无论是否有设备，都加载玩法提示
  await loadGameTips();

  if (shouldRedirect && deviceList.value.length > 0) {
    uni.switchTab({
      url: PageMap[Pages.Super_square].url
    });
    return;
  }

  // #ifdef MP-WEIXIN
  resumePendingBindAction();
  // #endif
});

uni.$on('deviceStatusRefresh', () => {
  loadDevices();
});
</script>

<style lang="scss" scoped>
.device-status-container {
  min-height: 100vh;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  overflow: hidden;

  background-image: url('@/img/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.gradient-bg {
  display: none;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.navbar-status-bar {
  height: var(--status-bar-height, 44px);
}

.navbar-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.navbar-title {
  font-size: 18px;
  font-weight: 500;
  color: #212730;
}

.switch-device-btn {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  height: 22px;
}

.switch-device-text {
  font-size: 16px;
  font-weight: 400;
  line-height: 22px;
  color: #36404f;
}

.switch-device-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  image {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;

    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.device-dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}

.device-dropdown {
  position: fixed;
  left: 28px;
  top: calc(var(--status-bar-height, 44px) + 44px + 2px);
  width: 199px;
  max-height: 220px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 101;
  overflow: hidden;
}

.device-dropdown-list {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  max-height: 212px;
  overflow-y: auto;
}

.device-dropdown-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 9px 12px;
  min-height: 44px;
  background: #ffffff;
  border-bottom: 0.5px solid #f3f4f7;

  &:last-child {
    border-bottom: none;
  }

  &.active {
    background: #ffffff;
  }
}

.device-dropdown-item-name {
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: #212730;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.active {
    color: var(--color-primary);
  }
}

.device-dropdown-item-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: 8px;
}

.halo-decoration {
  position: absolute;
  width: 272px;
  height: 205px;
  left: -65px;
  top: -49px;
  opacity: 0.4;
  z-index: 1;
}

.halo-line {
  position: absolute;
  background: linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0) 100%);
  filter: blur(6px);
  transform: rotate(34.28deg);
}

.halo-line-1 {
  width: 194px;
  height: 31px;
  left: 29px;
  top: -49px;
}

.halo-line-2 {
  width: 175px;
  height: 36px;
  left: -17px;
  top: -13px;
}

.halo-line-3 {
  width: 185px;
  height: 36px;
  left: -65px;
  top: 23px;
}

.halo-ellipse {
  position: absolute;
  border-radius: 50%;
  z-index: 1;
}

.halo-ellipse-1 {
  width: 209px;
  height: 209px;
  left: -57px;
  bottom: 150px;
  background: var(--color-primary-bg);
  opacity: 0.6;
  filter: blur(26px);
}

.halo-ellipse-2 {
  width: 181px;
  height: 181px;
  right: -77px;
  bottom: 120px;
  background: var(--color-primary-bg);
  opacity: 0.5;
  filter: blur(20px);
}

.content-area {
  position: relative;
  z-index: 2;
  padding: 16px;
  padding-top: calc(var(--status-bar-height, 44px) + 44px + 16px);
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.loading-text {
  font-size: 14px;
  color: #60718b;
}

// ========== 内容布局 ==========

.content-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// ========== 绑定状态模块 ==========

.module-bind-status {
  min-height: 200rpx;
}

.bind-card {
  background: white;
  border-radius: 32rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.brand-logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 28rpx;
  background: #eef2ff;
  flex-shrink: 0;
  object-fit: cover;
}

.bind-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.status-tip {
  font-size: 28rpx;
  font-weight: 500;
  letter-spacing: 1rpx;

  &.unbound {
    color: #1e293b;
  }

  &.bound {
    color: #1e293b;
  }
}

.device-info-row {
  margin-top: 4rpx;
}

.device-number {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--color-primary);
  display: block;
  margin-bottom: 8rpx;
}

.agent-intro {
  margin-top: 4rpx;
}

.agent-intro-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #212730;
  display: block;
  margin-bottom: 6rpx;
}

.agent-intro-desc {
  font-size: 24rpx;
  color: #60718b;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  line-height: 1.5;
}

.no-agent-hint {
  margin-top: 4rpx;
}

.no-agent-hint-text {
  font-size: 24rpx;
  color: #60718b;
  display: block;
  margin-bottom: 12rpx;
}

.add-options {
  display: flex;
  gap: 24rpx;
}

.add-btn {
  background: #f1f5f9;
  padding: 12rpx 28rpx;
  border-radius: 60rpx;
  transition: all 0.2s ease;

  &:active {
    background: #e2e8f0;
    transform: scale(0.96);
  }
}

.add-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #3b82f6;
}

// ========== 功能入口模块 ==========

.module-functions {
  min-height: 180rpx;
}

.func-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  background: white;
  border-radius: 32rpx;
  padding: 28rpx 20rpx;
  box-sizing: border-box;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.func-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.94);
    opacity: 0.8;
  }
}

.func-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 28rpx;
  background: #f0fdf4;
  object-fit: cover;
}

.func-name {
  font-size: 22rpx;
  font-weight: 500;
  color: #334155;
  text-align: center;
}

// ========== 资源卡片模块 ==========

.module-resources {
  display: flex;
  gap: 16rpx;
  min-height: 180rpx;
}

.resource-card {
  flex: 1;
  border-radius: 32rpx;
  overflow: hidden; // ⭐必须加
  padding: 0;       // ⭐去掉内边距
  background: transparent;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}


.full-img {
  width: 100%;
  height: 100%;
  border-radius: 24rpx;
  object-fit: cover;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}

// ========== 玩法提示模块 ==========

.module-tips {
  flex: 1;
  background: white;
  border-radius: 32rpx;
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  min-height: 300rpx;
}

.tips-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx 16rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.tips-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #10b981;
}

.tips-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #ecfdf5;
  border-radius: 40rpx;
  transition: all 0.2s ease;
  line-height: 1;

  &:active {
    background: #d1fae5;
    transform: scale(0.96);
  }
}

.tips-refresh-icon {
  width: 28rpx;
  height: 28rpx;
}

.tips-refresh-text {
  font-size: 24rpx;
  color: #10b981;
  font-weight: 500;
}

.tips-list {
  flex: 1;
  padding: 16rpx 0 24rpx;
  max-height: 500rpx;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 28rpx;
  border-bottom: 1rpx solid #f0f2f5;
  transition: background 0.2s ease;

  &:active {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
}

.tip-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.5;
  color: #334155;
}

.tips-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx;
}

.tips-loading-text {
  font-size: 26rpx;
  color: #94a3b8;
}

.tips-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx;
}

.tips-empty-text {
  font-size: 26rpx;
  color: #94a3b8;
}

// ========== 弹窗样式 ==========

.bottom-illustration {
  position: fixed;
  width: 100%;
  height: 132px;
  left: 0;
  bottom: 158rpx;
  opacity: 0.08;
  z-index: 1;
  pointer-events: none;
}

.edit-name-dialog {
  width: 700rpx;
  background: #ffffff;
  border-radius: 32rpx;
  overflow: hidden;
}

.edit-name-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 24px 0;
  gap: 16px;
}

.edit-name-title {
  font-size: 18px;
  font-weight: 500;
  color: #212730;
  line-height: 26px;
  text-align: center;
}

.edit-name-input-wrapper {
  width: 100%;
  height: 48px;
  background: #f3f4f7;
  border: 1.5px solid var(--color-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
}

.edit-name-input {
  flex: 1;
  height: 100%;
  font-size: 14px;
  color: #212730;
  background: transparent;
}

.edit-name-clear {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-icon {
  width: 20px;
  height: 20px;
}

.edit-name-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20px 24px 24px;
  gap: 12px;
}

.edit-name-btn {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;

  &.cancel {
    background: #f3f4f7;
    color: #212730;
  }

  &.confirm {
    background: var(--color-primary);
    color: #ffffff;
  }
}

.device-selector {
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.device-selector-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.device-selector-title {
  font-size: 18px;
  font-weight: 500;
  color: #212730;
}

.device-selector-close {
  width: 24px;
  height: 24px;

  image {
    width: 100%;
    height: 100%;
  }
}

.device-selector-list {
  max-height: 300px;
}

.device-selector-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: #f3f4f7;

  &.active {
    background: var(--color-info-bg);
    border: 1px solid var(--color-primary);
  }
}

.device-selector-item-name {
  font-size: 16px;
  color: #212730;
}

.device-selector-item-check {
  width: 20px;
  height: 20px;

  image {
    width: 100%;
    height: 100%;
  }
}

/* 内容区域（控制在左侧，避免压住白泽） */
.hero-content {
  width: 60%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 标题 */
.hero-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1f2937;
}

/* 描述 */
.hero-desc {
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* 按钮组 */
.hero-btn-group {
  display: flex;
  gap: 20rpx;
  margin-top: 12rpx;
}

/* 按钮 */
.btn {
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  text-align: center;
}

/* 主按钮 */
.btn.primary {
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #fff;
}

/* 次按钮 */
.btn.ghost {
  background: rgba(255,255,255,0.7);
  color: #10b981;
  border: 1px solid #a7f3d0;
}

/* 已绑定 */
.hero-bind {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-top: 10rpx;
}

.device-name {
  font-size: 28rpx;
  color: #10b981;
  font-weight: 600;
}

.btn.small {
  padding: 10rpx 20rpx;
  font-size: 24rpx;
}

.baize-img {
  position: fixed;
  right: 20rpx;
  top: calc(var(--status-bar-height, 44px) + 10rpx);
  width: 460rpx;
  height: 460rpx;
  z-index: 10;
  pointer-events: none;
  transform: translateX(50rpx);

  mix-blend-mode: multiply;
}
</style>
