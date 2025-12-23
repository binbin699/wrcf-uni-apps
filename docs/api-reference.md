# API接口文档

## 📡 接口概览

本文档描述了灵矽AI小程序的所有API接口，包括用户认证、AI助手管理、设备管理等功能模块。

### 基础信息
- **Base URL**: `https://your-api-domain.com`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token

## 🔐 用户认证

### 小程序手机号登录

**接口地址**: `POST /app/user/login/miniPhone`

**功能描述**: 通过微信小程序授权获取手机号进行用户登录

**请求参数**:
```json
{
  "code": "微信授权码",
  "encryptedData": "加密的手机号数据",
  "iv": "初始向量"
}
```

**响应示例**:
```json
{
  "code": 1000,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 1,
      "phone": "138****8888",
      "nickname": "用户昵称",
      "avatar": "头像URL"
    }
  }
}
```

**错误码**:
- `1001`: 授权码无效
- `1002`: 手机号解密失败
- `1003`: 用户信息获取失败

## 🤖 AI助手管理

### 获取AI助手列表

**接口地址**: `GET /app/agent/list`

**功能描述**: 获取用户可见的灵矽AI助手列表（包含私有和公开助手）

**请求头**: Authorization: Bearer {token}

**响应示例**:
```json
{
  "code": 1000,
  "message": "success",
  "data": [
    {
      "id": 1,
      "userId": 123,
      "userName": "用户名",
      "agentId": "agent_001",
      "agentName": "灵矽AI助手A",
      "isPublic": 1,
      "config": "{\"voice\":\"female\",\"language\":\"zh-CN\"}",
      "syncTime": "2024-01-01T10:00:00.000Z",
      "createTime": "2024-01-01T08:00:00.000Z",
      "updateTime": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

### AI助手绑定设备

**接口地址**: `POST /app/agent/bind`

**功能描述**: 将灵矽AI助手绑定到指定设备

**请求参数**:
```json
{
  "agentId": "agent_001",
  "deviceId": "device_001"
}
```

**响应示例**:
```json
{
  "code": 1000,
  "message": "success",
  "data": null
}
```

**业务规则**:
- 一个设备同时只能绑定一个AI助手
- 绑定新AI助手会自动解除原有绑定关系
- 只能绑定用户自己的设备

## 📱 设备管理

### 添加设备

**接口地址**: `POST /app/device/add`

**功能描述**: 手动添加新设备到用户账户

**请求头**: Authorization: Bearer {token}

**请求参数**:
```json
{
  "deviceName": "设备名称",
  "macAddress": "设备MAC地址",
  "remark": "设备备注（可选）"
}
```

**响应示例**:
```json
{
  "code": 1000,
  "message": "success",
  "data": null
}
```

**业务规则**:
- 设备会自动关联到当前登录用户
- MAC地址必须唯一，不能重复添加
- 设备名称为必填项

### 获取设备列表

**接口地址**: `GET /app/device/list`

**功能描述**: 获取当前用户的设备列表（设备通过WiFi配网自动添加）

**请求头**: Authorization: Bearer {token}


**响应示例**:
```json
{
  "code": 1000,
  "message": "success",
  "data": [
    {
      "id": "device_001",
      "userId": "user_123",
      "userName": "张三",
      "deviceName": "客厅音箱",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "agentId": "agent_001",
      "agentName": "智能助手A",
      "remark": "客厅智能音箱设备",
      "status": 1,
      "createTime": "2024-01-01T08:00:00.000Z",
      "updateTime": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```


## 📊 状态码说明

### 成功状态码
- `1000`: 操作成功

### 客户端错误 (1001-1999)
- `1001`: 参数错误
- `1002`: 数据格式错误
- `1003`: 必填参数缺失
- `1004`: 参数值超出范围
- `1005`: 重复操作

### 认证错误 (2001-2999)
- `2001`: 未登录
- `2002`: Token无效
- `2003`: Token过期
- `2004`: 权限不足

### 业务错误 (3001-3999)
- `3001`: 用户不存在
- `3002`: 设备不存在
- `3003`: 智能体不存在
- `3004`: 设备已被绑定
- `3005`: MAC地址已存在

### 服务器错误 (5001-5999)
- `5001`: 内部服务器错误
- `5002`: 数据库连接失败
- `5003`: 第三方服务异常
