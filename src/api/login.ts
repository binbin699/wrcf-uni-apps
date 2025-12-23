import request from '@/utils/request';
import { BaseResponse } from '@/types/request';
import type {
  BackendLoginResponse,
  BackendLoginData,
  BackendUserInfo,
  IAuthLoginRes,
  IUserInfoRes,
  IPasswordLoginForm,
  IPasswordRegisterForm,
  IMiniLoginParams,
  IEmailLoginForm,
  ISmsLoginParams
} from './types/login';
import { GoogleOauthRes } from './types/OAuth';
import i18n from '@/locale';
import { getGoogleClientId } from '@/configs/';

const $t = i18n.global.t;

// Google OAuth client id (web)
const GOOGLE_CLIENT_ID = getGoogleClientId();

/**
 * 数据转换工具函数
 */
class LoginDataTransformer {
  /**
   * 将后端登录响应转换为unibest格式
   */
  static transformLoginResponse(backendData: BackendLoginData): IAuthLoginRes {
    return {
      token: backendData.token,
      expiresIn: backendData.expire,
      refreshToken: backendData.refreshToken,
      refreshExpiresIn: backendData.refreshExpire
    };
  }

  /**
   * 将后端用户信息转换为unibest格式
   */
  static transformUserInfo(backendUserInfo: BackendUserInfo): IUserInfoRes {
    return {
      userId: backendUserInfo.id,
      nickname: backendUserInfo.nickName,
      avatar: backendUserInfo.avatarUrl,
      phone: backendUserInfo.phone,
      gender: backendUserInfo.gender
    };
  }
}

/**
 * 登录相关API服务
 */
