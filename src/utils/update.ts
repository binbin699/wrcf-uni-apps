// utils/update.ts
// ====================================================
// 最小改动：从服务器获取版本号 + 本地降级
// ====================================================

// ============ 配置区域 ============
const CONFIG = {
    // iOS 应用商店 ID（必填）
    iOSAppId: '6778761026',

    // Android 备用下载页（当市场链接打不开时的降级地址）
    fallbackDownloadUrl: 'https://wrcfmo.cn/twoweima/wrcf.apk',

    // Android 应用包名
    androidPackageName: 'com.jiubaozhinengweir.app',

    // 🔥 新增：服务器版本文件地址（使用你的域名）
    serverVersionUrl: 'https://wrcfmo.cn/version.json',
    
    // 🔥 新增：请求超时时间（毫秒）
    timeout: 3000,
};

// 🔥 修改：本地降级配置（当服务器请求失败时使用）
const FALLBACK_VERSION = {
    versionName: '1.0.7',
    versionCode: 101079,
};
// ======================================================

/**
 * 获取当前 App 版本信息（名称 + 数值）
 */
export const getCurrentVersionInfo = (): Promise<{ versionName: string; versionCode: number }> => {
    return new Promise((resolve) => {
        if (typeof plus === 'undefined') {
            resolve({ versionName: '1.0.0', versionCode: 100 });
            return;
        }
        // @ts-ignore
        plus.runtime.getProperty(plus.runtime.appid, (widgetInfo: any) => {
            resolve({
                versionName: widgetInfo.version || '1.0.0',
                versionCode: parseInt(widgetInfo.versionCode, 10) || 100,
            });
        });
    });
};

/**
 * 🔥 新增：从服务器获取最新版本号
 */
const fetchServerVersion = (): Promise<{ versionName: string; versionCode: number }> => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: CONFIG.serverVersionUrl,
            method: 'GET',
            timeout: CONFIG.timeout,
            success: (res) => {
                if (res.statusCode === 200 && res.data) {
                    const data = res.data as any;
                    // 验证数据格式
                    if (data.versionCode && data.versionName) {
                        resolve({
                            versionName: data.versionName,
                            versionCode: data.versionCode,
                        });
                    } else {
                        reject(new Error('版本数据格式错误'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
};

/**
 * 跳转应用商店更新（保持不变）
 */
export const goToAppStoreUpdate = () => {
    // @ts-ignore
    const platform = plus.os.name;

    if (platform === 'iOS') {
        const appStoreUrl = `https://apps.apple.com/cn/app/id${CONFIG.iOSAppId}`;
        // @ts-ignore
        plus.runtime.openURL(appStoreUrl);
        return;
    }

    // ---------- Android 部分 ----------
    const pkgName = CONFIG.androidPackageName;
    // @ts-ignore
    const vendor = plus.device.vendor?.toLowerCase() || '';

    let primaryUrl = '';
    if (vendor.includes('huawei')) {
        primaryUrl = `appmarket://details?id=${pkgName}`;
    } else if (vendor.includes('oppo')) {
        primaryUrl = `oppomarket://details?packagename=${pkgName}`;
    } else if (vendor.includes('vivo')) {
        primaryUrl = `vivomarket://details?id=${pkgName}`;
    } else if (vendor.includes('xiaomi')) {
        primaryUrl = `market://details?id=${pkgName}`;
    } else if (vendor.includes('samsung')) {
        primaryUrl = `samsungapps://ProductDetail/${pkgName}`;
    } else {
        primaryUrl = `market://details?id=${pkgName}`;
    }

    const fallbackUrls = [
        `market://details?id=${pkgName}`,
        `https://a.app.qq.com/o/simple.jsp?pkgname=${pkgName}`,
        CONFIG.fallbackDownloadUrl,
    ];

    // @ts-ignore
    plus.runtime.openURL(primaryUrl, (err: any) => {
        if (err) {
            console.warn('首选市场打开失败，尝试备用方案', err);
            const tryNext = (index: number) => {
                if (index >= fallbackUrls.length) {
                    uni.showToast({ title: '无法打开应用商店，请手动下载', icon: 'none' });
                    return;
                }
                const url = fallbackUrls[index];
                if (url === primaryUrl) {
                    tryNext(index + 1);
                    return;
                }
                // @ts-ignore
                plus.runtime.openURL(url, (err2: any) => {
                    if (err2) {
                        tryNext(index + 1);
                    }
                });
            };
            tryNext(0);
        }
    });
};

/**
 * 🔥 修改：主检查更新函数（优先从服务器获取）
 */
export const checkAppUpdate = async () => {
    try {
        // 1. 获取本地版本
        const localInfo = await getCurrentVersionInfo();
        console.log(`当前版本: v${localInfo.versionName} (${localInfo.versionCode})`);

        // 2. 🔥 从服务器获取最新版本
        let remoteVersion;
        try {
            remoteVersion = await fetchServerVersion();
            console.log('服务器版本:', remoteVersion);
        } catch (error) {
            // 服务器请求失败，使用本地降级配置
            console.warn('服务器请求失败，使用降级配置', error);
            remoteVersion = FALLBACK_VERSION;
        }

        // 3. 对比版本号
        if (remoteVersion.versionCode > localInfo.versionCode) {
            uni.showModal({
                title: '发现新版本',
                content: `检测到 v${remoteVersion.versionName} 版本，是否前往应用商店更新？`,
                confirmText: '立即更新',
                cancelText: '暂不',
                success: (modalRes) => {
                    if (modalRes.confirm) {
                        goToAppStoreUpdate();
                    }
                }
            });
        } else {
            console.log('✅ 当前已是最新版本');
        }
    } catch (error) {
        console.error('检查更新失败', error);
    }
};