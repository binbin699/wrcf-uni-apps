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
        <!-- 切换设备按钮 - 仅当有多个设备时显示 -->
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
            {{ device.macAddress ? 'MAC: ' + device.macAddress : device.deviceName }}
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

      <!-- 无设备状态 - 欢迎引导样式 -->
      <view
        class="welcome-guide"
        v-else-if="!currentDevice"
        :class="{ 'is-single': setupMode !== 'both' }">
        <view class="welcome-card" v-if="setupMode === 'both'">
          <view class="welcome-title">{{ $t('welcome.guide_title') }}</view>
          <view class="welcome-actions">
            <view class="welcome-setup-options">
              <view class="welcome-setup-card" @click="handleAddDeviceQrcode">
                <view class="welcome-setup-icon-wrapper qr">
                  <image
                    class="welcome-setup-icon"
                    src="/static/icons/scan-qrcode.svg"
                    mode="aspectFit" />
                </view>
                <text class="welcome-setup-text">{{ $t('welcome.setup_qrcode') }}</text>
              </view>
              <view class="welcome-setup-card" @click="handleAddDeviceBluetooth">
                <view class="welcome-setup-icon-wrapper bluetooth">
                  <image
                    class="welcome-setup-icon"
                    src="/static/icons/bluetooth.svg"
                    mode="aspectFit" />
                </view>
                <text class="welcome-setup-text">{{ $t('welcome.setup_bluetooth') }}</text>
              </view>
            </view>
            <!-- #ifndef MP-WEIXIN -->
            <view class="welcome-help-link" @click="handleHelpClick">
              <text>{{ $t('profile.instructions_tutorials') }}</text>
            </view>
            <!-- #endif -->
          </view>
        </view>
        <view class="welcome-card-single" v-else>
          <view class="welcome-icon-wrapper single" :class="setupMode">
            <image
              v-if="setupMode === 'qrcode'"
              class="welcome-setup-icon-large"
              src="/static/icons/scan-qrcode.svg"
              mode="aspectFit" />
            <image
              v-else
              class="welcome-setup-icon-large"
              src="/static/icons/bluetooth.svg"
              mode="aspectFit" />
          </view>
          <view class="welcome-title-single">{{ $t('welcome.guide_title') }}</view>
          <view class="welcome-actions-single">
            <view
              class="welcome-primary-btn"
              @click="
                setupMode === 'qrcode' ? handleAddDeviceQrcode() : handleAddDeviceBluetooth()
              ">
              {{
                setupMode === 'qrcode' ? $t('welcome.setup_qrcode') : $t('welcome.setup_bluetooth')
              }}
            </view>
            <!-- #ifndef MP-WEIXIN -->
            <view class="welcome-help-link single-mode" @click="handleHelpClick">
              <text>{{ $t('profile.instructions_tutorials') }}</text>
            </view>
            <!-- #endif -->
          </view>
        </view>
      </view>

      <!-- 有设备状态 -->
      <view class="device-content" v-else>
        <!-- 设备卡片 -->
        <view class="device-card">
          <view class="device-card-content">
            <text class="device-name">
              {{
                currentDevice.macAddress
                  ? 'MAC: ' + currentDevice.macAddress
                  : currentDevice.deviceName
              }}
            </text>
            <!-- 编辑按钮暂时注释，等后端接口完成后启用
            <view class="device-edit-btn" @click.stop="showEditNamePopup">
              <image class="edit-icon" src="/static/icons/icon-edit.svg" mode="aspectFit"></image>
            </view>
            -->
          </view>
        </view>

        <!-- 当前智能体区域 - 只在有绑定智能体时显示 -->
        <view class="agent-section" v-if="boundAgent">
          <!-- 智能体卡片容器 -->
          <view class="agent-card-container">
            <!-- 智能体卡片主体 -->
            <view class="agent-card" @click="handleAgentClick">
              <view class="agent-avatar">
                <view class="avatar-bg">
                  <text class="avatar-text">{{ getAvatarText(boundAgent.agentName) }}</text>
                </view>
              </view>
              <view class="agent-info">
                <view class="agent-name-row">
                  <view class="agent-name-wrapper">
                    <text class="agent-name">{{ boundAgent.agentName }}</text>
                    <view class="agent-arrow">
                      <image src="/static/icons/right-arrow.svg" mode="aspectFit"></image>
                    </view>
                  </view>
                </view>
                <view class="agent-tags">
                  <text class="agent-tag">
                    {{ boundAgent.config?.language || $t('device_status.default_language') }}
                  </text>
                  <view class="agent-tag-divider"></view>
                  <text class="agent-tag">
                    {{ boundAgent.config?.voiceName || $t('device_status.default_voice') }}
                  </text>
                  <view class="agent-tag-divider"></view>
                  <text class="agent-tag">
                    {{ boundAgent.config?.llmModelName || $t('device_status.default_llm') }}
                  </text>
                </view>
                <view class="agent-divider"></view>
                <text
                  class="agent-desc"
                  :class="{ 'is-expanded': isDescExpanded }"
                  @click.stop="toggleDescExpand">
                  {{ boundAgent.config?.systemPrompt || $t('device_status.no_description') }}
                </text>
              </view>
            </view>

            <!-- 底部当前角色标签 -->
            <view class="agent-section-footer">
              <view class="agent-section-header">
                <image
                  class="agent-section-icon"
                  src="/static/icons/icon-agent.svg"
                  mode="aspectFit"></image>
                <text class="agent-section-title">{{ $t('device_status.current_agent') }}</text>
              </view>
            </view>
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
              {{ device.macAddress ? 'MAC: ' + device.macAddress : device.deviceName }}
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

    <!-- AI 生成提示 -->
    <view v-if="deviceList.length > 0" class="ai-generated-tip">
      <text class="ai-generated-text">{{ $t('common.ai_generated_disclaimer') }}</text>
    </view>

    <!-- 自定义 TabBar -->
    <CustomTabBar :current="0" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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

