@file:Suppress("UNCHECKED_CAST", "USELESS_CAST", "INAPPLICABLE_JVM_NAME", "UNUSED_ANONYMOUS_PARAMETER", "NAME_SHADOWING", "UNNECESSARY_NOT_NULL_ASSERTION")
package uts.sdk.modules.androidBle
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.clj.fastble.BleHelper
import com.clj.fastble.ByteUtil
import io.dcloud.uniapp.*
import io.dcloud.uniapp.extapi.*
import io.dcloud.uts.*
import io.dcloud.uts.Map
import io.dcloud.uts.Set
import io.dcloud.uts.UTSAndroid
import java.lang.Exception
import java.util.ArrayList
import java.util.HashMap
import kotlin.properties.Delegates
import kotJiuBao.coroutines.CoroutineScope
import kotJiuBao.coroutines.Deferred
import kotJiuBao.coroutines.Dispatchers
import kotJiuBao.coroutines.async
import org.json.JSONArray
import org.json.JSONObject
open class WNuuid (
    @JsonNotNull
    open var serviceId: String,
    @JsonNotNull
    open var wuuid: String,
    @JsonNotNull
    open var nuuid: String,
) : UTSObject()
open class ScanPara (
    open var btNameFilter: String? = null,
    open var fliterNames: UTSArray<String>? = null,
    open var scantime: Number? = null,
    open var showEmptyName: Number? = null,
    open var iosFilterUUIDs: UTSArray<String>? = null,
    open var onScanResult: ((b: MyApiResult) -> Unit)? = null,
    open var scanComplate: (() -> Unit)? = null,
) : UTSObject()
open class WriteData (
    @JsonNotNull
    open var serviceId: String,
    @JsonNotNull
    open var characteristicId: String,
    open var writeType: Number? = null,
    open var data: UTSArray<Number>? = null,
    open var hexStrData: String? = null,
    @JsonNotNull
    open var fenbao: Boolean = false,
) : UTSObject()
open class ScanRecord (
    open var deviceName: String? = null,
    open var txPowerLevel: Number? = null,
    open var bytes: String? = null,
    open var serviceData: String? = null,
    open var serviceUuids: String? = null,
    open var advertiseFlags: Number? = null,
    open var manufacturerSpecificData: String? = null,
    open var serviceSolicitationUuids: String? = null,
) : UTSObject()
open class Device (
    open var name: String? = null,
    open var iosLocalName: String? = null,
    open var alias: String? = null,
    open var bondState: Number? = null,
    open var type: Number? = null,
    @JsonNotNull
    open var address: String,
) : UTSObject()
open class BleScanResult (
    open var connectType: Number? = null,
    open var rssi: Number? = null,
    open var isLegacy: Boolean? = null,
    open var advertisingSid: Number? = null,
    open var dataStatus: Number? = null,
    open var isConnectable: Boolean? = null,
    open var periodicAdvertisingInterval: Number? = null,
    open var primaryPhy: Number? = null,
    open var secondaryPhy: Number? = null,
    open var timestampNanos: Number? = null,
    open var scanRecord: ScanRecord? = null,
    @JsonNotNull
    open var device: Device,
) : UTSObject()
open class MyApiResult (
    @JsonNotNull
    open var type: Number,
    @JsonNotNull
    open var message: String,
    @JsonNotNull
    open var data: Any,
) : UTSObject()
open class ScanRssiBR (
    @JsonNotNull
    open var mac: String,
    @JsonNotNull
    open var rssi: Number,
    @JsonNotNull
    open var data: String,
    open var iosLocalName: String? = null,
    open var name: String? = null,
    open var manufacturerData: String? = null,
) : UTSObject()
open class BleServices (
    @JsonNotNull
    open var type: Number,
    @JsonNotNull
    open var uuid: String,
    @JsonNotNull
    open var characteristics: UTSArray<Characteristics>,
) : UTSObject()
open class Characteristics (
    @JsonNotNull
    open var properties: CharacteristicsProperties,
    @JsonNotNull
    open var uuid: String,
    @JsonNotNull
    open var propertiesType: Number,
) : UTSObject()
open class CharacteristicsProperties (
    @JsonNotNull
    open var READ: Boolean = false,
    @JsonNotNull
    open var WRITE: Boolean = false,
    @JsonNotNull
    open var NOTIFY: Boolean = false,
    @JsonNotNull
    open var INDICATE: Boolean = false,
) : UTSObject()
open class NotityData (
    @JsonNotNull
    open var data: UTSArray<Number>,
    open var mac: String? = null,
    open var serviceId: String? = null,
    open var characteristicsId: String? = null,
) : UTSObject()
fun bleResult(type1: Number, message1: String, data1: Any): MyApiResult {
    return MyApiResult(type = type1, message = message1, data = data1)
}
open class BleLib : BroadcastReceiver {
    open var bleHelper: BleHelper? = null
    open lateinit var adapter: BluetoothAdapter
    open var onBleScanListener: OnBleScanListener? = null
    open var onBleConnectListener: OnBleConnectListener? = null
    open var onBleScanServicesListener: OnBleScanServicesListener? = null
    open var onBleWriteDataListener: OnBleWriteDataListener? = null
    open var onBleNotityListener: OnBleNotityListener? = null
    open var onMtuSetListener: OnMtuSetListener? = null
    open var sThis: BleLib = this
    open var scanTimer: Number = -1
    open var connectInternal: Number = 0
    open var connectCallback: ((sth: MyApiResult) -> Unit) = fun(res){}
    open var scanDataListenerCallback: ((sth: MyApiResult) -> Unit) = fun(res){}
    open var scanListenerMac: String? = null
    open var scanResultMap: HashMap<String, BleScanResult> = HashMap<String, BleScanResult>()
    open var beginToConnectMac: String? = null
    open var tarServiceUUID: String = ""
    open var wUUID: String? = null
    open var nUUID: String? = null
    open var readDataCallback: ((sth: MyApiResult) -> Unit) = fun(res){}
    open var indicateDataCallback: ((sth: MyApiResult) -> Unit) = fun(res){}
    open var btOpenStateCallback: ((sth: MyApiResult) -> Unit) = fun(res){}
    open var haveSetMtu: Boolean = false
    open var readrssiCallback: ((sth: MyApiResult) -> Unit) = fun(res){}
    open var wNList: UTSArray<String> = _uA<String>()
    open var debug: Boolean = false
    open var threadName: String = "main"
    open var isConnecting: Boolean = false
    open var connect_time_out: Number = 15000
    public open fun setBtConnectTimeout(time: Number) {
        this.connect_time_out = time
    }
    open var auto_connect_time: Number = 12000
    public open fun setBtAutoConnectTime(time: Number) {
        this.auto_connect_time = time
    }
    public open fun setDebugMode(debug: Boolean) {
        this.debug = debug
    }
    public open fun setThreadTypeName(name: String) {
        this.threadName = name
    }
    public open fun onBtOpenStateListener(callback: (sth: MyApiResult) -> Unit) {
        this.btOpenStateCallback = callback
        callback(bleResult(0, "", this.isEnabled()))
    }
    constructor() : super() {
        this.adapter = (UTSAndroid.getAppContext()!!.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).getAdapter()
        this.btListener()
    }
    public open fun btListener() {
        open class MyOnBleCallback : BleHelper.OnBleCallback {
            open lateinit var lib: BleLib
            open var connnetTimerid: Number = 0
            constructor(lib: BleLib){
                this.lib = lib
            }
            override fun onScanResult(result: ScanResult, json: JSONObject): Unit {
                var that = this
                UTSAndroid.getDispatcher(this.lib.threadName).async(fun(_) {
                    try {
                        var scan = JSON.parse<BleScanResult>(json.toString())
                        if (scan == null) {
                            return
                        }
                        if (that.lib.debug) {
                            console.log("scan= ", scan)
                        }
                        try {
                            that.lib.scanDataListenerCallback(bleResult(0, "", ScanRssiBR(rssi = scan.rssi!!, mac = result.device.address, data = scan.scanRecord!!.bytes!!, manufacturerData = "")))
                        }
                         catch (e: Exception) {}
                        if (that.lib.scanResultMap.get(scan.device.address) == null) {
                            if (that.lib.onBleScanListener != null) {
                                if (scan != null) {
                                    that.lib.onBleScanListener!!.onScanCall(bleResult(0, "", scan))
                                }
                            }
                        }
                        that.lib.scanResultMap.put(scan.device.address, scan)
                    }
                     catch (e: Exception) {}
                }
                , null)
            }
            override fun onConnectResult(code: Int, msg: String) {
                clearTimeout(this.connnetTimerid)
                var that = this
                this.connnetTimerid = setTimeout(fun() {
                    if (that.lib.onBleConnectListener != null) {
                        that.lib.onBleConnectListener!!.onConnect(bleResult(code, msg, 0))
                    }
                }
                , 600)
            }
            override fun onBtConnectStateChange(on: Boolean) {
                this.lib.btOpenStateCallback(bleResult(0, "", this.lib.isEnabled()))
            }
            override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int, json: JSONArray) {
                var bleServices = JSON.parse<UTSArray<BleServices>>(json.toString())
                if (bleServices == null) {
                    bleServices = _uA()
                }
                if (this.lib.onBleScanServicesListener != null) {
                    this.lib.onBleScanServicesListener!!.onScanService(bleResult(0, "成功扫描到服务", bleServices))
                }
            }
            override fun onGattDisconnect(state: Int) {
                if (this.lib.onBleConnectListener != null) {
                    this.lib.onBleConnectListener!!.onConnect(bleResult(1001, "蓝牙异常断开", ""))
                }
            }
            override fun onMtuCallBack(status: Int, s: String) {
                if (this.lib.onMtuSetListener != null) {
                    this.lib.onMtuSetListener!!.onMtu(bleResult(parseInt(status + ""), s.toString(), ""))
                }
            }
            override fun onWriteState(status: Int, s: String) {
                if (this.lib.onBleWriteDataListener != null) {
                    this.lib.onBleWriteDataListener!!.onWriteData(bleResult(parseInt(status + ""), s.toString(), ""))
                }
            }
            override fun onDataRead(value: ByteArray) {
                if (this.lib.onBleNotityListener != null) {
                    var num: UTSArray<Number> = _uA()
                    var d = value.size.valueOf()
                    run {
                        var i: Number = 0
                        while(i < d){
                            var data = value[i.toInt()].valueOf()
                            num.push(data and 0xff)
                            i++
                        }
                    }
                    this.lib.onBleNotityListener!!.onNotityData(bleResult(0, "", num))
                }
            }
            override fun onDataReads(value: ByteArray, s: String, c: String) {
                if (this.lib.onBleNotityListener != null) {
                    var num: UTSArray<Number> = _uA()
                    var d = value.size.valueOf()
                    run {
                        var i: Number = 0
                        while(i < d){
                            var data = value[i.toInt()].valueOf()
                            num.push(data and 0xff)
                            i++
                        }
                    }
                    this.lib.onBleNotityListener!!.onNotityDatas(bleResult(0, "", NotityData(data = num, characteristicsId = c, serviceId = s)))
                }
            }
            override fun onReadData(state: Boolean, value: ByteArray?) {
                if (state) {
                    if (value != null) {
                        var num: UTSArray<Number> = _uA()
                        var d = value.size.valueOf()
                        run {
                            var i: Number = 0
                            while(i < d){
                                var data = value[i.toInt()].valueOf()
                                num.push(data and 0xff)
                                i++
                            }
                        }
                        this.lib.readDataCallback(bleResult(0, "读取到数据", num))
                    }
                } else {
                    var num: UTSArray<Number> = _uA()
                    this.lib.readDataCallback(bleResult(10000, "读取到数据", num))
                }
            }
            override fun onIndicateCallback(state: Int, value: ByteArray?) {
                if (state == 0) {
                    if (value != null) {
                        var num: UTSArray<Number> = _uA()
                        var d = value.size.valueOf()
                        run {
                            var i: Number = 0
                            while(i < d){
                                var data = value[i.toInt()].valueOf()
                                num.push(data and 0xff)
                                i++
                            }
                        }
                        this.lib.indicateDataCallback(bleResult(UTSNumber.from(state), "", num))
                    }
                } else {
                    var num: UTSArray<Number> = _uA()
                    this.lib.indicateDataCallback(bleResult(UTSNumber.from(state), "", num))
                }
            }
            override fun onReadRssi(int: Int) {
                this.lib.readrssiCallback(bleResult(0, "rssi", UTSNumber.from(int)))
            }
            override fun onNotityStateCallback(state: Int, msg: String) {
                this.lib.onBleNotityListener!!.onNotityData(bleResult(UTSNumber.from(state), msg, _uA<Number>()))
            }
        }
        this.bleHelper = BleHelper(UTSAndroid.getAppContext()!!, this.adapter, MyOnBleCallback(this))
    }
    open fun openBtBluetooth(callback: (b: MyApiResult) -> Unit) {
        var that = this
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (this.isHavePermision("android.permission.BLUETOOTH_SCAN") || this.isHavePermision("android.permission.BLUETOOTH_CONNECT")) {
                that.openBt(callback)
            } else {
                this.requesMoretPermison(_uA(
                    "android.permission.BLUETOOTH_SCAN",
                    "android.permission.BLUETOOTH_CONNECT"
                ), fun(st: Boolean) {
                    if (st) {
                        that.openBt(callback)
                    } else {
                        callback!!(bleResult(10001, "无蓝牙权限", ""))
                    }
                })
            }
        } else {
            if (this.isHavePermision("android.permission.ACCESS_FINE_LOCATION")) {
                that.openBt(callback)
            } else {
                this.requestPermison("android.permission.ACCESS_FINE_LOCATION", fun(res: Boolean) {
                    if (res) {
                        that.openBt(callback)
                    } else {
                        callback!!(bleResult(10001, "无蓝牙权限", ""))
                    }
                }
                )
            }
        }
    }
    open fun openBt(callback: (b: MyApiResult) -> Unit) {
        if (!this.isEnabled()) {
            var enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            UTSAndroid.getUniActivity()!!.startActivityForResult(enableBtIntent, 0)
            UTSAndroid.onAppActivityResult(fun(requestCode: Int, resultCode: Int, data: Intent?){
                if (requestCode == 0) {
                    if (resultCode == Activity.RESULT_OK) {
                        callback(bleResult(0, "", ""))
                    } else {
                        callback(bleResult(1, "", ""))
                    }
                }
                UTSAndroid.offAppActivityResult()
            }
            )
        }
    }
    open fun readRssi(callback: (b: MyApiResult) -> Unit) {
        this.readrssiCallback = callback
        this.bleHelper!!.readRssi()
    }
    open fun openBluetooth(on: Boolean): Unit {
        this.bleHelper!!.openBle(this.adapter, on)
    }
    public override fun onReceive(context: Context, data: Intent): Unit {
        var action = data.getAction()
        when (action) {
            BluetoothAdapter.ACTION_STATE_CHANGED -> 
                {}
        }
    }
    public open fun openBluetoothSettings(): Unit {
        var intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        UTSAndroid.getAppContext()!!.startActivity(intent)
    }
    public open fun getSericUUID(): String {
        var s = this.tarServiceUUID
        return s
    }
    public open fun getServiceUUID(): String {
        var s = this.tarServiceUUID
        return s
    }
    public open fun getNotityUUID(): String {
        var s = this.nUUID!!
        return s
    }
    public open fun getWriteUUID(): String {
        var s = this.wUUID!!
        return s
    }
    public open fun getwriteUUID(): String {
        var s = this.wUUID!!
        return s
    }
    public open fun onScanDataListener(callback: (res: MyApiResult) -> Unit) {
        this.scanDataListenerCallback = callback
    }
    public open fun isHavePermision(pername: String): Boolean {
        return UTSAndroid.checkSystemPermissionGranted(UTSAndroid.getUniActivity()!!, _uA(
            pername
        ))
    }
    public open fun requestPermison(pername: String, callback: (sth: Boolean) -> Unit) {
        if (this.isHavePermision(pername)) {
            callback(true)
            return
        }
        UTSAndroid.requestSystemPermission(UTSAndroid.getUniActivity()!!, _uA(
            pername
        ), fun(_: Boolean, p: UTSArray<String>){
            callback(true)
        }
        , fun(_: Boolean, p: UTSArray<String>){
            callback(false)
        }
        )
    }
    public open fun requesMoretPermison(pername: UTSArray<String>, callback: (sth: Boolean) -> Unit) {
        UTSAndroid.requestSystemPermission(UTSAndroid.getUniActivity()!!, pername, fun(allRight: Boolean, _: UTSArray<String>) {
            if (allRight) {
                callback(true)
            } else {
                callback(false)
            }
        }
        , fun(_: Boolean, _: UTSArray<String>) {
            callback(false)
        }
        )
    }
    public open fun isEnabled(): Boolean {
        return this.adapter.isEnabled()
    }
    public open fun onStartScanBle(para: ScanPara) {
        if (para.scantime == null) {
            para.scantime = 10000
        }
        var that = this
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (this.isHavePermision("android.permission.BLUETOOTH_SCAN") || this.isHavePermision("android.permission.BLUETOOTH_CONNECT")) {
                this.onScanBle(para)
            } else {
                this.requesMoretPermison(_uA(
                    "android.permission.BLUETOOTH_SCAN",
                    "android.permission.BLUETOOTH_CONNECT"
                ), fun(st: Boolean) {
                    if (st) {
                        that.onScanBle(para)
                    } else {
                        if (para.onScanResult != null) {
                            para.onScanResult!!(bleResult(10001, "无蓝牙权限", ""))
                        }
                    }
                })
            }
        } else {
            if (this.isHavePermision("android.permission.ACCESS_FINE_LOCATION")) {
                this.onScanBle(para)
            } else {
                this.requestPermison("android.permission.ACCESS_FINE_LOCATION", fun(res: Boolean) {
                    if (res) {
                        that.onScanBle(para)
                    } else {
                        if (para.onScanResult != null) {
                            para.onScanResult!!(bleResult(10001, "无蓝牙权限", ""))
                        }
                    }
                }
                )
            }
        }
    }
    public open fun onScanBle(para: ScanPara) {
        if (!this.isEnabled()) {
            if (para.onScanResult != null) {
                para.onScanResult!!(bleResult(10002, "蓝牙未开启", ""))
            }
            return
        }
        if (para.showEmptyName == null) {
            para.showEmptyName = 0
        }
        this.stopScanBle()
        open class MyOnBleScanListener : OnBleScanListener {
            override fun onScanCall(scan: MyApiResult) {
                try {
                    if (para.onScanResult != null) {
                        para.onScanResult!!(scan)
                    }
                }
                 catch (e: Exception) {}
            }
        }
        this.onBleScanListener = MyOnBleScanListener()
        if (this.scanTimer != -1) {
            clearTimeout(this.scanTimer)
        }
        this.scanResultMap.clear()
        this.bleHelper!!.clearNameMap()
        var that = this
        var settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_BALANCED).build()
        var filters = ArrayList<ScanFilter>()
        this.bleHelper!!.setEmptyName(if (para.showEmptyName == 0) {
            true
        } else {
            false
        }
        )
        if (para.btNameFilter == null) {
            para.btNameFilter = ""
        }
        this.bleHelper!!.setBtFilterName(para.btNameFilter!!)
        if (para.fliterNames == null) {
            para.fliterNames = _uA<String>()
        }
        if (para.fliterNames != null) {
            var ll: ArrayList<String> = ArrayList()
            run {
                var i: Number = 0
                while(i < para.fliterNames!!.length){
                    ll.add(para.fliterNames!![i])
                    i++
                }
            }
            this.bleHelper!!.setFilterNameList(ll)
        }
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.adapter.getBluetoothLeScanner().startScan(filters, settings, that.bleHelper!!.leScanCallback)
        }
        , null)
        if (para.scantime != -1) {
            this.scanTimer = setTimeout(fun() {
                that.stopScanBle()
                if (para.scanComplate != null) {
                    para.scanComplate!!()
                }
            }
            , para.scantime!!)
        }
    }
    public open fun setPhy2MMode() {
        if (this.isConnected()) {
            this.bleHelper!!.setPhy2MMode()
        }
    }
    public open fun startScanBleDevice(reassignedTime: Number, callback: (sth: MyApiResult) -> Unit): Unit {
        var time = reassignedTime
        if (time == -1) {
            time = Integer.MAX_VALUE
        }
        var that = this
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (this.isHavePermision("android.permission.BLUETOOTH_SCAN") || this.isHavePermision("android.permission.BLUETOOTH_CONNECT")) {
                this.scanBle(time, callback)
            } else {
                this.requesMoretPermison(_uA(
                    "android.permission.BLUETOOTH_SCAN",
                    "android.permission.BLUETOOTH_CONNECT"
                ), fun(st: Boolean) {
                    if (st) {
                        that.scanBle(time, callback)
                    }
                })
            }
        } else {
            if (this.isHavePermision("android.permission.ACCESS_FINE_LOCATION")) {
                this.scanBle(time, callback)
            } else {
                this.requestPermison("android.permission.ACCESS_FINE_LOCATION", fun(res: Boolean) {
                    if (res) {
                        that.scanBle(time, callback)
                    } else {
                        callback(bleResult(10001, "无蓝牙权限", ""))
                    }
                }
                )
            }
        }
    }
    public open fun stopScanBle(): Unit {
        this.onBleScanListener = null
        if (this.scanTimer != -1) {
            clearTimeout(this.scanTimer)
        }
        var that = this
        if (this.adapter.getBluetoothLeScanner() != null) {
            UTSAndroid.getDispatcher("io").async(fun(_) {
                that.adapter.getBluetoothLeScanner().stopScan(that.bleHelper!!.leScanCallback)
            }
            , null)
        }
    }
    public open fun scanBle(time: Number, callback: (sth: MyApiResult) -> Unit) {
        if (!this.isEnabled()) {
            callback(bleResult(10002, "蓝牙未开启", ""))
            return
        }
        this.stopScanBle()
        open class MyOnBleScanListener : OnBleScanListener {
            override fun onScanCall(scan: MyApiResult) {
                try {
                    callback(scan)
                }
                 catch (e: Exception) {}
            }
        }
        this.onBleScanListener = MyOnBleScanListener()
        if (this.scanTimer != -1) {
            clearTimeout(this.scanTimer)
        }
        this.scanResultMap.clear()
        this.bleHelper!!.clearNameMap()
        var that = this
        var settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_BALANCED).build()
        var filters = ArrayList<ScanFilter>()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.adapter.getBluetoothLeScanner().startScan(filters, settings, that.bleHelper!!.leScanCallback)
        }
        , null)
        this.scanTimer = setTimeout(fun() {
            that.stopScanBle()
        }
        , time)
    }
    public open fun connect(mac: String, auto: Boolean, callback: (sth: MyApiResult) -> Unit): Unit {
        var that = this
        if (!this.isEnabled()) {
            callback(bleResult(10002, "蓝牙未开启", ""))
            return
        }
        this.beginToConnectMac = mac
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (this.isHavePermision("android.permission.ACCESS_FINE_LOCATION") && this.isHavePermision("android.permission.BLUETOOTH_SCAN") || this.isHavePermision("android.permission.BLUETOOTH_CONNECT")) {
                that.connectDevices(mac, auto, callback)
            } else {
                this.requesMoretPermison(_uA(
                    "android.permission.ACCESS_FINE_LOCATION",
                    "android.permission.BLUETOOTH_SCAN",
                    "android.permission.BLUETOOTH_CONNECT"
                ), fun(st: Boolean) {
                    if (st) {
                        that.connectDevices(mac, auto, callback)
                    } else {
                        callback(bleResult(10003, "无蓝牙权限", that.isEnabled()))
                    }
                })
            }
        } else {
            if (this.isHavePermision("android.permission.ACCESS_FINE_LOCATION")) {
                that.connectDevices(mac, auto, callback)
            } else {
                this.requestPermison("android.permission.ACCESS_FINE_LOCATION", fun(res: Boolean) {
                    if (res) {
                        that.connectDevices(mac, auto, callback)
                    } else {
                        callback(bleResult(10003, "无蓝牙权限", that.isEnabled()))
                    }
                }
                )
            }
        }
    }
    open var connect_timeoutId: Number = -1
    public open fun connectDevices(mac: String, auto: Boolean, callback: (sth: MyApiResult) -> Unit): Unit {
        if (this.isConnected()) {
            callback(bleResult(10004, "bluetooth is connected", ""))
            return
        }
        var that = this
        open class MyOnBleConnectListener : OnBleConnectListener {
            override fun onConnect(res: MyApiResult) {
                clearTimeout(that.connect_timeoutId)
                that.isConnecting = false
                callback(res)
            }
        }
        this.onBleConnectListener = MyOnBleConnectListener()
        this.connectCallback = callback
        if (this.connect_timeoutId != -1) {
            clearTimeout(this.connect_timeoutId)
        }
        this.connect_timeoutId = setTimeout(fun() {
            that.isConnecting = false
            that.bleHelper!!.removeConnectCallback(mac)
            callback(MyApiResult(type = 10000, message = "connect timeout", data = ""))
        }
        , this.connect_time_out.toInt())
        that.isConnecting = true
        if (UTSAndroid.getAppContext() != null) {
            UTSAndroid.getDispatcher("io").async(fun(_) {
                that.bleHelper!!.connect(UTSAndroid.getAppContext()!!, mac, auto)
            }
            , null)
        }
        if (auto) {
            this.startAutoConnectBt(this.auto_connect_time, callback)
        }
    }
    public open fun startAutoConnectBt(time: Number, callback: (sth: MyApiResult) -> Unit) {
        var that = this
        if (this.connectInternal != 0) {
            clearInterval(this.connectInternal)
        }
        this.connectInternal = setInterval(fun() {
            if (that.isConnecting) {
                return
            }
            if (!that.isConnected()) {
                that.connect(that.beginToConnectMac!!, false, fun(res: MyApiResult) {
                    if (res.type == 0) {
                        callback(bleResult(0, "connect success", 1))
                    } else if (res.type == 10001) {
                        callback(bleResult(10001, "disconnect", 1))
                    }
                }
                )
            }
        }
        , time.toInt())
    }
    public open fun cancelAutoConnectBt() {
        if (this.connectInternal != 0) {
            clearInterval(this.connectInternal)
        }
    }
    public open fun scanServices(callback: (sth: MyApiResult) -> Unit): Unit {
        var that = this
        open class MyOnBleScanServicesListener : OnBleScanServicesListener {
            override fun onScanService(res: MyApiResult) {
                var services: UTSArray<BleServices> = res.data as UTSArray<BleServices>
                that.wNList = _uA<String>()
                run {
                    var i: Number = 0
                    while(i < services.length){
                        var haveW = false
                        var haveN = false
                        var nid = ""
                        var wid = ""
                        run {
                            var j: Number = 0
                            while(j < services[i].characteristics.length){
                                if (services[i].characteristics[j].properties.NOTIFY) {
                                    haveN = true
                                    nid = services[i].characteristics[j].uuid
                                }
                                if (services[i].characteristics[j].properties.WRITE) {
                                    haveW = true
                                    wid = services[i].characteristics[j].uuid
                                }
                                j++
                            }
                        }
                        if (haveW && haveN) {
                            that.wNList.push(services[i].uuid + "_" + nid + "_" + wid)
                        }
                        i++
                    }
                }
                if (that.wNList.length > 0) {
                    var size = that.wNList.length
                    that.setSelectUUID(UTSNumber.from(size) - 1)
                }
                callback(res)
            }
        }
        this.onBleScanServicesListener = MyOnBleScanServicesListener()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.bleHelper!!.readServices()
        }
        , null)
    }
    public open fun getUUIDs(): UTSArray<WNuuid> {
        var ids = _uA<WNuuid>()
        run {
            var i: Number = 0
            while(i < this.wNList.length){
                var b = this.wNList[i].split("_")
                ids.push(WNuuid(serviceId = b[0], nuuid = b[1], wuuid = b[2]))
                i++
            }
        }
        return ids
    }
    public open fun setSelectUUID(id: Number) {
        if (id < this.wNList.length) {
            var b = this.wNList[id].split("_")
            this.tarServiceUUID = b[0]
            this.nUUID = b[1]
            this.wUUID = b[2]
        }
    }
    public open fun listenerBleMessage(callback: (sth: MyApiResult) -> Unit): Unit {}
    public open fun disListenerBleMessage(): Unit {
        UTSAndroid.getAppContext()!!.unregisterReceiver(this)
    }
    public open fun isConnected(): Boolean {
        return this.bleHelper!!.isConnected()
    }
    public open fun getConnectMac(): String {
        var s = this.bleHelper!!.getConnectMac()
        return s
    }
    public open fun byte2HexString(data: UTSArray<Number>): String {
        var bytes = ByteArray(data.length.toInt())
        run {
            var i: Number = 0
            while(i < data.length){
                bytes[i.toInt()] = data[i].toByte()
                i++
            }
        }
        return ByteUtil.byte2HexString(bytes)
    }
    public open fun writeDataToBle(service: String, chars: String, data: UTSArray<Number>, callback: (sth: MyApiResult) -> Unit) {
        if (!this.isConnected()) {
            return
        }
        var bytes = ByteArray(data.length.toInt())
        var that = this
        run {
            var i: Number = 0
            while(i < data.length){
                bytes[i.toInt()] = data[i].toByte()
                i++
            }
        }
        open class MyOnBleWriteDataListener : OnBleWriteDataListener {
            override fun onWriteData(res: MyApiResult) {
                callback(res)
            }
        }
        this.onBleWriteDataListener = MyOnBleWriteDataListener()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.bleHelper!!.sendData(service, chars, bytes, !that.haveSetMtu)
        }
        , null)
    }
    public open fun writeDataToBleWithType(service: String, chars: String, data: UTSArray<Number>, writeType: Number, callback: (sth: MyApiResult) -> Unit) {
        if (!this.isConnected()) {
            return
        }
        var bytes = ByteArray(data.length.toInt())
        var that = this
        run {
            var i: Number = 0
            while(i < data.length){
                bytes[i.toInt()] = data[i].toByte()
                i++
            }
        }
        open class MyOnBleWriteDataListener : OnBleWriteDataListener {
            override fun onWriteData(res: MyApiResult) {
                callback(res)
            }
        }
        this.onBleWriteDataListener = MyOnBleWriteDataListener()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.bleHelper!!.sendDataNew(service, chars, bytes, !that.haveSetMtu, writeType.toInt())
        }
        , null)
    }
    public open fun writeStringDataToBleWithType(service: String, chars: String, data: String, writeType: Number, callback: (sth: MyApiResult) -> Unit) {
        if (!this.isConnected()) {
            return
        }
        var that = this
        open class MyOnBleWriteDataListener : OnBleWriteDataListener {
            override fun onWriteData(res: MyApiResult) {
                callback(res)
            }
        }
        this.onBleWriteDataListener = MyOnBleWriteDataListener()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.bleHelper!!.sendDataNew(service, chars, ByteUtil.parseHexStr2Byte(data), !that.haveSetMtu, writeType.toInt())
        }
        , null)
    }
    public open fun writeStringDataToBle(service: String, chars: String, data: String, callback: (sth: MyApiResult) -> Unit) {
        open class MyOnBleWriteDataListener : OnBleWriteDataListener {
            override fun onWriteData(res: MyApiResult) {
                callback(res)
            }
        }
        this.onBleWriteDataListener = MyOnBleWriteDataListener()
        var that = this
        UTSAndroid.getDispatcher("io").async(fun(_) {
            that.bleHelper!!.sendData(service, chars, ByteUtil.parseHexStr2Byte(data), !that.haveSetMtu)
        }
        , null)
    }
    public open fun sendData(data: WriteData, callback: (b: MyApiResult) -> Unit) {
        var that = this
        var haveErr = false
        var writeDelayId: Number = -1
        open class MyOnBleWriteDataListener : OnBleWriteDataListener {
            override fun onWriteData(res: MyApiResult) {
                if (res.type != 0) {
                    haveErr = true
                }
                if (data.fenbao) {
                    clearTimeout(writeDelayId)
                    writeDelayId = setTimeout(fun() {
                        if (haveErr) {
                            callback(bleResult(10001, "分包过程有写入失败", ""))
                        } else {
                            callback(bleResult(0, "分包写入成功", ""))
                        }
                    }, 100)
                } else {
                    callback(res)
                }
            }
        }
        var bytes: ByteArray? = null
        if (data.data != null) {
            bytes = ByteArray(data.data!!.length.toInt())
            var that = this
            run {
                var i: Number = 0
                while(i < data.data!!.length){
                    bytes[i.toInt()] = data.data!![i].toByte()
                    i++
                }
            }
        }
        if (data.hexStrData != null) {
            bytes = ByteUtil.parseHexStr2Byte(data.hexStrData!!)
        }
        this.onBleWriteDataListener = MyOnBleWriteDataListener()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            if (data.writeType == null) {
                that.bleHelper!!.sendData(data.serviceId, data.characteristicId, bytes!!, data.fenbao)
            } else {
                that.bleHelper!!.sendDataNew(data.serviceId, data.characteristicId, bytes!!, data.fenbao, data.writeType!!.toInt())
            }
        }
        , null)
    }
    public open fun onNotityReadBleData(service: String, chars: String, state: Boolean, callback: (sth: MyApiResult) -> Unit) {
        var that = this
        UTSAndroid.getDispatcher("io").async(fun(_) {
            if (state) {
                open class MyOnBleNotityListener : OnBleNotityListener {
                    override fun onNotityData(res: MyApiResult) {
                        callback(res)
                    }
                    override fun onNotityDatas(res: MyApiResult) {}
                }
                that.onBleNotityListener = MyOnBleNotityListener()
            } else {
                that.onBleNotityListener = null
            }
            that.bleHelper!!.setCharacteristicNotification(service, chars, state)
        }
        , null)
    }
    public open fun onNotityBleData(service: String, chars: String, state: Boolean, callback: (sth: MyApiResult) -> Unit) {
        var that = this
        UTSAndroid.getDispatcher("io").async(fun(_) {
            if (state) {
                open class MyOnBleNotityListener : OnBleNotityListener {
                    override fun onNotityData(res: MyApiResult) {}
                    override fun onNotityDatas(res: MyApiResult) {
                        callback(res)
                    }
                }
                that.onBleNotityListener = MyOnBleNotityListener()
            } else {
                that.onBleNotityListener = null
            }
            that.bleHelper!!.setCharacteristicNotification(service, chars, state)
        }
        , null)
    }
    public open fun onNotityReadBleDataMore(service: String, chars: String, state: Boolean, callback: (sth: MyApiResult) -> Unit) {
        var that = this
        UTSAndroid.getDispatcher("io").async(fun(_) {
            if (state) {
                open class MyOnBleNotityListener : OnBleNotityListener {
                    override fun onNotityData(res: MyApiResult) {
                        callback(res)
                    }
                    override fun onNotityDatas(res: MyApiResult) {}
                }
                that.onBleNotityListener = MyOnBleNotityListener()
            } else {
                that.onBleNotityListener = null
            }
            that.bleHelper!!.setCharacteristicNotificationMore(service, chars, state)
        }
        , null)
    }
    public open fun close(): Unit {
        var that = this
        this.cancelAutoConnectBt()
        UTSAndroid.getDispatcher("io").async(fun(_) {
            try {
                that.bleHelper!!.closeBt()
            }
             catch (e: Exception) {}
        }
        , null)
    }
    public open fun setMtu(num: Number, callback: (sth: MyApiResult) -> Unit): Unit {
        open class MyOnMtuSetListener : OnMtuSetListener {
            override fun onMtu(res: MyApiResult) {
                callback(res)
            }
        }
        this.onMtuSetListener = MyOnMtuSetListener()
        var b = this.bleHelper!!.requestMtu(num.toInt())
        if (b == false) {
            this.onMtuSetListener!!.onMtu(bleResult(1, "failed", ""))
        } else {
            this.haveSetMtu = true
        }
    }
    public open fun string2ByteStrWithCharset(data: String, code: String): String {
        return ByteUtil.string2ByteStrWithCharset(data, code).split(" ").join("")
    }
    public open fun byte2StringWithCharset(data: String, code: String): String {
        return ByteUtil.byte2StringWithCharset(data.replace(" ", ""), code)
    }
    public open fun onReadData(service: String, chars: String, callback: (b: MyApiResult) -> Unit) {
        this.readDataCallback = callback
        this.bleHelper?.readData(service, chars)
    }
    public open fun onIndicate(service: String, chars: String, callback: (b: MyApiResult) -> Unit) {}
}
interface OnBleScanListener {
    fun onScanCall(scan: MyApiResult)
}
interface OnBleConnectListener {
    fun onConnect(res: MyApiResult)
}
interface OnBleScanServicesListener {
    fun onScanService(res: MyApiResult)
}
interface OnBleNotityListener {
    fun onNotityData(res: MyApiResult)
    fun onNotityDatas(res: MyApiResult)
}
interface OnBleWriteDataListener {
    fun onWriteData(res: MyApiResult)
}
interface OnMtuSetListener {
    fun onMtu(res: MyApiResult)
}
open class ScanParaJSONObject : UTSJSONObject() {
    open var btNameFilter: String? = null
    open var fliterNames: UTSArray<String>? = null
    open var scantime: Number? = null
    open var showEmptyName: Number? = null
    open var iosFilterUUIDs: UTSArray<String>? = null
    open var onScanResult: UTSCallback? = null
    open var scanComplate: UTSCallback? = null
}
open class WriteDataJSONObject : UTSJSONObject() {
    open lateinit var serviceId: String
    open lateinit var characteristicId: String
    open var writeType: Number? = null
    open var data: UTSArray<Number>? = null
    open var hexStrData: String? = null
    open var fenbao: Boolean = false
}
open class BleLibByJs : BleLib {
    public open fun setBtConnectTimeoutByJs(time: Number) {
        return this.setBtConnectTimeout(time)
    }
    public open fun setBtAutoConnectTimeByJs(time: Number) {
        return this.setBtAutoConnectTime(time)
    }
    public open fun setDebugModeByJs(debug: Boolean) {
        return this.setDebugMode(debug)
    }
    public open fun setThreadTypeNameByJs(name: String) {
        return this.setThreadTypeName(name)
    }
    public open fun onBtOpenStateListenerByJs(callback: UTSCallback) {
        return this.onBtOpenStateListener(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    constructor() : super() {}
    public open fun btListenerByJs() {
        return this.btListener()
    }
    open fun openBtBluetoothByJs(callback: UTSCallback) {
        return this.openBtBluetooth(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(b: MyApiResult){
                callback(b)
            }
            callback.fnJS
        }
         as (b: MyApiResult) -> Unit)
    }
    open fun openBtByJs(callback: UTSCallback) {
        return this.openBt(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(b: MyApiResult){
                callback(b)
            }
            callback.fnJS
        }
         as (b: MyApiResult) -> Unit)
    }
    open fun readRssiByJs(callback: UTSCallback) {
        return this.readRssi(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(b: MyApiResult){
                callback(b)
            }
            callback.fnJS
        }
         as (b: MyApiResult) -> Unit)
    }
    open fun openBluetoothByJs(on: Boolean): Unit {
        return this.openBluetooth(on)
    }
    public open fun onReceiveByJs(context: Context, data: Intent): Unit {
        return this.onReceive(context, data)
    }
    public open fun openBluetoothSettingsByJs(): Unit {
        return this.openBluetoothSettings()
    }
    public open fun getSericUUIDByJs(): String {
        return this.getSericUUID()
    }
    public open fun getServiceUUIDByJs(): String {
        return this.getServiceUUID()
    }
    public open fun getNotityUUIDByJs(): String {
        return this.getNotityUUID()
    }
    public open fun getWriteUUIDByJs(): String {
        return this.getWriteUUID()
    }
    public open fun getwriteUUIDByJs(): String {
        return this.getwriteUUID()
    }
    public open fun onScanDataListenerByJs(callback: UTSCallback) {
        return this.onScanDataListener(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(res: MyApiResult){
                callback(res)
            }
            callback.fnJS
        }
         as (res: MyApiResult) -> Unit)
    }
    public open fun isHavePermisionByJs(pername: String): Boolean {
        return this.isHavePermision(pername)
    }
    public open fun requestPermisonByJs(pername: String, callback: UTSCallback) {
        return this.requestPermison(pername, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: Boolean){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: Boolean) -> Unit)
    }
    public open fun requesMoretPermisonByJs(pername: UTSArray<String>, callback: UTSCallback) {
        return this.requesMoretPermison(pername, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: Boolean){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: Boolean) -> Unit)
    }
    public open fun isEnabledByJs(): Boolean {
        return this.isEnabled()
    }
    public open fun onStartScanBleByJs(para: ScanParaJSONObject) {
        return this.onStartScanBle(ScanPara(btNameFilter = para.btNameFilter, fliterNames = para.fliterNames, scantime = para.scantime, showEmptyName = para.showEmptyName, iosFilterUUIDs = para.iosFilterUUIDs, onScanResult = fun(b: MyApiResult): Unit {
            para.onScanResult?.invoke(b)
        }
        , scanComplate = fun(): Unit {
            para.scanComplate?.invoke()
        }
        ))
    }
    public open fun onScanBleByJs(para: ScanParaJSONObject) {
        return this.onScanBle(ScanPara(btNameFilter = para.btNameFilter, fliterNames = para.fliterNames, scantime = para.scantime, showEmptyName = para.showEmptyName, iosFilterUUIDs = para.iosFilterUUIDs, onScanResult = fun(b: MyApiResult): Unit {
            para.onScanResult?.invoke(b)
        }
        , scanComplate = fun(): Unit {
            para.scanComplate?.invoke()
        }
        ))
    }
    public open fun setPhy2MModeByJs() {
        return this.setPhy2MMode()
    }
    public open fun startScanBleDeviceByJs(time: Number, callback: UTSCallback): Unit {
        return this.startScanBleDevice(time, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun stopScanBleByJs(): Unit {
        return this.stopScanBle()
    }
    public open fun scanBleByJs(time: Number, callback: UTSCallback) {
        return this.scanBle(time, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun connectByJs(mac: String, auto: Boolean, callback: UTSCallback): Unit {
        return this.connect(mac, auto, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun connectDevicesByJs(mac: String, auto: Boolean, callback: UTSCallback): Unit {
        return this.connectDevices(mac, auto, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun startAutoConnectBtByJs(time: Number, callback: UTSCallback) {
        return this.startAutoConnectBt(time, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun cancelAutoConnectBtByJs() {
        return this.cancelAutoConnectBt()
    }
    public open fun scanServicesByJs(callback: UTSCallback): Unit {
        return this.scanServices(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun getUUIDsByJs(): UTSArray<WNuuid> {
        return this.getUUIDs()
    }
    public open fun setSelectUUIDByJs(id: Number) {
        return this.setSelectUUID(id)
    }
    public open fun listenerBleMessageByJs(callback: UTSCallback): Unit {
        return this.listenerBleMessage(if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun disListenerBleMessageByJs(): Unit {
        return this.disListenerBleMessage()
    }
    public open fun isConnectedByJs(): Boolean {
        return this.isConnected()
    }
    public open fun getConnectMacByJs(): String {
        return this.getConnectMac()
    }
    public open fun byte2HexStringByJs(data: UTSArray<Number>): String {
        return this.byte2HexString(data)
    }
    public open fun writeDataToBleByJs(service: String, chars: String, data: UTSArray<Number>, callback: UTSCallback) {
        return this.writeDataToBle(service, chars, data, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun writeDataToBleWithTypeByJs(service: String, chars: String, data: UTSArray<Number>, writeType: Number, callback: UTSCallback) {
        return this.writeDataToBleWithType(service, chars, data, writeType, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun writeStringDataToBleWithTypeByJs(service: String, chars: String, data: String, writeType: Number, callback: UTSCallback) {
        return this.writeStringDataToBleWithType(service, chars, data, writeType, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun writeStringDataToBleByJs(service: String, chars: String, data: String, callback: UTSCallback) {
        return this.writeStringDataToBle(service, chars, data, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun sendDataByJs(data: WriteDataJSONObject, callback: UTSCallback) {
        return this.sendData(WriteData(serviceId = data.serviceId, characteristicId = data.characteristicId, writeType = data.writeType, data = data.data, hexStrData = data.hexStrData, fenbao = data.fenbao), if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(b: MyApiResult){
                callback(b)
            }
            callback.fnJS
        }
         as (b: MyApiResult) -> Unit)
    }
    public open fun onNotityReadBleDataByJs(service: String, chars: String, state: Boolean, callback: UTSCallback) {
        return this.onNotityReadBleData(service, chars, state, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun onNotityBleDataByJs(service: String, chars: String, state: Boolean, callback: UTSCallback) {
        return this.onNotityBleData(service, chars, state, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun onNotityReadBleDataMoreByJs(service: String, chars: String, state: Boolean, callback: UTSCallback) {
        return this.onNotityReadBleDataMore(service, chars, state, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun closeByJs(): Unit {
        return this.close()
    }
    public open fun setMtuByJs(num: Number, callback: UTSCallback): Unit {
        return this.setMtu(num, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(sth: MyApiResult){
                callback(sth)
            }
            callback.fnJS
        }
         as (sth: MyApiResult) -> Unit)
    }
    public open fun string2ByteStrWithCharsetByJs(data: String, code: String): String {
        return this.string2ByteStrWithCharset(data, code)
    }
    public open fun byte2StringWithCharsetByJs(data: String, code: String): String {
        return this.byte2StringWithCharset(data, code)
    }
    public open fun onReadDataByJs(service: String, chars: String, callback: UTSCallback) {
        return this.onReadData(service, chars, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(b: MyApiResult){
                callback(b)
            }
            callback.fnJS
        }
         as (b: MyApiResult) -> Unit)
    }
    public open fun onIndicateByJs(service: String, chars: String, callback: UTSCallback) {
        return this.onIndicate(service, chars, if (callback.fnJS != null) {
            callback.fnJS
        } else {
            callback.fnJS = fun(b: MyApiResult){
                callback(b)
            }
            callback.fnJS
        }
         as (b: MyApiResult) -> Unit)
    }
}
