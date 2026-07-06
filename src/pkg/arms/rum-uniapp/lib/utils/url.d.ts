import { IContext } from "@arms/rum-core";
/**
 * 根据指定 URL 获取视图的名称，默认为其path部分
 * @param url 需要提取路径部分的 URL
 * @param isHash 是否为 hash 模式路由的 URL
 */
export declare function getPathByURL(url: string, isHash?: boolean): string;
/**
 * 检查是否为上报域名
 * @param ctx
 * @param url 需要提取路径部分的 URL
 */
export declare function isEndpoint(ctx: IContext, url: string): boolean;
export declare function getURL(url: string): {
    uri: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
};
