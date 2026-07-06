# linx-app test

本目录用 Maestro 自动化测试已经真机运行中的 linx-app，覆盖一期发版回归场景。

## 1. 本地配置

### 1.1 准备清单

首次 setup 需要准备：

- macOS 开发机。
- Android 真机一台，已开启开发者选项和 USB 调试。
- 本仓库：`linx-app`。
- HBuilderX，已登录并能手动把 `linx-app` 真机运行到测试机。
- Android SDK Platform Tools，命令行可执行 `adb`。
- Maestro，命令行可执行 `maestro`。
- ripgrep，命令行可执行 `rg`。
- Python 3，命令行可执行 `python3`。
- 专用测试账号。
- 需要跑 fixture flow 时，准备稳定可见的测试设备和测试智能体。
- 中文 App 环境，建议使用国内 Android 调试基座或中文渠道配置。

基础命令检查：

```bash
adb version
maestro --version
rg --version
python3 --version
```

测试机检查：

```bash
adb devices
```

输出中应出现目标 Android 真机，并且状态为 `device`。

HBuilderX 检查：

1. HBuilderX 已登录。
2. HBuilderX 能通过菜单“运行 -> 运行到手机或模拟器”把 App 跑到测试机。
3. 测试开始前，App 已在测试机前台运行。

测试数据检查：

- App 当前语言为中文，底部 TabBar 和页面文案显示为中文。
- 测试账号可以登录 App。
- `test/.env` 中的 `TEST_USER_NAME` 与 App 页面展示一致。
- 测试账号下有稳定测试设备时，设置 `HAS_TEST_DEVICE=1`，并填写 `TEST_DEVICE_NAME_REGEX`。
- 测试账号下有稳定测试智能体时，设置 `HAS_TEST_AGENT=1`。

### 1.2 填写 `test/.env`

复制配置模板：

```bash
cp test/.env.example test/.env
```

填写本机配置：

- `DEVICE_ID`：`adb devices` 看到的 Android 真机 id。
- `APP_PACKAGE`：HBuilderX 调试基座包名，常见值为 `io.dcloud.HBuilder`。
- `TEST_EMAIL` / `TEST_PASSWORD`：测试账号凭据。
- `TEST_USER_NAME`：登录后个人中心展示的测试用户名。
- `TEST_DEVICE_NAME_REGEX`：测试设备名正则，用于 Maestro 断言。
- `HAS_TEST_DEVICE`：账号下有稳定测试设备时设为 `1`。
- `HAS_TEST_AGENT`：账号下有稳定测试智能体时设为 `1`。
- `BLOCKED_IS_FAILURE`：设为 `1` 时，存在 blocked flow 会让脚本返回失败状态码。

`test/.env` 已进入 `.gitignore`，真实账号、设备号和本机路径保留在本地。
配置值可以加引号，包含空格或 `>` 的值建议加引号。

## 2. 运行测试

运行前先用 HBuilderX 手动把 `linx-app` 真机运行到测试机，并停留在已登录后的 App 主界面，底部 TabBar 可见。

首次验证建议先跑一条 smoke flow：

```bash
pnpm test:e2e:smoke
```

这一步通过后，再跑一期回归。

一期回归：

```bash
pnpm test:e2e
```

指定设备：

```bash
pnpm test:e2e -- YOUR_ANDROID_DEVICE_ID
```

单独跑一个目录或文件：

```bash
FLOW_TARGETS="test/flows/agent" pnpm test:e2e
FLOW_TARGETS="test/flows/profile/logout-email-login.yaml" pnpm test:e2e
```

## 3. 输出

每次运行会生成：

- `test/reports/<run-id>/report.md`
- `test/reports/<run-id>/report-data.json`
- `test/reports/<run-id>/flow-results.jsonl`
- `test/reports/<run-id>/maestro.log`
- `test/reports/<run-id>/flows.txt`
- `test/reports/<run-id>/flows/*.log`
- `test/reports/<run-id>/rendered/<flow-path>.yaml`
- `test/reports/<run-id>/maestro/<flow-debug-artifacts>`

`report.md` 包含运行结论、环境信息、flow 结果表、失败详情、blocked 详情、日志片段、截图和 Maestro artifact 链接。`report-data.json` 保留完整结构化数据，便于后续生成 HTML、上传 CI artifact 或做趋势统计。

## 4. 约定

Flow 使用 `${APP_PACKAGE}` 作为 `appId`，测试账号和测试设备断言也由 `test/.env` 注入。新增本地差异配置时优先放入 `test/.env.example`，脚本读取 `test/.env` 后执行。

当前 flow 分三类：

- 无状态 smoke：验证 App 主链路可达，适合所有已登录账号。
- 自建数据 flow：通过 UI 创建页面或选择器验证，不依赖既有设备和智能体。
- fixture flow：依赖真实测试设备或既有智能体。缺少 fixture 时报告为 `BLOCKED`。

Blocked 表示测试前置条件缺失。Failed 表示 flow 已执行并发现断言失败、命令失败或 App 行为异常。

当前一期 flow 使用中文用户可见文案作为主要选择器，适用于中文 App 环境。国际化版本或非中文 locale 需要补充对应 locale 的 flow 或稳定测试标识后再纳入自动化回归。

## 5. 给新同事的介绍口径

这个项目用 Maestro 在 Android 真机上执行一期回归 flow。setup 的核心是把四件事准备好：命令行工具可用、Android 真机可被 `adb` 识别、HBuilderX 已经手动真机运行、`test/.env` 中的测试数据准确。

新同事完成 setup 后，先执行 smoke 单文件验证，再执行一期回归。每次运行结束查看 `test/reports/<run-id>/report.md`，失败时从 flow 日志、截图和 Maestro artifact 继续定位。
