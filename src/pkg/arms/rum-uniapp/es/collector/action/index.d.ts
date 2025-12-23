import { ICollector, IContext, RumActionEvent, RumEvent } from '@arms/rum-core';
export default class ActionCollector implements ICollector {
    name: string;
    private DELAY_TIME;
    ctx: IContext;
    sendEvent: (payload: RumEvent) => void;
    events: string[];
    lastEvent: RumActionEvent;
    timer: any;
    setup(ctx: IContext, sendEvent: (payload: RumEvent) => void): void;
    onEvent: (e: any) => void;
    sendAction: () => void;
    destroy(): void;
}
