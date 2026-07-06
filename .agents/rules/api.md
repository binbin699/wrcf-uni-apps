# API 开发规范

## 调用层级（重要）

**严格遵守三层架构**:
```
页面/组件 → src/api/*.ts → src/utils/request.ts → uni.request
```

- ✅ 页面/组件: 调用 `src/api/` 中定义的方法
- ✅ `src/api/*.ts`: 封装业务接口，调用 `utils/request.ts`
- ✅ `utils/request.ts`: 底层请求封装，调用 `uni.request`
- ❌ 页面/组件: 禁止直接调用 `utils/request.ts` 或 `uni.request`

## 当前状态

⚠️ **历史遗留**: `src/api/index.ts` 包含所有 API (单文件)

**当前使用方式**:
```typescript
import { authApi, agentApi, voiceApi, deviceApi } from '@/api';

// 使用
const userInfo = await authApi.login(data);
const agents = await agentApi.getList();
```

🔧 **重构目标**: 逐步拆分为独立模块

**目标结构**:
```
src/api/
├── login.ts        # 登录/注册相关
├── voice.ts        # 音色接口
├── device.ts       # 设备接口
├── agent.ts        # 智能体接口
├── user.ts         # 用户信息接口
├── common.ts       # 通用接口
└── types/          # 类型定义
    ├── login.ts
    ├── voice.ts
    ├── device.ts
    └── agent.ts
```

## 添加新 API 流程

### 1. 定义类型（必须）

⚠️ **如果对话中没有类型定义，必须向用户索取**

```typescript
// src/api/types/device.ts
export interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline';
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
}
```

### 2. 创建 API 函数

```typescript
// src/api/device.ts (目标位置)
import request from '@/utils/request';
import type { Device, DeviceListResponse } from './types/device';

/**
 * 获取设备列表
 */
export function getDeviceList() {
  return request.get<DeviceListResponse>('/api/devices');
}

/**
 * 获取设备详情
 */
export function getDeviceDetail(id: string) {
  return request.get<Device>(`/api/devices/${id}`);
}
```

### 3. 页面中调用

```typescript
// ✅ 正确
import { getDeviceList } from '@/api/device';
const devices = await getDeviceList();

// ❌ 错误 - 禁止直接使用 request
import request from '@/utils/request';
const devices = await request.get('/api/devices');
```

## 错误处理

- **通用错误** (401、500): 在 `request.ts` 中统一处理
- **业务错误**: 在页面调用处处理
