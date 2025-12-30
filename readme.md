# 灵矽AI APP/小程序

基于uni-app框架开发的多平台小程序项目，支持微信小程序、安卓、iOS、鸿蒙多个平台。

## 项目结构

```txt
MINIPROGRAM
│  .env.example            环境变量示例
│  app.config.ts           应用功能配置(根据版本和平台返回不同的功能配置)
│  
├─.hbuilderx
│      launch.json
│       
├─docs/
│          
├─harmony-configs          鸿蒙打包的一些配置
│      
├─node_modules/
│      
├─src
│  │  App.vue                    vue主入口
│  │  env.d.ts
│  │  main.ts                    程序主入口
│  │  manifest.json              应用配置文件
│  │  pages.json                 页面配置文件
│  │  shime-uni.d.ts
│  │  uni.scss
│  │  
│  ├─api                         api封装
│  │  │  common.ts
│  │  │  index.js
│  │  │  login.ts
│  │  │  
│  │  └─types/                   api中的一些类型
│  │          
│  ├─components
│  │      AgentBindDrawer.vue    智能体绑定设备抽屉组件
│  │      AgentCard.vue          智能体卡片组件
│  │      VoiceSelector.vue      音色选择器组件
│  │      
│  ├─const       
│  │      env.ts                 环境变量管理
│  │      index.ts               应用信息管理(AppInfo对象，包含平台信息与平台判断方法)
│  │      
│  ├─js_sdk                      引入的js-sdk
│  │  └─wa-permission
│  │          permission.js      权限sdk
│  │          
│  ├─locale                      i18n
│  │      en.json
│  │      index.ts
│  │      readme.md
│  │      zh-Hans.json
│  │      
│  ├─pages/                       页面
│  │           
│  ├─static/                      静态文件，图标等
│  │          
│  ├─store
│  │      index.ts
│  │      token.ts
│  │      user.ts
│  │      
│  ├─styles/                      全局通用样式
│  │      
│  ├─types/                       类型
│  │      
│  ├─uni_modules/                 使用的uni插件
│  │                  
│  └─utils                        实用工具，包含、录音器、权限管理器、声波配网
│          arrayPlayer.ts         音频播放器
│          audioPlayer.ts         音频播放器
│          audioRecorder.ts       录音器
│          permission.ts          权限管理器
│          promise.js
│          request.ts             请求封装
│          route.ts               路由管理
│          soundWave.ts           声波配网实现
│          storage.ts             统一存储接口
│          userGuide.ts           
│          wifi.ts                wifi接口
│          wifiConfig.ts          wifi配网工具
│          
└─unpackage                       打包生成的资源
    ├─res
    │  └─icons/                   HBuilderX生成的icon
    └─resources                   HBuilderX生成的APP打包资源
        ├─uni_modules/            uts插件
        └─__UNI__0510B30/         基础打包资源
```

## 开发工具

核心工具

- HBuilderX
- VS Code (可选，如果不习惯HBuilderX)

按目标平台需要的工具

- 微信开发者工具 (微信小程序)
- DevEco Studio (鸿蒙)
- Android Studio (安卓)
- Xcode (iOS)  *需要macOS系统15.0+*

## 开发流程

完成代码修改后

## 配置

在运行前，需要完成一些配置。

### 环境变量配置

在项目根目录创建 `.env` 文件来配置环境变量：

```bash
# 复制示例配置
# 注意：如果 .env 文件不存在，需要手动创建

# 在项目根目录（miniprogram/）创建 .env 文件
touch .env
```

在 `.env` 文件中添加以下内容：

```env
# 版本控制：'full' | 'cn' | 'intl'
# full: 全功能版本，支持所有功能（部分功能可能受平台限制）
# cn: 国内版，适配国内登录方式和服务
# intl: 国际版，使用海外服务器和登录方式
VITE_APP_EDITION=cn
```

**说明：**
- `VITE_APP_EDITION` 控制应用的功能版本，不同版本会启用不同的登录方式、API 地址等配置
- 具体配置详见 `app.config.ts` 文件

### 应用打包配置

多数配置在 `src/manifest.json` 文件中，建议通过HBuilderX打开项目(不是包含后台项目的文件夹，是miniprogram这个)，再打开manifest.json文件通过图形化界面进行配置。

