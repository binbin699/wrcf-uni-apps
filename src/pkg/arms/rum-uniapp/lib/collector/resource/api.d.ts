import { ICollector, IContext, ITracingHeaders, RumEvent } from '@arms/rum-core';
import { IApiAttr, Options } from "../../utils/api";
export default class ApiCollector implements ICollector {
    name: string;
    ctx: IContext;
    sendEvent: (payload: RumEvent) => void;
    setup(ctx: IContext, sendEvent: (payload: RumEvent) => void): void;
    interceptorRequest(): void;
    injectTracing(apiAttr: IApiAttr, inject: (tracingHeaders: ITracingHeaders) => void): void;
    rebuildRequestOptions(options: Options): Options;
    sendApi: (apiAttr: any, resp: any, options: any) => Promise<void>;
    private getResourceName;
}
