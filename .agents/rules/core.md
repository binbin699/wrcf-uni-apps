# 核心规则

## 技术栈

- Vue 3 + TypeScript + Pinia + uni-app
- 组件库: **wot-design-uni** (主要)
- 开发工具: Cursor / OpenCode (开发) / HBuilderX (打包)

## 禁止操作

- ❌ 手动修改 `manifest.json` (必须通过 HBuilderX 修改)
- ❌ 绕过 `request.ts` 直接调用 `uni.request`
- ❌ 页面直接调用 `utils/request.ts`
- ❌ 新代码使用 `any` 类型
- ❌ 提交敏感信息 (API keys、密码、证书)
- ❌ 在 `src/static/` 放大文件 (单文件不超过 500KB)

## 提交前检查

- `pnpm fmt` - 代码格式化 (Prettier)
- `pnpm type-check` - 类型检查

## 文件组织

```
/src
├── api/              # API 封装
│   ├── common.ts
│   ├── login.ts
│   └── types/        # API 类型定义
├── components/       # 公共组件
│   ├── AgentCard.vue
│   └── VoiceSelector.vue
├── const/            # 常量和配置
│   ├── env.ts        # 环境变量管理
│   └── index.ts      # 应用信息 (AppInfo)
├── locale/           # 国际化
│   ├── zh-Hans.json
│   └── en.json
├── pages/            # 页面
│   ├── index/
│   └── login/
├── static/           # 静态资源 (图片、字体)
├── store/            # Pinia 状态管理
│   ├── user.ts
│   └── token.ts
├── styles/           # 全局样式
├── types/            # 全局类型定义
├── utils/            # 工具函数
│   ├── request.ts
│   ├── storage.ts
│   └── permission.ts
└── uni_modules/      # uni-app 插件
```
