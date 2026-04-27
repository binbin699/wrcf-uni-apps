package com.clj.fastble

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings.CALLBACK_TYPE_ALL_MATCHES
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.text.TextUtils
import android.util.Log
import androidx.core.util.forEach
import com.alibaba.fastjson.JSON
import com.clj.fastble.callback.BleGattCallback
import com.clj.fastble.callback.BleIndicateCallback
import com.clj.fastble.callback.BleMtuChangedCallback
import com.clj.fastble.callback.BleNotifyCallback
import com.clj.fastble.callback.BleReadCallback
import com.clj.fastble.callback.BleWriteCallback
import com.clj.fastble.callback.BleRssiCallback

import com.clj.fastble.data.BleDevice
import com.clj.fastble.exception.BleException

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.ArrayList;

public interface  OnBtOpenStateListener{

    fun  onBtOpenStateChange();
}

open  class BleHelper :OnBtOpenStateListener{

    var  onBleCallback:OnBleCallback?=null;

    var mGatt:  BluetoothGatt?=null;
    var appService="";
    var context:Context?=null;
    var notityCharacteristic="";
    var writeCharacteristic="";
    var myBroadcastReceiver:MyBroadcastReceiver;
    var  adapter: BluetoothAdapter;
    var filternameEmpty=false;
    var filterBtName="";

    var fliterNameList:java.util.ArrayList<String> = ArrayList<String>();

    fun  setFilterNameList(aa:ArrayList<String>){
        fliterNameList=aa;

    }



    class MyBroadcastReceiver : BroadcastReceiver {
        var onBtOpenStateListener :   OnBtOpenStateListener

        constructor(onBtOpenStateListener:OnBtOpenStateListener){
            this.onBtOpenStateListener=onBtOpenStateListener;
        }


        override fun onReceive(p0: Context?, p1: Intent?) {
            if(p1?.action.equals(BluetoothAdapter.ACTION_STATE_CHANGED)){
                Log.i("xtf", "onReceive: ACTION_STATE_CHANGED")
                var state = p1?.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                if(state==BluetoothAdapter.STATE_OFF){
                    this.onBtOpenStateListener.onBtOpenStateChange()
                    BleManager.getInstance().disconnectAllDevice();
                    BleManager.getInstance().destroy();
                }else if(state==BluetoothAdapter.STATE_ON){

                    BleManager.getInstance().init(p0!!);
                    this.onBtOpenStateListener.onBtOpenStateChange()

                }




            }
        }

    }


    constructor(context: Context,adapter: BluetoothAdapter,onBleCallback:OnBleCallback){
        this.onBleCallback=onBleCallback;
        this.adapter=adapter;
        var filter= IntentFilter();
        this.context=context;
        filter.addAction("com.ble.bleHelper")
        filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
        myBroadcastReceiver= MyBroadcastReceiver(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.registerReceiver(myBroadcastReceiver,filter, Context.RECEIVER_EXPORTED)
        }else{
            context.registerReceiver(myBroadcastReceiver,filter);
        }
        BleManager.getInstance().init(context);

    }

    override fun  onBtOpenStateChange(){

        Log.i("xtf","   "+this.isConnected())


        if(!this.adapter.isEnabled){

            try{
                if(this.isConnected()){
                    this.closeBt();
                }
            }catch (e:Exception){
                e.printStackTrace()
            }


        }

        if(onBleCallback!=null){
            onBleCallback?.onBtConnectStateChange(this.adapter.isEnabled)
        }

    }

    fun   getSericUUID():String{
        if(appService.isBlank()) {
            return "";
        }

        return  appService;
    }

    fun   getNotityUUID():String{
        if(notityCharacteristic.isBlank()) {
            return "";
        }
        return  notityCharacteristic;
    }

    fun setBtFilterName(n:String){
        filterBtName=n;

    }
    fun setEmptyName(b:Boolean){
        this.filternameEmpty=b;
    }

    fun   getwriteUUID():String{
        if(writeCharacteristic.isBlank()){
            return "";
        }
        return  writeCharacteristic;
    }

    var nameMap:java.util.HashMap<String,String> =java.util.HashMap();
    var macDeviceMap:java.util.HashMap<String,JSONObject> =java.util.HashMap();



