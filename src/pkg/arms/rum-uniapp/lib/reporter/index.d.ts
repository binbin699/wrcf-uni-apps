import { IContext, IReporter, Reporter, RumEventBundle } from '@arms/rum-core';
/**
 * uni-app reporter
 */
declare class UniReporter extends Reporter implements IReporter {
    name: string;
    init(ctx: IContext): void;
    request(ctx: IContext, bundle: RumEventBundle): void;
}
export default UniReporter;
