import _PageJson from '@/pages.json';
import i18n from '@/locale';

const $t = i18n.global.t;

export enum Pages {
  Login = 'login',
  Register = 'register',
  Index = 'index',
  DeviceStatus = 'device-status',
  AgentCreate = 'create-agent',
  AgentEdit = 'edit-agent',
  Profile = 'profile',
  DeleteAccount = 'delete-account',
  DeviceManage = 'device',
  BluetoothConfig = 'bluetooth-config',
  NetConfig = 'net-config',
  MockTest = 'mock-test',
  Square = 'square',
  Super_square = 'super_square',
  VoiceClone = 'voice-clone',
  VoiceManage = 'voice-manage',
  BindVoiceprint = 'bind-voiceprint',
  MpLanding = 'mp-landing'
}

export const PageMap = {
  [Pages.Login]: {
    path: 'pages/login/login',
    url: '/pages/login/login',
    title: $t('pages.login')
  },
  [Pages.Register]: {
    path: 'pages/login/register',
    url: '/pages/login/register',
    title: $t('pages.register')
  },
  [Pages.Index]: {
    path: 'pages/index/index',
    url: '/pages/index/index',
    title: $t('index.my_agents'),
    isTab: true
  },
  [Pages.DeviceStatus]: {
    path: 'pages/device-status/device-status',
    url: '/pages/device-status/device-status',
    title: $t('pages.device_status'),
    isTab: true
  },
  [Pages.AgentCreate]: {
    path: 'pages/agent/create',
    url: '/pages/agent/create',
    title: $t('pages.create_agent'),
    isTab: true
  },
  [Pages.Profile]: {
    path: 'pages/profile/profile',
    url: '/pages/profile/profile',
    title: $t('pages.profile'),
    isTab: true
  },
  [Pages.DeleteAccount]: {
    path: 'pages/profile/delete-account',
    url: '/pages/profile/delete-account',
    title: $t('pages.delete_account')
  },
  [Pages.Square]: {
    path: 'pages/square/square',
    url: '/pages/square/square',
    title: $t('pages.square'),
    isTab: true
  },
  [Pages.Super_square]: {
    path: 'pages/square/super_square',
    url: '/pages/square/super_square',
    title: $t('pages.super_square'),
    isTab: true
  },
  [Pages.AgentEdit]: {
    path: 'pages/agent/edit',
    url: '/pages/agent/edit',
    title: $t('pages.edit_agent')
  },
  [Pages.DeviceManage]: {
    path: 'pages/device/device',
    url: '/pages/device/device',
    title: $t('pages.device')
  },
  [Pages.BluetoothConfig]: {
    path: 'pages/bluetooth-config/bluetooth-config',
    url: '/pages/bluetooth-config/bluetooth-config',
    title: $t('pages.bluetooth_config')
  },
  [Pages.NetConfig]: {
    path: 'pages/net-config/net-config',
    url: '/pages/net-config/net-config',
    title: $t('pages.net_config')
  },
  [Pages.MockTest]: {
    path: 'pages/mock-test/mock-test',
    url: '/pages/mock-test/mock-test',
    title: $t('pages.mock_test')
  },
  [Pages.VoiceClone]: {
    path: 'pages/voice/clone',
    url: '/pages/voice/clone',
    title: $t('pages.voice_clone')
  },
  [Pages.VoiceManage]: {
    path: 'pages/voice/manage',
    url: '/pages/voice/manage',
    title: $t('pages.voice_manage')
  },
  [Pages.BindVoiceprint]: {
    path: 'pages/voice/bind-voiceprint',
    url: '/pages/voice/bind-voiceprint',
    title: $t('pages.bind_voiceprint')
  },
  [Pages.MpLanding]: {
    path: 'pages/mp-landing/mp-landing',
    url: '/pages/mp-landing/mp-landing',
    title: $t('pages.mp_landing')
  }
};
