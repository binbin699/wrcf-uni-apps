# `templates/` 使用说明

`templates/` 提供一套脱敏后的 `linx.config` 模板。你可以直接按这个结构创建自己的配置目录，再把真实信息替换进去。

## 目录结构

- `config.json`：全局默认配置
- `channels/<channel>/config.json`：渠道覆盖配置
- `common/assets/`：公共品牌资源
- `common/locale/`：公共语言包

## 先选渠道

按你的发布目标保留对应目录：

- Android 国内包：`app-android-cn`
- Android 国际包：`app-android-intl`
- iOS 国内包：`app-ios-cn`
- iOS 国际包：`app-ios-intl`
- HarmonyOS 国内包：`app-harmony-cn`
- 微信小程序国内包：`mp-weixin-cn`

常见组合：

- 只发国内 App：保留 `app-android-cn` + `app-ios-cn`，需要鸿蒙就加 `app-harmony-cn`
- 只发国际 App：保留 `app-android-intl` + `app-ios-intl`
- 只发微信小程序：保留 `mp-weixin-cn`
- 同时发国内 App 和小程序：保留 `app-android-cn` + `app-ios-cn` + `mp-weixin-cn`

不需要的平台，直接不保留对应渠道目录。

## 怎么配置

先改根目录 `config.json`，它是全局默认值。  
再改对应的 `channels/<channel>/config.json`，它只覆盖该渠道的差异项。  
最后替换 `common/assets/` 里的品牌资源，以及各渠道的证书材料。

推荐顺序：

1. 改 `identity.name`、`identity.dcloudAppId`、`identity.versionName`、`identity.versionCode`
2. 改 `endpoints.baseApiUrl`
3. 改 `legal.termsUrl`、`legal.privacyUrl`、`legal.feedbackEmail`
4. 改 `thirdParty.google.*`、`thirdParty.weixin.*`、`thirdParty.apple.*`
5. 改 `identity.packageName`、`identity.iosBundleId`、`identity.harmonyBundleName`
6. 替换 `common/assets/` 里的 Logo、启动图、图标
7. 把渠道证书放到 `channels/<channel>/certs/`

根配置和渠道配置的字段归属如下：

- 根 `config.json`：`endpoints.baseApiUrl`、`endpoints.armsPid`、`endpoints.armsEndpoint`、`endpoints.armsEnv`、`features.*`、`legal.*`、`ui.showInstructionsTutorials`、`ui.profileEntryGroupOrder`、`ui.squareLanguageFilterStyle`、`thirdParty.google.oauthClientIdNative`、`thirdParty.weixin.oauthAppId`、`thirdParty.weixin.universalLinks`、`identity.dcloudAppId`、`identity.name`、`identity.description`、`identity.versionName`、`identity.versionCode`、`identity.urlSchemeWhitelist`、`theme.tokens`
- `channels/<channel>/config.json`：`endpoints.baseApiUrl`、`features.*`、`legal.*`、`ui.showInstructionsTutorials`、`ui.profileEntryGroupOrder`、`ui.squareLanguageFilterStyle`、`thirdParty.google.oauthClientIdWeb`、`thirdParty.weixin.mpAppId`、`thirdParty.weixin.mpLocationDesc`、`thirdParty.apple.universalLinks`、`identity.packageName`、`identity.iosBundleId`、`identity.harmonyBundleName`

`ui.profileEntryGroupOrder` 用来控制“我的”页面入口分组的上下顺序，可选值如下：

- `device_management`：设备管理
- `qrcode_setup`：扫码配网 / 二维码配网
- `bluetooth_setup`：蓝牙配网 / 蓝牙配置
- `voice`：音色管理 / 音色复刻
- `instructions_tutorials`：说明与教程
- `legal`：用户协议 / 隐私政策
- `feedback`：反馈


## 覆盖关系

- 根配置是默认值
- 渠道配置覆盖同名字段
- 同一个字段，渠道配置优先

例如：

- 全局写默认 API 地址
- `app-ios-intl` 单独写海外地址
- `mp-weixin-cn` 单独写微信小程序 AppId

## 必改项

- `endpoints.baseApiUrl`
- `identity.dcloudAppId`
- `identity.name`
- `identity.versionName` / `identity.versionCode`
- `identity.packageName` / `identity.iosBundleId` / `identity.harmonyBundleName`（只在对应 `channels/<channel>/config.json` 中配置）
- `thirdParty.google.*`（`oauthClientIdNative` 在根配置，`oauthClientIdWeb` 在渠道配置）
- `thirdParty.weixin.*`（`oauthAppId` 在根配置，`mpAppId` / `mpLocationDesc` 在小程序渠道配置）
- `thirdParty.apple.universalLinks`（启用 Apple 登录的 iOS 渠道配置）
- `legal.termsUrl` / `legal.privacyUrl` / `legal.feedbackEmail`
- `common/assets/*`

## 资源和证书

- `common/assets/`：公共品牌资源
- `channels/<channel>/assets/icons/`：渠道图标
- `channels/<channel>/certs/`：证书、描述文件、签名材料
