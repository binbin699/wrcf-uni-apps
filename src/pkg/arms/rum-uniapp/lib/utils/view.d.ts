import { IContext, IRumSession, IViewData } from '@arms/rum-core';
export interface Page {
    route: string;
    is: string;
    getPageId: () => string;
    __rum_view_id?: string;
}
export declare const PAGE_ID = "__rum_view_id";
/**
 * 获取 RUM 内置的view_id标识
 * @param page
 * @param session
 * @returns
 */
export declare function getRumViewId(page: Page, session?: IRumSession): string;
/**
 * 获取当前 view
 * @param viewId
 * @param ctx
 * @returns
 */
export declare function getViewById(viewId: string, ctx: IContext): IViewData;
/**
 * 获取当前 view
 * @param ctx
 * @returns
 */
export declare function getCurView(ctx: IContext): IViewData;
