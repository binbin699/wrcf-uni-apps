export var PAGE_ID="__rum_view_id";// declare var getCurrentPages: Function;
// /**
//  * 获取当前 page
//  * @returns
//  */
// export function getCurPage() {
//   // TODO: 改成从config里获取
//   if (typeof getCurrentPages === 'function') {
//     try {
//       const pages = getCurrentPages() || [];
//       return pages[pages.length - 1];
//     } catch (error) {
//       console.warn('[arms] error in getCurView', error);
//     }
//   }
// }
/**
 * 获取 RUM 内置的view_id标识
 * @param page
 * @param session
 * @returns
 */export function getRumViewId(a,b){return a?a[PAGE_ID]?a[PAGE_ID]:b?a[PAGE_ID]=b.getViewId():void 0:void 0}/**
 * 获取当前 view
 * @param viewId
 * @param ctx
 * @returns
 */export function getViewById(a,b){return a&&b?b.getViews().find(function(b){return b.id===a}):void 0}/**
 * 获取当前 view
 * @param ctx
 * @returns
 */export function getCurView(a){if(a){var b=a.getViews();if(b&&b.length)return b[b.length-1]}}