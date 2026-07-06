# linx-app Maestro 端到端测试方案 v2

## 1. 方案结论

一期测试以打包前真机运行为主：测试人先用 HBuilderX 将 linx-app 运行到 Android 测试机，再用 `pnpm test:e2e` 触发 Maestro 执行端到端回归，并输出报告。

这个方案服务基座改造验收和发版前回归。它把问题发现时间提前到云打包之前，减少“改代码、等云打包、再回归”的循环成本。

## 2. 背景

当前团队讨论已经形成一期共识：

1. 先做打包前真机自动化测试。
2. 第一批场景围绕设备管理和智能体管理。
3. 扫码、蓝牙、Wi-Fi 配网、声纹、音频类流程作为专项人工验证。

HBuilderX 真机运行和正式 App 包都以 WebView 容器承载 uni-app 页面，主要页面逻辑、接口调用、组件渲染和交互路径具备高度一致性。打包前真机测试适合承担第一道自动化回归。

打包后验证放在二期扩展，重点覆盖正式包启动、安装状态、首次启动协议和权限弹窗等容器级差异。

## 3. 测试目标

一期目标是形成一个可以每天重复执行的自动化入口：

1. 手动完成 HBuilderX 真机运行。
2. 保持 App 容器在测试机前台，停留在已登录后的 App 主界面，底部 TabBar 可见。
3. 自动执行全部 Maestro flow。
4. 自动区分通过、失败和前置条件缺失。
5. 自动生成可读报告、结构化结果和调试附件。
6. 给发版和验收节点提供快速回归依据。

## 4. 一期范围

### 4.1 Smoke

- 启动 App。
- 主 Tab 切换：设备、智能体、广场、我的。
- 我的页基础可达性。
- 广场页基础可达性。
- 设备管理页空状态可达性。

已落地脚本：

- `flows/smoke/tab-navigation.yaml`

### 4.2 设备管理

- 从我的页进入设备管理。
- 设备管理页展示空设备状态。
- 设备管理页展示设备名称和 MAC。
- 设备状态页展示当前设备。
- 设备状态页展示绑定入口。
- 从设备状态页进入广场绑定入口。
- 设备管理页返回我的页。

已落地脚本：

- `flows/device/device-management-open.yaml`

### 4.3 智能体管理

- 进入我的智能体列表。
- 打开创建智能体页。
- 校验创建智能体表单基础字段。
- 打开大模型、对话语言、音色选择器。
- 从绑定抽屉进入智能体编辑页。
- 打开智能体绑定设备抽屉。
- 抽屉展示待绑定设备。
- 抽屉展示确认按钮和取消按钮。
- 取消后回到智能体列表。

已落地脚本：

- `flows/agent/bind-drawer-open.yaml`
- `flows/agent/create-page-open.yaml`
- `flows/agent/create-selectors-open.yaml`
- `flows/agent/edit-page-open.yaml`

### 4.4 个人中心与登录

- 退出登录和账号密码登录。
- 帮助页 / WebView 打开。
- 设备改名弹窗。
- 删除确认弹窗。

已落地脚本：

- `flows/profile/help-open.yaml`
- `flows/profile/webview-open.yaml`
- `flows/profile/logout-email-login.yaml`
- `flows/device/device-status-edit-name-dialog.yaml`
- `flows/device/device-management-dialogs.yaml`

## 5. 专项人工验证

以下流程一期作为人工验证清单：

- 扫码添加设备。
- 扫码配网。
- 蓝牙添加设备。
- 蓝牙配网。
- Wi-Fi 扫描与提交。
- 声纹绑定、录音、音频播放。
- 真实设备对话链路。

这些流程依赖相机、蓝牙广播、Wi-Fi 环境、真实硬件状态、录音输入和主观体验判断。专项验证由测试人记录设备型号、固件版本、账号、网络环境和失败现象。

## 6. 自动化执行流程

### 6.1 准备测试机

1. Android 真机通过 USB 连接到本机。
2. `adb devices` 可以看到测试机。
3. 测试机保留专用测试账号。fixture flow 需要专用测试设备或测试智能体。
4. HBuilderX 已登录并能运行 linx-app 到该测试机。
5. 测试开始前，App 已在测试机前台运行，底部 TabBar 可见。
6. App 使用中文环境，页面文案与当前 flow 断言一致。

本地配置写入 `test/.env`：

- `DEVICE_ID`：Android 真机 id。
- `APP_PACKAGE`：HBuilderX 调试基座包名。
- `TEST_USER_NAME`：个人中心展示的测试用户名。
- `TEST_DEVICE_NAME_REGEX`：测试设备名称正则。
- `HAS_TEST_DEVICE`：账号下有稳定测试设备时设为 `1`。
- `HAS_TEST_AGENT`：账号下有稳定测试智能体时设为 `1`。
- `BLOCKED_IS_FAILURE`：需要把前置缺失视为失败状态码时设为 `1`。

### 6.2 准备 Maestro

这个脚本建立 Android driver 端口转发：`tcp:7001 -> tcp:7001`。

### 6.3 执行回归

先用 HBuilderX 手动把 linx-app 真机运行到测试机，再执行：

```bash
pnpm test:e2e
```

脚本动作：

1. 检查 ADB 和 Maestro。
2. 建立 Maestro driver 端口转发。
3. 读取 flow 的 fixture 标签。
4. 缺少 fixture 的 flow 记录为 `BLOCKED`。
5. 按顺序执行可运行的 `test/flows/smoke test/flows/device test/flows/agent test/flows/profile`。
6. 生成 `test/reports/<run-id>/report.md`、结构化结果和 Maestro 调试附件。

### 6.4 HBuilderX 真机运行

HBuilderX 真机运行作为手动前置条件。不同 HBuilderX 版本、设备列表、项目状态会影响菜单层级和弹窗，测试人按本机 HBuilderX 实际界面完成运行。

当前验证状态：

1. HBuilderX 手动真机运行后，`pnpm test:e2e` 已通过 Maestro flow 串跑。
2. `pnpm test:e2e` 默认复用当前真机 App 状态。
3. 报告输出到 `test/reports/<run-id>/report.md`。

## 7. 通过标准

一期自动化通过标准：

1. Smoke flow 全部通过。
2. 自建数据 flow 全部通过。
3. Fixture flow 在对应前置数据存在时全部通过。
4. 缺少 fixture 的 flow 在报告中标记为 `BLOCKED`。
5. 失败时保留 Maestro debug artifact 和测试机截图。

专项人工验证通过标准：

1. 扫码、蓝牙、Wi-Fi、声纹等主流程完成一次人工确认。
2. 问题记录包含测试账号、设备型号、固件版本、网络环境、复现步骤。

## 8. 维护原则

1. 优先使用用户可见文案作为选择器。
2. 文案有重复时使用坐标或相对位置。
3. Flow 只覆盖一个清晰业务目标。
4. 无状态 flow 覆盖可达性和空状态。
5. 能通过 UI 构造的数据在 flow 内构造。
6. 真实设备、真实网络、真实权限状态写入 fixture 标签和本地配置。
7. 当前一期 flow 面向中文 App 环境；国际化版本需要补充对应 locale 的 flow 或稳定测试标识。

## 9. 二期方向

二期可以增加正式包验证：

1. 下载或安装云打包产物。
2. 启动正式包。
3. 处理首次启动协议和权限弹窗。
4. 执行同一组核心 smoke flow。
5. 对比打包前真机结果和正式包结果。

二期价值集中在正式包容器、权限、安装状态和启动状态验证。一期先把主要业务回归链路跑稳定。
