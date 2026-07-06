import _extends from"@babel/runtime/helpers/extends";import _asyncToGenerator from"@babel/runtime/helpers/asyncToGenerator";import _regeneratorRuntime from"@babel/runtime/regenerator";import{find,generateGUID,generateSpanId,generateTraceId,isFunction,makeTracingHeaders,matchList,parseTracingOptions,performDraw,RumEventType,urlMatch,ONE_DAY}from"@arms/rum-core";import{sdk,appName}from"../../utils/platform";import{getPathByURL,isEndpoint}from"../../utils/url";import{getCurrentTime,getStringSize}from"../../utils/base";import{getCurView}from"../../utils/view";import{reviseApiAttr}from"../../utils/api";var ApiCollector=/*#__PURE__*/function(){function a(){var a=this;this.name="api-collector",this.ctx=void 0,this.sendEvent=void 0,this.sendApi=/*#__PURE__*/function(){var b=_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function e(b,c,d){var f,g,h,i,j,k,l,m,n,o;return _regeneratorRuntime.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:if(f=a.ctx.getConfig(),g=f.evaluateApi,h=c.statusCode,i=c.status,j=c.errMsg,k=c.errorMessage,l=c.message,!isFunction(g)){e.next=13;break}return e.prev=3,0===b.success&&(m=new Error("request error")),e.next=7,g(d,c,m);case 7:n=e.sent,b=_extends({},b,reviseApiAttr(n)),e.next=13;break;case 11:e.prev=11,e.t0=e["catch"](3);case 13:if(o=_extends({event_type:RumEventType.RESOURCE,type:"api",status_code:i||h,message:k||j||l,duration:getCurrentTime()-b.timestamp,times:1},b),!(o.duration>ONE_DAY)){e.next=16;break}return e.abrupt("return");case 16:a.sendEvent(o);case 17:case"end":return e.stop()}},e,null,[[3,11]])}));return function(){return b.apply(this,arguments)}}()}var b=a.prototype;return b.setup=// origin = {
//   request: sdk.request
// }
function(a,b){var c=a.getConfig(),d=c.collectors,e=void 0===d?{}:d;!1===e.api||(// Object.keys(this.origin).forEach((key) => this.hackRequest(key));
this.ctx=a,this.sendEvent=b,this.interceptorRequest())},b.interceptorRequest=function(){if(isFunction(sdk.addInterceptor)){var a=this;sdk.addInterceptor("request",{invoke:function(b){a.rebuildRequestOptions(b)}})}},b.injectTracing=function(a,b){var c,d=this.ctx.getConfig(),e=d.tracing,f=d.pid,g=d.version,h=void 0===g?"1.0.0":g,i=parseTracingOptions(e),j=i.enable,k=i.sample,l=i.propagatorTypes,m=i.allowedUrls,n=i.tracestate,o=i.baggage;if(j){var p=find(m,function(b){return matchList([b.match],a.url)});if(p){var q=p.propagatorTypes;0===q.length&&(q=l);// skywalking
var r=!1;q.includes("sw8")&&(q=["sw8"],r=!0);var s=r?generateGUID():generateTraceId(),t=r?generateGUID():generateSpanId(),u=performDraw(k),v=this.ctx.session.getUserId(),w=this.ctx.session.getSessionId(),x=void 0===n||n?"rum=v2&uniapp&"+f+"&"+w+"&"+v:void 0,y=void 0!==o&&o?"rum=v2,appType=uniapp,pid="+f+",sid="+w+",uid="+v:void 0,z=makeTracingHeaders(s,t,u,q,{tracestate:x,baggage:y,appId:f,appVersion:h,viewName:null===(c=a.view)||void 0===c?void 0:c.name,host:appName});u&&(a.trace_id=s,a.trace_data=JSON.stringify({spanId:t,sample:k,sampled:u,header:z})),b(z)}}}// hackRequest(key) {
//   const self = this;
//   if (!isFunction(sdk[key])) return;
//   sdk[key] = function (...args: any[]) {
//     args[0] = self.rebuildRequestOptions(args[0]);
//     return self.origin[key].apply(this, args);
//   }
//   // Object.defineProperty(sdk, key, {
//   //   configurable: true,
//   //   enumerable: true,
//   //   writable: true,
//   //   value: function (...args: any) {
//   //     args[0] = self.rebuildRequestOptions(args[0]);
//   //     self.origin[key].apply(this, args);
//   //     return this;
//   //   }
//   // });
// }
,b.rebuildRequestOptions=function(a){var b=this,c=a.url,d=a.success,e=a.fail,f=a.complete,g=a.header,h=getCurrentTime();// SDK自己的请求不监控 & 过滤不需要监控的url
if(isEndpoint(this.ctx,c)||urlMatch(c))return a;// const newOptions = {
//   ...options,
// };
var i={view:getCurView(this.ctx),timestamp:h,url:c,name:this.getResourceName(c),method:a.method||"GET"};return this.injectTracing(i,function(b){a.header=_extends({},g,b)}),a.success=function(){i.success=1;for(var a=arguments.length,b=Array(a),c=0;c<a;c++)b[c]=arguments[c];d&&d.apply(this,b)},a.fail=function(){i.success=0;for(var a=arguments.length,b=Array(a),c=0;c<a;c++)b[c]=arguments[c];e&&e.apply(this,b)},a.complete=function(){for(var c=arguments.length,d=Array(c),e=0;e<c;e++)d[e]=arguments[e];var g=_extends({},d[0]);try{i.success=i.success&&200<=g.statusCode&&300>g.statusCode?1:0,i.size=getStringSize(JSON.stringify(g)),b.sendApi(i,g,a)}catch(a){//
}f&&f.apply(this,d)},a},b.getResourceName=function(a){var b,c=this.ctx.getConfig(),d=c.parseResourceName;return b=isFunction(d)?d(a):getPathByURL(a),b}// /**
//  * 解析小程序的性能数据
//  * 参考：https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
//  *      https://opendocs.alipay.com/mini/api/owycmh?pathHash=c91640f8
//  * @param profile
//  * @returns
//  */
// parseProfile(profile: IMeasure) {
//   const data: IMeasure = {};
//
//   function parseMeasure(key: string, target: string) {
//     if (key in profile && profile[key] > 0) {
//       data[target] = profile[key];
//     }
//   }
//
//   // 以下针对类alipay小程序的情况
//   parseMeasure('domainLookup', 'dns_duration');
//   parseMeasure('connect', 'connect_duration');
//   parseMeasure('SSLconnection', 'ssl_duration');
//   parseMeasure('Waiting', 'first_byte_duration');
//   parseMeasure('totalTime', 'duration');
//
//   function calcMeasure(key1: string, key2: string, target: string) {
//     if ((key1 in profile) && (key1 in profile)) {
//       const mea = profile[key2] - profile[key1];
//       if (mea > 0) {
//         data[target] = mea;
//       }
//     }
//   }
//
//   // 以下针对wx小程序相对标准的情况
//   parseMeasure('receivedBytedCount', 'size');
//   calcMeasure('connectStart', 'connectEnd', 'connect_duration')
//   calcMeasure('SSLconnectionStart', 'SSLconnectionEnd', 'ssl_duration')
//   calcMeasure('domainLookUpStart', 'domainLookUpEnd', 'dns_duration')
//   calcMeasure('redirectStart', 'redirectEnd', 'redirect_duration')
//   calcMeasure('responseStart', 'requestStart', 'first_byte_duration')
//   calcMeasure('responseStart', 'requestEnd', 'download_duration')
//   calcMeasure('redirectStart', 'responseEnd', 'duration')
//   // 对超大的耗时进行过滤
//   Object.keys(data).forEach((key) => {
//     if (data[key] > ONE_DAY) {
//       delete data[key];
//     }
//   })
//
//   return data;
// }
,a}();export{ApiCollector as default};