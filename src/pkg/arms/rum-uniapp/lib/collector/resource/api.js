"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");exports.__esModule=!0,exports["default"]=void 0;var _regenerator=_interopRequireDefault(require("@babel/runtime/regenerator")),_extends2=_interopRequireDefault(require("@babel/runtime/helpers/extends")),_asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator")),_rumCore=require("@arms/rum-core"),_platform=require("../../utils/platform"),_url=require("../../utils/url"),_base=require("../../utils/base"),_view=require("../../utils/view"),_api=require("../../utils/api"),ApiCollector=exports["default"]=/*#__PURE__*/function(){function a(){var a=this;this.name="api-collector",this.ctx=void 0,this.sendEvent=void 0,this.sendApi=/*#__PURE__*/function(){var b=(0,_asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function e(b,c,d){var f,g,h,i,j,k,l,m,n,o;return _regenerator["default"].wrap(function(e){for(;;)switch(e.prev=e.next){case 0:if(f=a.ctx.getConfig(),g=f.evaluateApi,h=c.statusCode,i=c.status,j=c.errMsg,k=c.errorMessage,l=c.message,!(0,_rumCore.isFunction)(g)){e.next=13;break}return e.prev=3,0===b.success&&(m=new Error("request error")),e.next=7,g(d,c,m);case 7:n=e.sent,b=(0,_extends2["default"])({},b,(0,_api.reviseApiAttr)(n)),e.next=13;break;case 11:e.prev=11,e.t0=e["catch"](3);case 13:if(o=(0,_extends2["default"])({event_type:_rumCore.RumEventType.RESOURCE,type:"api",status_code:i||h,message:k||j||l,duration:(0,_base.getCurrentTime)()-b.timestamp,times:1},b),!(o.duration>_rumCore.ONE_DAY)){e.next=16;break}return e.abrupt("return");case 16:a.sendEvent(o);case 17:case"end":return e.stop()}},e,null,[[3,11]])}));return function(){return b.apply(this,arguments)}}()}var b=a.prototype;return b.setup=// origin = {
//   request: sdk.request
// }
function(a,b){var c=a.getConfig(),d=c.collectors,e=void 0===d?{}:d;!1===e.api||(// Object.keys(this.origin).forEach((key) => this.hackRequest(key));
this.ctx=a,this.sendEvent=b,this.interceptorRequest())},b.interceptorRequest=function(){if((0,_rumCore.isFunction)(_platform.sdk.addInterceptor)){var a=this;_platform.sdk.addInterceptor("request",{invoke:function(b){a.rebuildRequestOptions(b)}})}},b.injectTracing=function(a,b){var c,d=this.ctx.getConfig(),e=d.tracing,f=d.pid,g=d.version,h=void 0===g?"1.0.0":g,i=(0,_rumCore.parseTracingOptions)(e),j=i.enable,k=i.sample,l=i.propagatorTypes,m=i.allowedUrls,n=i.tracestate,o=i.baggage;if(j){var p=(0,_rumCore.find)(m,function(b){return(0,_rumCore.matchList)([b.match],a.url)});if(p){var q=p.propagatorTypes;0===q.length&&(q=l);// skywalking
var r=!1;q.includes("sw8")&&(q=["sw8"],r=!0);var s=r?(0,_rumCore.generateGUID)():(0,_rumCore.generateTraceId)(),t=r?(0,_rumCore.generateGUID)():(0,_rumCore.generateSpanId)(),u=(0,_rumCore.performDraw)(k),v=this.ctx.session.getUserId(),w=this.ctx.session.getSessionId(),x=void 0===n||n?"rum=v2&uniapp&"+f+"&"+w+"&"+v:void 0,y=void 0!==o&&o?"rum=v2,appType=uniapp,pid="+f+",sid="+w+",uid="+v:void 0,z=(0,_rumCore.makeTracingHeaders)(s,t,u,q,{tracestate:x,baggage:y,appId:f,appVersion:h,viewName:null===(c=a.view)||void 0===c?void 0:c.name,host:_platform.appName});u&&(a.trace_id=s,a.trace_data=JSON.stringify({spanId:t,sample:k,sampled:u,header:z})),b(z)}}}// hackRequest(key) {
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
,b.rebuildRequestOptions=function(a){var b=this,c=a.url,d=a.success,e=a.fail,f=a.complete,g=a.header,h=(0,_base.getCurrentTime)();// SDK自己的请求不监控 & 过滤不需要监控的url
if((0,_url.isEndpoint)(this.ctx,c)||(0,_rumCore.urlMatch)(c))return a;// const newOptions = {
//   ...options,
// };
var i={view:(0,_view.getCurView)(this.ctx),timestamp:h,url:c,name:this.getResourceName(c),method:a.method||"GET"};return this.injectTracing(i,function(b){a.header=(0,_extends2["default"])({},g,b)}),a.success=function(){i.success=1;for(var a=arguments.length,b=Array(a),c=0;c<a;c++)b[c]=arguments[c];d&&d.apply(this,b)},a.fail=function(){i.success=0;for(var a=arguments.length,b=Array(a),c=0;c<a;c++)b[c]=arguments[c];e&&e.apply(this,b)},a.complete=function(){for(var c=arguments.length,d=Array(c),e=0;e<c;e++)d[e]=arguments[e];var g=(0,_extends2["default"])({},d[0]);try{i.success=i.success&&200<=g.statusCode&&300>g.statusCode?1:0,i.size=(0,_base.getStringSize)(JSON.stringify(g)),b.sendApi(i,g,a)}catch(a){//
}f&&f.apply(this,d)},a},b.getResourceName=function(a){var b,c=this.ctx.getConfig(),d=c.parseResourceName;return b=(0,_rumCore.isFunction)(d)?d(a):(0,_url.getPathByURL)(a),b}// /**
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
,a}();