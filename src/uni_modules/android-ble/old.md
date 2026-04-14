


### 开启服务消息通知(旧)
### onNotityReadBleData
参数1 通知服务uuid  

参数2 通知属性 uuid

参数3  true 开启通知读取  false 关闭通知读取

参数4 回掉结果res.type 为0 表示通知数据  1000 表示订阅成功  1001 表示 订阅失败

uniappx
~~~
lib.onNotityReadBleData(lib.getSericUUID(),
	lib.getNotityUUID(),
	true,
	function(res:MyApiResult){
		if(res.type==0){
			console.log(res)
		}
		
	}	
)
~~~
uniapp
~~~
lib.onNotityReadBleData(lib.getSericUUID(),
	lib.getNotityUUID(),
	true,
	function(res){
		if(res.type==0){
			console.log(res)
		}
		
	}	
)
~~~

### 发送数据(弃用)
### writeDataToBle
参数1 服务uuid   

参数2 写入属性uuid

参数3 16进制数组

参数4 写入回掉

uniappx
~~~
var b:number[]=[0x55,0xff,oxAA] as number[];
lib.writeDataToBle(
	lib.getSericUUID(),
	lib.getwriteUUID(),
	b,
	function(res:MyApiResult){
		console.log(res)
	}	
)	
~~~


~~~
var b:number[]=[0x55,0xff,oxAA] as number[];
lib.writeDataToBleWithType(
	lib.getSericUUID(),
	lib.getwriteUUID(),
	b,
	0,
	function(res:MyApiResult){
		console.log(res)
	}	
)	
~~~
uniapp
~~~
var b=[0x55,0xff,oxAA] ;
lib.writeDataToBle(
	lib.getSericUUID(),
	lib.getwriteUUID(),
	b,
	function(res){
		console.log(res)
	}	
)	
~~~




### 发送16进制字符数据(弃用)
### writeStringDataToBle
参数1 服务uuid

参数2 写入属性uuid

参数3  16进制字符串 

参数4 回掉写入结果

uniappx
~~~
var d="00FFAABB"
lib.writeStringDataToBle(
	lib.getSericUUID(),
	lib.getwriteUUID(),
	d,
	function(res:MyApiResult){
		console.log(res)
	}
)
~~~
uniapp
~~~~
var d="00FFAABB"
lib.writeStringDataToBle(
	lib.getSericUUID(),
	lib.getwriteUUID(),
	d,
	function(res){
		console.log(res)
	}
)
~~~~