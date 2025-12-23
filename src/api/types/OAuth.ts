export interface GoogleOauthRes {
  // 等同unionid
  openid: string;
  email: string;
  displayName: string;
  idToken: string;
  serverAuthCode: string;

  // 头像地址（由 Android Uri 转成的字符串）
  photoUrl: string;
}
