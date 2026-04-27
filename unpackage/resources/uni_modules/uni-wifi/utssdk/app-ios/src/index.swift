import CoreFoundation
import CoreLocation
import DCloudUTSFoundation
import Foundation
import UIKit
import SystemConfiguration.CaptiveNetwork
@objc(UTSSDKModulesUniWifiStartWifiOptions)
@objcMembers
public class StartWifiOptions : NSObject, UTSObject {
    public var success: ((_ res: UniWifiResult) -> Void)?
    public var fail: ((_ res: UniError) -> Void)?
    public var complete: ((_ res: Any) -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "success":
                    self.success = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fail":
                    self.fail = try! utsSubscriptCheckValueIfPresent(newValue)
                case "complete":
                    self.complete = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.success = obj["success"] as! ((_ res: UniWifiResult) -> Void)?
        self.fail = obj["fail"] as! ((_ res: UniError) -> Void)?
        self.complete = obj["complete"] as! ((_ res: Any) -> Void)?
    }
}
@objc(UTSSDKModulesUniWifiStopWifiOptions)
@objcMembers
public class StopWifiOptions : NSObject, UTSObject {
    public var success: ((_ res: UniWifiResult) -> Void)?
    public var fail: ((_ res: UniError) -> Void)?
    public var complete: ((_ res: Any) -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "success":
                    self.success = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fail":
                    self.fail = try! utsSubscriptCheckValueIfPresent(newValue)
                case "complete":
                    self.complete = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.success = obj["success"] as! ((_ res: UniWifiResult) -> Void)?
        self.fail = obj["fail"] as! ((_ res: UniError) -> Void)?
        self.complete = obj["complete"] as! ((_ res: Any) -> Void)?
    }
}
@objc(UTSSDKModulesUniWifiGetWifiListOptions)
@objcMembers
public class GetWifiListOptions : NSObject, UTSObject {
    public var success: ((_ res: UniWifiResult) -> Void)?
    public var fail: ((_ res: UniError) -> Void)?
    public var complete: ((_ res: Any) -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "success":
                    self.success = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fail":
                    self.fail = try! utsSubscriptCheckValueIfPresent(newValue)
                case "complete":
                    self.complete = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.success = obj["success"] as! ((_ res: UniWifiResult) -> Void)?
        self.fail = obj["fail"] as! ((_ res: UniError) -> Void)?
        self.complete = obj["complete"] as! ((_ res: Any) -> Void)?
    }
}
@objc(UTSSDKModulesUniWifiSetWifiListOptions)
@objcMembers
public class SetWifiListOptions : NSObject, UTSObject {
    public var success: ((_ res: UniWifiResult) -> Void)?
    public var fail: ((_ res: UniError) -> Void)?
    public var complete: ((_ res: Any) -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "success":
                    self.success = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fail":
                    self.fail = try! utsSubscriptCheckValueIfPresent(newValue)
                case "complete":
                    self.complete = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.success = obj["success"] as! ((_ res: UniWifiResult) -> Void)?
        self.fail = obj["fail"] as! ((_ res: UniError) -> Void)?
        self.complete = obj["complete"] as! ((_ res: Any) -> Void)?
    }
}
@objc(UTSSDKModulesUniWifiWifiConnectOption)
@objcMembers
public class WifiConnectOption : NSObject, UTSObject {
    public var SSID: String?
    public var BSSID: String?
    public var password: String?
    public var maunal: Bool = false
    public var partialInfo: Bool = false
    public var success: ((_ res: UniWifiResult) -> Void)?
    public var fail: ((_ res: UniError) -> Void)?
    public var complete: ((_ res: Any) -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "SSID":
                    self.SSID = try! utsSubscriptCheckValueIfPresent(newValue)
                case "BSSID":
                    self.BSSID = try! utsSubscriptCheckValueIfPresent(newValue)
                case "password":
                    self.password = try! utsSubscriptCheckValueIfPresent(newValue)
                case "maunal":
                    self.maunal = try! utsSubscriptCheckValue(newValue)
                case "partialInfo":
                    self.partialInfo = try! utsSubscriptCheckValue(newValue)
                case "success":
                    self.success = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fail":
                    self.fail = try! utsSubscriptCheckValueIfPresent(newValue)
                case "complete":
                    self.complete = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.SSID = obj["SSID"] as! String?
        self.BSSID = obj["BSSID"] as! String?
        self.password = obj["password"] as! String?
        self.maunal = (obj["maunal"] as? Bool) ?? false
        self.partialInfo = (obj["partialInfo"] as? Bool) ?? false
        self.success = obj["success"] as! ((_ res: UniWifiResult) -> Void)?
        self.fail = obj["fail"] as! ((_ res: UniError) -> Void)?
        self.complete = obj["complete"] as! ((_ res: Any) -> Void)?
    }
}
@objc(UTSSDKModulesUniWifiGetConnectedWifiOptions)
@objcMembers
public class GetConnectedWifiOptions : NSObject, UTSObject {
    public var partialInfo: Bool = false
    public var success: ((_ res: UniWifiResult) -> Void)?
    public var fail: ((_ res: UniError) -> Void)?
    public var complete: ((_ res: Any) -> Void)?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "partialInfo":
                    self.partialInfo = try! utsSubscriptCheckValue(newValue)
                case "success":
                    self.success = try! utsSubscriptCheckValueIfPresent(newValue)
                case "fail":
                    self.fail = try! utsSubscriptCheckValueIfPresent(newValue)
                case "complete":
                    self.complete = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.partialInfo = (obj["partialInfo"] as? Bool) ?? false
        self.success = obj["success"] as! ((_ res: UniWifiResult) -> Void)?
        self.fail = obj["fail"] as! ((_ res: UniError) -> Void)?
        self.complete = obj["complete"] as! ((_ res: Any) -> Void)?
    }
}
@objc(UTSSDKModulesUniWifiUniWifiInfo)
@objcMembers
public class UniWifiInfo : NSObject, UTSObject {
    public var SSID: String!
    public var BSSID: String?
    public var secure: Bool = false
    public var signalStrength: NSNumber?
    public var frequency: NSNumber?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "SSID":
                    self.SSID = try! utsSubscriptCheckValue(newValue)
                case "BSSID":
                    self.BSSID = try! utsSubscriptCheckValueIfPresent(newValue)
                case "secure":
                    self.secure = try! utsSubscriptCheckValue(newValue)
                case "signalStrength":
                    self.signalStrength = try! utsSubscriptCheckValueIfPresent(newValue)
                case "frequency":
                    self.frequency = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.SSID = obj["SSID"] as! String
        self.BSSID = obj["BSSID"] as! String?
        self.secure = (obj["secure"] as? Bool) ?? false
        self.signalStrength = obj["signalStrength"] as! NSNumber?
        self.frequency = obj["frequency"] as! NSNumber?
    }
}
@objc(UTSSDKModulesUniWifiUniWifiInfoWithPartialInfo)
@objcMembers
public class UniWifiInfoWithPartialInfo : NSObject, UTSObject {
    public var SSID: String!
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "SSID":
                    self.SSID = try! utsSubscriptCheckValue(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.SSID = obj["SSID"] as! String
    }
}
@objc(UTSSDKModulesUniWifiUniWifiResult)
@objcMembers
public class UniWifiResult : NSObject, UTSObject {
    public var errCode: NSNumber!
    public var errSubject: String!
    public var errMsg: String!
    public var wifi: UniWifiInfo?
    public subscript(_ key: String) -> Any? {
        get {
            return utsSubscriptGetValue(key)
        }
        set {
            switch(key){
                case "errCode":
                    self.errCode = try! utsSubscriptCheckValue(newValue)
                case "errSubject":
                    self.errSubject = try! utsSubscriptCheckValue(newValue)
                case "errMsg":
                    self.errMsg = try! utsSubscriptCheckValue(newValue)
                case "wifi":
                    self.wifi = try! utsSubscriptCheckValueIfPresent(newValue)
                default:
                    break
            }
        }
    }
    public override init() {
        super.init()
    }
    public init(_ obj: UTSJSONObject) {
        self.errCode = obj["errCode"] as! NSNumber
        self.errSubject = obj["errSubject"] as! String
        self.errMsg = obj["errMsg"] as! String
        self.wifi = obj["wifi"] as! UniWifiInfo?
    }
}
public typealias UniWifiCallback = () -> Void
public typealias UniGetWifiListCallback = (_ wifiInfo: UTSJSONObject) -> Void
public typealias UniWifiResultCallback = (_ wifiInfo: UniWifiResult) -> Void
public typealias UniWifiResultCallbackWithPartialInfo = (_ wifiInfo: UniWifiInfoWithPartialInfo) -> Void
public typealias StartWifi = (_ option: StartWifiOptions) -> Void
public typealias StopWifi = (_ option: StopWifiOptions) -> Void
public typealias GetWifiList = (_ option: GetWifiListOptions) -> Void
public typealias OnGetWifiList = (_ callback: @escaping UniGetWifiListCallback) -> Void
public typealias OffGetWifiList = (_ callback: @escaping UniWifiCallback) -> Void
public typealias GetConnectedWifi = (_ option: GetConnectedWifiOptions) -> Void
public typealias ConnectWifi = (_ option: WifiConnectOption) -> Void
public typealias OnWifiConnected = (_ callback: @escaping UniWifiResultCallback) -> Void
public typealias OnWifiConnectedWithPartialInfo = (_ callback: @escaping UniWifiResultCallbackWithPartialInfo) -> Void
public typealias OffWifiConnected = (_ callback: UniWifiCallback?) -> Void
public typealias OffWifiConnectedWithPartialInfo = (_ callback: UniWifiResultCallbackWithPartialInfo?) -> Void
public typealias SetWifiList = (_ option: SetWifiListOptions) -> Void
public typealias WifiErrorCode = NSNumber
public protocol WifiFail : IUniError {
    var errCode: WifiErrorCode { get set }
}
public var UniErrorSubject = "uni-wifi"
public var WifiUniErrors: Map<WifiErrorCode, String> = Map([
    [
        12000,
        "not init."
    ],
    [
        12001,
        "system not support"
    ],
    [
        12002,
        "password error Wi-Fi"
    ],
    [
        12005,
        "wifi not turned on"
    ],
    [
        12007,
        "user denied"
    ],
    [
        12010,
        "unknown error"
    ],
    [
        12013,
        "wifi config may be expired"
    ]
])
public func getErrcode(_ errCode: NSNumber) -> WifiErrorCode {
    var res = WifiUniErrors[errCode]
    return res == nil ? 12000 : errCode
}
@objc(UTSSDKModulesUniWifiWifiFailImpl)
@objcMembers
public class WifiFailImpl : UniError, WifiFail {
    public init(_ errCode: WifiErrorCode){
        super.init()
        self.errSubject = UniErrorSubject
        self.errCode = errCode
        self.errMsg = WifiUniErrors[errCode] ?? ""
    }
}
@objc(UTSSDKModulesUniWifiLocationPromiseService)
@objcMembers
public class LocationPromiseService : NSObject, CLLocationManagerDelegate {
    public static var promiseCompletionHandler: [((_ res: Bool) -> Void)] = []
    public var manager: CLLocationManager?
    public init(_ manager: CLLocationManager?){
        self.manager = manager
    }
    public func initlizeManager() -> Bool {
        if (self.manager == nil) {
            self.manager = CLLocationManager()
            self.manager!.delegate = self
        }
        return true
    }
    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if (status == CLAuthorizationStatus.authorizedAlways || status == CLAuthorizationStatus.authorizedWhenInUse) {
            LocationPromiseService.promiseCompletionHandler.forEach({
            (handler) -> Void in
            handler(true)
            })
        } else if (status == CLAuthorizationStatus.notDetermined) {
            manager.requestWhenInUseAuthorization()
        } else if (status == CLAuthorizationStatus.denied) {
            LocationPromiseService.promiseCompletionHandler.forEach({
            (handler) -> Void in
            handler(false)
            })
        }
    }
    public func requestPromise(_ completion: @escaping (_ res: Bool) -> Void) {
        var status: CLAuthorizationStatus = CLLocationManager.authorizationStatus()
        if (status == CLAuthorizationStatus.notDetermined) {
            if (self.initlizeManager() == true) {
                self.manager!.requestWhenInUseAuthorization()
                LocationPromiseService.promiseCompletionHandler.push(completion)
            }
        } else if (status == CLAuthorizationStatus.authorizedAlways || status == CLAuthorizationStatus.authorizedWhenInUse) {
            completion(true)
        } else if (status == CLAuthorizationStatus.denied) {
            if (CLLocationManager.locationServicesEnabled() == false && self.initlizeManager() == true) {
                self.manager!.requestWhenInUseAuthorization()
                LocationPromiseService.promiseCompletionHandler.push(completion)
            }
        }
    }
}
public var locationPromiseService: LocationPromiseService = LocationPromiseService(nil)
public func requestLocationPromise(_ completion: @escaping (_ res: Bool) -> Void) {
    locationPromiseService.requestPromise(completion)
}
public func fetchConnectedWifiWithLocationPromise(_ option: GetConnectedWifiOptions) {
    var arr = CNCopySupportedInterfaces()
    var wifiInfo = UniWifiInfo(UTSJSONObject([
        "BSSID": "",
        "SSID": "",
        "secure": false,
        "signalStrength": 0 as NSNumber,
        "frequency": 0 as NSNumber
    ]))
    if (arr != nil) {
        var list = arr! as! NSArray
        var index: Int = 0
        while(index < list.count){
            var item = list[index]
            var interfaceName = item as! String
            var dic = CNCopyCurrentNetworkInfo(interfaceName as! CFString)
            if (dic != nil) {
                var dict = dic! as! NSDictionary
                var SSID = dict[kCNNetworkInfoKeySSID as! String]
                var BSSID = dict[kCNNetworkInfoKeyBSSID as! String]
                if (SSID != nil && BSSID != nil) {
                    var ssid = SSID! as! String
                    var bssid = BSSID! as! String
                    wifiInfo.SSID = ssid
                    wifiInfo.BSSID = bssid
                    wifiInfo.secure = false
                    wifiInfo.signalStrength = 0
                    wifiInfo.frequency = 0
                    break
                }
            }
            index++
        }
        if (wifiInfo.BSSID!.length > 0 && wifiInfo.SSID.length > 0) {
            var res = UniWifiResult(UTSJSONObject([
                "errSubject": "uni-getConnectedWifi",
                "errCode": 0 as NSNumber,
                "errMsg": "getConnectedWifi:ok",
                "wifi": wifiInfo
            ]))
            option.success?(res)
            option.complete?(res)
        } else {
            var err = WifiFailImpl(getErrcode(12010))
            option.fail?(err)
            option.complete?(err)
        }
    } else {
        var err = WifiFailImpl(getErrcode(12010))
        option.fail?(err)
        option.complete?(err)
    }
}
@objc(UTSSDKModulesUniWifiUniWiFiModuleGloabInfo)
@objcMembers
public class UniWiFiModuleGloabInfo : NSObject {
    public static var alreadyStartWifi: Bool = false
}
public var startWifi: StartWifi = {
(_ option: StartWifiOptions) -> Void in
UniWiFiModuleGloabInfo.alreadyStartWifi = true
var res = UniWifiResult(UTSJSONObject([
    "errSubject": "uni-startWifi",
    "errCode": 0 as NSNumber,
    "errMsg": "startWifi:ok",
    "wifi": nil
]))
option.success?(res)
option.complete?(res)
}
public var stopWifi: StopWifi = {
(_ option: StopWifiOptions) -> Void in
UniWiFiModuleGloabInfo.alreadyStartWifi = false
LocationPromiseService.promiseCompletionHandler = []
var res = UniWifiResult(UTSJSONObject([
    "errSubject": "uni-stopWifi",
    "errCode": 0 as NSNumber,
    "errMsg": "stopWifi:ok",
    "wifi": nil
]))
option.success?(res)
option.complete?(res)
}
public var getWifiList: GetWifiList = {
(_ option: GetWifiListOptions) -> Void in
var err = WifiFailImpl(getErrcode(12001))
option.fail?(err)
option.complete?(err)
}
public var onGetWifiList: OnGetWifiList = {
(_ callback: @escaping UniGetWifiListCallback) -> Void in
}
public var offGetWifiList: OffGetWifiList = {
(_ callback: @escaping UniWifiCallback) -> Void in
}
public var getConnectedWifi: GetConnectedWifi = {
(_ option: GetConnectedWifiOptions) -> Void in
if (UniWiFiModuleGloabInfo.alreadyStartWifi == false) {
    var err = WifiFailImpl(getErrcode(12000))
    option.fail?(err)
    option.complete?(err)
} else {
    if (UIDevice.current.systemVersion >= "13.0") {
        requestLocationPromise({
        (_ success) -> Void in
        if (success == true) {
            fetchConnectedWifiWithLocationPromise(option)
        } else {
            var err = WifiFailImpl(getErrcode(12007))
            option.fail?(err)
            option.complete?(err)
        }
        })
    } else {
        fetchConnectedWifiWithLocationPromise(option)
    }
}
}
public var connectWifi: ConnectWifi = {
(_ option: WifiConnectOption) -> Void in
var err = WifiFailImpl(getErrcode(12001))
option.fail?(err)
option.complete?(err)
}
public var onWifiConnected: OnWifiConnected = {
(_ callback: @escaping UniWifiResultCallback) -> Void in
}
public var onWifiConnectedWithPartialInfo: OnWifiConnectedWithPartialInfo = {
(_ callback: @escaping UniWifiResultCallbackWithPartialInfo) -> Void in
}
public var offWifiConnected: OffWifiConnected = {
(_ callback: UniWifiCallback?) -> Void in
}
public var offWifiConnectedWithPartialInfo: OffWifiConnectedWithPartialInfo = {
(_ callback: UniWifiResultCallbackWithPartialInfo?) -> Void in
}
public var setWifiList: SetWifiList = {
(_ option: SetWifiListOptions) -> Void in
var err = WifiFailImpl(getErrcode(12001))
option.fail?(err)
option.complete?(err)
}
@objc(UTSSDKModulesUniWifiStartWifiOptionsJSONObject)
@objcMembers
public class StartWifiOptionsJSONObject : NSObject {
    public var success: UTSCallback?
    public var fail: UTSCallback?
    public var complete: UTSCallback?
}
@objc(UTSSDKModulesUniWifiStopWifiOptionsJSONObject)
@objcMembers
public class StopWifiOptionsJSONObject : NSObject {
    public var success: UTSCallback?
    public var fail: UTSCallback?
    public var complete: UTSCallback?
}
@objc(UTSSDKModulesUniWifiGetWifiListOptionsJSONObject)
@objcMembers
public class GetWifiListOptionsJSONObject : NSObject {
    public var success: UTSCallback?
    public var fail: UTSCallback?
    public var complete: UTSCallback?
}
@objc(UTSSDKModulesUniWifiSetWifiListOptionsJSONObject)
@objcMembers
public class SetWifiListOptionsJSONObject : NSObject {
    public var success: UTSCallback?
    public var fail: UTSCallback?
    public var complete: UTSCallback?
}
@objc(UTSSDKModulesUniWifiWifiConnectOptionJSONObject)
@objcMembers
public class WifiConnectOptionJSONObject : NSObject {
    public var SSID: String?
    public var BSSID: String?
    public var password: String?
    public var maunal: Bool = false
    public var partialInfo: Bool = false
    public var success: UTSCallback?
    public var fail: UTSCallback?
    public var complete: UTSCallback?
}
@objc(UTSSDKModulesUniWifiGetConnectedWifiOptionsJSONObject)
@objcMembers
public class GetConnectedWifiOptionsJSONObject : NSObject {
    public var partialInfo: Bool = false
    public var success: UTSCallback?
    public var fail: UTSCallback?
    public var complete: UTSCallback?
}
public func startWifiByJs(_ option: StartWifiOptionsJSONObject) -> Void {
    return startWifi(StartWifiOptions(UTSJSONObject([
        "success": {
        (res: UniWifiResult) -> Void in
        option.success?(res)
        },
        "fail": {
        (res: UniError) -> Void in
        option.fail?(res)
        },
        "complete": {
        (res: Any) -> Void in
        option.complete?(res)
        }
    ])))
}
public func stopWifiByJs(_ option: StopWifiOptionsJSONObject) -> Void {
    return stopWifi(StopWifiOptions(UTSJSONObject([
        "success": {
        (res: UniWifiResult) -> Void in
        option.success?(res)
        },
        "fail": {
        (res: UniError) -> Void in
        option.fail?(res)
        },
        "complete": {
        (res: Any) -> Void in
        option.complete?(res)
        }
    ])))
}
public func getWifiListByJs(_ option: GetWifiListOptionsJSONObject) -> Void {
    return getWifiList(GetWifiListOptions(UTSJSONObject([
        "success": {
        (res: UniWifiResult) -> Void in
        option.success?(res)
        },
        "fail": {
        (res: UniError) -> Void in
        option.fail?(res)
        },
        "complete": {
        (res: Any) -> Void in
        option.complete?(res)
        }
    ])))
}
public func onGetWifiListByJs(_ callback: UTSCallback) -> Void {
    return onGetWifiList({
    (wifiInfo: UTSJSONObject) -> Void in
    callback(wifiInfo)
    })
}
public func offGetWifiListByJs(_ callback: UTSCallback) -> Void {
    return offGetWifiList({
    () -> Void in
    callback()
    })
}
public func getConnectedWifiByJs(_ option: GetConnectedWifiOptionsJSONObject) -> Void {
    return getConnectedWifi(GetConnectedWifiOptions(UTSJSONObject([
        "partialInfo": option.partialInfo,
        "success": {
        (res: UniWifiResult) -> Void in
        option.success?(res)
        },
        "fail": {
        (res: UniError) -> Void in
        option.fail?(res)
        },
        "complete": {
        (res: Any) -> Void in
        option.complete?(res)
        }
    ])))
}
public func connectWifiByJs(_ option: WifiConnectOptionJSONObject) -> Void {
    return connectWifi(WifiConnectOption(UTSJSONObject([
        "SSID": option.SSID,
        "BSSID": option.BSSID,
        "password": option.password,
        "maunal": option.maunal,
        "partialInfo": option.partialInfo,
        "success": {
        (res: UniWifiResult) -> Void in
        option.success?(res)
        },
        "fail": {
        (res: UniError) -> Void in
        option.fail?(res)
        },
        "complete": {
        (res: Any) -> Void in
        option.complete?(res)
        }
    ])))
}
public func onWifiConnectedByJs(_ callback: UTSCallback) -> Void {
    return onWifiConnected({
    (wifiInfo: UniWifiResult) -> Void in
    callback(wifiInfo)
    })
}
public func onWifiConnectedWithPartialInfoByJs(_ callback: UTSCallback) -> Void {
    return onWifiConnectedWithPartialInfo({
    (wifiInfo: UniWifiInfoWithPartialInfo) -> Void in
    callback(wifiInfo)
    })
}
public func offWifiConnectedByJs(_ callback: UTSCallback?) -> Void {
    return offWifiConnected({
    () -> Void in
    callback?()
    })
}
public func offWifiConnectedWithPartialInfoByJs(_ callback: UTSCallback?) -> Void {
    return offWifiConnectedWithPartialInfo({
    (wifiInfo: UniWifiInfoWithPartialInfo) -> Void in
    callback?(wifiInfo)
    })
}
public func setWifiListByJs(_ option: SetWifiListOptionsJSONObject) -> Void {
    return setWifiList(SetWifiListOptions(UTSJSONObject([
        "success": {
        (res: UniWifiResult) -> Void in
        option.success?(res)
        },
        "fail": {
        (res: UniError) -> Void in
        option.fail?(res)
        },
        "complete": {
        (res: Any) -> Void in
        option.complete?(res)
        }
    ])))
}
@objc(UTSSDKModulesUniWifiIndexSwift)
@objcMembers
public class UTSSDKModulesUniWifiIndexSwift : NSObject {
    public static func s_startWifiByJs(_ option: StartWifiOptionsJSONObject) -> Void {
        return startWifiByJs(option)
    }
    public static func s_stopWifiByJs(_ option: StopWifiOptionsJSONObject) -> Void {
        return stopWifiByJs(option)
    }
    public static func s_getWifiListByJs(_ option: GetWifiListOptionsJSONObject) -> Void {
        return getWifiListByJs(option)
    }
    public static func s_onGetWifiListByJs(_ callback: UTSCallback) -> Void {
        return onGetWifiListByJs(callback)
    }
    public static func s_offGetWifiListByJs(_ callback: UTSCallback) -> Void {
        return offGetWifiListByJs(callback)
    }
    public static func s_getConnectedWifiByJs(_ option: GetConnectedWifiOptionsJSONObject) -> Void {
        return getConnectedWifiByJs(option)
    }
    public static func s_connectWifiByJs(_ option: WifiConnectOptionJSONObject) -> Void {
        return connectWifiByJs(option)
    }
    public static func s_onWifiConnectedByJs(_ callback: UTSCallback) -> Void {
        return onWifiConnectedByJs(callback)
    }
    public static func s_onWifiConnectedWithPartialInfoByJs(_ callback: UTSCallback) -> Void {
        return onWifiConnectedWithPartialInfoByJs(callback)
    }
    public static func s_offWifiConnectedByJs(_ callback: UTSCallback?) -> Void {
        return offWifiConnectedByJs(callback)
    }
    public static func s_offWifiConnectedWithPartialInfoByJs(_ callback: UTSCallback?) -> Void {
        return offWifiConnectedWithPartialInfoByJs(callback)
    }
    public static func s_setWifiListByJs(_ option: SetWifiListOptionsJSONObject) -> Void {
        return setWifiListByJs(option)
    }
}