请先到[dcloud](https://dev.dcloud.net.cn/pages/app/list)注册账号并创建一个新的app项目，获取appid(`__UNI__XXXXXXX`)。

- appid (__UNI__XXXXXXX)

- appid (wx123123123...) (仅微信)

- 包名 (com.qiniu.linx)

- 图标 (可以在hbuilderx通过一张1024x1024的图标生成其余分辨率)

### 应用功能配置

分发到国内、国外时，需要的登录方式往往不同，本项目通过 [app.config.ts](./app.config.ts) 
定义配置函数，根据平台和版本返回不同的功能配置，包括后端 URL (request baseUrl)、支持的登录方式、蓝牙配网设置等。

版本类型：
- **full**: 全功能版本，尽可能多的支持功能（部分功能可能受平台限制，如微信登录）
- **cn**: 国内版，适配国内登录方式和服务
- **intl**: 国际版，使用海外服务器和登录方式

主要配置项：
- API 地址（国内/国外不同）
- 各种登录方式的支持情况（微信小程序手机号、游客登录、Google、Apple、密码、邮箱、短信等）
- 蓝牙配网相关设置
- 用户协议和隐私政策 URL
- Google OAuth Client ID
- ARMS 监控配置

版本取值通过环境变量 `VITE_APP_EDITION` 来控制，具体的版本细节请参考 `app.config.ts` 文件。

### 其他

其他的配置项可以在hbuilderx中打开manifest.json文件，通过图形化界面配置。

## 安装依赖

```bash
pnpm install
```

## 开发命令

没有什么命令，主要需要的命令需要在hbuilderx中运行,通过图形化界面使用。(背后是通过使用内置的huilderx cli)

## 开发

### 微信小程序开发模式

开发，热更新

```bash
pnpm run dev:mp-weixin
```

构建

```bash
pnpm run build:mp-weixin
```

### APP开发模式

以安卓平台为例，其他平台类似。

#### 开发调试

通过HBuilderX打开项目，点击工具栏的`运行`->`运行到安卓设备`即可。

#### 构建

有云打包与本地打包两种方式

- 云打包：在hbuilderx中点击工具栏的`发行`->`APP-Android/iOS-云打包`。
- 本地打包：在hbuilderx中点击工具栏的`发行`->`APP-Android/iOS-本地打包`->`生成本地打包资源`。

建议先使用云打包快速尝鲜，本地打包再慢慢调。

##### 云打包

按照图形界面操作即可。

##### 本地打包

1. 先按照目标平台，配置好环境（Android Studio、DevEco Studio、Xcode等）。

2. 在准备原生工程

这一步强烈建议下载最新的sdk包（hbuilderx中点击工具栏的`发行`->`APP-Android/iOS-本地打包`->`本地打包指南`），对比提供的原生工程来定制自己的工程，原因很多：

- 上来就给配置好了的工程目录有点懵，先看点官方文档压压惊

- 需要配置的地方比较多（包括但不限于APP包名、版本、权限、打包Key、证书、图标等），我开发时寻找的一些教程/文档也都不能一个涵盖完全，我这里也没法说的很清楚，但把干净的SDK与配置好的工程目录对比一下，就知道需要哪些地方配置

- 避免下载安装的HBuilderX版本与SDK版本对应不一致

3. 准备证书等

4. 更新打包资源

   安卓、ios需要先在hbuilderx中点击工具栏的`发行`->`APP-Android/iOS-本地打包`->`生成本地打包资源`，鸿蒙略过。

   会生成资源到[unpackage/resources](./unpackage/resources/)，包含一个以appid(__UNI__XXXXXXX)命名的目录与一个名为`uni_modules`的目录。

   其中，appid目录需要转移到原生工程对应目录：
   - 安卓：`src/main/assets/apps/`__UNI__XXXXXXX/www/...
   - IOS：`Pandora/apps/`__UNI__XXXXXXX/www/...

   uni_modules中的每一个目录，都是uts插件，需要参考文档完成原生工程lib创建（示例项目以及配置好了`uni-wifi`这个插件）
   - [安卓](https://nativesupport.dcloud.net.cn/AppDocs/usesdk/android.html#utsconfig)
   - [IOS](https://nativesupport.dcloud.net.cn/AppDocs/usesdk/ios.html#utsconfig)

   - 鸿蒙暂无

5. 在对应的开发工具中打包

打包位置：

- 安卓：在Android Studio中，工具栏点击`Build`->`Generate Signed App Bundle or APK(s)`，按照图形界面配置，打包完成会有应用内通知
- iOS：在Xcode中打开项目，工具栏点击`Product`->`Archive`，等待打包完成会有弹窗。
- 鸿蒙：在HBuilderX中配置好证书，其余全自动

## 主要参考文档

- 框架 [uni-app](https://uniapp.dcloud.net.cn/quickstart.html)

   注意项目是uni-app，不是uni-app-x

- [离线打包教程](https://nativesupport.dcloud.net.cn/AppDocs/)

   注意页面左侧导航栏的内容，不要只看一页概述

其他需要的文档大多可以直接在hbuilderx中直接打开

## 其他配置

### OAuth 登录配置

#### Google

然后要在manifest中配置sdkConfigs中的 oauth google clientId （IOS OAUTH）

文档参考[uniapp](https://uniapp.dcloud.net.cn/tutorial/app-oauth-google.html)

后端也需要完成相关配置，具体参考后端[deploy.md](../backend/deploy.md#配置)。

### 隐私协议

参考[uniapp](https://uniapp.dcloud.net.cn/tutorial/app-privacy-android.html)与[uniapp](https://uniapp.dcloud.net.cn/app/android-store.html#oauth)
