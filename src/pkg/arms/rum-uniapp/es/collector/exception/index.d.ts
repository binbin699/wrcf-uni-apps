import { ICollector, IContext, RumEvent } from '@arms/rum-core';
export default class ExceptionCollector implements ICollector {
    name: string;
    ctx: IContext;
    sendEvent: (payload: RumEvent) => void;
    setup(ctx: IContext, sendEvent: (payload: RumEvent) => void): void;
    hackOrigin(): void;
    uniError: (error: Error) => void;
    onError: (error: Error) => void;
    onUnhandledRejection: (e: PromiseRejectionEvent) => void;
    errorHandle: (event: any, source?: string) => void;
    /**
     * 根据stack获取Error信息
     * TODO: 增加基于Stack解析filename和lineNumber的能力
     * @param stack
     * @returns
     */
    getErrorByStack(stack?: string): {
        name: string;
        message: string;
    };
    destroy(): void;
}
