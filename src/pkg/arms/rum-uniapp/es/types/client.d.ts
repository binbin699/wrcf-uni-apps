import { IConfiguration, ITracingOption } from "@arms/rum-core";
import { IApiBaseAttr } from "../utils/api";
export interface Vue {
    mixin: (options: object) => void;
}
export interface IUniConfig extends IConfiguration {
    /**
     * vue2 时为 VUE
     * vue3 是为 new Vue() 实例
     */
    vue: Vue;
    /**
     * view.name 解析
     */
    parseViewName?(url: string): string;
    /**
     * resource.name 解析
     */
    parseResourceName?(url: string): string;
    /**
     * tracing 配置 'tracecontext' | 'b3' | 'b3multi' | 'jaeger';
     */
    tracing?: boolean | ITracingOption;
    /**
     * request 自定义解析;
     */
    evaluateApi?(request: any, response: any, error?: Error): Promise<IApiBaseAttr>;
}
