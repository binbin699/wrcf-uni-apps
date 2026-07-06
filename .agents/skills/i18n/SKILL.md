# i18n 翻译规范 Skill

以 **zh-Hans** 为语义基准，维护 `linx-app/src/locale` 与 `linx-app-brand-configs/*/common/locale`。

## 来源与优先级

| 层级 | 路径 | 说明 |
|------|------|------|
| 主应用 | `linx-app/src/locale/*.json` | 运行时 locale（nested JSON） |
| 品牌覆盖 | `linx-app-brand-configs/{brand}/common/locale/*.json` | **flat dot-keys**，apply/sync 时 merge 进 nested |
| 规范文档 | 项目根 `i18n-review-plan.md` §1.5 / §2.1 | UI 槽位 Tier 与字数上限 |
| 术语表 | `scripts/i18n/glossary-canonical.json` | 相同中文 → 统一译法 |
| 逐 key 补丁 | `scripts/i18n/locale-key-patches.json` | 术语表未覆盖的 UI 差异 |

## 品牌 sync 规则（重要）

`mengdian.config` 等品牌包使用 **flat** 键（如 `"login.app_name"`），主应用为 **nested**。  
`scripts/brand/lib/sync.ts` 的 `mergeLocaleRecords`：**先 flatten → merge → unflatten**，避免 vue-i18n 读到 nested 里的 Linx 而忽略 flat 里的 HiKbao。

## 维护命令（项目根目录）

```bash
# 1. 中文缩句 + 逐 key 补丁（含品牌 flat locale）
node scripts/i18n/apply-locale-fixes.js

# 2. 按术语表全文匹配批量统一
node scripts/i18n/apply-glossary-fixes.js

# 3. 生成 mengdian kk/ko/ar（从 en 品牌 + 主应用 locale）
node scripts/i18n/build-mengdian-brand-locales.js

# 4. 审计并更新报告
node scripts/i18n/audit-translation-consistency.js
node scripts/i18n/fill-step3-step4.js   # 回填 i18n-review-plan.md §1.5 列
```

**顺序：** `build-mengdian-brand-locales`（如需）→ `apply-locale-fixes` → `apply-glossary-fixes` → audit。

## 新增/修改翻译时

1. 查 §1.5 该 key 的 **UI 槽位 / Tier 字数**；中文先满足窄屏上限。
2. 相同中文多处出现 → 查 `glossary-canonical.json`，优先加术语而非各 key 各写。
3. 同中文不同 UI 语义（如「确认注销」标题 vs 按钮）→ 写入 `locale-key-patches.json`。
4. 品牌文案（HiKbao 等）→ 改 `mengdian.config/common/locale`，并跑 `build-mengdian-brand-locales.js` 同步 kk/ko/ar。
5. 勿在 nested locale 文件末尾追加 flat 键；统一用脚本 merge。

## 支持语言

`en` `ja` `ru` `kk` `ko` `ar` `th` `es` `fr` + 基准 `zh-Hans`

## 术语域（保持一致）

- **设备** device / appareil / デバイス / 기기 …
- **绑定** bind → Bound successfully / Liaison réussie …（见术语表）
- **配网** network configuration / configuration Wi-Fi …
- **WiFi** 统一写法，窄屏优先短句
