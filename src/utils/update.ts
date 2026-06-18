// utils/update.ts

const CONFIG = {
    // 1️⃣ iOS 应用商店 ID（必填）
    // 在 App Store Connect 或 iTunes Connect 中查看，纯数字，如 "1234567890"
    iOSAppId: '1234567890',

    // 2️⃣ Android 备用下载页（选填，但建议填）
    // 当手机没有安装应用市场（或 market:// 协议打不开）时的降级链接
    // 建议用蒲公英、腾讯应用宝的短链，或者你自己的官网下载页
    fallbackDownloadUrl: 'https://wrcfmo.cn/twoweima/wrcf.apk',

    // 3️⃣ 你的后端接口地址（必填）
    // 用于获取最新上架版本号，需要返回 JSON
    apiUrl: 'https://your-api.com/app/version',

    // 4️⃣ 接口返回的 JSON 数据结构（根据你的实际后台调整路径）
    // 举例：如果后台返回 { code:0, data: { version:"1.0.2" } }，就写 'data.version'
    // 如果后台直接返回 { version:"1.0.2" }，就写 'version'
    versionPath: 'data.version',
};

/**
 * 工具函数：根据路径字符串从对象中取值（如 'data.version'）
 */
const getValueByPath = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * 获取当前 App 版本号
 */
export const getCurrentVersion = (): Promise<string> => {
    return new Promise((resolve) => {
        // @ts-ignore
        plus.runtime.getProperty(plus.runtime.appid, (widgetInfo: any) => {
            resolve(widgetInfo.version);
        });
    });
};

/**
 * 跳转应用商店更新
 */
export const goToAppStoreUpdate = () => {
    // @ts-ignore
    const platform = plus.os.name;

    if (platform === 'iOS') {
        // iOS：使用配置的 AppID 拼接 URL
        const appStoreUrl = `https://apps.apple.com/cn/app/id${CONFIG.iOSAppId}`;
        // @ts-ignore
        plus.runtime.openURL(appStoreUrl);
    } else {
        // Android：使用包名跳转应用市场
        // @ts-ignore
        const pkgName = plus.runtime.appid;
        const androidMarketUrl = `market://details?id=${pkgName}`;
        // @ts-ignore
        plus.runtime.openURL(androidMarketUrl, (err: any) => {
            // 如果打不开应用市场（极少见），使用备用下载链接
            if (err) {
                // @ts-ignore
                plus.runtime.openURL(CONFIG.fallbackDownloadUrl);
            }
        });
    }
};

/**
 * 主检查更新函数
 */
export const checkAppUpdate = async () => {
    try {
        const localVer = await getCurrentVersion();

        // 请求后端获取最新版本
        // const res = await fetch(CONFIG.apiUrl);
        // const result = await res.json();
        //
        // // 根据配置的路径提取版本号
        // const remoteVer = getValueByPath(result, CONFIG.versionPath);
        const remoteVer = '1.0.1';

        if (!remoteVer) {
            console.warn('未从接口获取到版本号，请检查 versionPath 配置');
            return;
        }

        if (remoteVer !== localVer) {
            uni.showModal({
                title: '发现新版本',
                content: `检测到 v${remoteVer} 版本，是否前往应用商店更新？`,
                confirmText: '立即更新',
                cancelText: '暂不',
                success: (modalRes) => {
                    if (modalRes.confirm) {
                        goToAppStoreUpdate();
                    }
                }
            });
        }
    } catch (error) {
        console.error('检查更新失败', error);
    }
};