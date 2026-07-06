// /**
//  * 保留指定位数的小数
//  * @param num 原数据
//  * @param decimal 小数位数
//  * @returns
//  */
// export function formatNumber(num: number, decimal: number = 3): number {
//   if (!num) {
//     return num;
//   }
//   let str = num.toString();
//   const index = str.indexOf('.');
//   if (index !== -1) {
//     str = str.substring(0, decimal + index + 1);
//   } else {
//     str = str.substring(0);
//   }
//   return parseFloat(str);
// }
/**
 * 获取获取当前时间 fix Data.now() 存在的缺陷
 * duration方法用于计算时间跨度，由于Date.now存在bug，可能为负数，尽可能使用performance.now计算
 * @returns
 */export function getCurrentTime(){return new Date().getTime()}export function getStringSize(a,b){if(void 0===b&&(b="utf8"),"string"!=typeof a)throw new TypeError("Input must be a string");var c=b.toLowerCase();if("utf16"===c){for(var d,e=0,f=0;f<a.length;f++){// 检查代理对（有效的高位代理后跟低位代理）
if(d=a.charCodeAt(f),55296<=d&&56319>=d&&f+1<a.length){var g=a.charCodeAt(f+1);if(56320<=g&&57343>=g){e+=4,f++;// 跳过低位代理
continue}}e+=2}return e}if("utf8"===c){for(var h,j=0,k=0;k<a.length;k++){// 处理代理对（UTF-16辅助平面）
if(h=a.charCodeAt(k),55296<=h&&56319>=h&&k+1<a.length){var l=a.charCodeAt(k+1);56320<=l&&57343>=l&&(h=1024*(h-55296)+(l-56320)+65536,k++)}// 根据码点值计算UTF-8字节长度
j+=127>=h?1:2047>=h?2:65535>=h?3:1114111>=h?4:3}return j}throw new Error("Unsupported encoding. Use \"utf8\" or \"utf16\".")}