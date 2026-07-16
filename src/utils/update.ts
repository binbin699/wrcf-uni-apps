// utils/update.ts

// ============ 配置区域（每次发版时修改此处） ============
const CONFIG = {
    // iOS 应用商店 ID（必填）
    iOSAppId: '6778761026',

    // Android 备用下载页（当市场链接打不开时的降级地址）
    fallbackDownloadUrl: 'https://wrcfmo.cn/twoweima/wrcf.apk',

    // 🔥 新增：Android 应用包名（必须与各大应用商店上架的包名一致）
    androidPackageName: 'com.jiubaozhinengweir.app', // 请替换为您的实际包名
};

// 🔥 最新版本信息（硬编码，每次发版更新）
const REMOTE_VERSION = {
    versionName: '1.0.9',
    versionCode: 101081,
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
 * 跳转应用商店更新（已修复包名问题）
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
    // ✅ 使用配置的正确包名，而不是 plus.runtime.appid
    const pkgName = CONFIG.androidPackageName;
    // @ts-ignore
    const vendor = plus.device.vendor?.toLowerCase() || '';

    // 1️⃣ 根据厂商生成首选 URL
    let primaryUrl = '';
    if (vendor.includes('huawei')) {
        primaryUrl = `appmarket://details?id=${pkgName}`;
    } else if (vendor.includes('oppo')) {
        // OPPO 官方支持两种参数，优先用 packagename
        primaryUrl = `oppomarket://details?packagename=${pkgName}`;
        // 如果仍不生效，可以尝试改用 market://（备用会兜底）
    } else if (vendor.includes('vivo')) {
        primaryUrl = `vivomarket://details?id=${pkgName}`;
    } else if (vendor.includes('xiaomi')) {
        primaryUrl = `market://details?id=${pkgName}`;
    } else if (vendor.includes('samsung')) {
        primaryUrl = `samsungapps://ProductDetail/${pkgName}`;
    } else {
        primaryUrl = `market://details?id=${pkgName}`; // 默认通用
    }

    // 2️⃣ 降级备用列表（按优先级排序）
    const fallbackUrls = [
        `market://details?id=${pkgName}`,                      // 通用市场
        `https://a.app.qq.com/o/simple.jsp?pkgname=${pkgName}`, // 应用宝网页版（可拉起）
        CONFIG.fallbackDownloadUrl,                            // 最终备用下载页
    ];

    // 3️⃣ 尝试打开首选 URL，失败则依次尝试备用
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
                    // 成功则无需处理
                });
            };
            tryNext(0);
        }
    });
};

/**
 * 主检查更新函数
 */
export const checkAppUpdate = async () => {
    try {
        const localInfo = await getCurrentVersionInfo();
        const { versionName: remoteVersionName, versionCode: remoteVersionCode } = REMOTE_VERSION;

        if (remoteVersionCode > localInfo.versionCode) {
            uni.showModal({
                title: '发现新版本',
                content: `检测到 v${remoteVersionName} 版本，是否前往应用商店更新？`,
                confirmText: '立即更新',
                // cancelText: '暂不',
                success: (modalRes) => {
                    if (modalRes.confirm) {
                        goToAppStoreUpdate();
                    }
                }
            });
        } else {
            console.log('当前已是最新版本');
        }
    } catch (error) {
        console.error('检查更新失败', error);
    }
};