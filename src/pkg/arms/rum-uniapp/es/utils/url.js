/**
 * 根据指定 URL 获取视图的名称，默认为其path部分
 * @param url 需要提取路径部分的 URL
 * @param isHash 是否为 hash 模式路由的 URL
 */export function getPathByURL(a,b){void 0===b&&(b=!1);try{var c=getURL(a);return b?c.hash:c.pathname}catch(a){return""}}/**
 * 检查是否为上报域名
 * @param ctx
 * @param url 需要提取路径部分的 URL
 */export function isEndpoint(a,b){var c=a.getConfig(),d=c.endpoint;try{return getURL(b).hostname===getURL(d).hostname}catch(a){return!1}}var REGEX=/^(?:([^:\/?#]+):\/\/)?((?:([^\/?#@]*)@)?([^\/?#:]*)(?:\:(\d*))?)?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n)*))?/i;export function getURL(a){var b=decodeURIComponent(a).match(REGEX),c=(b[3]||"").split(":"),d=c.length?(b[2]||"").replace(/(.*\@)/,""):b[2];return{uri:b[0],protocol:b[1],host:d,hostname:b[4],port:b[5],pathname:b[6],search:b[7],// query: mapSearchParams(parts[7]),
hash:b[8]}}