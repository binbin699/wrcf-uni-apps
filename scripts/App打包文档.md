# App 云打包文档

> [!WARNING] 提醒
> [安卓工程](https://github.com/Qiniu-linx/linx-android-app) 已不再使用，Android 和 iOS 端当前完全使用云打包

## 前置配置

### 1. DCloud 配置

在 [DCloud 开发者中心](https://dev.dcloud.net.cn/) 创建应用：

1. 填写应用基本信息（应用名称、AppID 等）
2. 在「各平台信息」中添加 Android App 和 iOS App
3. 配置包名/Bundle ID

### 2. iOS 证书配置

iOS 打包需要准备：

- 证书文件 (.p12)
- 描述文件 (.mobileprovision)
- 证书私钥密码

申请流程参考：[iOS证书(.p12)和描述文件(.mobileprovision)申请](https://ask.dcloud.net.cn/article/152)

### 3. 安装 HBuilderX

下载并安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html) 并登录 DCloud账号。

常见路径：

- macOS: `/Applications/HBuilderX.app/Contents/MacOS/cli`
- Linux: `/opt/HBuilderX/cli`

首次运行脚本时，如果未自动发现 CLI，会提示手动输入路径，路径会保存到 `.cli-path` 文件。

### 4. 拉取项目并配置文件

确保项目目录下存在以下文件：

- `.env` - 包含 `VITE_APP_EDITION` 配置
- `src/manifest.json` - 应用清单文件

基于 DCloud 配置及自身需要修改 `src/manifest.json`

## 使用脚本打包

### 交互模式

直接运行脚本，按提示选择配置：

```bash
./scripts/cloud-pack.sh
```

脚本会依次询问：

1. 版本类型（cn/intl/full）
2. 版本号
3. 版本代码
4. 打包平台（Android/iOS）
5. 平台特定配置

### 命令行模式

通过参数直接指定配置，适合 CI/CD 或批量打包：

```bash
# 查看帮助
./scripts/cloud-pack.sh --help

# Android 打包
./scripts/cloud-pack.sh \
  --platform android \
  --edition cn \
  --version 1.1.5 \
  --version-code 101050 \
  --abi 64 \
  --package-name com.qiniu.linx \
  -y

# Android AAB 打包（用于 Google Play）
./scripts/cloud-pack.sh \
  --platform android \
  --edition intl \
  --version 1.1.5 \
  --version-code 101050 \
  --abi 64 \
  --package-name com.qiniu.linx \
  --android-format aab \
  -y

# iOS 打包
./scripts/cloud-pack.sh \
  --platform ios \
  --edition cn \
  --version 1.1.5 \
  --version-code 101050 \
  --ios-region cn \
  --ios-bundle-id com.qiniu.linx \
  --ios-profile ~/certs/app.mobileprovision \
  --ios-cert ~/certs/app.p12 \
  --ios-cert-password yourpassword \
  -y
```

## 参数说明

### 通用参数

| 参数             | 说明               | 示例             |
| ---------------- | ------------------ | ---------------- |
| `-h, --help`     | 显示帮助           |                  |
| `-y, --yes`      | 跳过确认，直接打包 |                  |
| `--edition`      | 版本类型           | cn / intl / full |
| `--version`      | 版本号             | 1.1.5            |
| `--version-code` | 版本代码           | 101050           |
| `--platform`     | 打包平台           | android / ios    |

### Android 参数

| 参数               | 说明     | 示例           |
| ------------------ | -------- | -------------- |
| `--abi`            | CPU 架构 | 32 / 64 / both |
| `--package-name`   | 包名     | com.qiniu.linx |
| `--android-format` | 打包格式 | apk / aab      |

架构说明：

- `32` - armeabi-v7a（32位）
- `64` - arm64-v8a（64位）
- `both` - 32/64位兼容包

打包格式说明：

- `apk` - 标准 APK 安装包（默认）
- `aab` - Android App Bundle，用于 Google Play 上架

### iOS 参数

| 参数                  | 说明         | 示例                        |
| --------------------- | ------------ | --------------------------- |
| `--ios-region`        | 区域版本     | cn / intl                   |
| `--ios-bundle-id`     | Bundle ID    | com.qiniu.linx              |
| `--ios-profile`       | 描述文件路径 | ~/certs/app.mobileprovision |
| `--ios-cert`          | 证书文件路径 | ~/certs/app.p12             |
| `--ios-cert-password` | 证书密码     |                             |

## 打包流程

1. 检查 HBuilderX CLI
2. 检查配置文件（.env、manifest.json）
3. 读取并显示当前配置
4. 收集打包参数（交互或命令行）
5. 更新配置文件
6. 调用 CLI 执行云打包
7. 输出下载链接

## 打包产物

打包成功后，脚本会输出：

- 临时下载地址（限下载 5 次）
- 一键加固链接（Android）
- 一键发布链接

## 注意事项

1. 打包前确保已登录 HBuilderX 账号
2. iOS 证书和描述文件需匹配 Bundle ID
3. Android 打包完成后，脚本会自动恢复 abiFilters 为兼容配置
4. AAB 格式通过设置渠道为 GooglePlay 实现，不支持安心打包模式
5. 版本代码建议使用 6 位数字格式：主版本(2位) + 次版本(2位) + 修订号(2位)
