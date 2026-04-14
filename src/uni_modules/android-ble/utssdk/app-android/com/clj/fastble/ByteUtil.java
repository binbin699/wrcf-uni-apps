package com.clj.fastble;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.text.DecimalFormat;

public class ByteUtil 
{
	/**
     * 字节数组转整型
     * 
     * @param b
     * @return
     */
    public int byte2Int(byte[] b) {
        int intValue = 0;
        for (int i = 0; i < b.length; i++) {
            intValue += (b[i] & 0xFF) << (8 * (b.length - 1 - i));

        }
        return intValue;
    }

    /**
     * 整型转转字节数组 C0 R CD CS DC0
     * 
     * @param intValue
     * @throws Exception
     */
    public byte[] int2Byte(int intValue, int length) {
        byte[] b = new byte[length];
        for (int i = 0; i < length; i++) {
            b[i] = (byte) (intValue >> 8 * (length - 1 - i) & 0xFF);
        }
        return b;
    }
    
    /**
     * 字节数组转Short类型
     * 
     * @param b
     * @return
     */
    public short byte2Short(byte[] b) {
        return (short) (b[1] & 0xff | (b[0] & 0xff) << 8);
    }

    /**
     * 字节数组转浮点型
     * 
     * @param b
     * @return
     */
    public float byte2Float(byte[] b) {
        // int ivalue = ((data[0] & 0xFF) << 24) | ((data[1] & 0xFF) << 16)
        // | ((data[2] & 0xFF) << 8) | (data[3] & 0xFF);

        int l;
        l = b[0];
        l &= 0xff;
        l |= ((long) b[1] << 8);
        l &= 0xffff;
        l |= ((long) b[2] << 16);
        l &= 0xffffff;
        l |= ((long) b[3] << 24);
        return Float.intBitsToFloat(l);

    }


    /**
     * 低字节数组到short的转换
     * @param b byte[]
     * @return short
     */
    public static short lBytesToShort(byte[] b) {
        int s = 0;
        if (b[1] >= 0) {
            s = s + b[1];
        } else {
            s = s + 256 + b[1];
        }
        s = s * 256;
        if (b[0] >= 0) {
            s = s + b[0];
        } else {
            s = s + 256 + b[0];
        }
        short result = (short)s;
        return result;
    }


    /**
     * 返回指定长度的字节数组
     * 
     * @param bytes
     * @param length
     * @return
     */
    public byte[] getBytes(byte[] bytes, int length) {
        byte[] rb = new byte[length];
        if (length >= bytes.length) {
            for (int i = 0; i < bytes.length; i++) {
                rb[i] = bytes[i];
            }
        } else {
            for (int i = 0; i < length; i++) {
                rb[i] = bytes[i];
            }
        }
        return rb;
    }

    /**
     * 字节数组转化字符串 去空
     */
    public String byteToString(byte[] rb) throws UnsupportedEncodingException {

        return new String(trim(rb), "GB2312");
    }

    /**
     * 字节数组相加
     * 
     * @param ob
     * @param cb
     * @return
     */
    public static synchronized byte[]  addBytes(byte[] ob, byte[] cb) {
        if(ob==null){
            return cb;
        }
        if(cb==null){
            return ob;
        }
        byte[] rb = new byte[ob.length + cb.length];
        for (int i = 0; i < ob.length; i++) {
            rb[i] = ob[i];

        }
        for (int i = 0; i < cb.length; i++) {
            rb[ob.length + i] = cb[i];
        }
        return rb;
    }

    /**
     * 字节数组的子数组 指定起始位置，长度的字节数组
     * 
     * @param bs
     * @param start
     * @param length
     * @return
     */
    public static synchronized byte[] subBytes(byte[] bs, int start, int length) {
        byte[] rb = new byte[length];
        for (int i = 0; i < length; i++) {
            if (bs.length <= (start + i)) {
                return rb;
            }
            rb[i] = bs[start + i];
        }
        return rb;
    }

    /**
     * 去掉字节数组中多余的字节
     */

    public static byte[] trim(byte[] bs) {
        if(bs==null){
            return null;
        }
        int length = bs.length;
        for (int i = 0; i < bs.length; i++) {

            if (0 == Byte.valueOf(bs[i])) {
                length = i;
                break;
            }
        }

        byte[] rb = new byte[length];
        for (int i = 0; i < length; i++) {
            rb[i] = bs[i];
        }
        return rb;
    }
    
    /**
     * 浮点转换为字节
     * 
     * @param f
     * @return
     */
    public byte[] float2byte(float f) {

        // 把float转换为byte[]
        int fbit = Float.floatToIntBits(f);

        byte[] b = new byte[4];
        for (int i = 0; i < 4; i++) {
            b[i] = (byte) (fbit >> (24 - i * 8));
        }

        // 翻转数组
        int len = b.length;
        // 建立一个与源数组元素类型相同的数组
        byte[] dest = new byte[len];
        // 为了防止修改源数组，将源数组拷贝一份副本
        System.arraycopy(b, 0, dest, 0, len);
        byte temp;
        // 将顺位第i个与倒数第i个交换
        for (int i = 0; i < len / 2; ++i) {
            temp = dest[i];
            dest[i] = dest[len - i - 1];
            dest[len - i - 1] = temp;
        }

        return dest;

    }
    
    /**
     * 米转千米保留一位小数
     */
    public static int meterToKilometer(int m)
    {
    	int km = m/1000;
    	BigDecimal b = new BigDecimal(km);
    	double result = b.setScale(1,BigDecimal.ROUND_HALF_UP).doubleValue();
		return (int) result;
    }

    public static void main(String[] args) {
        ByteUtil util = new ByteUtil();
      //  System.out.println(util.byte2Float(util.float2byte(1002.554f)));

    }

    //两数相除，结果保留一位小数
    public static String division(int a ,int b){
        String result = "";
        float num =(float)a/b;
        DecimalFormat df = new DecimalFormat("0.0");
        result = df.format(num);
        return result;

    }

    public static String byte2HexString(byte[] bytes) {
        String hex = "";
        if (bytes != null) {
            for (Byte b : bytes) {

                hex += String.format("%02X", b.intValue() & 0xFF)+" ";
            }
        }
        if(hex.endsWith(" ")){
            hex=hex.substring(0,hex.length()-1);
        }
        return hex;
    }


    public  static  String string2ByteStrWithCharset(String data,String code){
        try {
            return  ByteUtil.byte2HexString(data.getBytes(code));
        } catch (UnsupportedEncodingException e) {
            return  "";
        }
    }

    public  static  String byte2StringWithCharset(String byetData,String code){
        try {
            byte[] bytes = ByteUtil.parseHexStr2Byte(byetData);
            return  new String(bytes,code);
        } catch (UnsupportedEncodingException e) {
            return  "";
        }
    }

    /**
     * 将16进制转换为二进制
     *
     * @param hexStr
     * @return
     */
    public static byte[] parseHexStr2Byte(String hexStr) {
        if (hexStr.length() < 1) {
            return null;
        }
        if(hexStr.length()%2!=0){
            hexStr=0+hexStr;
        }
        hexStr = hexStr.replace(" ", "");
        byte[] result = new byte[hexStr.length() / 2];
        for (int i = 0; i < hexStr.length() / 2; i++) {
            int high = Integer.parseInt(hexStr.substring(i * 2, i * 2 + 1), 16);
            int low = Integer.parseInt(hexStr.substring(i * 2 + 1, i * 2 + 2), 16);
            result[i] = (byte) (high * 16 + low);
        }
        return result;
    }

}