    fun clearNameMap(){
        nameMap.clear()
        macDeviceMap.clear()


    }


    fun setPhy2MMode(){
        // 检查Android版本支持
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // 设置PHY模式
            mGatt?.setPreferredPhy(
                BluetoothDevice.PHY_LE_2M_MASK,  // 发送PHY
                BluetoothDevice.PHY_LE_2M_MASK,  // 接收PHY
                BluetoothDevice.PHY_OPTION_NO_PREFERRED  // PHY选项
            );
        }
    }


    val leScanCallback: ScanCallback = object : ScanCallback() {

        override fun onScanFailed(errorCode: Int) {
            super.onScanFailed(errorCode)
            Log.i("xtf", "onScanFailed: "+errorCode)
        }

        override fun onScanResult(callbackType: Int, result: ScanResult) {
            super.onScanResult(callbackType, result)
            if(filternameEmpty){
                if(TextUtils.isEmpty(result.device.name)){
                    return;
                }
                if(!TextUtils.isEmpty(filterBtName)){
                    if(!result.device.name.contains(filterBtName)){
                        return;
                    }

                }
                if(fliterNameList.size>0){
                    var exist=false;
                    for( s:String in fliterNameList){
                        if(result.device.name.contains(s)){
                            exist=true;
                        }
                    }
                    if(!exist){
                        return;
                    }
                }


            }



            var root =JSONObject();
            try {
                var device =JSONObject();

                if(!TextUtils.isEmpty(result.device.name)){
                    nameMap.put(result.device.address,result.device.name)
                }
                device.put("name",nameMap.get(result.device.address))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    device.put("alias",result.device.alias)
                }
                device.put("bondState",result.device.uuids)
                device.put("bondState",result.device.bondState)
                device.put("type",result.device.type)
                device.put("address",result.device.address)
                val scanRecord =JSONObject();
                scanRecord.put("deviceName",result.scanRecord?.deviceName)
                scanRecord.put("txPowerLevel",result.scanRecord?.txPowerLevel)
                val b= result.scanRecord?.bytes;
                scanRecord.put("bytes", ByteUtil.byte2HexString(b))
                scanRecord.put("serviceData",JSON.toJSONString(result.scanRecord?.serviceData))
                scanRecord.put("serviceUuids",(result.scanRecord?.serviceUuids))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    scanRecord.put("advertisingDataMap",JSON.toJSONString(result.scanRecord?.advertisingDataMap))
                }
                scanRecord.put("advertiseFlags",result.scanRecord?.advertiseFlags)

                val c= result.scanRecord?.manufacturerSpecificData;
                var aar=JSONArray();
                c?.forEach { key, value ->
                    // 处理key和value
                    var mm=JSONObject();
                    // Log.i("xtf", "onScanResult: "+ByteUtil.byte2HexString(value))
                    mm.put(key.toString()+"",ByteUtil.byte2HexString(value));
                    aar.put(mm);
                }

                scanRecord.put("manufacturerSpecificData",aar.toString())
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    scanRecord.put("serviceSolicitationUuids",JSON.toJSONString(result.scanRecord?.serviceSolicitationUuids))
                }



                root.put("rssi",result.rssi);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    root.put("isLegacy",result.isLegacy)
                    root.put("advertisingSid",result.advertisingSid)
