type Platform = 'mp-weixin' | 'app-ios' | 'app-android' | 'app-harmony';

/**
 * 获取应用配置
 * 根据不同的版本返回不同的功能配置
 *
 * @param platform 平台类型
 * iOS：app-ios
 * Android：app-android
 * 鸿蒙：app-harmony
 * 微信小程序：mp-weixin
 *
 * @param appEdition 版本类型，可选值：full, cn, intl
 */
export default function getAppConfig(
  platform: Platform,
  appEdition: 'full' | 'cn' | 'intl'
): Record<string, any> {
  // 基础 API 地址
  let BASE_API_URL: string;

  if (platform === 'mp-weixin') {
    // 微信小程序使用 HTTPS 线上服务器
    BASE_API_URL = 'https://lingxiwmp.qiniu.com/user';
  } else {
    // App 端根据版本选择服务器
    BASE_API_URL =
      // appEdition === 'intl' ? 'http://192.168.0.35:8001' : 'http://192.168.0.35:8001';
      appEdition === 'intl' ? 'http://36.134.119.145:8000' : 'http://36.134.119.145:8000';
  }

  // 是否支持微信小程序手机号登录
  const SUPPORT_LOGIN_TYPE_WX_MP_PHONE = appEdition === 'cn' || appEdition === 'full';

  // 是否支持游客登录
  const SUPPORT_LOGIN_TYPE_GUEST = appEdition === 'full';

  // 在小程序中是否支持游客登录
  const SUPPORT_LOGIN_TYPE_GUEST_MP = appEdition === 'cn' || appEdition === 'full';

  // 是否支持谷歌登录
  const SUPPORT_LOGIN_TYPE_GOOGLE = platform === 'app-android' && appEdition !== 'cn';

  // 是否支持密码登录
  const SUPPORT_LOGIN_TYPE_PASSWORD = true;

  // 是否支持微信授权登录
  const SUPPORT_LOGIN_TYPE_WECHAT_OAUTH = true;

  // 是否支持邮箱登录
  const SUPPORT_LOGIN_TYPE_EMAIL = appEdition === 'intl' || appEdition === 'full';

  // 是否支持苹果登录
  const SUPPORT_LOGIN_TYPE_APPLE = platform === 'app-ios';

  // 是否支持短信登录
  const SUPPORT_LOGIN_TYPE_SMS = appEdition === 'cn' || appEdition === 'full';

  // 蓝牙配网是否启用设备名称筛选，可选值：true, false，默认 true
  const BLE_FILTER_ENABLED = true;

  // 控制首页设置引导的显示
  // 可选值: qrcode, bluetooth, both (不填默认为 both)
  const APP_SETUP_MODE = 'both';

  // 是否支持声纹管理（微信小程序不支持）
  const APP_USE_VOICEPRINT = false;

  // 是否支持音色复刻
  const APP_USE_VOICE_CLONE = true;
  // 主要的设置引导方式，优先展示该方式，值为 qrcode、bluetooth 或 none（不展示）
  const APP_PRIMARY_SETUP_MODE = 'none';
  // 用户协议和隐私政策 URL（微信小程序不显示）
  const TERMS_URL =
    platform === 'mp-weixin' ? '' : 'http://47.114.109.136:8008/user-agreement.html';
  const PRIVACY_URL =
    platform === 'mp-weixin' ? '' : 'http://47.114.109.136:8008/privacy-policy.html';

  // 用户反馈邮箱（留空则不显示反馈入口，微信小程序不显示）
  // 九宝：jiubao@qiniu.com
  const FEEDBACK_EMAIL = platform === 'mp-weixin' ? '' : 'jiubao@qiniu.com';

  // 是否显示说明与教程（微信小程序不显示）
  const SHOW_INSTRUCTIONS_TUTORIALS = platform !== 'mp-weixin';
  const PROFILE_ENTRY_GROUP_ORDER = [
    'device_management',
    'qrcode_setup',
    'bluetooth_setup',
    'voice',
    'instructions_tutorials',
    'legal',
    'feedback'
  ];

  /**
   * 智能体广场语言筛选样式（可被品牌 config.json 的 ui.squareLanguageFilterStyle 覆盖）
   * navbar：导航栏左上角下拉；horizontal_bar：搜索框下方下拉选择框
   */
  const SQUARE_LANGUAGE_FILTER_STYLE = 'navbar';

  // Google 授权登录，海外版需要配置 Google Client ID
  const GOOGLE_OAUTH_CLIENT_ID_WEB =
    appEdition === 'cn'
      ? ''
      : '668197306109-2glguqobqtbm92rt9upnot9rrt0t7bmf.apps.googleusercontent.com';

  // ARMS 监控配置
  const ARMS_PID = 'hmn73dtabu@f6272e69e2e3597';
  const ARMS_ENDPOINT = 'https://hmn73dtabu-default-cn.rum.aliyuncs.com/rum/web/v2';
  const ARMS_ENV = 'prod';

  // 音频文件上传域名（灵矽平台需要能直接访问的公网域名）
  // 如果不配置，默认使用 BASE_API_URL
  const UPLOAD_DOMAIN = 'https://jiubaozhinengweir.com/var/www/music';

  //视频存储路径
  const VIDEO_SERVER_DOMAIN = 'https://wrcfmo.cn/';
  const VIDEO_STORAGE_PATH = '/static_in/video/';
  return {
    BASE_API_URL,
    SUPPORT_LOGIN_TYPE_WX_MP_PHONE,
    SUPPORT_LOGIN_TYPE_GUEST,
    SUPPORT_LOGIN_TYPE_GUEST_MP,
    SUPPORT_LOGIN_TYPE_GOOGLE,
    SUPPORT_LOGIN_TYPE_PASSWORD,
    SUPPORT_LOGIN_TYPE_WECHAT_OAUTH,
    SUPPORT_LOGIN_TYPE_EMAIL,
    SUPPORT_LOGIN_TYPE_APPLE,
    SUPPORT_LOGIN_TYPE_SMS,
    BLE_FILTER_ENABLED,
    APP_SETUP_MODE,
    APP_USE_VOICEPRINT,
    APP_USE_VOICE_CLONE,
    TERMS_URL,
    PRIVACY_URL,
    FEEDBACK_EMAIL,
    SHOW_INSTRUCTIONS_TUTORIALS,
    PROFILE_ENTRY_GROUP_ORDER,
    SQUARE_LANGUAGE_FILTER_STYLE,
    GOOGLE_OAUTH_CLIENT_ID_WEB,
    ARMS_PID,
    ARMS_ENDPOINT,
    ARMS_ENV,
    APP_PRIMARY_SETUP_MODE,
    APP_QRCODE_SCAN_SOURCE
    UPLOAD_DOMAIN,
    VIDEO_SERVER_DOMAIN,
    VIDEO_STORAGE_PATH
  };
}
