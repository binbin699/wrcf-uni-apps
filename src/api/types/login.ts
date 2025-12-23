import { BaseResponse } from '@/types/request';

/**
 * 后端用户信息结构
 */
export interface BackendUserInfo {
  /** 用户id */
  id: number;
  /** 用户名 */
  nickName: string;
  /** 性别 */
  gender: number;
  /** 手机号 */
  phone: string;
  /** 头像 */
  avatarUrl: string;
}

/**
 * 后端登录响应data字段结构
 */
export interface BackendLoginData {
  expire: number;
  refreshExpire: number;
  refreshToken: string;
  token: string;
  userInfo: BackendUserInfo;
}

/**
 * 后端完整登录响应结构
 */
export interface BackendLoginResponse extends BaseResponse<BackendLoginData> { }

/**
 * 适配unibest的认证响应类型
 */
export interface IAuthLoginRes {
  token: string;
  expiresIn: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}

/**
 * 适配unibest的用户信息类型
 */
export interface IUserInfoRes {
  userId: number;
  nickname: string;
  avatar: string;
  phone: string;
  gender: number;
}

/**
 * 登录表单类型
 */
export interface IPasswordLoginForm {
  unionid: string;
  password: string;
}

/**
 * 邮箱登录表单类型
 */
export interface IEmailLoginForm {
  email: string;
  password: string;
}

/**
 * 注册表单类型
 */
export interface IPasswordRegisterForm {
  unionid: string;
  password: string;
  nickName?: string;
}

/**
 * 微信小程序登录参数
 */
export interface IMiniLoginParams {
  code: string;
  encryptedData?: string;
  iv?: string;
}

/**
 * 短信登录参数
 */
export interface ISmsLoginParams {
  phone: string;
  ticket: string;
  smsCode: string;
}

// 兼容性类型别名
export type UserInfo = BackendUserInfo;
export type LoginResponse = BackendLoginResponse;
export type LoginData = BackendLoginData;
