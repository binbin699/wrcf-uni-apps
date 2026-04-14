import CoreBluetooth
import DCloudUTSFoundation
class BluetoothController: NSObject {
    var centralManager: CBCentralManager!
    var connectedPeripheral: CBPeripheral?
    static var shared = BluetoothController();
    var state_callback: ((_ data:Bool) -> Void)?;
	var ssicallback: (( _ rssi: String) -> Void)?;
	
    var scancallback: (( _ data:CBPeripheral, _ rssi: Int,_ advertisementData: String,_ madta:String,_ localname:String) -> Void)?;
	var connectCallback:(( _ state:Bool,_ data:CBPeripheral) -> Void)?;
	var  scanServiceCallbak:((_ peripheral: CBPeripheral, _ service: CBService, _ serviceSize:Int) -> Void)?;
	var notityCallback:((_ state:Int,_ data:String,_ uuid:String,_ mac:String) -> Void)?;
	var discoveredPeripherals: [UUID: CBPeripheral] = [:]

	var serviceSize=0;
	var showEmptyName:Bool=true;
	var haveSetMtu:Bool=false;
	var isDebug:Bool=false;
	
	
func setDebug( _ b:Bool){
	isDebug=b;
}
	
	
	func  setHaveSetMtu(_ b:Bool){
		haveSetMtu=b;
		
	}
	
	var filterBtName="";
	var filterNames : [String] = [];
	var scanUUIDsFiter : [CBUUID] = [];
	func setFilterBtName(_ b:String){
		filterBtName=b;
	}
	
	
	func setfiltersNames(_ c:[String]){
		filterNames=c;
	}
	
	func setScanUUIDsFiters(_ c:[CBUUID]){
	// console.log("setScanUUIDsFiters",c.length)
		scanUUIDsFiter=c;
		
	}
	func setShowEmptyName(_ b:Bool){
		showEmptyName=b;
	}
	
	
	
    override init() {
        super.init()
    }
    
    func toGBKHex(_ text:String)->String{
    	if let hexUTF8 = text.toGBKHex() {
    		return hexUTF8;
    	}
    	return ""
    }
    
    func utf8toHexString(_ text:String)->String{
    	if let hexUTF8 = text.utf8toHexString() {
    		return hexUTF8;
    	}
    	return ""
    }
    
    func gbkHexToString(_ text:String)->String{
    	if let hexUTF8 = text.gbkHexToString() {
    		return hexUTF8;
    	}
    	return ""
    }
    func utf8hexToString(_ text:String)->String{
    	if let hexUTF8 = text.utf8hexToString() {
    		return hexUTF8;
    	}
    	return ""
    }
    func  btInit(_ callback: @escaping ( _ data:Bool) -> Void){
        
        state_callback=callback
        centralManager = CBCentralManager(delegate: self, queue: DispatchQueue.global(qos: .utility))

    }
    
    
    // 启动扫描
    func startScan(_ callback: @escaping ( _ data:CBPeripheral, _ rssi: Int,_ advertisementData: String,_ maData:String,_ localname:String ) -> Void) {
        let options: [String: Any] = [
            CBCentralManagerScanOptionAllowDuplicatesKey: true, // 禁止重复扫描
            // CBCentralManagerScanOptionSolicitedServiceUUIDsKey: [CBUUID(string: "")] // 指定服务UUID
        ]
        self.scancallback=callback;
		if(self.isDebug){
			console.log("开始蓝牙扫描 步骤2 ")
		}
		console.log(scanUUIDsFiter,scanUUIDsFiter.length)
		if(scanUUIDsFiter.length==0){
			centralManager.scanForPeripherals(withServices: nil, options: options)
		}else{
			centralManager.scanForPeripherals(withServices: scanUUIDsFiter, options: options)
		}
		
        
    }
    
    
    func  getCBPeripheral( _ mac:String )->CBPeripheral{
            
            let uuid = UUID(uuidString: mac);
            let knownPeripherals = centralManager.retrievePeripherals(withIdentifiers: [uuid!])
          return knownPeripherals[0];
        }
		
		
	
	
	/// 1. 获取连接到特定服务的设备
	func retrievePeripherals(_ serviceUUIDs:[UUID]) -> [CBPeripheral] {
	    // 必须指定服务UUID
		if let c=centralManager?.retrievePeripherals(withIdentifiers : serviceUUIDs){
			return c;
		}else{
			var emptyArray1: [CBPeripheral] = []
	
			return	emptyArray1
		}
	}
    
