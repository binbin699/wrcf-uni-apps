# android-ble 
# android ios 鸿蒙  微信小程序 ble 蓝牙程序
[安卓Spp经典蓝牙插件 ](https://ext.dcloud.net.cn/plugin?id=26830)
#### uniapp demo 在uniappx demo 下的zip 
### 插件测试使用方法

1.选择试用，绑定要试用的项目appid，

2.选择后下载到对应的本地项目，

3.按照文档 -》把插件引入项目（即 import {BleLib} from "@/uni_modules/android-ble" 需要先引入），

4.发布-》云打包-》选择制作基座-》打包等基座制作完成

5.运行 -》 运行到手机或模拟器-》运行到Androidapp基座-》选择使用自定义基座运行-》选择手机-》运行

6.之前若安装过基座 ，请卸载之前的基座

### uniappx
~~~
import {BleLib,MyApiResult,BleScanResult,BleServices,ScanRssiBR,WNuuid,ScanPara,NotityData} from "@/uni_modules/android-ble"	

var lib=new BleLib()
~~~
### uniapp
~~~
import {BleLib} from "@/uni_modules/android-ble"

var lib=new BleLib()
~~~


### 检测蓝牙是否开启
~~~
var open=lib.isEnabled();// true 为蓝牙开启 false 为关闭
~~~


### 监听系统蓝牙开关状态
uniappx
~~~
lib.onBtOpenStateListener(function(res:MyApiResult){
	
})
~~~
uniapp
~~~
lib.onBtOpenStateListener(function(res){
	
})
~~~

### 蓝牙扫描(新)
uniappx
~~~
// btNameFilter 为“”表示扫描所有有名字的蓝牙
lib.onStartScanBle({
	scantime:10*1000,// 扫描10秒时间
	showEmptyName:0,  //0 表示 不返回空的名称  1 表示可返回空名称蓝牙
	//btNameFilter:"A9",// showEmptyName 为0有效  代表过滤 A9 相关的名字 为空表示不过滤
	onScanResult:function(res:MyApiResult){
		// type 为0 扫描成功  10001 表示无蓝牙权限 10002 表示蓝牙未开启
	},
	//fliterNames:["A9","Mi "] as string[],  // showEmptyName 为0有效 过滤 过滤 A9  Mi 相关的蓝牙
	//iosFilterUUIDs:["6E40FC00-B5A3-F393-E0A9-E50E24DCCA9E"] as string[],// ios 端  ios26 要求通过serviceUUid 过滤扫描
	scanComplate:function(){
		//扫描结束
	}
} as ScanPara);
~~~
uniapp
~~~
// btNameFilter 为“”表示扫描所有有名字的蓝牙
lib.onStartScanBle({
	scantime:10*1000,// 扫描10秒时间
	showEmptyName:0,  //0 表示 不返回空的名称  1 表示可返回空名称蓝牙
	//btNameFilter:"A9",// showEmptyName 为0有效  代表过滤 A9 相关的名字 为空表示不过滤
	onScanResult:function(res){
		// type 为0 扫描成功  10001 表示无蓝牙权限 10002 表示蓝牙未开启
	},
	//fliterNames:["A9","Mi "],  // showEmptyName 为0有效 过滤 过滤 A9  Mi 相关的蓝牙
	//iosFilterUUIDs:["6E40FC00-B5A3-F393-E0A9-E50E24DCCA9E"] as string[],// ios 端  ios26 要求通过serviceUUid 过滤扫描
	scanComplate:function(){
		//扫描结束
	}
});
~~~

### 蓝牙扫描(旧)
### 
uniappx
~~~
lib.startScanBleDevice(15000,function(res:MyApiResult){
	// type 为0 扫描成功  10001 表示无蓝牙权限 10002 表示蓝牙未开启
	if(res.type==0){
		var scan=res.data as BleScanResult;
	}else{
		
	}
})
~~~
uniapp
~~~
lib.startScanBleDevice(15000,function(res){
	// type 为0 扫描成功  10001 表示无蓝牙权限 10002 表示蓝牙未开启
	if(res.type==0){
		var scan=res.data;
	}else
	
	}
})
~~~

###  蓝牙扫描时监听蓝牙广播信号变化 实时回掉  多次
uniappx
~~~
lib.onScanDataListener(function(res:MyApiResult){
	var data=res.data as ScanRssiBR;
	
})
~~~
uniappx
~~~
lib.onScanDataListener(function(res){
	
})
~~~
### 停止扫描蓝牙
~~~
lib.stopScanBle();
~~~