//                    root.put("rssi",result.txPower)
                    root.put("dataStatus",result.dataStatus)
                    root.put("isConnectable",result.isConnectable)
                    root.put("periodicAdvertisingInterval",result.periodicAdvertisingInterval)
                    root.put("primaryPhy",result.primaryPhy)
                    root.put("secondaryPhy",result.secondaryPhy)
                    root.put("timestampNanos",result.timestampNanos)
                }
                root.put("scanRecord",scanRecord);
                root.put("device",device);
                macDeviceMap.put(result.device.address,root)

                if(callbackType==CALLBACK_TYPE_ALL_MATCHES){
                    onBleCallback?.onScanResult(result,root);
                }
            }catch (e:Exception){
//                e.printStackTrace()
            }


        }
    }



    fun startScan(adapter: BluetoothAdapter){
//       adapter.bluetoothLeScanner.startScan(leScanCallback);
    }


    fun stopScan(adapter: BluetoothAdapter){
        adapter.bluetoothLeScanner.stopScan(leScanCallback);

    }

    fun openBle(adapter: BluetoothAdapter, on: Boolean ){
        adapter.let {
            if(Build.VERSION.SDK_INT<Build.VERSION_CODES.TIRAMISU){
                if (on){
                    it.enable();
                }else{
                    it.disable();
                }
            }



        }
    }


    private val bluetoothGattCallback: BluetoothGattCallback = object : BluetoothGattCallback() {



        override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
            super.onServicesDiscovered(gatt, status)
            if (status == BluetoothGatt.GATT_SUCCESS) {
                mGatt=gatt;
            }




        }







        override fun onMtuChanged(gatt: BluetoothGatt?, mtu: Int, status: Int) {
            super.onMtuChanged(gatt, mtu, status)

            if(onBleCallback!=null){
                if(status==BluetoothGatt.GATT_SUCCESS){
                    onBleCallback?.onMtuCallBack(status,"success");
                }else{
                    onBleCallback?.onMtuCallBack(status,"failed");
                }

            }

        }


        //        @Deprecated("Deprecated in Java")
//        override fun onCharacteristicChanged(
//            gatt: BluetoothGatt?,
//            characteristic: BluetoothGattCharacteristic?
//        ) {
//            super.onCharacteristicChanged(gatt, characteristic)
//            Log.i("xtf", "onCharacteristicChanged: ")
//            if(onBleCallback!=null){
//                if(characteristic!=null){
//                    onBleCallback?.onDataRead(characteristic.value);
//
//                }
//            }
//
//        }
        override fun onCharacteristicWrite(
            gatt: BluetoothGatt?,
            characteristic: BluetoothGattCharacteristic?,
            status: Int
        ) {
            super.onCharacteristicWrite(gatt, characteristic, status)
            if(onBleCallback!=null){
                if(status==BluetoothGatt.GATT_SUCCESS){
                    onBleCallback?.onWriteState(status,"success")
                }else{
                    onBleCallback?.onWriteState(status,"failed")
                }

            }


        }


        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray
        ) {
            super.onCharacteristicChanged(gatt, characteristic, value)
            if(onBleCallback!=null){
                onBleCallback?.onDataRead(value);
            }


        }





        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
//            if (status !== BluetoothGatt.GATT_SUCCESS) {
//                if(onBleCallback!=null){
//                    onBleCallback?.onConnectResult(gatt,status,"异常断开")
//                }
//                return
//            }

            var msg="";
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                // successfully connected to the GATT Server
                mGatt=gatt;
                msg="successfully connected to the GATT Server";
                if(onBleCallback!=null){
                    onBleCallback?.onConnectResult(0,msg)
                }
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                // disconnected from the GATT Server
                msg="couldnot connect from the GATT Server";
                mGatt=null;
                if(newState==0){
                    onBleCallback?.onConnectResult(1,msg)
                }   else{
                    onBleCallback?.onConnectResult(newState,msg)
                }



            }


        }

        /**
         * 读取特性回调 Android 13及以上使用
         */
        override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) return
//            deviceInfo("读取特性值(Android 13及以上)：${BleUtils.bytesToHex(value, true)}")
        }

        /**
         * 读取特性回调 Android 12及以下使用
         */
        @Deprecated("Deprecated in Java")
        override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) return