const { t: $t } = useI18n();
const toast = useToast();
const { showNotify, closeNotify } = useNotify();
const { scanAndBind, isNavigating } = useDeviceScan({ toast, showNotify, closeNotify });

// 配置
const setupMode = APP_CONFIG.APP_SETUP_MODE || 'both';

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

// 登录成功后自动续接绑定流程（仅小程序端）
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
        scanAndBind({});
      } else if (pending === 'bluetooth') {
        uni.navigateTo({
          url: PageMap[Pages.BluetoothConfig].url
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
const showDeviceSelector = ref(false);
const showEditName = ref(false);
const editDeviceName = ref('');
const isDescExpanded = ref(false);
const showDeviceDropdown = ref(false);
let loadDevicesVersion = 0; // 用于取消过期的加载请求
// 标记用户是否从欢迎引导发起了设备配置，配置完成后跳转智能体广场
const pendingSetupRedirect = ref(false);

// 加载设备列表
const loadDevices = async () => {
  const version = ++loadDevicesVersion;
  try {
    loading.value = true;
    // 记住当前选中的设备ID
    const previousDeviceId = currentDevice.value?.id;

    const res = await deviceApi.getList();
    // 如果在等待期间又触发了新的加载，则丢弃本次结果
    if (version !== loadDevicesVersion) {
      console.log('[设备状态] 丢弃过期的设备列表响应');
      return;
    }
    console.log('[设备状态] 设备列表响应:', res);
    if (res && res.code === 1000 && res.data) {
      deviceList.value = Array.isArray(res.data) ? res.data : [];
      console.log('[设备状态] 设备列表:', deviceList.value);

      if (deviceList.value.length > 0) {
        // 尝试保持之前选中的设备，如果不存在则选择第一个
        const previousDevice = previousDeviceId
          ? deviceList.value.find((d: any) => d.id === previousDeviceId)
          : null;

        if (previousDevice) {
          currentDevice.value = previousDevice;
          console.log('[设备状态] 保持之前选中的设备:', currentDevice.value);
        } else {
          currentDevice.value = deviceList.value[0];
          console.log('[设备状态] 选择第一个设备:', currentDevice.value);
        }
        await loadBoundAgent(version);
      } else {
        // 设备列表为空时，清空当前设备和智能体
        currentDevice.value = null;
        boundAgent.value = null;
        console.log('[设备状态] 设备列表为空，已清空当前设备');
      }
    } else {
      // API 返回异常时也清空
      deviceList.value = [];
      currentDevice.value = null;
      boundAgent.value = null;
    }
  } catch (error) {
    // 过期请求不处理错误
    if (version !== loadDevicesVersion) return;
    console.error('加载设备列表失败:', error);
    // 出错时也清空，避免显示旧数据
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
  console.log('[设备状态] 尝试加载绑定的智能体, agentId:', currentDevice.value?.agentId);
  if (!currentDevice.value?.agentId) {
    console.log('[设备状态] 设备未绑定智能体');
    boundAgent.value = null;
    return;
  }
  try {
    const res = await agentApi.getInfo(currentDevice.value.agentId);
    // 如果在等待期间又触发了新的加载，则丢弃本次结果
    if (version !== undefined && version !== loadDevicesVersion) {
      console.log('[设备状态] 丢弃过期的智能体详情响应');
      return;
    }
    console.log('[设备状态] 智能体详情响应:', res);
    // 检查 API 返回是否成功且数据有效
    if (res && res.code === 1000 && res.data) {
      // 构建完整的 agent 数据对象，避免后续直接修改 ref 的嵌套属性导致响应式丢失
      const agentData = { ...res.data };
      console.log('[设备状态] 绑定的智能体:', agentData);

      // 根据ID查询语言显示名称、音色名称和LLM名称
      if (agentData.config) {
        // 复制 config 以便安全修改
        agentData.config = { ...agentData.config };

        // 通过 langCode 查找翻译后的语言显示名称
        if (agentData.config.langCode) {
          await initLanguageDisplayNameCache();
          const langDisplayName = getLanguageDisplayNameByLangCode(
            agentData.config.langCode,
            agentData.config.language
          );
          agentData.config.language = langDisplayName;
        }

        // 并行查询音色名称和LLM名称
        const promises: Promise<void>[] = [];

        // 查询音色名称
        if (agentData.config.ttsVoiceId) {
          promises.push(
            (async () => {
              try {
                const voiceRes = await voiceApi.getList();
                console.log('[设备状态] 音色列表响应:', voiceRes);
                if (voiceRes && voiceRes.data) {
                  const voiceList = Array.isArray(voiceRes.data)
                    ? voiceRes.data
                    : voiceRes.data.list
                      ? voiceRes.data.list
                      : Object.values(voiceRes.data);
                  console.log('[设备状态] 音色列表:', voiceList);
                  const voice = voiceList.find(
                    (v: any) =>
                      v.voiceId === agentData.config.ttsVoiceId ||
                      v.id === agentData.config.ttsVoiceId
                  );
                  if (voice) {
                    agentData.config.voiceName = voice.voiceName || voice.name;
                    console.log('[设备状态] 找到音色:', voice);
                  }
                }
              } catch (e) {
                console.error('查询音色名称失败:', e);
              }
            })()
          );
        }

        // 查询LLM名称
        if (agentData.config.llmModelId) {
          promises.push(
            (async () => {
              try {
                const llmRes = await agentApi.getLLMlist();
                console.log('[设备状态] LLM列表响应:', llmRes);
                if (llmRes && llmRes.data) {
                  // LLM列表在 data.llm 数组中
                  const llmList =
                    llmRes.data.llm ||
                    llmRes.data.list ||
                    (Array.isArray(llmRes.data) ? llmRes.data : []);
                  console.log('[设备状态] LLM列表:', llmList);
                  // 尝试多种ID字段匹配
                  const llm = llmList.find(
                    (l: any) =>
                      l.id === agentData.config.llmModelId ||
                      l.llmId === agentData.config.llmModelId ||
                      l.modelId === agentData.config.llmModelId
                  );
                  if (llm) {
                    agentData.config.llmModelName = llm.name || llm.llmName || llm.modelName;
                    console.log('[设备状态] 找到LLM:', llm);
                  } else {
                    console.log(
                      '[设备状态] 未找到匹配的LLM, llmModelId:',
                      agentData.config.llmModelId
                    );
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

      // 再次检查版本，避免异步查询期间的竞态
      if (version !== undefined && version !== loadDevicesVersion) {
        console.log('[设备状态] 丢弃过期的智能体数据（查询音色/LLM期间已过期）');
        return;
      }
      // 一次性赋值完整数据，确保 Vue 响应式能检测到变更
      boundAgent.value = agentData;
    } else {
      // API返回失败或智能体不存在，清空绑定的智能体
      console.log('[设备状态] 智能体不存在或获取失败, code:', res?.code, 'message:', res?.message);
      boundAgent.value = null;
    }
  } catch (error) {
    console.error('加载智能体失败:', error);
    boundAgent.value = null;
  }
};

// 获取头像背景色
const getAvatarBgColor = (name: string) => {
  const colors = ['#E3F6FF', '#FFE8E8', '#E8FFE8', '#FFF3E8', '#F3E8FF'];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

// 获取头像文字
const getAvatarText = (name: string) => {
  return name ? name.charAt(0) : '?';
};

// 切换描述展开状态
const toggleDescExpand = () => {
  isDescExpanded.value = !isDescExpanded.value;
};

// 处理添加设备（扫码）
const handleAddDeviceQrcode = () => {
  pendingSetupRedirect.value = true;
  scanAndBind({
    onScanSuccess: () => {
      // 扫码成功后刷新设备列表
      loadDevices();
    }
  });
};

// 处理添加设备（蓝牙）
const handleAddDeviceBluetooth = () => {
  pendingSetupRedirect.value = true;
  uni.navigateTo({
    url: PageMap[Pages.BluetoothConfig].url
  });
};

// 处理点击说明与教程
const handleHelpClick = () => {
  uni.navigateTo({
    url: '/pages/profile/help'
  });
};

// 显示编辑设备名称弹窗
const showEditNamePopup = () => {
  if (currentDevice.value) {
    editDeviceName.value = currentDevice.value.deviceName || '';
    showEditName.value = true;
  }
};

// 保存设备名称
const handleSaveDeviceName = async () => {
  if (!editDeviceName.value.trim()) {
    uni.showToast({
      title: $t('device_status.name_required'),
      icon: 'none'
    });
    return;
  }

  try {
    await deviceApi.update({
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
    console.error('更新设备名称失败:', error);
    const errorMsg = error?.message?.includes('Not Found')
      ? $t('common.operation_failed')
      : $t('common.save_failed');
    uni.showToast({
      title: errorMsg,
      icon: 'none'
    });
  }
};

// 处理编辑设备（跳转到设备详情页）
const handleEditDevice = () => {
  if (currentDevice.value) {
    uni.navigateTo({
      url: `/pages/device/device?deviceId=${currentDevice.value.id}`
    });
  }
};

// 处理切换设备（点击设备卡片）
const handleSwitchDevice = () => {
  // 只有多个设备时才显示选择器
  if (deviceList.value.length > 1) {
    showDeviceSelector.value = true;
  }
};

// 切换设备下拉菜单显示
const toggleDeviceDropdown = () => {
  showDeviceDropdown.value = !showDeviceDropdown.value;
};

// 从下拉菜单选择设备
const selectDeviceFromDropdown = async (device: any) => {
  currentDevice.value = device;
  showDeviceDropdown.value = false;
  await loadBoundAgent();
};

// 处理选择设备（从底部弹窗）
const handleSelectDevice = async (device: any) => {
  currentDevice.value = device;
  showDeviceSelector.value = false;
  await loadBoundAgent();
};

// 处理点击智能体
const handleAgentClick = () => {
  if (boundAgent.value && boundAgent.value.agentId) {
    uni.navigateTo({
      url: `/pages/agent/edit?agentId=${boundAgent.value.agentId}`
    });
  }
};

// 处理绑定智能体
const handleBindAgent = () => {
  // 跳转到智能体列表选择绑定
  uni.switchTab({
    url: '/pages/index/index'
  });
};

onShow(async () => {
  // 隐藏系统 TabBar（解决双重导航栏问题）
  uni.hideTabBar({ animation: false });
  // 重置扫码导航状态，防止 Tab 页持久化导致 isNavigating 卡住
  isNavigating.value = false;

  // 记录是否需要在加载完成后跳转智能体广场
  const shouldRedirect = pendingSetupRedirect.value;
  if (shouldRedirect) {
    pendingSetupRedirect.value = false;
  }

  // 刷新设备列表（onShow 在页面首次显示时也会触发，无需在 onMounted 中重复调用）
  await loadDevices();

  // 配置完成后，如果设备已成功添加，跳转智能体广场方便用户绑定智能体
  if (shouldRedirect && deviceList.value.length > 0) {
    console.log('[设备状态] 配置完成，跳转智能体广场');
    uni.switchTab({
      url: '/pages/square/square'
    });
    return;
  }

  // #ifdef MP-WEIXIN
  // 登录后续接绑定流程（仅小程序端）
  resumePendingBindAction();
  // #endif
});

// 页面显示时刷新数据
uni.$on('deviceStatusRefresh', () => {
  loadDevices();
});
</script>

<style lang="scss" scoped>
.device-status-container {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

// 渐变背景
.gradient-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: linear-gradient(180deg, #9cbdff 0%, #d2dbff 22.97%, #fcfdff 100%);
  z-index: 0;
}

// 自定义导航栏
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

// 切换设备按钮
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

// 设备切换下拉菜单
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
    color: #3e5def;
  }
}

.device-dropdown-item-check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-left: 8px;
}

// 光晕装饰
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
  background: #ebefff;
  opacity: 0.6;
  filter: blur(26px);
}

.halo-ellipse-2 {
  width: 181px;
  height: 181px;
  right: -77px;
  bottom: 120px;
  background: #eaeeff;
  opacity: 0.5;
  filter: blur(20px);
}

// 主要内容区域
.content-area {
  position: relative;
  z-index: 2;
  padding: 16px;
  padding-top: calc(var(--status-bar-height, 44px) + 44px + 16px);
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
}

// 加载状态
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

// 欢迎引导样式
.welcome-guide {
  display: flex;
  justify-content: center;
  align-items: center;
  // 计算可用高度：100vh - 顶部导航栏高度 - 顶部padding - 底部TabBar区域 - 底部padding
  min-height: calc(
    100vh - var(--status-bar-height, 44px) - 44px - 16px - 120px - env(safe-area-inset-bottom) -
      16px
  );
  padding: 0 30rpx;
}

.welcome-card {
  width: 100%;
  max-width: 640rpx;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 36rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;

  /* #ifdef MP-WEIXIN */
  // 小程序隐藏了"说明与教程"链接，增加内边距让卡片更协调
  padding: 72rpx 40rpx 64rpx;
  gap: 48rpx;
  /* #endif */
}

.welcome-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  white-space: pre-line;
  text-align: center;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
  width: 100%;
}

.welcome-setup-options {
  display: flex;
  width: 100%;
  gap: 24rpx;
  justify-content: center;
}

.welcome-setup-card {
  flex: 1;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 36rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  border: 2rpx solid #f1f5f9;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  /* #ifdef MP-WEIXIN */
  // 小程序隐藏了"说明与教程"，增加卡片高度补偿
  padding: 52rpx 20rpx;
  gap: 28rpx;
  /* #endif */

  &:active {
    transform: scale(0.96);
    background: #f8fafc;
  }
}

.welcome-setup-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 16rpx rgba(0, 0, 0, 0.1);

  &.qr {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  &.bluetooth {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
  }
}

.welcome-setup-icon {
  width: 48rpx;
  height: 48rpx;
}

.welcome-setup-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #334155;
}

.welcome-help-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 16rpx 40rpx 8rpx;
  margin-top: 16rpx;
  color: #3b82f6;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.2s ease;

  &:active {
    opacity: 0.7;
  }

  &.single-mode {
    margin-top: 8rpx;
    margin-bottom: 8rpx;
  }
}

// 单个按钮布局样式（qrcode / bluetooth 模式）
.welcome-card-single {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 48rpx;
  padding: 80rpx 48rpx 60rpx;
  box-shadow: 0 32rpx 80rpx rgba(37, 99, 235, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-icon-wrapper.single {
  width: 140rpx;
  height: 140rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 16rpx 32rpx rgba(0, 0, 0, 0.1);

  &.qrcode {
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 16rpx 32rpx rgba(16, 185, 129, 0.25);
  }

  &.bluetooth {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    box-shadow: 0 16rpx 32rpx rgba(59, 130, 246, 0.25);
  }
}

.welcome-setup-icon-large {
  width: 72rpx;
  height: 72rpx;
}

.welcome-title-single {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  white-space: pre-line;
  text-align: center;
  margin-bottom: 60rpx;
}

.welcome-actions-single {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-primary-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: #ffffff;
  border-radius: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 12rpx 24rpx rgba(37, 99, 235, 0.25);
  margin-bottom: 32rpx;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

// 设备内容
.device-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// 设备卡片
.device-card {
  width: 100%;
  height: 72px;
  background: linear-gradient(274.82deg, #637df2 0%, #3e5eef 100%);
  box-shadow: 0px 0px 12px rgba(91, 118, 248, 0.06);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.device-card-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 100%;
  position: relative;
  z-index: 1;
}

.device-name {
  font-size: 20px;
  font-weight: 500;
  color: #ffffff;
  line-height: 36px;
  flex: 1;
}

.device-edit-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-icon {
  width: 16px;
  height: 16px;
}

// 智能体区域
.agent-section {
  display: flex;
  flex-direction: column;
}

// 智能体卡片容器
.agent-card-container {
  display: flex;
  flex-direction: column;
  filter: drop-shadow(0px 0px 8px rgba(91, 118, 248, 0.05));
}

// 智能体卡片主体（内层白色卡片）
.agent-card {
  display: flex;
  flex-direction: row;
  padding: 20px 16px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 0px 12px rgba(91, 118, 248, 0.06);
  gap: 12px;
}

// 底部当前角色标签（外层底部区域）
.agent-section-footer {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 16px 13px;
  height: 70px;
  margin-top: -26px;
  background: #edf9ff;
  border: 0.5px solid #d5dae2;
  border-radius: 0 0 20px 20px;
  box-sizing: border-box;
  z-index: -1;
}

.agent-section-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.agent-section-icon {
  width: 14px;
  height: 14px;
}

.agent-section-title {
  font-size: 14px;
  color: #60718b;
  line-height: 24px;
}

.agent-avatar {
  flex-shrink: 0;
}

.avatar-bg {
  width: 44px;
  height: 44px;
  background: #e3f6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 18px;
  font-weight: 500;
  color: #3e5def;
  line-height: 24px;
  text-align: center;
}

.agent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.agent-name-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.agent-name {
  font-size: 18px;
  font-weight: 500;
  color: #212730;
}

.agent-arrow {
  width: 16px;
  height: 16px;
  opacity: 0.8;

  image {
    width: 100%;
    height: 100%;
  }
}

.agent-tags {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 6px 12px;
  background: #e3f6ff;
  border-radius: 6px;
  gap: 8px;
  flex-wrap: wrap;
}

.agent-tag {
  font-size: 13px;
  color: #36404f;
}

.agent-tag-divider {
  width: 1px;
  height: 8px;
  background: #98a5b8;
  opacity: 0.5;
}

.agent-divider {
  width: 100%;
  height: 1px;
  background: #d5dae2;
  margin: 8px 0;
}

.agent-desc {
  font-size: 14px;
  line-height: 22px;
  color: #4b586d;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;

  &.is-expanded {
    -webkit-line-clamp: unset;
    line-clamp: unset;
  }
}

// 未绑定智能体
.no-agent-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20px 16px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0px 0px 12px rgba(91, 118, 248, 0.06);
  gap: 12px;
}

.no-agent-icon {
  width: 44px;
  height: 44px;
  background: #f3f4f7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  image {
    width: 24px;
    height: 24px;
    opacity: 0.5;
  }
}

.no-agent-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.no-agent-title {
  font-size: 16px;
  font-weight: 500;
  color: #212730;
}

.no-agent-desc {
  font-size: 14px;
  color: #60718b;
}

.no-agent-arrow {
  width: 20px;
  height: 20px;

  image {
    width: 100%;
    height: 100%;
    opacity: 0.5;
  }
}

// 底部插图
.bottom-illustration {
  position: fixed;
  width: 100%;
  height: 132px;
  left: 0;
  // TabBar 高度: tabbar-inner(104rpx) + paddingBottom(约54rpx) = 158rpx
  bottom: 158rpx;
  opacity: 0.08;
  z-index: 1;
  pointer-events: none;
}

// AI 生成提示
.ai-generated-tip {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  // TabBar 上方，留出足够间距
  bottom: calc(158rpx + 24px);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-generated-text {
  font-weight: 400;
  font-size: 12px;
  line-height: 18px;
  color: #60718b;
  text-align: center;
  white-space: nowrap;
}

// 编辑设备名称弹窗
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
  border: 1.5px solid #3d77fc;
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
    background: #3e5def;
    color: #ffffff;
  }
}

// 设备选择弹窗
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
    background: #e3f6ff;
    border: 1px solid #3e5def;
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
</style>
