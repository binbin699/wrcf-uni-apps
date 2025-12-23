# 快速开始指南

## 🚀 项目运行

### 开发环境运行

#### 使用HBuilderX
1. **打开项目**
   ```
   文件 → 打开目录 → 选择miniprogram文件夹
   ```

2. **配置manifest.json**
   ```json
   {
     "mp-weixin": {
       "appid": "你的小程序AppID",
       "setting": {
         "urlCheck": false
       }
     }
   }
   ```

3. **运行到微信开发者工具**
   ```
   运行 → 运行到小程序模拟器 → 微信开发者工具
   ```

#### 使用命令行
```bash
# 进入项目目录
cd miniprogram

# 安装依赖
npm install

# 运行到微信小程序
npm run dev:mp-weixin

# 构建生产版本
npm run build:mp-weixin
```

### 生产环境部署

1. **构建项目**
   ```bash
   npm run build:mp-weixin
   ```

2. **上传代码**
   - 在微信开发者工具中点击"上传"
   - 填写版本号和项目备注
   - 提交审核

3. **发布小程序**
   - 登录微信公众平台
   - 提交审核
   - 审核通过后发布