### 蓝牙是否连接
~~~
var isconnect=lib.isConnected();
~~~

### 获取已连接设备id
~~~
var device=lib.getConnectMac();// 已经连接返回mac 地址 未连接返回“”
~~~
### 打开Android蓝牙

uniappx
~~~
lib.openBtBluetooth(function(res:MyApiResult){
	
})
~~~
uniapp
~~~
lib.openBtBluetooth(function(res){
	
})
~~~
### 连接蓝牙
### connect
参数1 需要连接的mac 地址

参数2  是否开启蓝牙自动连接 true 自动连接 false 取消自动连接

参数3 连接回掉 type  0  成功  10000 蓝牙连接失败 10001 蓝牙异常断开  10002 表示蓝牙未开启  10003表示无蓝牙权限  10004 表示蓝牙已经连接 10005  鸿蒙虚拟蓝牙地址无效
	   

uniappx
~~~
lib.connect(device.device.address,false,function(res:MyApiResult){
	console.log(res)
	// type  0  成功  10000 蓝牙连接失败 10001 蓝牙异常断开  10002 表示蓝牙未开启  10003表示无蓝牙权限  10004 表示蓝牙已经连接 10005  鸿蒙虚拟蓝牙地址无效
	if(res.type==0){
		
	}else{
		
	}
})
~~~
uniapp
~~~
lib.connect(device.device.address,false,function(res){
	console.log(res)
	// type  0  成功  10000 蓝牙连接失败 10001 蓝牙异常断开  10002 表示蓝牙未开启  10003表示无蓝牙权限  10004 表示蓝牙已经连接 10005  鸿蒙虚拟蓝牙地址无效
	if(res.type==0){
		
	}else{
		
	}
})
~~~

### 设置蓝牙超时时间
~~~
lib.setBtConnectTimeout(12000);
~~~


### 设置自动连接间隔
~~~
lib.setBtAutoConnectTime(12000);
~~~
### 取消自动连接蓝牙
~~~
lib.cancelAutoConnectBt();
~~~

### 扫描蓝牙服务与特征值
### scanServices
连接蓝牙后需要获扫描蓝牙与特征值

uniappx
~~~
lib.scanServices(function(resSevice:MyApiResult){
	if(res.type==0){
		var d=res.data as BleServices[];
		
	}
});
~~~
uniapp
~~~
lib.scanServices(function(resSevice){
	
});
~~~	

### 选择可用服务 
~~~
// 切换lib.getSericUUID()等内容
lib.setSelectUUID(0);// 长度不可超过 

~~~
### 获取可用写通知服务
~~~
var uuids=lib.getUUIDs();
console.log(uuids)

~~~

### android 设置phy ble 2M 模式
~~~
lib.setPhy2MMode(); 
~~~

### 断开蓝牙
~~~
lib.close();
~~~

### 开启服务消息通知
### onNotityBleData
参数1 通知服务uuid  

参数2 通知属性 uuid

参数3  true 开启通知读取  false 关闭通知读取

参数4 回掉结果res.type 为0 表示通知数据  1000 表示订阅成功  1001 表示 订阅失败

uniappx
~~~
lib.onNotityBleData(lib.getSericUUID(),
	lib.getNotityUUID(),
	true,
	function(res:MyApiResult){
		if(res.type==0){
			var data=res.data as NotityData;
			console.log(res)
		}
		
	}	
)
~~~
uniapp
~~~
lib.onNotityBleData(lib.getSericUUID(),
	lib.getNotityUUID(),
	true,
	function(res){
		if(res.type==0){
			console.log(res)
		}
		
	}	
)
~~~




### 获取自动识别读写服务uuid
~~~
lib.getSericUUID()
~~~
### 获取自动识通知uuid
~~~
lib.getNotityUUID()
~~~
### 获取自动识写入uuid
~~~
lib.getwriteUUID()
~~~


### 发送数据

~~~
export type WriteData={
	serviceId:string,// 服务uuid
	characteristicId:string,// 写入uuid
	writeType?:number,// 写入类型 0 为WRITE  1 为WRITE_NO_RESPONSE  为空表示自动识别写入类型
	data?:number[], //  参数例子 uniappx  [0xff,0x00,0x11,0x22] as number[]   uniapp 为 [0xff,0x00,0x11,0x22]  与hexStrData 两者只有一个可以为空  
	hexStrData?:string,
	fenbao:boolean,// 表示是否分包 默认为false  若分包发送 则表示自动分拆20个字节分次发送
}
~~~
 发送16进制字符
 
