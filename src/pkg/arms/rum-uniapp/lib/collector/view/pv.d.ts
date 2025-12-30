import { ICollector, IContext, RumEvent } from '@arms/rum-core';
interface IUniPage {
    id: string;
    route: string;
    name?: string;
}
export default class PvCollector implements ICollector {
    name: string;
    ctx: IContext;
    sendEvent: (payload: RumEvent) => void;
    private prevPage;
    setup(ctx: IContext, sendEvent: (payload: RumEvent) => void): void;
    onLaunch: (that: any, e: any) => void;
    onBeforeCreate: (that: any, e: any) => void;
    onUnload: () => void;
    sendPv: (page: IUniPage) => void;
    private getViewName;
    destroy(): void;
}
export {};
