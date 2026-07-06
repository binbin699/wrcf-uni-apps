import { IContext, IProcessor } from '@arms/rum-core';
export default class SessionProcessor implements IProcessor {
    name: string;
    ctx: IContext;
    setup(ctx: IContext): void;
    update: (e?: Event) => void;
    process(ctx: IContext): import("@arms/rum-core").RumEvent;
}