    /// 1. 获取连接到特定服务的设备
    func getConnectedDevicesWithServices(_ serviceUUIDs:[CBUUID]) -> [CBPeripheral] {
        // 必须指定服务UUID
		if let c=centralManager?.retrieveConnectedPeripherals(withServices: serviceUUIDs){
			return c;
		}else{
			var emptyArray1: [CBPeripheral] = []

			return	emptyArray1
		}
    }
	
	
	
    
	
	func  getCBUUID(_ s:String)->CBUUID{
		
		return CBUUID(string: s);
	}
	func  getUUID(_ s:String)->UUID{
		
		return UUID(uuidString: s)!;
	}
	
	
    
    func stopScan(){
		centralManager?.stopScan() // 找到目标设备后停止扫描
    }
	
	

    // 发现设备回调
    func centralManager(_ central: CBCentralManager,
                       didDiscover peripheral: CBPeripheral,
                       advertisementData: [String : Any],
                       rssi RSSI: NSNumber) {
		
		if(self.isDebug){
			console.log("swift 发现设备回掉 步骤1 showEmptyName=",showEmptyName)
		}
		if(showEmptyName){
		
			if let n=peripheral.name {
				// console.log("------",peripheral.name);
				if filterBtName.count == 0 {
				    print("字符串为空")
				} else {
				    // print("字符串长度: \(str.count)")
					if(!n.contains(filterBtName)){
						return;
					}
				}
				if(filterNames.length>0){
					var exist=false;
					// console.log(filterNames)
					
					for ff in filterNames {
					   if(n.contains(ff)){
					   	exist=true;
					   }
					}
					if(!exist){
						return;
					}
				}
				
				
				
			}else{
				return;
			}
		}
			
		discoveredPeripherals[peripheral.identifier] = peripheral
		
		let hexDataStrings = parseAndConcatenateAdvertisementData(advertisementData)
		if(self.isDebug){
			console.log("swift 发现设备回掉 步骤2 ")
		}
		// console.log(peripheral.name,hexDataStrings)
		var b="";
		if let manufacturerData = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data {
			b=manufacturerData.toHexString(withSpaces:true)
		}
		var locname="";
		if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String {
		       locname=localName;
		}
		
		if(self.isDebug){
			console.log("swift 发现设备回掉 步骤3 ")
		}					   
        self.scancallback?(peripheral,RSSI.intValue,hexDataStrings,b,locname);
		if(self.isDebug){
			console.log("swift 发现设备回掉 步骤4 ")
		}	
    }
	
	    private func parseAndConcatenateAdvertisementData(_ advertisementData: [String: Any]) -> String {
	        var result = ""
	        
	        // 处理Flags (通常第一个)
	        if let isConnectable = advertisementData[CBAdvertisementDataIsConnectable] as? NSNumber {
	            let flagsValue: UInt8 = isConnectable.boolValue ? 0x06 : 0x04 // 一般LE通用发现模式
	            let flagsData = Data([flagsValue])
	            result += createADStructure(length: UInt8(flagsData.count + 1), type: 0x01, data: flagsData)
	        } else {
	            // 默认Flags
	            let flagsData = Data([0x06]) // LE通用发现模式，可连接
	            result += createADStructure(length: UInt8(flagsData.count + 1), type: 0x01, data: flagsData)
	        }
	        
	        // 处理本地名称
	        if let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String,
	           let nameData = localName.data(using: .utf8) {
	            result += createADStructure(length: UInt8(nameData.count + 1), type: 0x09, data: nameData)
	        }
			
			
	        
	        // 处理服务UUID
	        if let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] {
	            for uuid in serviceUUIDs {
	                let uuidData = uuid.data
	                let type: UInt8 = uuid.data.count == 2 ? 0x03 : 0x07 // 16-bit或128-bit UUID
	                result += createADStructure(length: UInt8(uuidData.count + 1), type: type, data: uuidData)
	            }
	        }
	        
	        // 处理发射功率
	        if let txPower = advertisementData[CBAdvertisementDataTxPowerLevelKey] as? NSNumber {
	            var powerValue = Int8(truncating: txPower)
	            let powerData = Data(bytes: &powerValue, count: MemoryLayout<Int8>.size)
	            result += createADStructure(length: UInt8(powerData.count + 1), type: 0x0A, data: powerData)
	        }
	        
