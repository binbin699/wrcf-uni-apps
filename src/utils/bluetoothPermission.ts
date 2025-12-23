/**
 * Android 12+ 蓝牙权限预请求
 * 
 * 必须在 App 启动时或用户同意隐私政策后立即请求
 * 否则后续调用蓝牙 API 会报错
 * 
 * 注意：此函数只应在用户同意隐私政策后调用（SecGuard 合规要求）
 */
export function requestBluetoothPermissionsForAndroid12() {
  // #ifdef APP-PLUS
  try {
    const systemInfo = uni.getSystemInfoSync();
    
    // 只在 Android 上需要
    if (systemInfo.platform !== 'android') {
      return;
    }
    
    // 只在 Android 12+ 上需要
    const osVersion = parseFloat(systemInfo.osVersion || '0');
    if (osVersion < 12) {
      console.log('[蓝牙权限] Android', osVersion, '不需要预请求蓝牙权限');
      return;
    }
    
    // 检查 plus.android 是否可用
    if (typeof plus === 'undefined' || !plus.android) {
      console.warn('[蓝牙权限] plus.android 不可用，延迟请求');
      // 等待 plus ready
      document.addEventListener('plusready', () => {
        requestBluetoothPermissionsForAndroid12();
      });
      return;
    }
    
    console.log('[蓝牙权限] Android 12+，预请求蓝牙权限...');
    
    plus.android.requestPermissions(
      [
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION'
      ],
      (result: any) => {
        console.log('[蓝牙权限] 预请求结果:', JSON.stringify(result));
        if (result.granted && result.granted.length > 0) {
          console.log('[蓝牙权限] 已授予权限:', result.granted);
        } else if (result.deniedAlways && result.deniedAlways.length > 0) {
          console.warn('[蓝牙权限] 永久拒绝的权限:', result.deniedAlways);
        } else if (result.deniedPresent && result.deniedPresent.length > 0) {
          console.warn('[蓝牙权限] 本次拒绝的权限:', result.deniedPresent);
        }
      },
      (error: any) => {
        console.error('[蓝牙权限] 预请求错误:', error);
      }
    );
  } catch (e) {
    console.error('[蓝牙权限] 请求异常:', e);
  }
  // #endif
}
