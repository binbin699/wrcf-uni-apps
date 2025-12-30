import _extends from"@babel/runtime/helpers/extends";import _inheritsLoose from"@babel/runtime/helpers/inheritsLoose";import{Shell}from"@arms/rum-core";import PvCollector from"./collector/view/pv";// import PerfCollector from './collector/view/perf';
import ExceptionCollector from"./collector/exception";import ApiCollector from"./collector/resource/api";// import ActionCollector from './collector/action';
import DefaultProcessor from"./processor/default-processor";import SessionProcessor from"./processor/session-processor";import Reporter from"./reporter";// import { getNetType } from "./utils/network";
import{VERSION}from"./utils/platform";import{RumSession}from"./utils/session";import{mixin}from"./utils/mixin";/**
 * 对外导出 shell 层, 所有 shell 层模型的 API 设计约定：
 * 1. API 命名空间按照 variables / functions / events 来组织
 * 2. 事件（events）的命名格式为：on[Will|Did]VerbNoun?，参考 https://code.visualstudio.com/api/references/vscode-api#events
 * 3. 基于 Disposable 模式，对于事件的绑定、快捷键的绑定函数，返回值则是解绑函数
 */export var ArmsRum=/*#__PURE__*/function(a){function b(){for(var b,c=arguments.length,d=Array(c),e=0;e<c;e++)d[e]=arguments[e];return b=a.call.apply(a,[this].concat(d))||this,b.version=VERSION,b}_inheritsLoose(b,a);var c=b.prototype;return c.init=/**
   * 初始化
   */function(a){// 监听网络类型变化
// getNetType(this.updateNetType);
// 先初始化 client，再设置 vue
this.client.useCollectors([new PvCollector,// new PerfCollector(),
new ExceptionCollector,new ApiCollector// new ActionCollector(),
]),this.client.useProcessors([new DefaultProcessor,new SessionProcessor]),this.client.useReporter(new Reporter),this.client.init(a,new RumSession),a.vue&&this.setVue(a.vue),this}/**
   * set config
   */,c.setConfig=function(){var a=this.client.getContext();if(2===arguments.length){var b,c=this.client.getContext(),d=c.getConfig();c.setConfig(_extends({},d,(b={},b[0>=arguments.length?void 0:arguments[0]]=1>=arguments.length?void 0:arguments[1],b)))}else a.setConfig(0>=arguments.length?void 0:arguments[0])},c.setVue=function(a){this.setConfig("vue",a),mixin(a)},b}(Shell);export default new ArmsRum;