	        // 处理制造商数据
	        if let manufacturerData = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data {
	            result += createADStructure(length: UInt8(manufacturerData.count + 1), type: 0xFF, data: manufacturerData)
	        }
	        
	        // 处理服务数据
	        if let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] {
	            for (uuid, data) in serviceData {
	                let serviceDataWithUUID = uuid.data + data
	                let type: UInt8 = uuid.data.count == 2 ? 0x16 : 0x21 // 16-bit或128-bit UUID
	                result += createADStructure(length: UInt8(serviceDataWithUUID.count + 1), type: type, data: serviceDataWithUUID)
	            }
	        }
	        
	        return result
	    }
	    
	    // 创建AD结构 (长度 + 类型 + 数据)
	    private func createADStructure(length: UInt8, type: UInt8, data: Data) -> String {
	        // 长度字节
	        var result = ""+String(format: "%02X", length)
	        
	        // 类型字节
	        result += " " + String(format: "%02X", type)
	        
	        // 数据字节
	        result += " " + dataToHexString(data, withSpaces: true)
	        result+=" ";
	        return result
	    }
	    
	    // 将Data转换为16进制字符串
	    private func dataToHexString(_ data: Data, withSpaces: Bool = false) -> String {
	        if withSpaces {
	            return data.map { String(format: "%02X", $0) }.joined(separator: " ")
	        } else {
	            return data.map { String(format: "%02X", $0) }.joined()
	        }
	    }
	
	func swToConnect(_ peripheral: CBPeripheral,_ callback: @escaping ( _ state:Bool, _ data:CBPeripheral) -> Void){
		
		peripheral.delegate = self
		self.connectCallback=callback;
		self.connectCallback?(true, peripheral);
	}
	
	func connectDevice( _ peripheral:CBPeripheral!, _ callback: @escaping ( _ state:Bool, _ data:CBPeripheral) -> Void){
		 let connectionOptions: [String: Any] = [
		            CBConnectPeripheralOptionNotifyOnConnectionKey: true,
		            CBConnectPeripheralOptionNotifyOnDisconnectionKey: true,
		            CBConnectPeripheralOptionNotifyOnNotificationKey: true,
		            CBConnectPeripheralOptionEnableTransportBridgingKey: true,
		            CBConnectPeripheralOptionRequiresANCS: false  // 关键优化点3：禁用ANCS
		        ]

		
		centralManager.connect(peripheral!, options: connectionOptions)
		self.connectCallback=callback;
	}
	
	
	
	
	func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
	  console.log("failed",error)
	}
	
	func setRssicallback(_ callback: @escaping (  _ rssi: String) -> Void){
		self.ssicallback=callback;
	}
    
    
    func centralManager(_ central: CBCentralManager,
                       didConnect peripheral: CBPeripheral) {
			
			peripheral.delegate = self
			var that=self;
			 DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
			          that.connectCallback?( true, peripheral);
			}

			
					
    }
	
	
	func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
	    print("设备已断开连接")
		self.connectCallback?(false,peripheral);
		
	}
	
	
	
	 // MARK: - 读取信号强度 (RSSI)
	    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
	        if let error = error {
	            print("读取RSSI失败: \(error.localizedDescription)")
	            return
	        }
	        
	        // 信号强度值 (单位：dBm)
			self.ssicallback?("\(RSSI.intValue)");
	        print("当前信号强度: \(RSSI.intValue) dBm")
	    }
	    
	
	func scanServices(_ p:CBPeripheral , _ callback: @escaping (_ peripheral: CBPeripheral, _ service: CBService , _ serviceSize:Int) -> Void){
		
		self.scanServiceCallbak=callback;
		p.discoverServices(nil) // 传入 nil 以发现所有服务
		
	}

    func peripheral(_ peripheral: CBPeripheral,
                   didUpdateValueFor characteristic: CBCharacteristic,
                   error: Error?) {
      var u =  characteristic.uuid.uuidString;
        guard let data = characteristic.value else { return }
        self.notityCallback?(3,data.toHexString(withSpaces:true),u,peripheral.identifier.uuidString);
      
    }
	func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
		  if let error = error {
					self.notityCallback?(1,"","","");
		             return
		         }
		         if characteristic.isNotifying {
		            self.notityCallback?(2,"","","");
		         } else {
		           self.notityCallback?(2,"","","");
		         }
		 
	}
    
    // Data -> Hex String
    func dataToHex(_ data: Data) -> String {
        return data.map { String(format: "%02hhx", $0) }.joined()
    }
	
	func dataToHexWithSpaces ( _ data : Data ) -> String { return data . map { String ( format : "%02x" , $0 ) } . joined ( separator : " " ) }
	func dataToInt32Array(_ data: Data) -> [Int32] {
	    var intArray = [Int32]()
	    for offset in stride(from: 0, to: data.count, by: 4) {
	        let value = data.subdata(in: offset..<offset+4).withUnsafeBytes {
	            $0.load(as: Int32.self)
	        }
	        intArray.append(value)
	    }
	    return intArray
	}
	

    // Hex String -> Data
    func hexToData(_ hex: String) -> Data {
     
		var	data=hex.hexToData()!;
		            
		
        return data
    }
	
	
	func isBluetoothEnabled()->Bool {
	    return centralManager.state == .poweredOn
	}
	func  disconnect( _ peripheral:CBPeripheral){
			// 假设已持有连接的 peripheral 实例和 centralManager 实例
	        if(peripheral.state == .connected){
	            centralManager.cancelPeripheralConnection(peripheral)
	        }
			
	     
	}
	
    
    func sendCommand(_ command: String) {
//        guard let characteristic = targetCharacteristic,
//              let data = command.data(using: .utf8) else { return }
//        connectedPeripheral?.writeValue(data, for: characteristic, type: .withResponse)
    }
	
	func intArrayToDataFast(_ array: [Int32]) -> Data {
	    return array.withUnsafeBytes { buffer in
	        Data(buffer)
	    }
	}
	
	
	 static func checkCentralPermission(_ completion: @escaping (_ b:Int) -> Void) {
	        if #available(iOS 13.1, *) {
	            // iOS 13.1+ 直接获取授权状态
	            let status = CBCentralManager.authorization
				
				switch status {
				        case .allowedAlways:
				            print("已授权")
							completion(0)
				        case .denied, .restricted:
				            print("被拒绝或受限")
				            // 跳转到设置
				           completion(1)
				        case .notDetermined:
						completion(2)
						 @unknown default:
						 break
				}
				
				// if(status== .allowedAlways){
				// 	completion(0);
				// }else if(status== .denied||status==.restricted){
				// 	completion(1);
				// }else if(status==.notDetermined){
				// 	completion(2);
				// }
				// .denied, .restricted:
				
	        } else if #available(iOS 13.0, *) {
	            // iOS 13.0 需要创建实例来获取状态
	            let manager = CBCentralManager(delegate: nil, queue: nil)
	            // 注意：iOS 13.0 需要通过代理回调获取状态
	            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
	                // 这里实际上需要等待 state 变化，更好的做法是使用代理
	                completion(0) // iOS 13.0 的简化处理
	            }
	        } else {
	            // iOS 13 之前，蓝牙不需要明确授权（只需要 info.plist 声明）
	             completion(0)
	        }
	    }
	
}