//            deviceInfo("读取特性值(Android 12及以下)：${BleUtils.bytesToHex(characteristic.value, true)}")
        }



        override fun onServiceChanged(gatt: BluetoothGatt) {
            super.onServiceChanged(gatt)
        }



    }

    fun connect(context:Context,mac :String,auto:Boolean){



        BleManager.getInstance().connect(mac,object :BleGattCallback(){
            override fun onStartConnect() {

            }

            override fun onConnectFail(p0: BleDevice?, p1: BleException?) {
                try{
                    mGatt?.disconnect();
                    mGatt=null;
                }catch (e:Exception){

                }
                if(onBleCallback!=null){
                    onBleCallback?.onConnectResult(10000,p1?.description!!);
                }

            }

            override fun onConnectSuccess(p0: BleDevice?, p1: BluetoothGatt?, p2: Int) {
                mGatt=p1;
                if(onBleCallback!=null){
                    onBleCallback?.onConnectResult(0,"success connect");
                }
            }

            override fun onDisConnected(p0: Boolean, p1: BleDevice?, p2: BluetoothGatt?, p3: Int) {
                try{
                    BleManager.getInstance().disconnect(BleDevice(mGatt?.device))
                    mGatt?.disconnect()
                }catch (e:Exception){

                }finally {
                    mGatt=null;
                }


                if(onBleCallback!=null){
                    onBleCallback?.onConnectResult(10001,"disconnect connect");
                }

            }


        })
//        BluetoothAdapter.getDefaultAdapter().getRemoteDevice(mac).connectGatt(context,auto,bluetoothGattCallback)
    }


    fun  readServices(){
        val bluetoothGatt = BleManager.getInstance().getBluetoothGatt(BleDevice(mGatt!!.device))
        mGatt=bluetoothGatt;
        if(onBleCallback!=null){
            if (mGatt != null) {
                try{
                    onBleCallback?.onServicesDiscovered(mGatt!!,0,displayGattServices(mGatt?.services))
                }catch (e:Exception){

                }
            };
        }


    }

    fun removeConnectCallback(mac: String){
        val remoteDevice = BleManager.getInstance().bluetoothAdapter.getRemoteDevice(mac)
        ;       BleManager.getInstance().removeConnectGattCallback(BleDevice(remoteDevice))
    }

    private fun displayGattServices(gattServices: List<BluetoothGattService>?):JSONArray {
        var services=   JSONArray();

        // Loops through available GATT Services.
        gattServices?.forEach { gattService ->
            val currentServiceData = HashMap<String, String>()
            var service=  JSONObject()
            service.put("type",gattService.type)
            service.put("uuid",gattService.uuid.toString())

            val gattCharacteristics = gattService.characteristics

            var charsArray=JSONArray();


            gattCharacteristics.forEach { characteristic ->
                if(TextUtils.isEmpty(appService)){
                    appService="";
                    notityCharacteristic="";
                    writeCharacteristic="";
                }

                var map=HashMap<String,Boolean>();
                if ((characteristic.getProperties() and BluetoothGattCharacteristic.PROPERTY_READ) !== 0) {
                    // 可读
                    map.put("READ",true);
                }else{
                    map.put("READ",false);
                }
                // 判断是否可写
                if ((characteristic.getProperties() and BluetoothGattCharacteristic.PROPERTY_WRITE) !== 0) {
                    // 可写
                    map.put("WRITE",true);
                    writeCharacteristic=characteristic.uuid.toString();
                }else{
                    if ((characteristic.getProperties() and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) !== 0) {

                        map.put("WRITE",true);
                    }else{
                        map.put("WRITE",false);
                    }




                }




                // 判断是否可通知
                if ((characteristic.getProperties() and BluetoothGattCharacteristic.PROPERTY_NOTIFY) !== 0) {
                    // 可通知
                    map.put("NOTIFY",true);
                    notityCharacteristic=characteristic.uuid.toString();
                }else{
                    map.put("NOTIFY",false);

                }


                // 判断是否支持 indicate 特性
                if ((characteristic.getProperties() and BluetoothGattCharacteristic.PROPERTY_INDICATE) !== 0) {
                    // 支持 indicate

                    map.put("INDICATE",true);

                }else{
                    map.put("INDICATE",false);
                }
                if(notityCharacteristic!=null&&writeCharacteristic!=null){
                    appService=gattService.uuid.toString();
                }

                var chars=JSONObject();
                chars.put("properties",JSONObject(JSON.toJSONString(map)));
                chars.put("uuid",characteristic.uuid);
                if(characteristic.properties!=null){
                    chars.put("propertiesType",characteristic.properties)
                }
                if(characteristic.value!=null){
                    chars.put("value",String(characteristic.value))
                }

                charsArray.put(chars)

            }
            service.put("characteristics",charsArray)
            services.put(service);



        }
        return services;
    }


    fun requestMtu(num:Int):Boolean{
        BleManager.getInstance().setMtu(BleDevice(mGatt!!.device!!),num,object : BleMtuChangedCallback(){
            override fun onSetMTUFailure(p0: BleException?) {
                onBleCallback?.onMtuCallBack(1,"failed")
            }

            override fun onMtuChanged(p0: Int) {
                onBleCallback?.onMtuCallBack(0,"success")
            }
        })
        return  true;
    }


    fun setCharacteristicNotification(serviceUUID:String,characteristicUUID:String,on:Boolean) {
        if(on){
            BleManager.getInstance().notify(BleDevice(mGatt!!.device),serviceUUID,characteristicUUID,
                object: BleNotifyCallback() {
                    override fun onNotifySuccess() {
                        if(onBleCallback!=null){
                            onBleCallback?.onNotityStateCallback(1000,"订阅成功");
                        }
                    }

                    override fun onNotifyFailure(p0: BleException?) {
                        if(onBleCallback!=null){
                            onBleCallback?.onNotityStateCallback(1001,"订阅失败"+p0?.description!!);
                        }
                    }

                    override fun onCharacteristicChanged(p0: ByteArray?) {
                        if(onBleCallback!=null){
                            onBleCallback?.onDataRead(p0!!);
                        }

                        if(onBleCallback!=null){
                            onBleCallback?.onDataReads(p0!!,serviceUUID,characteristicUUID);
                        }
                    }



                }
            )
        }else{
            BleManager.getInstance().stopNotify(BleDevice(mGatt!!.device),serviceUUID,characteristicUUID);
        }


//        val service: BluetoothGattService? =
//            mGatt?.getService(UUID.fromString(serviceUUID))
//        val characteristic =
//            service?.getCharacteristic(UUID.fromString(characteristicUUID))
//        var b=    mGatt?.setCharacteristicNotification(characteristic,on);
//        if(on){
//            if(b!!){
//                var descriptors = characteristic?.getDescriptors();
//                descriptors?.forEach {
//
//                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
//                        mGatt?.writeDescriptor(it,BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
//                    }else{
//                        it.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
//                        mGatt?.writeDescriptor(it)
//                    }
////
////                    mGatt?.writeDescriptor(it);
//                }
//            }
//        }


    }

    fun setCharacteristicNotificationMore(serviceUUID:String,characteristicUUID:String,on:Boolean) {
        if(on){
            BleManager.getInstance().notify(BleDevice(mGatt!!.device),serviceUUID,characteristicUUID,true,
                object: BleNotifyCallback() {
                    override fun onNotifySuccess() {
                        if(onBleCallback!=null){
                            onBleCallback?.onNotityStateCallback(1000,"订阅成功");
                        }
                    }

                    override fun onNotifyFailure(p0: BleException?) {
                        if(onBleCallback!=null){
                            onBleCallback?.onNotityStateCallback(1001,"订阅失败"+p0?.description!!);
                        }
                    }

                    override fun onCharacteristicChanged(p0: ByteArray?) {
                        if(onBleCallback!=null){
                            onBleCallback?.onDataRead(p0!!);
                        }
                    }

                }
            )
        }else{
            BleManager.getInstance().stopNotify(BleDevice(mGatt!!.device),serviceUUID,characteristicUUID,true);
        }




    }

    fun setCCCD(serviceUUID:String,characteristicUUID:String,uuid:String){
        val service: BluetoothGattService? =
            mGatt?.getService(UUID.fromString(serviceUUID))
        val characteristic =
            service?.getCharacteristic(UUID.fromString(characteristicUUID))

        // 写入CCC配置
        var cccValue = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE;
        var descriptor = characteristic?.getDescriptor(UUID.fromString(uuid));
        descriptor?.setValue(cccValue);
        mGatt?.writeDescriptor(descriptor);

    }


    fun sendData(serviceUUID:String,characteristicUUID:String,b:ByteArray,fenbao:Boolean){
        if (mGatt != null) {
            var clall = object :
                BleWriteCallback() {
                override fun onWriteSuccess(p0: Int, p1: Int, p2: ByteArray?) {
                    onBleCallback?.onWriteState(0, "success")
                }

                override fun onWriteFailure(p0: BleException?) {
                    if (onBleCallback != null) {
                        onBleCallback?.onWriteState(20000, "写入失败,"+p0?.description!!+"\n"+p0?.code)
                        //                        }
                    }


                }
            };
            BleManager.getInstance().write(BleDevice(mGatt?.device!!),serviceUUID,characteristicUUID,b,fenbao,clall);
        }
    }


    fun sendDataNew(serviceUUID:String,characteristicUUID:String,b:ByteArray,fenbao:Boolean,writeType:Int){
        if (mGatt != null) {
            var clall = object :
                BleWriteCallback() {
                override fun onWriteSuccess(p0: Int, p1: Int, p2: ByteArray?) {
                    onBleCallback?.onWriteState(0, "success")
                }

                override fun onWriteFailure(p0: BleException?) {
                    if (onBleCallback != null) {
                        onBleCallback?.onWriteState(20000, "写入失败,"+p0?.description!!+"\n"+p0?.code)
                        //                        }
                    }


                }
            };
            BleManager.getInstance().write(BleDevice(mGatt?.device!!),serviceUUID,characteristicUUID,b,fenbao,true,0,writeType,clall);
        }
    }


    fun closeBt(){
        try {

            BleManager.getInstance().disconnect(BleDevice(mGatt?.device))
            mGatt?.disconnect();
//            mGatt?.close()
        }catch (e:Exception){
            e.printStackTrace()
        }finally {
            mGatt=null;
            if(onBleCallback!=null){
                onBleCallback?.onConnectResult(10001,"disconnect connect");
            }
        }
    }

    fun isConnected():Boolean{
        if(mGatt==null){
            return false;
        }else{
            return true;
        }
    }


    fun getConnectMac(): String {
        try {
            if(mGatt!=null){
                return mGatt?.device?.address!!
            }else{
                return "";
            }
        }catch (e:Exception){
            // e.printStackTrace()
            return ""
        }

    }

    fun readRssi(){
        BleManager.getInstance().readRssi(BleDevice(mGatt!!.device!!),object : BleRssiCallback(){
            override fun onRssiFailure(p0: BleException?) {
                onBleCallback?.onReadRssi(10000);
            }

            override fun onRssiSuccess(p0: Int) {
                onBleCallback?.onReadRssi(p0);
            }


        })

    }

    fun readData(serviceUUID:String,characteristicUUID:String){
        BleManager.getInstance().read(BleDevice(mGatt?.device),serviceUUID,characteristicUUID,object :
            BleReadCallback(){
            override fun onReadSuccess(p0: ByteArray?) {
                if(onBleCallback!=null){
                    onBleCallback?.onReadData(true,p0!!);
                }
            }
            override fun onReadFailure(p0: BleException?) {
                if(onBleCallback!=null){
                    var b: String="";
                    b=p0?.description!!;
                    onBleCallback?.onReadData(false,null);
                }
            }
        })
    }


    fun  indicate(serviceUUID:String,indicateUUid:String){

        BleManager.getInstance().indicate(BleDevice(mGatt?.device),serviceUUID,indicateUUid,object:
            BleIndicateCallback() {
            override fun onIndicateSuccess() {
                if(onBleCallback!=null){
                    onBleCallback?.onIndicateCallback(1000,null);
                }
            }

            override fun onIndicateFailure(exception: BleException?) {
                if(onBleCallback!=null){
                    onBleCallback?.onIndicateCallback(1001,null);
                }
            }

            override fun onCharacteristicChanged(data: ByteArray?) {
                if(onBleCallback!=null){
                    onBleCallback?.onIndicateCallback(0,data);
                }
            }

        } )
    }





    public  interface OnBleCallback {
        fun onScanResult(result: ScanResult, json: JSONObject);
        fun onConnectResult( code: Int, msg: String);
        fun onServicesDiscovered(gatt: BluetoothGatt, status: Int, json: JSONArray)
        fun onGattDisconnect(state: Int);
        fun onMtuCallBack(status: Int, s: String);
        fun onWriteState(status: Int, s: String)
        fun onBtConnectStateChange(on:Boolean);
        fun onDataRead(value: ByteArray);

        fun onDataReads(value: ByteArray,serviceId:String,charsId:String);
        fun onReadRssi(int: Int);
        fun onNotityStateCallback(state:Int,msg:String)

        fun onReadData(state: Boolean, value: ByteArray?);


        fun onIndicateCallback(state:Int, value: ByteArray?);
    }

}