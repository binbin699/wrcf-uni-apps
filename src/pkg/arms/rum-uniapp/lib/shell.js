"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");exports.__esModule=!0,exports["default"]=exports.ArmsRum=void 0;var _extends3=_interopRequireDefault(require("@babel/runtime/helpers/extends")),_inheritsLoose2=_interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose")),_rumCore=require("@arms/rum-core"),_pv=_interopRequireDefault(require("./collector/view/pv")),_exception=_interopRequireDefault(require("./collector/exception")),_api=_interopRequireDefault(require("./collector/resource/api")),_defaultProcessor=_interopRequireDefault(require("./processor/default-processor")),_sessionProcessor=_interopRequireDefault(require("./processor/session-processor")),_reporter=_interopRequireDefault(require("./reporter")),_platform=require("./utils/platform"),_session=require("./utils/session"),_mixin=require("./utils/mixin"),ArmsRum=exports.ArmsRum=/*#__PURE__*/function(a){function b(){for(var b,c=arguments.length,d=Array(c),e=0;e<c;e++)d[e]=arguments[e];return b=a.call.apply(a,[this].concat(d))||this,b.version=_platform.VERSION,b}(0,_inheritsLoose2["default"])(b,a);var c=b.prototype;return c.init=/**
   * 初始化
   */function(a){// 监听网络类型变化
// getNetType(this.updateNetType);
return a.vue&&this.setVue(a.vue),this.client.useCollectors([new _pv["default"],// new PerfCollector(),
new _exception["default"],new _api["default"]// new ActionCollector(),
]),this.client.useProcessors([new _defaultProcessor["default"],new _sessionProcessor["default"]]),this.client.useReporter(new _reporter["default"]),this.client.init(a,new _session.RumSession),this}/**
   * set config
   */,c.setConfig=function(){var a=this.client.getContext();if(2===arguments.length){var b,c=this.client.getContext(),d=c.getConfig();c.setConfig((0,_extends3["default"])({},d,(b={},b[0>=arguments.length?void 0:arguments[0]]=1>=arguments.length?void 0:arguments[1],b)))}else a.setConfig(0>=arguments.length?void 0:arguments[0])},c.setVue=function(a){this.setConfig("vue",a),(0,_mixin.mixin)(a)},b}(_rumCore.Shell),_default=exports["default"]=new ArmsRum;// import PerfCollector from './collector/view/perf';
// import ActionCollector from './collector/action';
// import { getNetType } from "./utils/network";
/**
 * 对外导出 shell 层, 所有 shell 层模型的 API 设计约定：
 * 1. API 命名空间按照 variables / functions / events 来组织
 * 2. 事件（events）的命名格式为：on[Will|Did]VerbNoun?，参考 https://code.visualstudio.com/api/references/vscode-api#events
 * 3. 基于 Disposable 模式，对于事件的绑定、快捷键的绑定函数，返回值则是解绑函数
 */