export class LoginApiService {
  /**
   * 账号密码登录
   */
  static async passwordLogin(loginForm: IPasswordLoginForm): Promise<{
    auth: IAuthLoginRes;
    userInfo: IUserInfoRes;
  }> {
    const response: BackendLoginResponse = await request.post('/app/user/login/password', {
      unionid: loginForm.unionid,
      password: loginForm.password
    });

    const { data } = response;

    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * 邮箱密码登录
   */
  static async emailLogin(loginForm: IEmailLoginForm): Promise<{
    auth: IAuthLoginRes;
    userInfo: IUserInfoRes;
  }> {
    const response: BackendLoginResponse = await request.post('/app/user/login/email', {
      email: loginForm.email,
      password: loginForm.password
    });

    const { data } = response;

    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * WeChat App OAuth 登录
   * 调用 uni.login(provider: 'weixin') 获取 code，再请求后端换取用户信息
   */
  static async wxAppLogin(): Promise<{ auth: IAuthLoginRes; userInfo: IUserInfoRes }> {
    // 兼容APP-PLUS/Harmony环境，仅在App端可用
    const loginRes: any = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        onlyAuthorize: true,
        success: resolve,
        fail: reject
      });
    });

    console.log('loginRes', loginRes);
    if (!loginRes || !loginRes.code) {
      throw new Error($t('login.auth_failed'));
    }

    const response: BackendLoginResponse = await request.post('/app/user/login/oauth', {
      provider: 'wx',
      data: {
        code: loginRes.code
      }
    });

    const { data } = response;
    console.log('login data', data);
    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * Apple登录
   */
  static async appleLogin(): Promise<{ auth: IAuthLoginRes; userInfo: IUserInfoRes }> {
    console.log('Apple 登录开始');
    const loginRes: any = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'apple',
        success: resolve,
        fail: reject
      });
    });

    console.log('Apple loginRes:', loginRes);

    // 检查 authResult (iOS) 或 code (部分场景)
    if (!loginRes) {
      console.error('❌ loginRes 为空');
      throw new Error($t('login.auth_failed'));
    }

    // 提取必要参数
    // uni-app Apple登录返回结构（实际）：
    // { 
    //   authResult: { access_token, openid },
    //   appleInfo: { identityToken, authorizationCode, user, fullName, realUserStatus }
    // }
    const { authResult, appleInfo } = loginRes;

    if (!appleInfo || !appleInfo.identityToken) {
      console.error('Apple 登录失败：缺少 identityToken');
      console.error('appleInfo:', appleInfo);
      throw new Error($t('login.auth_failed') + ': No identityToken');
    }

    // 提取数据：identityToken 和 authorizationCode 在 appleInfo 中，openid 在 authResult 中
    const identityToken = appleInfo.identityToken;
    const authorizationCode = appleInfo.authorizationCode;
    const openid = authResult?.openid || appleInfo.user;
    const email = ''; // Apple 首次登录后，后续不会再返回 email
    const fullName = appleInfo.fullName || {};

    console.log('Apple 登录数据准备完成，发送到后端');

    const response: BackendLoginResponse = await request.post('/app/user/login/oauth', {
      provider: 'apple',
      data: {
        identityToken,
        authorizationCode,
        openid,
        email,
        fullName
      }
    });

    const { data } = response;
    console.log('apple login data', data);
    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * 发送短信验证码
   */
  static async sendSmsCode(phone: string): Promise<BaseResponse<{ ticket: string }>> {
    return await request.post('/app/user/login/smsCode', { phone });
  }

  /**
   * 短信登录
   */
  static async smsLogin(params: ISmsLoginParams): Promise<{ auth: IAuthLoginRes; userInfo: IUserInfoRes }> {
    const response: BackendLoginResponse = await request.post('/app/user/login/phone', params);

    const { data } = response;

    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * 小程序手机号登录
   */
  static async miniPhoneLogin(params: IMiniLoginParams): Promise<{
    auth: IAuthLoginRes;
    userInfo: IUserInfoRes;
  }> {
    const response: BackendLoginResponse = await request.post('/app/user/login/miniPhone', params);

    const { data } = response;

    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * 账号密码注册
   */
  static async register(registerForm: IPasswordRegisterForm): Promise<{
    auth: IAuthLoginRes;
    userInfo: IUserInfoRes;
  }> {
    const response: BackendLoginResponse = await request.post(
      '/app/user/login/register',
      registerForm
    );

    const { data } = response;

    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * Google OAuth登录，获取idToken等
   *
   * 安卓实现参考：https://jishuzhan.net/article/1933106901214081026
   * @param options.success 成功回调，参数为GoogleOauthRes
   * @param options.fail 失败回调，参数为错误信息和是否取消登录
   */
  static async googleOAuth(options?: {
    success?: (res: GoogleOauthRes) => void;
    fail?: (err: any, cancel: boolean) => void;
  }) {
    // todo: ios支持
    try {
      const mainActivity = plus.android.runtimeMainActivity();
      const GoogleSignInOptions = plus.android.importClass(
        'com.google.android.gms.auth.api.signin.GoogleSignInOptions'
      );

      // @ts-ignore
      const gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestIdToken(GOOGLE_CLIENT_ID) // 关键：申请 idToken
        .requestServerAuthCode(GOOGLE_CLIENT_ID)
        .requestEmail()
        .requestProfile()
        .build();

      const GoogleSignIn = plus.android.importClass(
        'com.google.android.gms.auth.api.signin.GoogleSignIn'
      );
      // @ts-ignore
      const mGoogleClient = GoogleSignIn.getClient(mainActivity, gso);
      const signInIntent = plus.android.invoke(mGoogleClient, 'getSignInIntent');

      const CODE_REQUEST = 200;
      // @ts-ignore
      mainActivity.startActivityForResult(signInIntent, CODE_REQUEST);

      // @ts-ignore
      mainActivity.onActivityResult = (requestCode, resultCode, data) => {
        if (requestCode == CODE_REQUEST) {
          // @ts-ignore
          const account = new GoogleSignIn().getLastSignedInAccount(mainActivity);
          const googleAccountInfo = {
            openid: plus.android.invoke(account, 'getId'),
            email: plus.android.invoke(account, 'getEmail'),
            displayName: plus.android.invoke(account, 'getDisplayName'),
            idToken: plus.android.invoke(account, 'getIdToken'), // 目标字段
            serverAuthCode: plus.android.invoke(account, 'getServerAuthCode'),
            // 将 Android Uri(JSBObject) 转成字符串 URL
            // @ts-ignore
            photoUrl: (() => {
              try {
                // @ts-ignore
                const uriObj = plus.android.invoke(account, 'getPhotoUrl');
                if (!uriObj) return '';
                // @ts-ignore 调用 Java 对象的 toString()
                const url = plus.android.invoke(uriObj, 'toString');
                return typeof url === 'string' ? url : '';
              } catch (e) {
                console.error('解析 photoUrl 失败:', e);
                return '';
              }
            })()
          };
          // googleAccountInfo全是空，说明用户取消了登录
          if (
            !googleAccountInfo.idToken &&
            !googleAccountInfo.serverAuthCode &&
            !googleAccountInfo.email
          ) {
            console.log({ requestCode, resultCode, data });
            options?.fail?.({ requestCode, resultCode, data }, true);
            return;
          }
          options?.success?.(googleAccountInfo);
        } else {
          console.error('Google 登录失败', { requestCode, resultCode, data });
          options?.fail?.({ requestCode, resultCode, data }, false);
        }
      };
    } catch (error) {
      console.error('Google 登录异常', error);
      options?.fail?.(error, false);
    }
  }

  /**
   * Google OAuth login
   *
   * 完成google oauth，然后使用idToken请求后端获取用户信息 (自动注册)
   */
  static async googleLogin(): Promise<{
    auth: IAuthLoginRes;
    userInfo: IUserInfoRes;
  }> {
    return new Promise((resolve, reject) => {
      LoginApiService.googleOAuth({
        success: async (oauthRes: GoogleOauthRes) => {
          try {
            console.log('request oauth', oauthRes);
            // 调用后端OAuth接口
            const response: BackendLoginResponse = await request.post('/app/user/login/oauth', {
              provider: 'google',
              data: {
                openid: oauthRes.openid,
                email: oauthRes.email,
                displayName: oauthRes.displayName,
                idToken: oauthRes.idToken,
                serverAuthCode: oauthRes.serverAuthCode,
                photoUrl: oauthRes.photoUrl
              }
            });

            if (response.code === 1000) {
              const backendData = response.data;

              // 转换为标准格式
              const result = {
                auth: LoginDataTransformer.transformLoginResponse(backendData),
                userInfo: LoginDataTransformer.transformUserInfo(backendData.userInfo)
              };

              resolve(result);
            } else {
              reject(new Error(response.message || 'Google ' + $t('login.login_failed')));
            }
          } catch (error: any) {
            console.error('Google登录请求失败:', error);
            reject(error);
          }
        },
        fail: (error: any, cancel: boolean) => {
          console.error('Google OAuth失败:', error);
          if (cancel) {
            reject(new Error('Google ' + $t('login.auth_cancel')));
          } else {
            reject(new Error('Google ' + $t('login.auth_failed')));
          }
        }
      });
    });
  }
  // /**
  //  * Google OAuth login 错误示例
  //  */
  // static async googleLogin() {

  //   uni.login({
  //     // @ts-ignore google不在provider里？？
  //     provider: 'google',
  //     success: function (loginRes) {
  //       /**
  //        {
  //           "authResult": {
  //               "openid": "1034432199501000000000",
  //               "unionid": "1034432199501000000000"
  //           },
  //           "errMsg": "login:ok"
  //         }
  //        */
  //       // 登录成功
  //       console.log('登录成功:', loginRes);
  //       uni.getUserInfo({
  //         // @ts-ignore google不在provider里？？
  //         provider: 'google',
  //         success: function (info) {
  //           /**
  //            * {
  //                 "userInfo": {
  //                   "nickname": "xxxx",
  //                   "unionid": "1034432199501000000000",
  //                   "openid": "1034432199501000000000",
  //                   "email": "sxxxx@gmail.com",
  //                   "openId": "1034432199501000000000",
  //                   "nickName": "xxxx"
  //                 },
  //                 "errMsg": "getUserInfo:ok"
  //             }
  //            */
  //           console.log('用户信息:', info);

  //         },
  //         fail: function (err) {
  //           // 获取用户信息失败
  //           console.error('获取用户信息失败:', err);
  //         }
  //       });
  //       // ------------------
  //     },
  //     fail: function (err) {
  //       // 登录授权失败
  //       // err.code是错误码
  //       console.error('登录授权失败:', err);
  //     }
  //   });
  // }

  /**
   * 游客登录
   */
  static async guestLogin(): Promise<{
    auth: IAuthLoginRes;
    userInfo: IUserInfoRes;
  }> {
    const response: BackendLoginResponse = await request.post('/app/user/login/guest');

    const { data } = response;

    return {
      auth: LoginDataTransformer.transformLoginResponse(data),
      userInfo: LoginDataTransformer.transformUserInfo(data.userInfo)
    };
  }

  /**
   * 刷新token
   */
  static async refreshToken(refreshToken: string): Promise<IAuthLoginRes> {
    const response: BaseResponse<BackendLoginData> = await request.post(
      '/app/user/login/refreshToken',
      {
        refreshToken
      }
    );

    return LoginDataTransformer.transformLoginResponse(response.data);
  }

  /**
   * 获取用户信息
   */
  static async getUserInfo(): Promise<IUserInfoRes> {
    const response: BaseResponse<BackendUserInfo> = await request.get('/app/user/info/person');

    return LoginDataTransformer.transformUserInfo(response.data);
  }

  /**
   * 更新用户信息
   */
  static async updateUserInfo(userInfo: Partial<IUserInfoRes>): Promise<IUserInfoRes> {
    // 转换为后端格式
    const backendData = {
      nickName: userInfo.nickname,
      gender: userInfo.gender,
      phone: userInfo.phone,
      avatarUrl: userInfo.avatar
    };

    const response: BaseResponse<BackendUserInfo> = await request.post(
      '/app/user/info/updatePerson',
      backendData
    );

    return LoginDataTransformer.transformUserInfo(response.data);
  }

  /**
   * 更新密码
   */
  static async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    await request.post('/app/user/info/updatePassword', {
      oldPassword,
      newPassword
    });
  }

  /**
   * 绑定手机号
   */
  static async bindPhone(params: IMiniLoginParams): Promise<void> {
    await request.post('/app/user/info/bindPhone', params);
  }

  /**
   * 注销/删除账号
   */
  static async delAccount(): Promise<BaseResponse<void>> {
    return await request.post('/app/user/info/logoff');
  }
}

// 导出便捷的API函数
export const loginApi = {
  // 登录相关
  passwordLogin: LoginApiService.passwordLogin,
  emailLogin: LoginApiService.emailLogin,
  miniPhoneLogin: LoginApiService.miniPhoneLogin,
  register: LoginApiService.register,
  guestLogin: LoginApiService.guestLogin,
  refreshToken: LoginApiService.refreshToken,
  googleLogin: LoginApiService.googleLogin,
  wxAppLogin: LoginApiService.wxAppLogin,
  appleLogin: LoginApiService.appleLogin,
  sendSmsCode: LoginApiService.sendSmsCode,
  smsLogin: LoginApiService.smsLogin,

  // 用户信息相关
  getUserInfo: LoginApiService.getUserInfo,
  updateUserInfo: LoginApiService.updateUserInfo,
  updatePassword: LoginApiService.updatePassword,
  bindPhone: LoginApiService.bindPhone,
  delAccount: LoginApiService.delAccount
};

// 默认导出
export default loginApi;
