import { IContext, IProcessor, RumEvent } from '@arms/rum-core';
export default class DefaultProcessor implements IProcessor {
    name: string;
    process(ctx: IContext): RumEvent;
}
