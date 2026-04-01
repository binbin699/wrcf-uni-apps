// @ts-nocheck
import request from '@/utils/request';
import common from './common';

// 用户认证相关接口
export const authApi = {
  // 小程序手机号登录
  login(data) {
    return request.post('/app/user/login/miniPhone', data);
  },

  // 账号密码登录
  passwordLogin(data) {
    return request.post('/app/user/login/password', data);
  },

  // 账号密码注册
  register(data) {
    return request.post('/app/user/login/register', data);
  },

  // 游客登录
  guestLogin() {
    return request.post('/app/user/login/guest');
  },

  // 刷新token
  refreshToken(refreshToken) {
    return request.post('/app/user/login/refreshToken', { refreshToken });
  }
};

// 用户信息相关接口
export const userInfoApi = {
  // 获取用户信息
  getPerson() {
    return request.get('/app/user/info/person');
  },

  // 更新用户信息
  updatePerson(data) {
    return request.post('/app/user/info/updatePerson', data);
  },

  // 更新用户密码
  updatePassword(data) {
    return request.post('/app/user/info/updatePassword', data);
  },

  // 绑定手机号
  bindPhone(data) {
    return request.post('/app/user/info/bindPhone', data);
  },

  // 绑定小程序手机号
  miniPhone(data) {
    return request.post('/app/user/info/miniPhone', data);
  },

  // 删除账号
  delAccount() {
    return request.post('/app/user/info/logoff');
  }
};

// 智能体管理相关接口
export const agentApi = {
  // 获取智能体列表，只包含个人智能体
  getList() {
    return request.get('/app/agent/list');
  },

  // 获取与用户关联的智能体列表，包含用户个人智能体和用户设备绑定他人公开智能体
  getRelatedAgents() {
    return request.get('/app/agent/list-related');
  },

  // 获取可用的LLM模型列表
  getLLMlist() {
    return request.get('/app/llm/list');
  },

  // 创建智能体
  create(data) {
    return request.post('/app/agent/create', data);
  },

  // 获取智能体详情
  getInfo(id) {
    return request.get(`/app/agent/info?id=${id}`);
  },

  // 更新智能体配置
  updateConfig(data) {
    return request.post('/app/agent/updateConfig', data);
  },

  // 智能体绑定设备
  bind(data) {
    return request.post('/app/agent/bind', data);
  },

  // 删除智能体
  deleteAgent(agentId) {
    return request.post('/app/agent/delete', { agentId });
  },

  // 更新智能体状态（公开/私有）
  updateAgentStatus(data) {
    return request.post('/app/agent/updateStatus', data);
  },

  // 获取公开的智能体列表
  // language: 'all' 获取所有智能体，不传则根据系统语言自动筛选
  getPublicAgents(language = 'all') {
    return request.get('/app/agent/public', { data: { language } });
  },

  // 获取模板智能体列表
  // language: 'all' 获取所有模板，不传则根据系统语言自动筛选
  getTemplateAgents(language = 'all') {
    return request.get('/app/agent/templates', { data: { language } });
  },

  // 优化提示词（灵矽平台AI处理需要较长时间，设置60秒超时，禁用默认loading）
  optimizePrompt(data) {
    return request.post('/app/agent/optimize-prompt', data, { timeout: 60000, showLoading: false });
  }
};

// 音色管理相关接口
export const voiceApi = {
  // 获取音色列表（GET接口，兼容前端调用）
  getList() {
    return request.get('/app/voice/list');
  },

  // 获取用户可见的音色列表（包含公开音色和自己的私有音色与平台音色）
  getVisibleVoices(query = {}) {
    return request.post('/app/voice/visible', query);
  },

  // 创建音色栏位
  createVoice(data) {
    return request.post('/app/voice/create', data);
  },

  // 训练音色
  trainVoice(data) {
    return request.post('/app/voice/train', data);
  },

  // 获取音色详细信息
  getVoiceDetail(voiceId) {
    return request.post('/app/voice/detail', { voiceId });
  },

  // 同步音色状态（保留接口，myList 已集成自动同步）
  syncVoiceStatus() {
    return request.post('/app/voice/sync');
  },

  // 删除音色
  removeVoice(voiceId) {
    return request.post('/app/voice/remove', { voiceId });
  },

  // 设置音色公开状态
  setVoicePublic(voiceId, isPublic) {
    return request.post('/app/voice/setPublic', { voiceId, isPublic });
  },

  // 获取音色列表（仅自己的音色）
  getMyVoices(query = {}) {
    return request.post('/app/voice/myList', query);
  },

  // 添加音色（通用CRUD接口）
  add(data) {
    return request.post('/app/voice/add', data);
  },

  // 删除音色（通用CRUD接口）
  delete(data) {
    return request.post('/app/voice/delete', data);
  },

  // 更新音色（通用CRUD接口）
  update(data) {
    return request.post('/app/voice/update', data);
  },

  // 获取音色信息（通用CRUD接口）
  info(id) {
    return request.get(`/app/voice/info?id=${id}`);
  },

  // 分页查询音色列表（通用CRUD接口）
  page(query = {}) {
    return request.post('/app/voice/page', query);
  }
};

// 设备管理相关接口
export const deviceApi = {
  // 获取设备列表
  getList() {
    return request.get('/app/device/list');
  },

  // 添加设备
  add(data) {
    return request.post('/app/device/add', data);
  },

  // 删除设备
  remove(data) {
    return request.delete('/app/device/remove', data);
  },

  // 更新设备名称（App 端调用）
  updateName(data) {
    return request.post('/app/device/update-name', data);
  },

  /**
   * 绑定声纹到设备
   * @param {deviceId: number, roleId?: string, audioUrl?: string, threshold?: number} data
   * @returns
   */
  bindVoiceprint(data) {
    return request.post('/app/device/bind-voiceprint', data);
  },

  /**
   * 解绑声纹从设备
   * @param {deviceId: number, voiceId: string} data
   * @returns
   */
  unbindVoiceprint(data) {
    return request.post('/app/device/unbind-voiceprint', data);
  },

  /**
   * 通过二维码绑定设备
   * @param {{ m: string }} data qrcode数据对象，仅需 MAC 地址
   * @returns
   */
  bindByQrcode(data) {
    return request.post('/app/device/bind-by-qrcode', { qrcode: data });
  },

  /**
   * 获取蓝牙配网设备名称过滤正则
   * @returns {{ regex: string }}
   */
  getFilterRegex() {
    return request.get('/app/device/filter-regex');
  }
};

// 语言管理相关接口
export const languageApi = {
  // 获取对话语言选项列表
  getList() {
    return request.get('/app/language/list');
  }
};

// 教程资源接口
export { tutorialApi } from './tutorial';

// 通用接口
export const commonApi = common;

// 为了向后兼容，保留原有的userApi导出
export const userApi = {
  ...userInfoApi,
  ...agentApi,
  ...deviceApi,
  ...voiceApi
};
