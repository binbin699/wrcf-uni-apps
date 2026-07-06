import { ICollector, IContext, RumEvent } from '@arms/rum-core';
export default class PerfCollector implements ICollector {
    name: string;
    ctx: IContext;
    sendEvent: (payload: RumEvent) => void;
    perfObserver: any;
    setup(ctx: IContext, sendEvent: (payload: RumEvent) => void): void;
    observerHandler: (ev: any) => void;
    destroy(): void;
}