extension String {
    func hexToData() -> Data? {
        var hex = self.replacingOccurrences(of: "[^0-9a-fA-F]", with: "", options: .regularExpression)
        guard hex.count.isMultiple(of: 2) else { return nil } // 长度校验
        
        var data = Data()
        var index = hex.startIndex
        while index < hex.endIndex {
            let endIndex = hex.index(index, offsetBy: 2)
            let byteStr = hex[index..<endIndex]
            if let num = UInt8(byteStr, radix: 16) {
                data.append(num)
            } else {
                return nil // 非法字符拦截
            }
            index = endIndex
        }
        return data
    }
}

// 代理方法实现蓝牙状态检测
extension BluetoothController: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        guard central.state == .poweredOn else {
            print("蓝牙未开启，错误状态码：\(central.state.rawValue)")
            state_callback?(false)
            return
        }
        state_callback?(true)
      //  startScan()
    }
}


extension BluetoothController: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral,
                   didDiscoverServices error: Error?) {
       guard let services = peripheral.services else { return }
			self.serviceSize=services.count;
           for service in services {
               peripheral.discoverCharacteristics(nil, for: service) // 发现服务的所有特征
           }
    }
    
    func peripheral(_ peripheral: CBPeripheral,
                   didDiscoverCharacteristicsFor service: CBService,
                   error: Error?) {
		
					   
		self.scanServiceCallbak?(peripheral,service,self.serviceSize);
				   
  //       guard let characteristics = service.characteristics else { return }
  //       for characteristic in characteristics {
		
         
  //       }
    }
	
	
    func  setNotity(_ peripheral: CBPeripheral,_ characteristi:CBCharacteristic, _ state:Bool,_ callback: @escaping (_ s:Int, _ data:String,_ uuid:String,_ mac:String) -> Void ){
		peripheral.setNotifyValue(state, for: characteristi);
		self.notityCallback=callback;
	}
	
	
	
	
	
	
	
	
	func sendLargeData( _ peripheral: CBPeripheral,_ characteristic:CBCharacteristic, _ hexString: String,_ callback: @escaping ( _ data:Bool) -> Void) {
	   // console.log("xxxxxxxxxxxx")
		guard let data = hexString.hexDataStrict() else { 
			callback(false);
			return
			 
	}
		
		// console.log("xxaaaa")
	    let chunkSize = 20 // BLE默认MTU
	    
		var  have=false;
		
		if peripheral.state != .connected {
		   callback(false)
		    return
		}
		
		if characteristic.properties.contains(.write) {

			have=true;
		} else if characteristic.properties.contains(.writeWithoutResponse) {
		}
		if(!haveSetMtu){
			// console.log("分包发送")
			for i in stride(from: 0, to: data.count, by: chunkSize) {
			    let end = min(i+chunkSize, data.count)
			    let chunk = data.subdata(in: i..<end)
				if(have){
					peripheral.writeValue(chunk, for: characteristic, type: .withResponse)
				}else{
					peripheral.writeValue(chunk, for: characteristic, type: .withoutResponse)
				}
				
			}
		}else{
			// console.log("没有分包")
			if(have){
				peripheral.writeValue(data, for: characteristic, type: .withResponse)
			}else{
				peripheral.writeValue(data, for: characteristic, type: .withoutResponse)
			}
		
		}
	   
		callback(true);
	}
	
	
	func sendLargeDatas( _ peripheral: CBPeripheral,_ characteristic:CBCharacteristic, _ hexString: String,_ writeType:Int,  _ callback: @escaping ( _ data:Bool) -> Void) {
	    guard let data = hexString.hexDataStrict() else { return }
	    let chunkSize = 20 // BLE默认MTU
	    
		var  have=false;
		
		if peripheral.state != .connected {
		   callback(false)
		    return
		}
		if(!haveSetMtu){
			// console.log("分包发送")
			for i in stride(from: 0, to: data.count, by: chunkSize) {
			    let end = min(i+chunkSize, data.count)
			    let chunk = data.subdata(in: i..<end)
				if(writeType==0){
					peripheral.writeValue(chunk, for: characteristic, type: .withResponse)
				}else{
					peripheral.writeValue(chunk, for: characteristic, type: .withoutResponse)
				}
			}
		}else{
			if(writeType==0){
				peripheral.writeValue(data, for: characteristic, type: .withResponse)
			}else{
				peripheral.writeValue(data, for: characteristic, type: .withoutResponse)
			}
		}
	    
		callback(true);
	}
	
	
	
	func peripheral(_ peripheral: CBPeripheral, 
	                   didWriteValueFor characteristic: CBCharacteristic,
	                   error: Error?) {
			 if let error = error {
				 console.log("写入失败",error)
				 
			 }else{
				// console.log("写入成功")
				 
			 }			   
						   
	}
	
	
	func  getDataMtu(_ peripheral: CBPeripheral,_ type:Int)->Int{
		if(type==0){
			let maxWriteWithoutResponse = peripheral.maximumWriteValueLength(for: .withoutResponse)
			return maxWriteWithoutResponse;
		}else {
			let maxWriteWithResponse = peripheral.maximumWriteValueLength(for: .withResponse)
			return maxWriteWithResponse;
		}
	}
	
	static func getState( _ type:Int, _  properties:CBCharacteristicProperties)->Bool{
		if(type==0){
			if properties . contains ( .read ) { 
				return true;
			}else{
				return false;
			}
			
		}else if(type==1){
			if properties . contains ( .write ) { 
				return true;
			}else{
				return false;
			}
			
		}else if(type==2){
			if properties . contains ( .notify ) { 
				return true;
			}else{
				return false;
			}
			
		}else if(type==3){
			if properties . contains ( .indicate ) { 
				return true;
			}else{
				return false;
			}
			
		}else if(type==4){
			if properties . contains ( .writeWithoutResponse ) { 
				return true;
			}else{
				return false;
			}
			
		}
		
		return false;
	}
}

