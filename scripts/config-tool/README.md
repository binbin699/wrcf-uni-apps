# Brand Config Toolchain

这套工具用于把外部品牌配置包应用到当前 App 基座，并生成打包需要的配置产物。

配置包路径由协作者本地环境决定，下面统一写成 `<config-dir>`。示例：

```bash
pnpm run config:validate -- <config-dir> --channel app-ios-cn
pnpm run config:apply -- <config-dir> --channel app-ios-cn
pnpm run brand:verify -- --channel app-ios-cn
```

## 配置包结构

```text
<config-dir>/
  config.json
  common/
    assets/
    locale/
  channels/
    <channel>/
      config.json
      assets/
      certs/
```

`config.json` 放品牌通用配置，`channels/<channel>/config.json` 放渠道差异。资源、图标和证书按目录放入 `common` 或对应 channel。

## 命令职责

| 命令 | 用途 |
| --- | --- |
| `config:validate` | 校验外部配置包 |
| `config:apply` | 应用外部配置包到当前仓库，并生成受控产物 |
| `brand:sync` | 根据当前仓库里的配置重新生成受控产物 |
| `brand:verify` | 检查受控产物和当前配置一致 |

支持的 channel：

```text
app-android-cn
app-android-intl
app-ios-cn
app-ios-intl
app-harmony-cn
mp-weixin-cn
```

## Apply 影响范围

`config:apply` 会写入配置源：

```text
config.json
common/
channels/
```

并生成这些受控产物：

```text
src/manifest.json
src/styles/theme.css
src/locale/
src/static/
unpackage/res/
```

`config:apply --channel <channel>` 只会把选中的 channel 写入当前仓库。打包脚本会从当前仓库的 `channels/<channel>/config.json`、`channels/<channel>/assets`、`channels/<channel>/certs` 读取 App 打包需要的包名、Bundle ID、图标和证书。

每次 apply 会先从当前 Git `HEAD` 恢复受控产物，再叠加配置包。这样 pull 下来的基座改动会进入本次生成结果，连续 apply 不同品牌时也会先回到干净基座。

每次 apply 会创建备份：

```text
.linx-config/backups/<timestamp>/snapshot/
```

如果受控产物存在未暂存改动，`config:apply` 会停止。确认这些改动可以覆盖时再加 `--force`。

## 常见用法

校验配置包：

```bash
pnpm run config:validate -- <config-dir> --channel <channel>
```

应用配置包：

```bash
pnpm run config:apply -- <config-dir> --channel <channel>
```

刷新当前配置产物：

```bash
pnpm run brand:sync -- --channel <channel>
```

检查当前配置产物：

```bash
pnpm run brand:verify -- --channel <channel>
```

应用后建议检查：

```bash
pnpm run brand:verify -- --channel <channel>
pnpm type-check
git status --short
git diff --stat
```
