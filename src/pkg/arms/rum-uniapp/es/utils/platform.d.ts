import { RumEventBundle } from "@arms/rum-core";
export declare const global2: any;
export declare const VERSION: string;
interface CommonOption {
    success?: (res: any) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
}
interface SDK {
    onAppShow: (listener: Function) => void;
    onAppHide: (listener: Function) => void;
    request: (options: any) => void;
    getStorageSync: (key: any) => any;
    setStorageSync: (key: any, data?: string) => void;
    onError: (listener: Function) => void;
    onPageNotFound: (listener: Function) => void;
    offError: (listener: Function) => void;
    navigateTo: (options: any) => void;
    getSystemInfo: () => any;
    getDeviceInfo: () => any;
    getAppBaseInfo: () => any;
    getWindowInfo: () => any;
    getNetworkType: (options: CommonOption) => any;
    addInterceptor: (key: string, options: any) => any;
}
export declare const sdk: SDK;
export declare const appName = "uniapp";
export declare function getStorageSync(key: any): any;
export declare function setStorageSync(key: string, data: string): void;
export declare function getPerformance(): any;
export declare function getNetType(): Promise<string>;
export declare const fixAttrs: (bundle: RumEventBundle) => Promise<RumEventBundle>;
export {};
