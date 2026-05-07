@file:Suppress("UNCHECKED_CAST", "USELESS_CAST", "INAPPLICABLE_JVM_NAME", "UNUSED_ANONYMOUS_PARAMETER", "NAME_SHADOWING", "UNNECESSARY_NOT_NULL_ASSERTION")
package uts.sdk.modules.uniWifi
import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.wifi.ScanResult
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiConfiguration.AuthAlgorithm
import android.net.wifi.WifiConfiguration.KeyMgmt
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.text.TextUtils
import androidx.core.app.ActivityCompat
import io.dcloud.uniapp.*
import io.dcloud.uniapp.extapi.*
import io.dcloud.uts.*
import io.dcloud.uts.Map
import io.dcloud.uts.Set
import io.dcloud.uts.UTSAndroid
import kotlin.properties.Delegates
import kotJiuBao.coroutines.CoroutineScope
import kotJiuBao.coroutines.Deferred
import kotJiuBao.coroutines.Dispatchers
import kotJiuBao.coroutines.async
open class StartWifiOptions (
    open var success: ((res: UniWifiResult) -> Unit)? = null,
    open var fail: ((res: UniError) -> Unit)? = null,
    open var complete: ((res: Any) -> Unit)? = null,
) : UTSObject()
open class StopWifiOptions (
    open var success: ((res: UniWifiResult) -> Unit)? = null,
    open var fail: ((res: UniError) -> Unit)? = null,
    open var complete: ((res: Any) -> Unit)? = null,
) : UTSObject()
open class GetWifiListOptions (
    open var success: ((res: UniWifiResult) -> Unit)? = null,
    open var fail: ((res: UniError) -> Unit)? = null,
    open var complete: ((res: Any) -> Unit)? = null,
) : UTSObject()
open class WifiConnectOption (
    open var SSID: String? = null,
    open var BSSID: String? = null,
    open var password: String? = null,
    open var maunal: Boolean? = null,
    open var partialInfo: Boolean? = null,
    open var success: ((res: UniWifiResult) -> Unit)? = null,
    open var fail: ((res: UniError) -> Unit)? = null,
    open var complete: ((res: Any) -> Unit)? = null,
) : UTSObject()
open class GetConnectedWifiOptions (
    open var partialInfo: Boolean? = null,
    open var success: ((res: UniWifiResult) -> Unit)? = null,
    open var fail: ((res: UniError) -> Unit)? = null,
    open var complete: ((res: Any) -> Unit)? = null,
) : UTSObject()
open class UniWifiInfo (
    @JsonNotNull
    open var SSID: String,
    open var BSSID: String? = null,
    open var secure: Boolean? = null,
    open var signalStrength: Number? = null,
    open var frequency: Number? = null,
) : UTSObject()
open class UniWifiInfoWithPartialInfo (
    @JsonNotNull
    open var SSID: String,
) : UTSObject()
open class UniWifiResult (
    @JsonNotNull
    open var errCode: Number,
    @JsonNotNull
    open var errSubject: String,
    @JsonNotNull
    open var errMsg: String,
    open var wifi: UniWifiInfo? = null,
) : UTSObject()
typealias UniWifiCallback = () -> Unit
typealias UniGetWifiListCallback = (wifiInfo: UTSJSONObject) -> Unit
typealias UniWifiResultCallback = (wifiInfo: UniWifiResult) -> Unit
typealias UniWifiResultCallbackWithPartialInfo = (wifiInfo: UniWifiInfoWithPartialInfo) -> Unit
typealias WifiErrorCode = Number
interface WifiFail : IUniError {
    override var errCode: WifiErrorCode
}
val UniErrorSubject = "uni-wifi"
val WifiUniErrors: Map<WifiErrorCode, String> = Map(_uA(
    _uA(
        12000,
        "not init."
    ),
    _uA(
        12001,
        "system not support"
    ),
    _uA(
        12002,
        "password error Wi-Fi"
    ),
    _uA(
        12005,
        "wifi not turned on"
    ),
    _uA(
        12007,
        "user denied"
    ),
    _uA(
        12010,
        "unknown error"
    ),
    _uA(
        12013,
        "wifi config may be expired"
    )
))
fun getErrcode(errCode: Number): WifiErrorCode {
    val res = WifiUniErrors[errCode]
    return if (res == null) {
        12000
    } else {
        errCode
    }
}
open class WifiFailImpl : UniError, WifiFail {
    constructor(errCode: WifiErrorCode) : super() {
        this.errSubject = UniErrorSubject
        this.errCode = errCode
        this.errMsg = WifiUniErrors[errCode] ?: ""
    }
}
open class Global {
    companion object {
        var mReceiver: CustomBroadcastReceiver? = null
        var WIFI_AUTH_OPEN: String = ""
        var WIFI_AUTH_ROAM: String = "[ESS]"
        var scanList: UTSArray<AndroidUniWifiInfo> = _uA()
        var onGetWifiListCallback: UniGetWifiListCallback? = null
        var supendGetWifiSuccess: UniWifiResultCallback? = null
        var supendGetWifiComplete: UniWifiResultCallback? = null
        var onWifiConnectCallbackList: UTSArray<UniWifiResultCallback> = _uA()
        var onWifiConnectWithPartialInfoCallbackList: UTSArray<UniWifiResultCallbackWithPartialInfo> = _uA()
    }
}
fun isHex(key: String): Boolean {
    run {
        var i = key.length - 1
        while(i >= 0){
            var c = key.charAt(i)
            if (!(c >= "0" && c <= "9" || c >= "A" && c <= "F" || c >= "a" && c <= "f")) {
                return false
            }
            i--
        }
    }
    return true
}
fun isHexWepKey(wepKey: String): Boolean {
    var len = wepKey.length
    if (len != 10 && len != 26 && len != 58) {
        return false
    }
    return isHex(wepKey)
}
open class AndroidUniWifiInfo (
    @JsonNotNull
    open var SSID: String,
    open var BSSID: String? = null,
    @JsonNotNull
    open var secure: Boolean = false,
    @JsonNotNull
    open var signalStrength: Number,
    @JsonNotNull
    open var frequency: Number,
    @JsonNotNull
    open var securityType: String,
) : UTSObject()
fun wrapUniWifiInfoFromAndroid(androidInfo: AndroidUniWifiInfo): UniWifiInfo {
    var ret = UniWifiInfo(SSID = androidInfo.SSID, BSSID = androidInfo.BSSID, secure = androidInfo.secure, signalStrength = androidInfo.signalStrength, frequency = androidInfo.frequency)
    return ret
}
fun wrapUniWifiInfoFromScan(scanResult: ScanResult): AndroidUniWifiInfo {
    var ret = AndroidUniWifiInfo(SSID = "", secure = false, signalStrength = 0, frequency = 0, securityType = "NONE")
    if (scanResult != null) {
        ret.BSSID = scanResult.BSSID
        ret.SSID = scanResult.SSID
        ret.signalStrength = scanResult.level
        ret.frequency = scanResult.frequency
        ret.secure = false
        var capabilities = scanResult.capabilities.trim()
        if ((capabilities.equals(Global.WIFI_AUTH_OPEN) || capabilities.equals(Global.WIFI_AUTH_ROAM))) {
            ret.secure = false
        } else {
            ret.secure = true
        }
        ret.securityType = getSecurityType(scanResult)
    }
    return ret
}
fun wrapUniWifiInfoFromConnectInfo(connectInfo: WifiInfo): UniWifiInfo {
    var ret = UniWifiInfo(SSID = "", secure = false, signalStrength = 0, frequency = 0)
    if (connectInfo.getSSID() != null) {
        var s = connectInfo.getSSID()
        if (s.length > 2 && s.charAt(0) == "\"" && s.charAt(s.length - 1) == "\"") {
            s = s.substring(1, s.length - 1)
        }
        ret.SSID = s
    }
    ret.BSSID = connectInfo.getBSSID()
    ret.signalStrength = connectInfo.getRssi() + 100
    ret.frequency = connectInfo.getFrequency()
    return ret
}
@Suppress("DEPRECATION")
fun wrapWifiConfiguration(SSID: String, password: String?, passwordType: String): WifiConfiguration {
    var config = WifiConfiguration()
    config.status = WifiConfiguration.Status.ENABLED
    config.allowedAuthAlgorithms.clear()
    config.allowedGroupCiphers.clear()
    config.allowedKeyManagement.clear()
    config.allowedPairwiseCiphers.clear()
    config.allowedProtocols.clear()
    config.SSID = "\"".concat(SSID).concat("\"")
    if ("NONE".equals(passwordType) || password == null) {
        config.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.NONE)
    } else if ("WEP".equals(passwordType)) {
        if (password != null && !TextUtils.isEmpty(password)) {
            if (isHexWepKey(password)) {
                config.wepKeys[0] = password
            } else {
                config.wepKeys[0] = "\"".concat(password).concat("\"")
            }
        }
        config.allowedAuthAlgorithms.set(AuthAlgorithm.OPEN)
        config.allowedAuthAlgorithms.set(AuthAlgorithm.SHARED)
        config.allowedKeyManagement.set(KeyMgmt.NONE)
        config.wepTxKeyIndex = 0
    } else if ("WPA".equals(passwordType)) {
        config.allowedProtocols.set(WifiConfiguration.Protocol.RSN)
        config.allowedProtocols.set(WifiConfiguration.Protocol.WPA)
        config.allowedKeyManagement.set(WifiConfiguration.KeyMgmt.WPA_PSK)
        config.allowedPairwiseCiphers.set(WifiConfiguration.PairwiseCipher.CCMP)
        config.allowedPairwiseCiphers.set(WifiConfiguration.PairwiseCipher.TKIP)
        config.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.WEP40)
        config.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.WEP104)
        config.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.CCMP)
        config.allowedGroupCiphers.set(WifiConfiguration.GroupCipher.TKIP)
        config.preSharedKey = "\"".concat(password).concat("\"")
    }
    return config
}
fun getSecurityType(result: ScanResult): String {
    if (result.capabilities.contains("WEP")) {
        return "WEP"
    } else if (result.capabilities.contains("PSK")) {
        return "WPA"
    } else if (result.capabilities.contains("EAP")) {
        return "EAP"
    }
    return "NONE"
}
fun zeroCountNum(source: String?): Number {
    if (source == null) {
        return 0
    }
    var splitted = source.split(":")
    var countNum: Number = 0
    for(perItem in resolveUTSKeyIterator(splitted)){
        if (perItem == "00") {
            countNum += 1
        }
    }
    return countNum
}
@Suppress("UNUSED_PARAMETER", "DEPRECATION")
open class CustomBroadcastReceiver : BroadcastReceiver {
    open var mWifiManager: WifiManager? = null
    constructor(wifiManager: WifiManager) : super() {
        this.mWifiManager = wifiManager
    }
    override fun onReceive(_context: Context, intent: Intent): Unit {
        if (intent.action == WifiManager.WIFI_STATE_CHANGED_ACTION) {
            var state = intent.getIntExtra(WifiManager.EXTRA_WIFI_STATE, WifiManager.WIFI_STATE_UNKNOWN)
            if (state == WifiManager.WIFI_STATE_ENABLED) {
                var uniWifiInfo = UniWifiInfo("", "", false, 0, 0)
                setTimeout(fun() {
                    var winfo = this.mWifiManager!!.getConnectionInfo()
                    if (winfo != null && winfo.bssid != null && zeroCountNum(winfo.bssid) < 3) {
                        uniWifiInfo = wrapUniWifiInfoFromConnectInfo(winfo)
                        var res = UniWifiResult(0, UniErrorSubject, "onWifiConnected:ok", uniWifiInfo)
                        for(perCallback in resolveUTSKeyIterator(Global.onWifiConnectCallbackList)){
                            perCallback(res)
                        }
                        var connectedWithPartialInfo = UniWifiInfoWithPartialInfo(uniWifiInfo.SSID)
                        for(perCallback in resolveUTSKeyIterator(Global.onWifiConnectWithPartialInfoCallbackList)){
                            perCallback(connectedWithPartialInfo)
                        }
                    }
                }
                , 100)
            }
        }
        if (intent.action == WifiManager.SCAN_RESULTS_AVAILABLE_ACTION) {
            startWifiScaning = false
            var results = this.mWifiManager!!.scanResults
            if (results != null) {
                Global.scanList = _uA()
                for(scanResult in resolveUTSKeyIterator(results)){
                    if (scanResult.SSID == null) {
                        continue
                    }
                    Global.scanList.push(wrapUniWifiInfoFromScan(scanResult))
                }
                if (Global.onGetWifiListCallback != null) {
                    val data = UTSJSONObject()
                    data["wifiList"] = Global.scanList
                    Global.onGetWifiListCallback?.invoke(data)
                    Global.onGetWifiListCallback = null
                }
            }
            var ret = UniWifiResult(0, UniErrorSubject, "getWifiList:ok", null)
            if (Global.supendGetWifiSuccess != null) {
                Global.supendGetWifiSuccess?.invoke(ret)
                Global.supendGetWifiSuccess = null
            }
            if (Global.supendGetWifiComplete != null) {
                Global.supendGetWifiComplete?.invoke(ret)
                Global.supendGetWifiComplete = null
            }
        }
    }
}
var startWifiScaning = false
@Suppress("DEPRECATION")
fun startWifiImpl(option: StartWifiOptions) {
    var wifiManager: WifiManager = UTSAndroid.getAppContext()!!.getSystemService(Context.WIFI_SERVICE) as WifiManager
    if (!wifiManager.isWifiEnabled()) {
        var failResult = WifiFailImpl(getErrcode(12005))
        option.fail?.invoke(failResult)
        option.complete?.invoke(failResult)
        return
    }
    if (Global.mReceiver != null) {
        var result = UniWifiResult(0, UniErrorSubject, "startWifi:ok", null)
        option.success?.invoke(result)
        option.complete?.invoke(result)
        return
    }
    Global.mReceiver = CustomBroadcastReceiver(wifiManager)
    var filter = IntentFilter()
    filter.addAction(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
    filter.addAction(WifiManager.WIFI_STATE_CHANGED_ACTION)
    filter.addAction(WifiManager.SUPPLICANT_STATE_CHANGED_ACTION)
    UTSAndroid.getUniActivity()!!.registerReceiver(Global.mReceiver, filter)
    UTSAndroid.onAppActivityDestroy(fun() {
        if (Global.mReceiver != null) {
            UTSAndroid.getUniActivity()!!.unregisterReceiver(Global.mReceiver)
            Global.mReceiver = null
            Global.scanList = _uA()
            Global.onGetWifiListCallback = null
            Global.onWifiConnectCallbackList = _uA()
            Global.onWifiConnectWithPartialInfoCallbackList = _uA()
        }
    }
    )
    startWifiScaning = true
    wifiManager.startScan()
    var result = UniWifiResult(0, UniErrorSubject, "startWifi:ok", null)
    option.success?.invoke(result)
    option.complete?.invoke(result)
}
@Suppress("DEPRECATION")
fun startWifi(option: StartWifiOptions) {
    var permissionNeed = _uA(
        "android.permission.ACCESS_FINE_LOCATION"
    )
    UTSAndroid.requestSystemPermission(UTSAndroid.getUniActivity()!!, permissionNeed, fun(allRight: Boolean, _grantedList: UTSArray<String>) {
        if (allRight) {
            startWifiImpl(option)
        }
    }
    , fun(_doNotAskAgain: Boolean, _grantedList: UTSArray<String>) {
        var err = WifiFailImpl(getErrcode(12001))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
    }
    )
}
@Suppress("DEPRECATION")
fun getWifiList(option: GetWifiListOptions) {
    if (Global.mReceiver == null) {
        var err = WifiFailImpl(getErrcode(12000))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    var wifiManager: WifiManager = UTSAndroid.getAppContext()!!.getSystemService(Context.WIFI_SERVICE) as WifiManager
    if (option.success != null) {
        Global.supendGetWifiSuccess = option.success!!
    }
    if (option.complete != null) {
        Global.supendGetWifiComplete = option.complete!!
    }
    wifiManager.startScan()
}
fun onWifiConnected(callback: UniWifiResultCallback) {
    Global.onWifiConnectCallbackList.push(callback)
}
fun onWifiConnectedWithPartialInfo(callback: UniWifiResultCallbackWithPartialInfo) {
    Global.onWifiConnectWithPartialInfoCallbackList.push(callback)
}
fun offWifiConnected(callback: UniWifiResultCallback?) {
    if (callback == null) {
        Global.onWifiConnectCallbackList = _uA()
        return
    }
    var callbackIndex = Global.onWifiConnectCallbackList.indexOf(callback)
    if (callbackIndex >= 0) {
        Global.onWifiConnectCallbackList.splice(callbackIndex, 1)
    }
}
fun offWifiConnectedWithPartialInfo(callback: UniWifiResultCallbackWithPartialInfo?) {
    if (callback == null) {
        Global.onWifiConnectWithPartialInfoCallbackList = _uA()
        return
    }
    var callbackIndex = Global.onWifiConnectWithPartialInfoCallbackList.indexOf(callback)
    if (callbackIndex >= 0) {
        Global.onWifiConnectWithPartialInfoCallbackList.splice(callbackIndex, 1)
    }
}
fun onGetWifiList(callback: UniGetWifiListCallback) {
    Global.onGetWifiListCallback = callback
}
fun offGetWifiList(callback: UniWifiCallback?) {
    Global.onGetWifiListCallback = null
    Global.supendGetWifiComplete = null
    Global.supendGetWifiSuccess = null
}
fun realWifiConnect(option: WifiConnectOption) {
    if (Global.mReceiver == null || Global.scanList.length < 1) {
        var err = WifiFailImpl(getErrcode(12000))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    var scanWifiInfo: AndroidUniWifiInfo? = null
    for(scanResult in resolveUTSKeyIterator(Global.scanList)){
        if (scanResult.SSID.equals(option.SSID)) {
            scanWifiInfo = scanResult
        }
    }
    if (scanWifiInfo == null) {
        var err = WifiFailImpl(getErrcode(12000))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    var wifiConfigration = wrapWifiConfiguration(scanWifiInfo.SSID, option.password, scanWifiInfo.securityType)
    wifiConfigration.BSSID = scanWifiInfo.BSSID
    var wifiManager: WifiManager = UTSAndroid.getAppContext()!!.getSystemService(Context.WIFI_SERVICE) as WifiManager
    var targetExistConfig: WifiConfiguration? = null
    var existingConfigs = wifiManager.getConfiguredNetworks()
    for(existingConfig in resolveUTSKeyIterator(existingConfigs)){
        if (existingConfig.SSID.equals("\"" + option.SSID + "\"")) {
            targetExistConfig = existingConfig
        }
    }
    if (targetExistConfig != null) {
        var removeRet = wifiManager.removeNetwork(targetExistConfig.networkId)
        if (!removeRet) {
            if (Build.VERSION.SDK_INT > 28) {
                var err = WifiFailImpl(getErrcode(12001))
                option.fail?.invoke(err)
                option.complete?.invoke(err)
            } else {
                var err = WifiFailImpl(getErrcode(12013))
                option.fail?.invoke(err)
                option.complete?.invoke(err)
            }
            return
        }
    }
    var currentConnect = wifiManager.getConnectionInfo()
    if (currentConnect.networkId >= 0) {
        wifiManager.disableNetwork(currentConnect.networkId)
    } else {
        wifiManager.removeNetwork(currentConnect.networkId)
    }
    wifiManager.disconnect()
    var connected = false
    try {
        var netID = wifiManager.addNetwork(wifiConfigration)
        if (netID < 0) {
            var err = WifiFailImpl(getErrcode(12002))
            option.fail?.invoke(err)
            option.complete?.invoke(err)
            return
        }
        var enabled = wifiManager.enableNetwork(netID, true)
        if (!enabled) {
            var err = WifiFailImpl(getErrcode(12007))
            option.fail?.invoke(err)
            option.complete?.invoke(err)
            return
        }
        connected = wifiManager.reconnect()
    }
     catch (e: Throwable) {
        connected = false
        console.log(e)
    }
    if (!connected) {
        var err = WifiFailImpl(getErrcode(12010))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    var result = UniWifiResult(0, UniErrorSubject, "getWifiList:ok", null)
    wifiManager.saveConfiguration()
    if (option.partialInfo != null && option.partialInfo == true) {
        var wifiPartialInfo = UniWifiInfo(SSID = scanWifiInfo.SSID)
        result.wifi = wifiPartialInfo
    } else {
        result.wifi = wrapUniWifiInfoFromAndroid(scanWifiInfo)
    }
    option.success?.invoke(result)
    option.complete?.invoke(result)
}
@Suppress("UNUSED_PARAMETER", "DEPRECATION")
fun connectWifi(option: WifiConnectOption) {
    if (option.maunal == true) {
        var manunalIntent = Intent(android.provider.Settings.ACTION_WIFI_SETTINGS)
        UTSAndroid.getUniActivity()!!.startActivity(manunalIntent)
        var result = UniWifiResult(0, UniErrorSubject, "connectWifi:ok", null)
        option.success?.invoke(result)
        option.complete?.invoke(result)
        return
    }
    if (startWifiScaning) {
        var taskCount: Number = 0
        var taskId: Number = 0
        taskId = setInterval(fun() {
            taskCount += 1
            if (taskCount >= 5 || startWifiScaning == false) {
                clearInterval(taskId)
                realWifiConnect(option)
            }
        }, 2000)
        UTSAndroid.onAppActivityDestroy(fun() {
            clearInterval(taskId)
        })
    } else {
        realWifiConnect(option)
    }
}
fun stopWifi(option: StopWifiOptions) {
    if (Global.mReceiver == null) {
        var err = WifiFailImpl(getErrcode(12000))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    try {
        UTSAndroid.getUniActivity()!!.unregisterReceiver(Global.mReceiver)
    }
     catch (e: Throwable) {}
    Global.onGetWifiListCallback = null
    Global.onWifiConnectWithPartialInfoCallbackList = _uA()
    Global.onWifiConnectCallbackList = _uA()
    Global.mReceiver = null
    var ret = UniWifiResult(0, UniErrorSubject, "stopWifi:ok", null)
    option.success?.invoke(ret)
    option.complete?.invoke(ret)
}
@Suppress("DEPRECATION")
fun getConnectedWifi(option: GetConnectedWifiOptions) {
    var wifiInfo = UniWifiInfo(SSID = "")
    if (Global.mReceiver == null) {
        var err = WifiFailImpl(getErrcode(12000))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    if (ActivityCompat.checkSelfPermission(UTSAndroid.getUniActivity()!!, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
        var err = WifiFailImpl(getErrcode(12001))
        option.fail?.invoke(err)
        option.complete?.invoke(err)
        return
    }
    val context = UTSAndroid.getAppContext()
    if (context != null) {
        val wm = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val winfo = wm.getConnectionInfo()
        wifiInfo = wrapUniWifiInfoFromConnectInfo(winfo)
        var res = UniWifiResult(0, UniErrorSubject, "getConnectedWifi:ok", null)
        if (option.partialInfo != null && option.partialInfo == true) {
            var ret = UniWifiInfo(SSID = wifiInfo.SSID)
            res.wifi = ret
        } else {
            if (wifiInfo.BSSID == null || zeroCountNum(wifiInfo.BSSID) > 3) {
                var err = WifiFailImpl(getErrcode(12005))
                option.fail?.invoke(err)
                option.complete?.invoke(err)
                return
            }
            res.wifi = wifiInfo
        }
        option.success?.invoke(res)
        option.complete?.invoke(res)
        return
    }
    var err = WifiFailImpl(getErrcode(12000))
    option.fail?.invoke(err)
    option.complete?.invoke(err)
}
open class StartWifiOptionsJSONObject : UTSJSONObject() {
    open var success: UTSCallback? = null
    open var fail: UTSCallback? = null
    open var complete: UTSCallback? = null
}
open class StopWifiOptionsJSONObject : UTSJSONObject() {
    open var success: UTSCallback? = null
    open var fail: UTSCallback? = null
    open var complete: UTSCallback? = null
}
open class GetWifiListOptionsJSONObject : UTSJSONObject() {
    open var success: UTSCallback? = null
    open var fail: UTSCallback? = null
    open var complete: UTSCallback? = null
}
open class WifiConnectOptionJSONObject : UTSJSONObject() {
    open var SSID: String? = null
    open var BSSID: String? = null
    open var password: String? = null
    open var maunal: Boolean? = null
    open var partialInfo: Boolean? = null
    open var success: UTSCallback? = null
    open var fail: UTSCallback? = null
    open var complete: UTSCallback? = null
}
open class GetConnectedWifiOptionsJSONObject : UTSJSONObject() {
    open var partialInfo: Boolean? = null
    open var success: UTSCallback? = null
    open var fail: UTSCallback? = null
    open var complete: UTSCallback? = null
}
fun startWifiImplByJs(option: StartWifiOptionsJSONObject) {
    return startWifiImpl(StartWifiOptions(success = fun(res: UniWifiResult): Unit {
        option.success?.invoke(res)
    }
    , fail = fun(res: UniError): Unit {
        option.fail?.invoke(res)
    }
    , complete = fun(res: Any): Unit {
        option.complete?.invoke(res)
    }
    ))
}
fun startWifiByJs(option: StartWifiOptionsJSONObject) {
    return startWifi(StartWifiOptions(success = fun(res: UniWifiResult): Unit {
        option.success?.invoke(res)
    }
    , fail = fun(res: UniError): Unit {
        option.fail?.invoke(res)
    }
    , complete = fun(res: Any): Unit {
        option.complete?.invoke(res)
    }
    ))
}
fun getWifiListByJs(option: GetWifiListOptionsJSONObject) {
    return getWifiList(GetWifiListOptions(success = fun(res: UniWifiResult): Unit {
        option.success?.invoke(res)
    }
    , fail = fun(res: UniError): Unit {
        option.fail?.invoke(res)
    }
    , complete = fun(res: Any): Unit {
        option.complete?.invoke(res)
    }
    ))
}
fun onWifiConnectedByJs(callback: UTSCallback) {
    return onWifiConnected(if (callback.fnJS != null) {
        callback.fnJS
    } else {
        callback.fnJS = fun(wifiInfo: UniWifiResult){
            callback(wifiInfo)
        }
        callback.fnJS
    }
     as (wifiInfo: UniWifiResult) -> Unit)
}
fun onWifiConnectedWithPartialInfoByJs(callback: UTSCallback) {
    return onWifiConnectedWithPartialInfo(if (callback.fnJS != null) {
        callback.fnJS
    } else {
        callback.fnJS = fun(wifiInfo: UniWifiInfoWithPartialInfo){
            callback(wifiInfo)
        }
        callback.fnJS
    }
     as (wifiInfo: UniWifiInfoWithPartialInfo) -> Unit)
}
fun offWifiConnectedByJs(callback: UTSCallback?) {
    return offWifiConnected(if (callback == null) {
        null
    } else {
        if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(wifiInfo: UniWifiResult){
                callback(wifiInfo)
            }
            callback.fnJS
        }
         as (wifiInfo: UniWifiResult) -> Unit
    }
    )
}
fun offWifiConnectedWithPartialInfoByJs(callback: UTSCallback?) {
    return offWifiConnectedWithPartialInfo(if (callback == null) {
        null
    } else {
        if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(wifiInfo: UniWifiInfoWithPartialInfo){
                callback(wifiInfo)
            }
            callback.fnJS
        }
         as (wifiInfo: UniWifiInfoWithPartialInfo) -> Unit
    }
    )
}
fun onGetWifiListByJs(callback: UTSCallback) {
    return onGetWifiList(if (callback.fnJS != null) {
        callback.fnJS
    } else {
        callback.fnJS = fun(wifiInfo: UTSJSONObject){
            callback(wifiInfo)
        }
        callback.fnJS
    }
     as (wifiInfo: UTSJSONObject) -> Unit)
}
fun offGetWifiListByJs(callback: UTSCallback?) {
    return offGetWifiList(if (callback == null) {
        null
    } else {
        if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(){
                callback()
            }
            callback.fnJS
        }
         as () -> Unit
    }
    )
}
fun connectWifiByJs(option: WifiConnectOptionJSONObject) {
    return connectWifi(WifiConnectOption(SSID = option.SSID, BSSID = option.BSSID, password = option.password, maunal = option.maunal, partialInfo = option.partialInfo, success = fun(res: UniWifiResult): Unit {
        option.success?.invoke(res)
    }
    , fail = fun(res: UniError): Unit {
        option.fail?.invoke(res)
    }
    , complete = fun(res: Any): Unit {
        option.complete?.invoke(res)
    }
    ))
}
fun stopWifiByJs(option: StopWifiOptionsJSONObject) {
    return stopWifi(StopWifiOptions(success = fun(res: UniWifiResult): Unit {
        option.success?.invoke(res)
    }
    , fail = fun(res: UniError): Unit {
        option.fail?.invoke(res)
    }
    , complete = fun(res: Any): Unit {
        option.complete?.invoke(res)
    }
    ))
}
fun getConnectedWifiByJs(option: GetConnectedWifiOptionsJSONObject) {
    return getConnectedWifi(GetConnectedWifiOptions(partialInfo = option.partialInfo, success = fun(res: UniWifiResult): Unit {
        option.success?.invoke(res)
    }
    , fail = fun(res: UniError): Unit {
        option.fail?.invoke(res)
    }
    , complete = fun(res: Any): Unit {
        option.complete?.invoke(res)
    }
    ))
}