uniappx
~~~
lib.sendData({
	serviceId:lib.getServiceUUID(),
	characteristicId:lib.getwriteUUID(),
	fenbao:false,
	hexStrData:"FF001122",
} as WriteData,function(res:MyApiResult){
		console.log(res);
})
~~~

uniapp
~~~
lib.sendData({
	serviceId:lib.getServiceUUID(),
	characteristicId:lib.getwriteUUID(),
	fenbao:false,
	hexStrData:"FF001122",
} ,function(res){
		console.log(res);
})
~~~

发送16数组

uniappx
~~~
lib.sendData({
	serviceId:lib.getServiceUUID(),
	characteristicId:lib.getwriteUUID(),
	fenbao:false,
	data:[0xff,0x00,0x11,0x22] as number[],
} as WriteData,function(res:MyApiResult){
		console.log(res);
})
~~~

uniapp
~~~
lib.sendData({
	serviceId:lib.getServiceUUID(),
	characteristicId:lib.getwriteUUID(),
	fenbao:false,
	data:[0xff,0x00,0x11,0x22]
} ,function(res){
		console.log(res);
})
~~~




### 设置mtu(仅安卓有效)
### setMtu
uniappx
~~~
lib.setMtu(512,function(res:MyApiResult){
	
})
~~~
uniapp
~~~
lib.setMtu(512,function(res){
	
})
~~~


### 读取rssi 信号 需要蓝牙已经连接
 uniapp
~~~
lib.readRssi(function(b){
	console.log(b)
})
~~~
uniappx
~~~
lib.readRssi(function(b:MyApiResult){
	console.log(b)
})
~~~

### 字符转16进制拼接字符
### string2ByteStrWithCharset
参数1 普通文本
 
参数2  传utf-8 gbk
~~~
lib.string2ByteStrWithCharset("测试","gbk")
~~~

### 进制拼接字符转文本
### byte2StringWithCharset
参数1 16进制拼接字符 

参数2  传utf-8 gbk
~~~
lib.string2ByteStrWithCharset("E6B58BE8AF95","utf-8")
~~~


### 判断对端蓝牙设备的虚拟MAC地址是否有效(鸿蒙)
~~~
let deviceId = '11:22:33:44:55:66'  // 该地址可通过BLE扫描获取
var b= lib.isValidRandomDeviceId(deviceId);
console.log(b)
~~~
### 申请鸿蒙蓝牙权限
uniappx
~~~
lib.reqBtPer(function(b:boolean){
})
~~~
uniapp
~~~
lib.reqBtPer(function(b){
})
~~~
### 安卓检测是否有权限
蓝牙需要下方三个权限
~~~
android.permission.ACCESS_FINE_LOCATION
android.permission.BLUETOOTH_CONNECT
android.permission.BLUETOOTH_SCAN
~~~

~~~
lib.isHavePermision("android.permission.ACCESS_FINE_LOCATION")
~~~
### 安卓申请
uniapp
~~~
//申请单个
requestPermison("android.permission.ACCESS_FINE_LOCATION",function(res){

})
//申请多个
requesMoretPermison(["android.permission.ACCESS_FINE_LOCATION"],function(res){

})
~~~
uniappx
~~~
//申请单个
requestPermison("android.permission.ACCESS_FINE_LOCATION",function(res:boolean){

})
//申请多个
requesMoretPermison(["android.permission.ACCESS_FINE_LOCATION"],function(res:boolean){

})
~~~


### 注意 
若连接上蓝牙 发现无法通信 可以在 扫描服务后lib.setSelectUUID(0) 切换插件的通知和写的uuid

uniappx
~~~
lib.scanServices(function(resSevice:MyApiResult){
	if(res.type==0){
		var d=res.data as BleServices[];
		lib.setSelectUUID(0)
	}
});
~~~
uniapp
~~~
lib.scanServices(function(resSevice){
	lib.setSelectUUID(0)
});
~~~	
 ### 打赏
感谢您使用此插件，如果你觉得本插件，解决了你的问题，赠人玫瑰，手留余香。





