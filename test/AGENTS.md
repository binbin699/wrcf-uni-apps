# linx-app Test Instructions

本目录用于维护 linx-app 的真机 UI 驱动端到端回归测试。

## 目录结构

- `flows/`：Maestro flow，按业务域拆分。
- `scripts/`：测试运行、报告生成和 Android driver 端口转发脚本。
- `docs/`：测试方案和维护说明。
- `.env.example`：本地测试配置模板。

## 运行方式

1. 先用 HBuilderX 手动把 linx-app 真机运行到 Android 测试机。
2. 停留在已登录后的 App 主界面，底部 TabBar 可见。
3. 执行 `pnpm test:e2e` 或 `pnpm test:e2e:smoke`。
4. 查看 `test/reports/<run-id>/report.md`。

## 编写约定

- Flow 使用用户可见文案、页面结构、稳定交互入口作为主要选择器依据。
- Flow 文件按业务域拆分，例如 `flows/agent/*.yaml`、`flows/device/*.yaml`。
- 覆盖主路径，再补充异常路径。
- 测试账号、测试设备和断言文案通过 `test/.env` 注入。
- 新增本地差异配置时优先补充 `test/.env.example`。
- 扫码、蓝牙、Wi-Fi、声纹、音频、真实硬件状态相关流程作为专项人工验证项。