extension Data {
    /// 将Data转换为带空格的十六进制字符串
    func toHexString(withSpaces: Bool = true) -> String {
        let hexArray = self.map { String(format: "%02X", $0) }
        return hexArray.joined(separator: withSpaces ? " " : "")
    }
}

extension String {
    func hexDataStrict() -> Data? {
		
        guard count % 2 == 0 else { return nil } // 验证偶数长度
        var data = Data()
        var index = startIndex
        
        while index < endIndex {
            let byteRange = index..<self.index(index, offsetBy: 2)
            let byteStr = String(self[byteRange])
            guard let byte = UInt8(byteStr, radix: 16) else { return nil }
            data.append(byte)
            index = self.index(index, offsetBy: 2)
        }
        return data
    }
	
	
	
	/// 十六进制字符串按 GBK 编码还原为文本
	    func gbkHexToString() -> String? {
	        // 1. 验证长度是否为偶数
	        guard count % 2 == 0 else { return nil }
	        
	        // 2. 解析十六进制字符串为字节序列
	        var data = Data()
	        var index = startIndex
	        while index < endIndex {
	            let end = self.index(index, offsetBy: 2)
	            let byteStr = self[index..<end]
	            guard let byte = UInt8(byteStr, radix: 16) else { return nil }
	            data.append(byte)
	            index = end
	        }
	        
	        // 3. 将字节序列按 GBK 解码为字符串
	        let cfEncoding = CFStringEncodings.GB_18030_2000
	        let encoding = CFStringConvertEncodingToNSStringEncoding(CFStringEncoding(cfEncoding.rawValue))
	        return String(data: data, encoding: .init(rawValue: encoding))
	    }
	
	
	/// 将文本按 GBK 编码转为十六进制字符串
	  /// - Parameters:
	  ///   - uppercase: 是否大写（默认 true）
	  func toGBKHex(uppercase: Bool = true) -> String? {
	      // 1. 获取 GBK 编码标识
	      let cfEncoding = CFStringEncodings.GB_18030_2000
	      let encoding = CFStringConvertEncodingToNSStringEncoding(CFStringEncoding(cfEncoding.rawValue))
	      
	      // 2. 将字符串转为 GBK 字节序列
	      guard let gbkData = (self as NSString).data(using: encoding) else {
	          return nil // 非 GBK 字符会失败（如 Emoji）
	      }
	      
	      // 3. 字节序列转十六进制字符串
	      let format = uppercase ? "%02X" : "%02x"
	      return gbkData.map { String(format: format, $0) }.joined()
	  }
	
	/// 十六进制字符串按指定编码转文本
	  func utf8hexToString(encoding: String.Encoding = .utf8) -> String? {
	      // 长度需为偶数
	      guard count % 2 == 0 else { return nil }
	      
	      var data = Data()
	      var index = startIndex
	      
	      // 每两位解析为一个字节
	      while index < endIndex {
	          let end = self.index(index, offsetBy: 2)
	          let byteStr = self[index..<end]
	          guard let byte = UInt8(byteStr, radix: 16) else { return nil }
	          data.append(byte)
	          index = end
	      }
	      return String(data: data, encoding: encoding)
	  }
	
	/// 将文本按指定编码转为十六进制字符串
	    /// - Parameters:
	    ///   - encoding: 字符编码（默认 UTF-8）
	    ///   - uppercase: 是否大写（默认 true）
	    func utf8toHexString(encoding: String.Encoding = .utf8, uppercase: Bool = true) -> String? {
	        // 1. 按指定编码转为字节序列
	        guard let data = self.data(using: encoding) else { return nil }
	        
	        // 2. 字节序列转十六进制字符串
	        let format = uppercase ? "%02X" : "%02x"
	        return data.map { String(format: format, $0) }.joined()
	    }
}

