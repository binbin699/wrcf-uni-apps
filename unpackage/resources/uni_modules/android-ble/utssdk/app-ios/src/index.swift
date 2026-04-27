import AuthenticationServices
import CoreBluetooth
import DCloudUTSFoundation
import Foundation
import Swift
@objc(UTSSDKModulesAndroidBleWNuuid)
@objcMembers
public class WNuuid : NSObject, UTSObject {
    public var serviceId: String!
    public var wuuid: String!
    public var nuuid: String!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "serviceId":
                    self.serviceId = try! utsSubscriptCheckValue(newValue)
                case "wuuid":
                    self.wuuid = try! utsSubscriptCheckValue(newValue)
                case "nuuid":
                    self.nuuid = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.serviceId = obj["serviceId"] as! String
        self.wuuid = obj["wuuid"] as! String
        self.nuuid = obj["nuuid"] as! String
    }
}
@objc(UTSSDKModulesAndroidBleScanPara)
@objcMembers
public class ScanPara : NSObject, UTSObject {
    public var btNameFilter: String?
    public var fliterNames: [String]?
    public var scantime: NSNumber?
    public var showEmptyName: NSNumber?
    public var iosFilterUUIDs: [String]?
    public var onScanResult: ((_ b: MyApiResult) -> Void)?
    public var scanComplate: (() -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "btNameFilter":
                    self.btNameFilter = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fliterNames":
                    self.fliterNames = try! utsSubscriptCheckValueIfPresent(newValue)
                case "scantime":
                    self.scantime = try! utsSubscriptCheckValueIfPresent(newValue)
                case "showEmptyName":
                    self.showEmptyName = try! utsSubscriptCheckValueIfPresent(newValue)
                case "iosFilterUUIDs":
                    self.iosFilterUUIDs = try! utsSubscriptCheckValueIfPresent(newValue)
                case "onScanResult":
                    self.onScanResult = try! utsSubscriptCheckValueIfPresent(newValue)
                case "scanComplate":
                    self.scanComplate = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.btNameFilter = obj["btNameFilter"] as! String?
        self.fliterNames = obj["fliterNames"] as! [String]?
        self.scantime = obj["scantime"] as! NSNumber?
        self.showEmptyName = obj["showEmptyName"] as! NSNumber?
        self.iosFilterUUIDs = obj["iosFilterUUIDs"] as! [String]?
        self.onScanResult = obj["onScanResult"] as! ((_ b: MyApiResult) -> Void)?
        self.scanComplate = obj["scanComplate"] as! (() -> Void)?
    }
}
@objc(UTSSDKModulesAndroidBleWriteData)
@objcMembers
public class WriteData : NSObject, UTSObject {
    public var serviceId: String!
    public var characteristicId: String!
    public var writeType: NSNumber?
    public var data: [NSNumber]?
    public var hexStrData: String?
    public var fenbao: Bool = false
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "serviceId":
                    self.serviceId = try! utsSubscriptCheckValue(newValue)
                case "characteristicId":
                    self.characteristicId = try! utsSubscriptCheckValue(newValue)
                case "writeType":
                    self.writeType = try! utsSubscriptCheckValueIfPresent(newValue)
                case "data":
                    self.data = try! utsSubscriptCheckValueIfPresent(newValue)
                case "hexStrData":
                    self.hexStrData = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fenbao":
                    self.fenbao = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.serviceId = obj["serviceId"] as! String
        self.characteristicId = obj["characteristicId"] as! String
        self.writeType = obj["writeType"] as! NSNumber?
        self.data = obj["data"] as! [NSNumber]?
        self.hexStrData = obj["hexStrData"] as! String?
        self.fenbao = obj["fenbao"] as! Bool
    }
}
@objc(UTSSDKModulesAndroidBleScanRecord)
@objcMembers
public class ScanRecord : NSObject, UTSObject {
    public var deviceName: String?
    public var txPowerLevel: NSNumber?
    public var bytes: String?
    public var serviceData: String?
    public var serviceUuids: String?
    public var advertiseFlags: NSNumber?
    public var manufacturerSpecificData: String?
    public var serviceSolicitationUuids: String?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "deviceName":
                    self.deviceName = try! utsSubscriptCheckValueIfPresent(newValue)
                case "txPowerLevel":
                    self.txPowerLevel = try! utsSubscriptCheckValueIfPresent(newValue)
                case "bytes":
                    self.bytes = try! utsSubscriptCheckValueIfPresent(newValue)
                case "serviceData":
                    self.serviceData = try! utsSubscriptCheckValueIfPresent(newValue)
                case "serviceUuids":
                    self.serviceUuids = try! utsSubscriptCheckValueIfPresent(newValue)
                case "advertiseFlags":
                    self.advertiseFlags = try! utsSubscriptCheckValueIfPresent(newValue)
                case "manufacturerSpecificData":
                    self.manufacturerSpecificData = try! utsSubscriptCheckValueIfPresent(newValue)
                case "serviceSolicitationUuids":
                    self.serviceSolicitationUuids = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.deviceName = obj["deviceName"] as! String?
        self.txPowerLevel = obj["txPowerLevel"] as! NSNumber?
        self.bytes = obj["bytes"] as! String?
        self.serviceData = obj["serviceData"] as! String?
        self.serviceUuids = obj["serviceUuids"] as! String?
        self.advertiseFlags = obj["advertiseFlags"] as! NSNumber?
        self.manufacturerSpecificData = obj["manufacturerSpecificData"] as! String?
        self.serviceSolicitationUuids = obj["serviceSolicitationUuids"] as! String?
    }
}
@objc(UTSSDKModulesAndroidBleDevice)
@objcMembers
public class Device : NSObject, UTSObject {
    public var name: String?
    public var iosLocalName: String?
    public var alias: String?
    public var bondState: NSNumber?
    public var type: NSNumber?
    public var address: String!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "name":
                    self.name = try! utsSubscriptCheckValueIfPresent(newValue)
                case "iosLocalName":
                    self.iosLocalName = try! utsSubscriptCheckValueIfPresent(newValue)
                case "alias":
                    self.alias = try! utsSubscriptCheckValueIfPresent(newValue)
                case "bondState":
                    self.bondState = try! utsSubscriptCheckValueIfPresent(newValue)
                case "type":
                    self.type = try! utsSubscriptCheckValueIfPresent(newValue)
                case "address":
                    self.address = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.name = obj["name"] as! String?
        self.iosLocalName = obj["iosLocalName"] as! String?
        self.alias = obj["alias"] as! String?
        self.bondState = obj["bondState"] as! NSNumber?
        self.type = obj["type"] as! NSNumber?
        self.address = obj["address"] as! String
    }
}
@objc(UTSSDKModulesAndroidBleBleScanResult)
@objcMembers
public class BleScanResult : NSObject, UTSObject {
    public var connectType: NSNumber?
    public var rssi: NSNumber?
    public var isLegacy: Bool = false
    public var advertisingSid: NSNumber?
    public var dataStatus: NSNumber?
    public var isConnectable: Bool = false
    public var periodicAdvertisingInterval: NSNumber?
    public var primaryPhy: NSNumber?
    public var secondaryPhy: NSNumber?
    public var timestampNanos: NSNumber?
    public var scanRecord: ScanRecord?
    public var device: Device!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "connectType":
                    self.connectType = try! utsSubscriptCheckValueIfPresent(newValue)
                case "rssi":
                    self.rssi = try! utsSubscriptCheckValueIfPresent(newValue)
                case "isLegacy":
                    self.isLegacy = try! utsSubscriptCheckValue(newValue)
                case "advertisingSid":
                    self.advertisingSid = try! utsSubscriptCheckValueIfPresent(newValue)
                case "dataStatus":
                    self.dataStatus = try! utsSubscriptCheckValueIfPresent(newValue)
                case "isConnectable":
                    self.isConnectable = try! utsSubscriptCheckValue(newValue)
                case "periodicAdvertisingInterval":
                    self.periodicAdvertisingInterval = try! utsSubscriptCheckValueIfPresent(newValue)
                case "primaryPhy":
                    self.primaryPhy = try! utsSubscriptCheckValueIfPresent(newValue)
                case "secondaryPhy":
                    self.secondaryPhy = try! utsSubscriptCheckValueIfPresent(newValue)
                case "timestampNanos":
                    self.timestampNanos = try! utsSubscriptCheckValueIfPresent(newValue)
                case "scanRecord":
                    self.scanRecord = try! utsSubscriptCheckValueIfPresent(newValue)
                case "device":
                    self.device = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.connectType = obj["connectType"] as! NSNumber?
        self.rssi = obj["rssi"] as! NSNumber?
        self.isLegacy = (obj["isLegacy"] as? Bool) ?? false
        self.advertisingSid = obj["advertisingSid"] as! NSNumber?
        self.dataStatus = obj["dataStatus"] as! NSNumber?
        self.isConnectable = (obj["isConnectable"] as? Bool) ?? false
        self.periodicAdvertisingInterval = obj["periodicAdvertisingInterval"] as! NSNumber?
        self.primaryPhy = obj["primaryPhy"] as! NSNumber?
        self.secondaryPhy = obj["secondaryPhy"] as! NSNumber?
        self.timestampNanos = obj["timestampNanos"] as! NSNumber?
        self.scanRecord = obj["scanRecord"] as! ScanRecord?
        self.device = obj["device"] as! Device
    }
}
@objc(UTSSDKModulesAndroidBleMyApiResult)
@objcMembers
public class MyApiResult : NSObject, UTSObject {
    public var type: NSNumber!
    public var message: String!
    public var data: Any!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "type":
                    self.type = try! utsSubscriptCheckValue(newValue)
                case "message":
                    self.message = try! utsSubscriptCheckValue(newValue)
                case "data":
                    self.data = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.type = obj["type"] as! NSNumber
        self.message = obj["message"] as! String
        self.data = obj["data"] as! Any
    }
}
@objc(UTSSDKModulesAndroidBleScanRssiBR)
@objcMembers
public class ScanRssiBR : NSObject, UTSObject {
    public var mac: String!
    public var rssi: NSNumber!
    public var data: String!
    public var iosLocalName: String?
    public var name: String?
    public var manufacturerData: String?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "mac":
                    self.mac = try! utsSubscriptCheckValue(newValue)
                case "rssi":
                    self.rssi = try! utsSubscriptCheckValue(newValue)
                case "data":
                    self.data = try! utsSubscriptCheckValue(newValue)
                case "iosLocalName":
                    self.iosLocalName = try! utsSubscriptCheckValueIfPresent(newValue)
                case "name":
                    self.name = try! utsSubscriptCheckValueIfPresent(newValue)
                case "manufacturerData":
                    self.manufacturerData = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.mac = obj["mac"] as! String
        self.rssi = obj["rssi"] as! NSNumber
        self.data = obj["data"] as! String
        self.iosLocalName = obj["iosLocalName"] as! String?
        self.name = obj["name"] as! String?
        self.manufacturerData = obj["manufacturerData"] as! String?
    }
}
@objc(UTSSDKModulesAndroidBleBleServices)
@objcMembers
public class BleServices : NSObject, UTSObject {
    public var type: NSNumber!
    public var uuid: String!
    public var characteristics: [Characteristics]!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "type":
                    self.type = try! utsSubscriptCheckValue(newValue)
                case "uuid":
                    self.uuid = try! utsSubscriptCheckValue(newValue)
                case "characteristics":
                    self.characteristics = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.type = obj["type"] as! NSNumber
        self.uuid = obj["uuid"] as! String
        self.characteristics = obj["characteristics"] as! [Characteristics]
    }
}
@objc(UTSSDKModulesAndroidBleCharacteristics)
@objcMembers
public class Characteristics : NSObject, UTSObject {
    public var properties: CharacteristicsProperties!
    public var uuid: String!
    public var propertiesType: NSNumber!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "properties":
                    self.properties = try! utsSubscriptCheckValue(newValue)
                case "uuid":
                    self.uuid = try! utsSubscriptCheckValue(newValue)
                case "propertiesType":
                    self.propertiesType = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.properties = obj["properties"] as! CharacteristicsProperties
        self.uuid = obj["uuid"] as! String
        self.propertiesType = obj["propertiesType"] as! NSNumber
    }
}
@objc(UTSSDKModulesAndroidBleCharacteristicsProperties)
@objcMembers
public class CharacteristicsProperties : NSObject, UTSObject {
    public var READ: Bool = false
    public var WRITE: Bool = false
    public var NOTIFY: Bool = false
    public var INDICATE: Bool = false
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "READ":
                    self.READ = try! utsSubscriptCheckValue(newValue)
                case "WRITE":
                    self.WRITE = try! utsSubscriptCheckValue(newValue)
                case "NOTIFY":
                    self.NOTIFY = try! utsSubscriptCheckValue(newValue)
                case "INDICATE":
                    self.INDICATE = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.READ = obj["READ"] as! Bool
        self.WRITE = obj["WRITE"] as! Bool
        self.NOTIFY = obj["NOTIFY"] as! Bool
        self.INDICATE = obj["INDICATE"] as! Bool
    }
}
@objc(UTSSDKModulesAndroidBleNotityData)
@objcMembers
public class NotityData : NSObject, UTSObject {
    public var data: [NSNumber]!
    public var mac: String?
    public var serviceId: String?
    public var characteristicsId: String?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "data":
                    self.data = try! utsSubscriptCheckValue(newValue)
                case "mac":
                    self.mac = try! utsSubscriptCheckValueIfPresent(newValue)
                case "serviceId":
                    self.serviceId = try! utsSubscriptCheckValueIfPresent(newValue)
                case "characteristicsId":
                    self.characteristicsId = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.data = obj["data"] as! [NSNumber]
        self.mac = obj["mac"] as! String?
        self.serviceId = obj["serviceId"] as! String?
        self.characteristicsId = obj["characteristicsId"] as! String?
    }
}
public func bleResult(_ type1: NSNumber, _ message1: String, _ data1: Any) -> MyApiResult {
    return MyApiResult(UTSJSONObject([
        "type": type1,
        "message": message1,
        "data": data1
    ]))
}
public var scanMap = Map<String, CBPeripheral>()
public var scanId: NSNumber = 0
public var iosscanMap = Map<String, CBPeripheral>()
public var sLibMap: Map<String, BleLib> = Map<String, BleLib>()
public var cbServiceMap = Map<String, CBService>()
public var cBCharacteristicMap = Map<String, CBCharacteristic>()
@objc(UTSSDKModulesAndroidBleBleLib)
@objcMembers
public class BleLib : NSObject {
    public var defaultService: String = ""
    public var defaultNotity: String = ""
    public var defaultWrite: String = ""
    public var curdataCBPeripheral: CBPeripheral? = nil
    public var connectInternal: NSNumber = 0
    public var connectCallback: ((_ sth: MyApiResult) -> Void) = {
    (_ res) -> Void in
    }
    public var beginToConnectMac: String? = nil
    public var appbtconnect: Bool = false
    public var btOpenStateCallback: ((_ sth: MyApiResult) -> Void) = {
    (_ res) -> Void in
    }
    public var connectTimeout: NSNumber = 0
    public var scanListenerMac: String? = nil
    public var connectPb: Map<String, CBPeripheral> = Map<String, CBPeripheral>()
    public var scanDataListenerCallback: ((_ sth: MyApiResult) -> Void) = {
    (_ res) -> Void in
    }
    public var wNList: [String] = [] as! [String]
    public var isConnecting: Bool = false
    public var threadName: String = "io"
    public var haveSetMtu: Bool = false
    public var connect_time_out: NSNumber = 15000
    public var de: Bool = false
    override public init(){
        super.init()
        scanMap.clear()
        self.btListener()
    }
    public func setBtConnectTimeout(_ time: NSNumber) {
        self.connect_time_out = time
    }
    public var auto_connect_time: NSNumber = 12000
    public func setBtAutoConnectTime(_ time: NSNumber) {
        self.auto_connect_time = time
    }
    public func setDebugMode(_ debug: Bool) {
        self.de = debug
        BluetoothController.shared.setDebug(debug)
    }
    public func setThreadTypeName(_ name: String) {
        self.threadName = name
    }
    public func onScanDataListener(_ callback: @escaping (_ res: MyApiResult) -> Void) {
        self.scanDataListenerCallback = callback
    }
    public func onBtOpenStateListener(_ callback: @escaping (_ sth: MyApiResult) -> Void) {
        self.btOpenStateCallback = callback
        callback(bleResult(0, "", BluetoothController.shared.isBluetoothEnabled()))
    }
    public func btListener() {
        var that = self
        BluetoothController.shared.btInit({
        (_ res: Bool) -> Void in
        if (that.appbtconnect) {
            that.appbtconnect = that.isConnected()
            that.connectCallback(bleResult(10001, "bt close", ""))
        }
        that.btOpenStateCallback(bleResult(0, "bt state change", res))
        })
    }
    public func openBtBluetooth(_ callback: @escaping (_ b: MyApiResult) -> Void) {}
    public func openBluetooth(_ on: Bool) -> Void {}
    public func openBluetoothSettings() -> Void {}
    public func getSericUUID() -> String {
        return self.defaultService
    }
    public func getNotityUUID() -> String {
        return self.defaultNotity
    }
    public func getwriteUUID() -> String {
        return self.defaultWrite
    }
    public func getServiceUUID() -> String {
        return self.defaultService
    }
    public func isHavePermision(_ pername: String) -> Bool {
        return true
    }
    public func requestPermison(_ pername: String, _ callback: @escaping (_ sth: Bool) -> Void) {}
    public func requesMoretPermison(_ pername: [String], _ callback: @escaping (_ sth: Bool) -> Void) {}
    public func isEnabled() -> Bool {
        return BluetoothController.shared.isBluetoothEnabled()
    }
    public func onStartScanBle(_ para: ScanPara) {
        var that = self
        BluetoothController.checkCentralPermission({
        (_ b: Int) -> Void in
        var s = NSNumber.from(b)
        if (s == 0) {
            that.onScanBle(para)
        } else {
            if (para.onScanResult != nil) {
                para.onScanResult!(bleResult(10001, "无权限", that.isEnabled()))
            }
        }
        })
    }
    public func onScanBle(_ para: ScanPara) {
        if (self.de) {
            console.log("开始蓝牙扫描,蓝牙开启状态", self.isEnabled())
        }
        clearTimeout(scanId)
        var that = self
        if (para.scantime == nil) {
            para.scantime = 10000
        }
        if (para.showEmptyName == nil) {
            para.showEmptyName = 0
        }
        if (para.btNameFilter == nil) {
            para.btNameFilter = ""
        }
        if (para.fliterNames == nil) {
            para.fliterNames = [] as! [String]
        }
        BluetoothController.shared.setShowEmptyName(para.showEmptyName == 0)
        BluetoothController.shared.setFilterBtName(para.btNameFilter!)
        BluetoothController.shared.setfiltersNames(para.fliterNames!)
        if (para.scantime != -1) {
            scanId = setTimeout({
            () -> Void in
            that.stopScanBle()
            if (para.scanComplate != nil) {
                para.scanComplate!()
            }
            }, para.scantime!.toInt())
        }
        if (self.de) {
            console.log("开始蓝牙扫描 步骤1 ", self.isEnabled())
        }
        if (para.iosFilterUUIDs == nil) {
            para.iosFilterUUIDs = [] as! [String]
        }
        var c: [CBUUID] = [] as! [CBUUID]
        do {
            var i: NSNumber = 0
            while(i < para.iosFilterUUIDs!.length){
                c.push(BluetoothController.shared.getCBUUID(para.iosFilterUUIDs![i]))
                i++
            }
        }
        BluetoothController.shared.setScanUUIDsFiters(c)
        BluetoothController.shared.startScan({
        (_ res: CBPeripheral, _ rs: Int, _ reassignedAdvertisementData: String, _ maData: String, _ locname: String) -> Void in
        var advertisementData = reassignedAdvertisementData
        if (that.de) {
            console.log("扫描蓝牙返回 回掉步骤1  ", res)
        }
        var name: String = ""
        if (res.name != nil) {
            name = res.name!
        }
        if (advertisementData.endsWith(" ")) {
            advertisementData = advertisementData.substring(0, advertisementData.length - 1)
        }
        if (that.de) {
            console.log("扫描蓝牙返回 回掉步骤2  ")
        }
        if (that.scanDataListenerCallback != nil) {
            that.scanDataListenerCallback(bleResult(0, "", ScanRssiBR(UTSJSONObject([
                "rssi": NSNumber.from(rs),
                "data": advertisementData,
                "mac": res.identifier.uuidString,
                "manufacturerData": maData,
                "name": name,
                "iosLocalName": locname
            ]))))
        }
        if (that.de) {
            console.log("扫描蓝牙返回 回掉步骤3  ")
        }
        if (scanMap.get(res.identifier.uuidString) == nil) {
            var b = BleScanResult(UTSJSONObject([
                "rssi": NSNumber.from(rs),
                "device": Device(UTSJSONObject([
                    "name": name,
                    "address": res.identifier.uuidString,
                    "iosLocalName": locname
                ])),
                "deviceName": name,
                "scanRecord": ScanRecord(UTSJSONObject([
                    "bytes": advertisementData
                ]))
            ]))
            if (that.de) {
                console.log("扫描蓝牙返回 回掉步骤4  ")
            }
            if (para.onScanResult != nil) {
                para.onScanResult!(bleResult(0, "ble data ", b))
            }
            if (that.de) {
                console.log("扫描蓝牙返回 回掉步骤5  ")
            }
        }
        scanMap.set(res.identifier.uuidString, res)
        iosscanMap.set(res.identifier.uuidString, res)
        })
    }
    public func startScanBleDevice(_ time: NSNumber, _ callback: @escaping (_ sth: MyApiResult) -> Void) -> Void {
        var that = self
        BluetoothController.checkCentralPermission({
        (_ b: Int) -> Void in
        var s = NSNumber.from(b)
        if (s == 0) {
            that.scanBle(time, callback)
        } else {
            callback(bleResult(10001, "无权限", that.isEnabled()))
        }
        })
    }
    public func stopScanBle() -> Void {
        clearTimeout(scanId)
        scanMap.clear()
        BluetoothController.shared.stopScan()
    }
    public func scanBle(_ time: NSNumber, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        clearTimeout(scanId)
        var that = self
        scanId = setTimeout({
        () -> Void in
        that.stopScanBle()
        }, time.toInt())
        BluetoothController.shared.startScan({
        (_ res: CBPeripheral, _ rs: Int, _ reassignedAdvertisementData: String, _ maData: String, _ locaname: String) -> Void in
        var advertisementData = reassignedAdvertisementData
        var name: String = ""
        if (res.name != nil) {
            name = res.name!
        }
        if (advertisementData.endsWith(" ")) {
            advertisementData = advertisementData.substring(0, advertisementData.length - 1)
        }
        if (that.scanDataListenerCallback != nil) {
            that.scanDataListenerCallback(bleResult(0, "", ScanRssiBR(UTSJSONObject([
                "rssi": NSNumber.from(rs),
                "data": advertisementData,
                "mac": res.identifier.uuidString,
                "manufacturerData": maData,
                "name": name,
                "iosLocalName": locaname
            ]))))
        }
        if (scanMap.get(res.identifier.uuidString) == nil) {
            var b = BleScanResult(UTSJSONObject([
                "rssi": NSNumber.from(rs),
                "device": Device(UTSJSONObject([
                    "name": name,
                    "address": res.identifier.uuidString,
                    "iosLocalName": locaname
                ])),
                "deviceName": name,
                "scanRecord": ScanRecord(UTSJSONObject([
                    "bytes": advertisementData
                ]))
            ]))
            callback(bleResult(0, "1", b))
        }
        scanMap.set(res.identifier.uuidString, res)
        iosscanMap.set(res.identifier.uuidString, res)
        })
    }
    public func connect(_ mac: String, _ auto: Bool, _ callback: @escaping (_ sth: MyApiResult) -> Void) -> Void {
        var that = self
        BluetoothController.checkCentralPermission({
        (_ b: Int) -> Void in
        var f = NSNumber.from(b)
        if (f == 0) {
            that.connectToDevice(mac, auto, callback)
        } else {
            callback(bleResult(10003, "无蓝牙权限", that.isEnabled()))
        }
        })
    }
    public func redictToConnect(_ mac: String, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var p: CBPeripheral? = self.connectPb.get(mac)
        var that = self
        if (p != nil) {
            BluetoothController.shared.swToConnect(p!, {
            (_ state: Bool, _ data: CBPeripheral) -> Void in
            if (state) {
                that.curdataCBPeripheral = data
                that.appbtconnect = true
                callback(bleResult(0, "connect success", 0))
            } else {
                that.appbtconnect = false
                that.curdataCBPeripheral = nil
                callback(bleResult(10001, "bluetooth disconnect ", 0))
            }
            })
        }
    }
    public func getConnectedDevicesWithServices(_ b: [String]) -> MyApiResult {
        self.connectPb.clear()
        var c: [CBUUID] = [] as! [CBUUID]
        do {
            var i: NSNumber = 0
            while(i < b.length){
                c.push(BluetoothController.shared.getCBUUID(b[i]))
                i++
            }
        }
        var b: [CBPeripheral] = BluetoothController.shared.getConnectedDevicesWithServices(c)
        var ss: [BleScanResult] = [] as! [BleScanResult]
        do {
            var i: NSNumber = 0
            while(i < b.length){
                self.connectPb.set(b[i].identifier.uuidString, b[i])
                var connect = b[i].state == CoreBluetooth.CBPeripheralState.connected ? 0 : 1
                ss.push(BleScanResult(UTSJSONObject([
                    "device": Device(UTSJSONObject([
                        "connectType": connect,
                        "name": b[i].name,
                        "address": b[i].identifier.uuidString
                    ]))
                ])))
                i++
            }
        }
        return bleResult(0, "", ss)
    }
    public func retrievePeripherals(_ b: [String]) -> MyApiResult {
        var c: [UUID] = [] as! [UUID]
        do {
            var i: NSNumber = 0
            while(i < b.length){
                c.push(BluetoothController.shared.getUUID(b[i]))
                i++
            }
        }
        var b: [CBPeripheral] = BluetoothController.shared.retrievePeripherals(c)
        var ss: [BleScanResult] = [] as! [BleScanResult]
        do {
            var i: NSNumber = 0
            while(i < b.length){
                var connect = b[i].state == CoreBluetooth.CBPeripheralState.connected ? 0 : 1
                ss.push(BleScanResult(UTSJSONObject([
                    "device": Device(UTSJSONObject([
                        "connectType": connect,
                        "name": b[i].name,
                        "address": b[i].identifier.uuidString
                    ]))
                ])))
                i++
            }
        }
        return bleResult(0, "", ss)
    }
    public func connectToDevice(_ mac: String, _ auto: Bool, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        if (self.isConnected()) {
            callback(bleResult(10004, "bluetooth is connected", ""))
            return
        }
        self.beginToConnectMac = mac
        self.connectCallback = callback
        var that = self
        if (iosscanMap.has(mac)) {
            var p: CBPeripheral = BluetoothController.shared.getCBPeripheral(mac)
            self.connectTimeout = setTimeout({
            () -> Void in
            that.isConnecting = false
            callback(bleResult(10000, "connect timeout", 0))
            }, that.connect_time_out.toInt())
            that.connectTargetDevice(p, auto, callback)
        } else {
            var haveSearch = false
            self.connectTimeout = setTimeout({
            () -> Void in
            if (!haveSearch) {
                that.stopScanBle()
            }
            that.isConnecting = false
            callback(bleResult(10000, "connect timeout", 0))
            }, that.connect_time_out.toInt())
            BluetoothController.shared.startScan({
            (_ res: CBPeripheral, _ rs: Int, _ advertisementData: String, _ maData: String, _ localName: String) -> Void in
            iosscanMap.set(res.identifier.uuidString, res)
            if (res.identifier.uuidString == mac) {
                haveSearch = true
                that.stopScanBle()
                var p: CBPeripheral = BluetoothController.shared.getCBPeripheral(mac)
                that.connectTargetDevice(p, auto, callback)
            }
            })
        }
    }
    public func setPhy2MMode() {}
    public func connectTargetDevice(_ p: CBPeripheral, _ auto: Bool, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var that = self
        if (auto) {
            if (self.isConnecting) {
                return
            }
        }
        that.isConnecting = true
        BluetoothController.shared.connectDevice(p, {
        (_ state: Bool, _ data: CBPeripheral) -> Void in
        clearTimeout(that.connectTimeout)
        that.isConnecting = false
        if (state) {
            that.curdataCBPeripheral = data
            that.appbtconnect = true
            callback(bleResult(0, "connect success", 0))
        } else {
            that.appbtconnect = false
            that.curdataCBPeripheral = nil
            callback(bleResult(10001, "bluetooth disconnect ", 0))
        }
        })
        if (auto) {
            self.startAutoConnectBt(self.auto_connect_time, callback)
        }
    }
    public func startAutoConnectBt(_ time: NSNumber, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var that = self
        if (self.connectInternal != 0) {
            clearInterval(self.connectInternal)
        }
        self.connectInternal = setInterval({
        () -> Void in
        if (that.isConnecting) {
            return
        }
        if (!that.isConnected()) {
            that.connect(that.beginToConnectMac!, false, {
            (_ res: MyApiResult) -> Void in
            if (res.type == 0) {
                callback(bleResult(0, "connect success", 1))
            } else if (res.type == 10001) {
                callback(bleResult(10001, "disconnect", 1))
            }
            })
        }
        }, time.toInt())
    }
    public func cancelAutoConnectBt() {
        if (self.connectInternal != 0) {
            clearInterval(self.connectInternal)
        }
    }
    public func scanServices(_ callback: @escaping (_ sth: MyApiResult) -> Void) -> Void {
        var services: [BleServices] = [] as! [BleServices]
        var index: NSNumber = 0
        var that = self
        BluetoothController.shared.scanServices(that.curdataCBPeripheral!, {
        (_ peripheral: CBPeripheral, _ service: CBService, _ size: Int) -> Void in
        that.curdataCBPeripheral = peripheral
        var serviceSize = NSNumber.from(size)
        that.wNList = [] as! [String]
        var b = service.uuid.uuidString as! String
        var ser = BleServices(UTSJSONObject([
            "type": index++,
            "uuid": b,
            "characteristics": [] as! [Characteristics]
        ]))
        services.push(ser)
        cbServiceMap.set(b, service)
        service.characteristics?.forEach({
        (_ value: CBCharacteristic, _ i: NSNumber, _ array: [CBCharacteristic]) -> Void in
        var c = value.uuid.uuidString as! String
        cBCharacteristicMap.set(c, value)
        var curCharac = Characteristics(UTSJSONObject([
            "uuid": c,
            "propertiesType": 0 as NSNumber,
            "properties": CharacteristicsProperties(UTSJSONObject([
                "READ": BluetoothController.getState(0, value.properties),
                "WRITE": BluetoothController.getState(1, value.properties) || BluetoothController.getState(4, value.properties),
                "NOTIFY": BluetoothController.getState(2, value.properties),
                "INDICATE": BluetoothController.getState(3, value.properties)
            ]))
        ]))
        ser.characteristics.push(curCharac)
        })
        if (services.length >= serviceSize) {
            var havew = false
            var haveN = false
            var wuuid = ""
            var nuuid = ""
            do {
                var i: NSNumber = 0
                while(i < serviceSize){
                    do {
                        var j: NSNumber = 0
                        while(j < services[i].characteristics.length){
                            if (services[i].characteristics[j].properties.NOTIFY) {
                                haveN = true
                                nuuid = services[i].characteristics[j].uuid
                            }
                            if (services[i].characteristics[j].properties.WRITE) {
                                havew = true
                                wuuid = services[i].characteristics[j].uuid
                            }
                            j++
                        }
                    }
                    if (haveN && havew) {
                        that.wNList.push(services[i].uuid + "_" + nuuid + "_" + wuuid)
                    }
                    i++
                }
            }
            if (that.wNList.length > 0) {
                var size = that.wNList.length
                that.setSelectUUID(NSNumber.from(size) - 1)
            }
            callback(bleResult(0, "", services))
        }
        })
    }
    public func getDataMtu(_ type: NSNumber) -> NSNumber {
        var b = BluetoothController.shared.getDataMtu(self.curdataCBPeripheral!, type.toInt())
        return NSNumber.from(b)
    }
    public func listenerBleMessage(_ callback: @escaping (_ sth: MyApiResult) -> Void) -> Void {}
    public func disListenerBleMessage() -> Void {}
    public func isConnected() -> Bool {
        if (self.curdataCBPeripheral == nil) {
            return false
        }
        if (self.curdataCBPeripheral?.state == CBPeripheralState.connected) {
            return true
        }
        return false
    }
    public func getConnectMac() -> String {
        if (self.isConnected()) {
            return self.beginToConnectMac!
        }
        return ""
    }
    public func byte2HexString(_ data: [NSNumber]) -> String {
        var str = ""
        do {
            var i: NSNumber = 0
            while(i < data.length){
                str = str + data[i].toString(16).padStart(2, "0")
                if (i < data.length - 1) {
                    str = str + " "
                }
                i++
            }
        }
        return str.toUpperCase()
    }
    public func writeDataToBle(_ service: String, _ chars: String, _ data: [NSNumber], _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        if (!self.isConnected()) {
            callback(bleResult(10005, "bluetooth is not connected", ""))
            return
        }
        var str = self.byte2HexString(data)
        self.writeStringDataToBle(service, chars, str, callback)
    }
    public func writeStringDataToBle(_ service: String, _ chars: String, _ reassignedData: String, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var data = reassignedData
        if (!self.isConnected()) {
            callback(bleResult(10005, "bluetooth is not connected", ""))
            return
        }
        var c = cbServiceMap.get(service)
        data = data.split(" ").join("")
        var ch = cBCharacteristicMap.get(chars)
        BluetoothController.shared.sendLargeData(curdataCBPeripheral!, ch!, data, {
        (_ res: Bool) -> Void in
        callback(bleResult(res ? 0 : 10001, "success", ""))
        })
    }
    public func writeDataToBleWithType(_ service: String, _ chars: String, _ data: [NSNumber], _ writeType: NSNumber, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var str = self.byte2HexString(data)
        self.writeStringDataToBleWithType(service, chars, str, writeType, callback)
    }
    public func writeStringDataToBleWithType(_ service: String, _ chars: String, _ reassignedData: String, _ writeType: NSNumber, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var data = reassignedData
        if (!self.isConnected()) {
            callback(bleResult(10005, "bluetooth is not connected", ""))
            return
        }
        var c = cbServiceMap.get(service)
        data = data.split(" ").join("")
        var ch = cBCharacteristicMap.get(chars)
        BluetoothController.shared.sendLargeDatas(curdataCBPeripheral!, ch!, data, writeType.toInt(), {
        (_ res: Bool) -> Void in
        callback(bleResult(res ? 0 : 10001, "success", ""))
        })
    }
    public func sendData(_ data: WriteData, _ callback: @escaping (_ b: MyApiResult) -> Void) {
        if (!self.isConnected()) {
            callback(bleResult(10005, "bluetooth is not connected", ""))
            return
        }
        var str = ""
        if (data.hexStrData != nil) {
            str = data.hexStrData!
            str = str.split(" ").join("")
        }
        if (data.data != nil) {
            str = self.byte2HexString(data.data!)
            str = str.split(" ").join("")
        }
        var c = cbServiceMap.get(data.serviceId)
        var ch = cBCharacteristicMap.get(data.characteristicId)
        BluetoothController.shared.setHaveSetMtu(!data.fenbao)
        if (data.writeType == nil) {
            BluetoothController.shared.sendLargeData(curdataCBPeripheral!, ch!, str, {
            (_ res: Bool) -> Void in
            if (res) {
                callback(bleResult(0, "发送成功", ""))
            } else {
                callback(bleResult(10001, "发送失败", ""))
            }
            })
        } else {
            BluetoothController.shared.sendLargeDatas(curdataCBPeripheral!, ch!, str, data.writeType!.toInt(), {
            (_ res: Bool) -> Void in
            if (res) {
                callback(bleResult(0, "", ""))
            } else {
                callback(bleResult(10001, "", ""))
            }
            })
        }
    }
    public func onNotityReadBleData(_ service: String, _ chars: String, _ state: Bool, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var that = self
        var c = cbServiceMap.get(service)
        var ch = cBCharacteristicMap.get(chars)
        if (ch == nil) {
            callback(bleResult(10001, "notity chars failed", ""))
            return
        }
        BluetoothController.shared.setNotity(curdataCBPeripheral!, ch!, state, {
        (_ s: Int, _ data: String, _ chars: String, _ mac: String) -> Void in
        var st = NSNumber.from(s)
        if (st == 3) {
            callback(bleResult(0, "read data", that.hexToTypedArray(data)))
        } else if (st == 1) {
            callback(bleResult(1001, "订阅失败", [] as! [NSNumber]))
        } else if (st == 2) {
            callback(bleResult(1000, "订阅成功", [] as! [NSNumber]))
        }
        })
    }
    public func onNotityBleData(_ service: String, _ chars: String, _ state: Bool, _ callback: @escaping (_ sth: MyApiResult) -> Void) {
        var that = self
        var c = cbServiceMap.get(service)
        var ch = cBCharacteristicMap.get(chars)
        if (ch == nil) {
            callback(bleResult(10001, "notity chars failed", ""))
            return
        }
        BluetoothController.shared.setNotity(curdataCBPeripheral!, ch!, state, {
        (_ s: Int, _ data: String, _ chs: String, _ mac: String) -> Void in
        var st = NSNumber.from(s)
        if (st == 3) {
            callback(bleResult(0, "read data", NotityData(UTSJSONObject([
                "data": that.hexToTypedArray(data),
                "serviceId": "",
                "characteristicsId": chs,
                "mac": mac
            ]))))
        } else if (st == 1) {
            callback(bleResult(1001, "订阅失败", [] as! [NSNumber]))
        } else if (st == 2) {
            callback(bleResult(1000, "订阅成功", [] as! [NSNumber]))
        }
        })
    }
    public func hexToTypedArray(_ str: String) -> [NSNumber] {
        var b = str.split(" ")
        var num: [NSNumber] = [] as! [NSNumber]
        do {
            var i: NSNumber = 0
            while(i < b.length){
                num.push(parseInt(b[i], 16))
                i++
            }
        }
        return num
    }
    public func close() -> Void {
        self.cancelAutoConnectBt()
        if (self.curdataCBPeripheral != nil) {
            BluetoothController.shared.disconnect(self.curdataCBPeripheral!)
        }
    }
    public func readRssi(_ callback: @escaping (_ b: MyApiResult) -> Void) {
        self.curdataCBPeripheral!.readRSSI()
        BluetoothController.shared.setRssicallback({
        (_ b: String) -> Void in
        callback(bleResult(0, "信号", parseInt(b)))
        })
    }
    public func setMtu(_ num: NSNumber, _ callback: @escaping (_ sth: MyApiResult) -> Void) -> Void {
        haveSetMtu = true
        BluetoothController.shared.setHaveSetMtu(haveSetMtu)
        callback(bleResult(0, "ios 不支持设置", 20))
    }
    public func string2ByteStrWithCharset(_ data: String, _ code: String) -> String {
        if (code == "gbk" || code == "GBK") {
            return BluetoothController.shared.toGBKHex(data)
        } else if (code == "utf-8" || code == "UTF-8") {
            return BluetoothController.shared.utf8toHexString(data)
        }
        return ""
    }
    public func byte2StringWithCharset(_ data: String, _ code: String) -> String {
        if (code == "gbk" || code == "GBK") {
            return BluetoothController.shared.gbkHexToString(data.split(" ").join(""))
        } else if (code == "utf-8" || code == "UTF-8") {
            return BluetoothController.shared.utf8hexToString(data.split(" ").join(""))
        }
        return ""
    }
    public func getUUIDs() -> [WNuuid] {
        var ids = [] as! [WNuuid]
        do {
            var i: NSNumber = 0
            while(i < self.wNList.length){
                var b = self.wNList[i].split("_")
                ids.push(WNuuid(UTSJSONObject([
                    "serviceId": b[0],
                    "nuuid": b[1],
                    "wuuid": b[2]
                ])))
                i++
            }
        }
        return ids
    }
    public func setSelectUUID(_ id: NSNumber) {
        if (id < self.wNList.length) {
            var b = self.wNList[id].split("_")
            self.defaultService = b[0]
            self.defaultNotity = b[1]
            self.defaultWrite = b[2]
        }
    }
}
@objc(UTSSDKModulesAndroidBleScanParaJSONObject)
@objcMembers
public class ScanParaJSONObject : NSObject {
    public var btNameFilter: String?
    public var fliterNames: [String]?
    public var scantime: NSNumber?
    public var showEmptyName: NSNumber?
    public var iosFilterUUIDs: [String]?
    public var onScanResult: UTSCallback?
    public var scanComplate: UTSCallback?
}
@objc(UTSSDKModulesAndroidBleWriteDataJSONObject)
@objcMembers
public class WriteDataJSONObject : NSObject {
    public var serviceId: String!
    public var characteristicId: String!
    public var writeType: NSNumber?
    public var data: [NSNumber]?
    public var hexStrData: String?
    public var fenbao: Bool = false
}
@objc(UTSSDKModulesAndroidBleBleLibByJs)
@objcMembers
public class BleLibByJs : BleLib {
    public func setBtConnectTimeoutByJs(_ time: NSNumber) {
        return self.setBtConnectTimeout(time)
    }
    public func setBtAutoConnectTimeByJs(_ time: NSNumber) {
        return self.setBtAutoConnectTime(time)
    }
    public func setDebugModeByJs(_ debug: Bool) {
        return self.setDebugMode(debug)
    }
    public func setThreadTypeNameByJs(_ name: String) {
        return self.setThreadTypeName(name)
    }
    public func onScanDataListenerByJs(_ callback: UTSCallback) {
        return self.onScanDataListener({
        (_ res: MyApiResult) -> Void in
        callback(res)
        })
    }
    public func onBtOpenStateListenerByJs(_ callback: UTSCallback) {
        return self.onBtOpenStateListener({
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func btListenerByJs() {
        return self.btListener()
    }
    public func openBtBluetoothByJs(_ callback: UTSCallback) {
        return self.openBtBluetooth({
        (_ b: MyApiResult) -> Void in
        callback(b)
        })
    }
    public func openBluetoothByJs(_ on: Bool) -> Void {
        return self.openBluetooth(on)
    }
    public func openBluetoothSettingsByJs() -> Void {
        return self.openBluetoothSettings()
    }
    public func getSericUUIDByJs() -> String {
        return self.getSericUUID()
    }
    public func getNotityUUIDByJs() -> String {
        return self.getNotityUUID()
    }
    public func getwriteUUIDByJs() -> String {
        return self.getwriteUUID()
    }
    public func getServiceUUIDByJs() -> String {
        return self.getServiceUUID()
    }
    public func isHavePermisionByJs(_ pername: String) -> Bool {
        return self.isHavePermision(pername)
    }
    public func requestPermisonByJs(_ pername: String, _ callback: UTSCallback) {
        return self.requestPermison(pername, {
        (_ sth: Bool) -> Void in
        callback(sth)
        })
    }
    public func requesMoretPermisonByJs(_ pername: [String], _ callback: UTSCallback) {
        return self.requesMoretPermison(pername, {
        (_ sth: Bool) -> Void in
        callback(sth)
        })
    }
    public func isEnabledByJs() -> Bool {
        return self.isEnabled()
    }
    public func onStartScanBleByJs(_ para: ScanParaJSONObject) {
        return self.onStartScanBle(ScanPara(UTSJSONObject([
            "btNameFilter": para.btNameFilter,
            "fliterNames": para.fliterNames,
            "scantime": para.scantime,
            "showEmptyName": para.showEmptyName,
            "iosFilterUUIDs": para.iosFilterUUIDs,
            "onScanResult": {
            (_ b: MyApiResult) -> Void in
            para.onScanResult?(b)
            },
            "scanComplate": {
            () -> Void in
            para.scanComplate?()
            }
        ])))
    }
    public func onScanBleByJs(_ para: ScanParaJSONObject) {
        return self.onScanBle(ScanPara(UTSJSONObject([
            "btNameFilter": para.btNameFilter,
            "fliterNames": para.fliterNames,
            "scantime": para.scantime,
            "showEmptyName": para.showEmptyName,
            "iosFilterUUIDs": para.iosFilterUUIDs,
            "onScanResult": {
            (_ b: MyApiResult) -> Void in
            para.onScanResult?(b)
            },
            "scanComplate": {
            () -> Void in
            para.scanComplate?()
            }
        ])))
    }
    public func startScanBleDeviceByJs(_ time: NSNumber, _ callback: UTSCallback) -> Void {
        return self.startScanBleDevice(time, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func stopScanBleByJs() -> Void {
        return self.stopScanBle()
    }
    public func scanBleByJs(_ time: NSNumber, _ callback: UTSCallback) {
        return self.scanBle(time, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func connectByJs(_ mac: String, _ auto: Bool, _ callback: UTSCallback) -> Void {
        return self.connect(mac, auto, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func redictToConnectByJs(_ mac: String, _ callback: UTSCallback) {
        return self.redictToConnect(mac, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func getConnectedDevicesWithServicesByJs(_ b: [String]) -> MyApiResult {
        return self.getConnectedDevicesWithServices(b)
    }
    public func retrievePeripheralsByJs(_ b: [String]) -> MyApiResult {
        return self.retrievePeripherals(b)
    }
    public func connectToDeviceByJs(_ mac: String, _ auto: Bool, _ callback: UTSCallback) {
        return self.connectToDevice(mac, auto, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func setPhy2MModeByJs() {
        return self.setPhy2MMode()
    }
    public func connectTargetDeviceByJs(_ p: CBPeripheral, _ auto: Bool, _ callback: UTSCallback) {
        return self.connectTargetDevice(p, auto, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func startAutoConnectBtByJs(_ time: NSNumber, _ callback: UTSCallback) {
        return self.startAutoConnectBt(time, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func cancelAutoConnectBtByJs() {
        return self.cancelAutoConnectBt()
    }
    public func scanServicesByJs(_ callback: UTSCallback) -> Void {
        return self.scanServices({
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func getDataMtuByJs(_ type: NSNumber) -> NSNumber {
        return self.getDataMtu(type)
    }
    public func listenerBleMessageByJs(_ callback: UTSCallback) -> Void {
        return self.listenerBleMessage({
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func disListenerBleMessageByJs() -> Void {
        return self.disListenerBleMessage()
    }
    public func isConnectedByJs() -> Bool {
        return self.isConnected()
    }
    public func getConnectMacByJs() -> String {
        return self.getConnectMac()
    }
    public func byte2HexStringByJs(_ data: [NSNumber]) -> String {
        return self.byte2HexString(data)
    }
    public func writeDataToBleByJs(_ service: String, _ chars: String, _ data: [NSNumber], _ callback: UTSCallback) {
        return self.writeDataToBle(service, chars, data, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func writeStringDataToBleByJs(_ service: String, _ chars: String, _ data: String, _ callback: UTSCallback) {
        return self.writeStringDataToBle(service, chars, data, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func writeDataToBleWithTypeByJs(_ service: String, _ chars: String, _ data: [NSNumber], _ writeType: NSNumber, _ callback: UTSCallback) {
        return self.writeDataToBleWithType(service, chars, data, writeType, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func writeStringDataToBleWithTypeByJs(_ service: String, _ chars: String, _ data: String, _ writeType: NSNumber, _ callback: UTSCallback) {
        return self.writeStringDataToBleWithType(service, chars, data, writeType, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func sendDataByJs(_ data: WriteDataJSONObject, _ callback: UTSCallback) {
        return self.sendData(WriteData(UTSJSONObject([
            "serviceId": data.serviceId,
            "characteristicId": data.characteristicId,
            "writeType": data.writeType,
            "data": data.data,
            "hexStrData": data.hexStrData,
            "fenbao": data.fenbao
        ])), {
        (_ b: MyApiResult) -> Void in
        callback(b)
        })
    }
    public func onNotityReadBleDataByJs(_ service: String, _ chars: String, _ state: Bool, _ callback: UTSCallback) {
        return self.onNotityReadBleData(service, chars, state, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func onNotityBleDataByJs(_ service: String, _ chars: String, _ state: Bool, _ callback: UTSCallback) {
        return self.onNotityBleData(service, chars, state, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func hexToTypedArrayByJs(_ str: String) -> [NSNumber] {
        return self.hexToTypedArray(str)
    }
    public func closeByJs() -> Void {
        return self.close()
    }
    public func readRssiByJs(_ callback: UTSCallback) {
        return self.readRssi({
        (_ b: MyApiResult) -> Void in
        callback(b)
        })
    }
    public func setMtuByJs(_ num: NSNumber, _ callback: UTSCallback) -> Void {
        return self.setMtu(num, {
        (_ sth: MyApiResult) -> Void in
        callback(sth)
        })
    }
    public func string2ByteStrWithCharsetByJs(_ data: String, _ code: String) -> String {
        return self.string2ByteStrWithCharset(data, code)
    }
    public func byte2StringWithCharsetByJs(_ data: String, _ code: String) -> String {
        return self.byte2StringWithCharset(data, code)
    }
    public func getUUIDsByJs() -> [WNuuid] {
        return self.getUUIDs()
    }
    public func setSelectUUIDByJs(_ id: NSNumber) {
        return self.setSelectUUID(id)
    }
}
