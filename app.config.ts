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
export default function getAppConfig(platform: Platform, appEdition: 'full' | 'cn' | 'intl'): Record<string, any> {
  // 基础 API 地址
  const BASE_API_URL = appEdition === 'intl' ? 'http://47.79.126.80:8001' : 'http://47.112.207.28:8001';

  // 是否支持微信小程序手机号登录
  const SUPPORT_LOGIN_TYPE_WX_MP_PHONE = appEdition === 'cn' || appEdition === 'full';

  // 是否支持游客登录
  const SUPPORT_LOGIN_TYPE_GUEST = false;

  // 在小程序中是否支持游客登录
  const SUPPORT_LOGIN_TYPE_GUEST_MP = false;

  // 是否支持谷歌登录
  const SUPPORT_LOGIN_TYPE_GOOGLE = platform === 'app-android' && appEdition !== 'cn';

  // 是否支持密码登录
  const SUPPORT_LOGIN_TYPE_PASSWORD = false;

  // 是否支持微信授权登录
  const SUPPORT_LOGIN_TYPE_WECHAT_OAUTH = appEdition == 'cn';

  // 是否支持邮箱登录
  const SUPPORT_LOGIN_TYPE_EMAIL = true;

  // 是否支持苹果登录
  const SUPPORT_LOGIN_TYPE_APPLE = platform === 'app-ios';

  // 是否支持短信登录
  const SUPPORT_LOGIN_TYPE_SMS = appEdition === 'cn';

  // 蓝牙配网是否启用设备名称筛选，可选值：true, false，默认 true
  const BLE_FILTER_ENABLED = true;

  // 控制首页设置引导的显示
  // 可选值: qrcode, bluetooth, both (不填默认为 both)
  const APP_SETUP_MODE = 'qrcode';

  // 是否支持声纹
  const APP_USE_VOICEPRINT = false;

  // 用户协议和隐私政策 URL
  const TERMS_URL = 'https://mengdiantansuo.com.cn/terms';
  const PRIVACY_URL = 'https://mengdiantansuo.com.cn/privacy';

  // Google 授权登录，海外版需要配置 Google Client ID
  const GOOGLE_OAUTH_CLIENT_ID_WEB =
    appEdition === 'cn'
      ? ''
      : '287792291942-4i16oc73btg889o3l8hf174980d4f7po.apps.googleusercontent.com';

  // ARMS 监控配置
  const ARMS_PID = 'hmn73dtabu@f6272e69e2e3597';
  const ARMS_ENDPOINT = 'https://hmn73dtabu-default-cn.rum.aliyuncs.com/rum/web/v2';
  const ARMS_ENV = 'prod';

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
    TERMS_URL,
    PRIVACY_URL,
    GOOGLE_OAUTH_CLIENT_ID_WEB,
    ARMS_PID,
    ARMS_ENDPOINT,
    ARMS_ENV
  };
}
