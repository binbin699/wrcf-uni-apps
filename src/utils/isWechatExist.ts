/**
 * 检测微信是否安装
 * @returns true: 已安装, false: 未安装
 * @注意 iOS 9+ 需要在 manifest.json 的 app-plus.distribute.ios.urlschemewhitelist 中添加 "weixin"
 * @doc https://www.html5plus.org/doc/zh_cn/runtime.html#plus.runtime.isApplicationExist
 */
export function isWechatExist(): boolean {
  try {
    return plus.runtime.isApplicationExist({ pname: 'com.tencent.mm', action: 'weixin://' });
  } catch (error) {
    console.error('检测微信安装失败:', error);
    return false;
  }
}
