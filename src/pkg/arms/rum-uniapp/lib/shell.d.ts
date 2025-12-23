import { Shell } from '@arms/rum-core';
import { IUniConfig, Vue } from "./types/client";
/**
 * 对外导出 shell 层, 所有 shell 层模型的 API 设计约定：
 * 1. API 命名空间按照 variables / functions / events 来组织
 * 2. 事件（events）的命名格式为：on[Will|Did]VerbNoun?，参考 https://code.visualstudio.com/api/references/vscode-api#events
 * 3. 基于 Disposable 模式，对于事件的绑定、快捷键的绑定函数，返回值则是解绑函数
 */
export declare class ArmsRum extends Shell {
    version: string;
    /**
     * 初始化
     */
    init(config: IUniConfig): this;
    /**
     * set config
     */
    setConfig<T extends keyof IUniConfig>(key: T, value: IUniConfig[T]): void;
    setConfig(value: IUniConfig): void;
    setVue(vue: Vue): void;
}
declare const _default: ArmsRum;
export default _default;
