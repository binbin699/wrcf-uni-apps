# 灵矽 AI App / 小程序

基于 uni-app 框架开发的多平台应用项目，支持微信小程序、Android、iOS、HarmonyOS NEXT 多个平台。

代码仓库：[https://github.com/Qiniu-linx/linx-app](https://github.com/Qiniu-linx/linx-app)

> **注意**：请使用最新分支（形如 `feat/v1.X.X`，版本号越大越新）。`linx-android-app` 与 `linx-ios-app` 已废弃，请勿使用。

完整文档站点：[https://lingxiwmp.qiniu.com/docs/publish/](https://lingxiwmp.qiniu.com/docs/publish/)

## 无二开用户入口

如果你**不需要做二次开发**，可以直接从脱敏模板开始配置自己的分发渠道和发布参数：

- 模板说明：[templates/readme.md](./templates/readme.md)
- 说明目录：[templates/](./templates)

这里会告诉你如何选择 `channels`、如何替换自己的 API 地址、AppId、包名、证书和品牌资源。

## 项目结构

```
linx-app
├── .env.example              环境变量示例
├── app.config.ts             应用功能配置（根据版本和平台返回不同配置）
├── vite.config.ts            Vite 构建配置
├── tsconfig.json             TypeScript 配置
├── package.json              项目依赖与脚本
├── project.config.json       微信小程序项目配置
│
├── scripts/
│   └── cloud-pack.sh         云打包脚本（支持交互式与命令行模式）
│
├── docs/                     项目内文档
├── templates/                脱敏配置模板
│
└── src/
    ├── App.vue               Vue 主入口
    ├── main.ts               程序主入口
    ├── manifest.json          应用配置文件
    ├── pages.json             页面路由配置
    ├── uni.scss               全局 SCSS 变量
    │
    ├── api/                   API 封装层
    │   ├── index.ts           API 主入口
    │   ├── common.ts          通用 API
    │   ├── login.ts           登录/认证 API
    │   └── types/             API 类型定义
    │
    ├── components/            全局组件
    │   ├── AgentBindDrawer.vue  智能体绑定设备抽屉
    │   ├── AgentCard.vue        智能体卡片
    │   ├── CustomTabBar.vue     自定义底部导航栏
    │   └── VoiceSelector.vue    音色选择器
    │
    ├── pages/                 页面模块
    │   ├── index/             首页
    │   ├── agent/             智能体创建/编辑
    │   ├── bluetooth-config/  蓝牙配网
    │   ├── device/            设备管理
    │   ├── device-status/     设备状态
    │   ├── login/             登录/注册
    │   ├── net-config/        WiFi 配网
    │   ├── profile/           用户设置
    │   ├── square/            广场/发现
    │   ├── voice/             音色管理/声纹/克隆
    │   ├── mp-landing/        小程序落地页
    │   └── webview/           内嵌网页
    │
    ├── const/                 常量与环境配置
    │   ├── index.ts           AppInfo 对象（平台信息与判断方法）
    │   └── env.ts             环境变量管理
    │
    ├── store/                 Pinia 状态管理
    │   ├── token.ts           认证 Token 管理
    │   └── user.ts            用户状态管理
    │
    ├── locale/                i18n 国际化（zh-Hans, en, ja, ru）
    │
    ├── utils/                 工具库
    │   ├── request.ts         请求封装（基于 uni.request）
    │   ├── audioPlayer.ts     音频播放器
    │   ├── audioRecorder.ts   录音器
    │   ├── permission.ts      权限管理
    │   ├── route.ts           路由管理
    │   ├── storage.ts         统一存储接口
    │   ├── wifi.ts            WiFi 接口
    │   ├── wifiConfig.ts      WiFi 配网工具
    │   ├── soundWave.ts       声波配网
    │   ├── useDeviceScan.ts   设备扫描 Composable
    │   └── bluetoothPermission.ts  蓝牙权限处理
    │
    ├── types/                 全局类型定义
    ├── styles/                全局通用样式
    ├── static/                静态资源（图标等）
    ├── pkg/                   内置包（ARMS 监控等）
    ├── js_sdk/                第三方 JS SDK
    └── uni_modules/           uni-app 插件模块
        ├── wot-design-uni/    UI 组件库（主要）
        ├── lime-qrcode/       二维码生成
        └── uni-wifi/          WiFi API 插件
```

## 环境准备

### 前置要求

- **Node.js** >= 16.x
- **pnpm**（推荐的包管理器）
- **HBuilderX**（最新版本）

按目标平台还需要：

| 平台       | 工具                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| 微信小程序 | [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)  |
| Android    | HBuilderX 云打包（无需本地环境）                                                           |
| iOS        | HBuilderX 云打包 + Apple Developer 证书                                                    |
| HarmonyOS  | [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/) + HBuilderX 4.61+ |

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

复制示例配置文件：

```bash
cp .env.example .env
```

在 `.env` 文件中配置：

```env
# 版本控制：'full' | 'cn' | 'intl'
# full: 全功能版本
# cn: 国内版，适配国内登录方式和服务
# intl: 国际版，使用海外服务器和登录方式
VITE_APP_EDITION=cn
```

- `VITE_APP_EDITION` 控制应用的功能版本，不同版本会启用不同的登录方式、API 地址等
- 具体配置逻辑详见 `app.config.ts`

### 应用配置

在 `src/manifest.json` 中配置（建议通过 HBuilderX 图形界面）：

1. 到 [DCloud 开发者中心](https://dev.dcloud.net.cn/) 创建应用，获取 AppID（`__UNI__XXXXXXX`）
2. 配置应用图标、包名等基本信息
3. 如需微信小程序，还需在 [微信公众平台](https://mp.weixin.qq.com/) 申请 AppID

### 功能配置 (`app.config.ts`)

`app.config.ts` 根据平台（mp-weixin / app-ios / app-android / app-harmony）和版本（cn / intl / full）返回不同的功能配置，包括：

- API 地址（国内/海外）
- 登录方式（微信手机号、Google、Apple、邮箱、短信、游客、密码等）
- 蓝牙配网设置
- 声纹功能开关
- 用户协议和隐私政策 URL
- ARMS 监控配置

## 开发

### 微信小程序

```bash
# 开发模式（热更新）
pnpm dev:mp-weixin

# 生产构建
pnpm build:mp-weixin
```

构建产物：

- 开发版：`dist/dev/mp-weixin`（本地调试用）
- 生产版：`dist/build/mp-weixin`（上传发布用）

> **重要**：上线必须使用 `pnpm build:mp-weixin` 的生产构建版本，dev 版本未压缩、体积大，且会暴露源码。

### App 开发（Android / iOS）

通过 HBuilderX 打开项目，点击 **「运行」** -> **「运行到手机或模拟器」** 选择目标设备。

### 其他常用命令

```bash
pnpm fmt           # 格式化代码（Prettier）
pnpm type-check    # TypeScript 类型检查
pnpm dev:h5        # H5 开发模式
pnpm build:h5      # H5 生产构建
```

## 打包发布

### Android 打包

> 详细文档：[Android 前置配置](https://lingxiwmp.qiniu.com/docs/publish/android/prerequisites) | [打包流程](https://lingxiwmp.qiniu.com/docs/publish/android/build)

**方式一：HBuilderX 图形界面**

1. HBuilderX 中选择 **「发行」** -> **「App-Android/iOS-云打包」**
2. 选择 Android(apk 包)、填写包名、使用云端证书、打正式包、传统打包
3. 点击打包，等待完成后通过控制台下载链接获取安装包

**方式二：脚本**

```bash
# 交互模式
./scripts/cloud-pack.sh

# 命令行模式
./scripts/cloud-pack.sh \
  --channel app-android-cn \
  --version 1.1.5 \
  --version-code 101050 \
  --abi 64 \
  -y

# Google Play AAB 打包
./scripts/cloud-pack.sh \
  --channel app-android-intl \
  --version 1.1.5 \
  --version-code 101050 \
  --abi 64 \
  --android-format aab \
  -y
```

> Google Play 上架指南：[Google Play 配置与打包](https://lingxiwmp.qiniu.com/docs/publish/android/google-play)

### iOS 打包

> 详细文档：[iOS 前置配置](https://lingxiwmp.qiniu.com/docs/publish/ios/prerequisites) | [打包流程](https://lingxiwmp.qiniu.com/docs/publish/ios/build)

前置条件：

- 加入 [Apple Developer Program](https://developer.apple.com/programs/)
- 创建 App ID（Identifier）、申请发布证书（`.p12`）、创建描述文件（`.mobileprovision`）

```bash
# 脚本打包
./scripts/cloud-pack.sh \
  --channel app-ios-cn \
  --version 1.1.5 \
  --version-code 101050 \
  --ios-profile ~/certs/app.mobileprovision \
  --ios-cert ~/certs/app.p12 \
  --ios-cert-password yourpassword \
  -y
```

### HarmonyOS 打包

> 详细文档：[鸿蒙前置配置](https://lingxiwmp.qiniu.com/docs/publish/harmony/prerequisites) | [打包流程](https://lingxiwmp.qiniu.com/docs/publish/harmony/build)

鸿蒙打包流程：

1. 在 [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html) 创建应用
2. 在 HBuilderX 中配置签名证书（调试/发布）
3. HBuilderX **「运行到鸿蒙」** 生成 `dist/dev/app-harmony` 工程
4. 用 DevEco Studio 打开工程，配置签名后打包

### 微信小程序发布

> 详细文档：[微信前置配置](https://lingxiwmp.qiniu.com/docs/publish/weixin/prerequisites) | [构建与发布](https://lingxiwmp.qiniu.com/docs/publish/weixin/build)

1. 在微信公众平台配置 AppID 和服务器域名
2. 执行 `pnpm build:mp-weixin` 生成生产版本
3. 微信开发者工具导入 `dist/build/mp-weixin`
4. 上传代码 -> 设置体验版测试 -> 提交审核 -> 正式发布

服务器域名配置（使用官方服务器时）：

| 域名类型              | 域名地址                      |
| --------------------- | ----------------------------- |
| request 合法域名      | `https://lingxiwmp.qiniu.com` |
| uploadFile 合法域名   | `https://lingxiwmp.qiniu.com` |
| downloadFile 合法域名 | `https://lingxiwmp.qiniu.com` |

> 如需自建后端，参考 [linx-app-backend 部署文档](https://github.com/Qiniu-linx/linx-app-backend/blob/master/backend/deploy.md)

## 打包脚本参数一览

| 参数                  | 说明         | 可选值                      |
| --------------------- | ------------ | --------------------------- |
| `-h, --help`          | 显示帮助     |                             |
| `-y, --yes`           | 跳过确认     |                             |
| `--channel`           | 打包 channel | app-android-cn / app-ios-cn 等 |
| `--version`           | 版本号       | 如 1.1.5                    |
| `--version-code`      | 版本代码     | 如 101050                   |
| `--abi`               | CPU 架构     | 32 / 64 / both              |
| `--android-format`    | 打包格式     | apk / aab                   |
| `--ios-profile`       | 描述文件路径 | ~/certs/app.mobileprovision |
| `--ios-cert`          | 证书文件路径 | ~/certs/app.p12             |
| `--ios-cert-password` | 证书密码     |                             |

## 参考文档

- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)（注意：本项目是 uni-app，不是 uni-app-x）
- [灵矽 App 完整文档站](https://lingxiwmp.qiniu.com/docs/publish/)
- [后端服务仓库](https://github.com/Qiniu-linx/linx-app-backend)
- [DCloud 开发者中心](https://dev.dcloud.net.cn/)

## 提交前检查

```bash
pnpm fmt          # 格式化代码
pnpm type-check   # 类型检查
```
