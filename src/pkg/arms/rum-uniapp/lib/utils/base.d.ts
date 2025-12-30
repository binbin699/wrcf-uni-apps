/**
 * 获取获取当前时间 fix Data.now() 存在的缺陷
 * duration方法用于计算时间跨度，由于Date.now存在bug，可能为负数，尽可能使用performance.now计算
 * @returns
 */
export declare function getCurrentTime(): number;
export declare function getStringSize(str: string, encode?: string): number;
