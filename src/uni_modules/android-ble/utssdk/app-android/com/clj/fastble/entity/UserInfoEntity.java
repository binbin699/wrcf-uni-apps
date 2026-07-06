package com.clj.fastble.entity;

import com.google.gson.Gson;

public class UserInfoEntity {
    public static final byte[] ANDROID_HEAD={0x12, 0x12, 0x12, 0x12, 0x12};
    public static final byte[] IPHONE_HEAD={0x11, 0x11, 0x11, 0x11, 0x11};

    /*
     * 1:激活
     * 2:推送消息
     */
    int type;
    MessageEntity data;
    String name;
    String pwd;

    public MessageEntity getData() {
        return data;
    }

    public void setData(MessageEntity data) {
        this.data = data;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }



    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPwd() {
        return pwd;
    }

    public void setPwd(String pwd) {
        this.pwd = pwd;
    }

    public UserInfoEntity() {
    }

    public UserInfoEntity(byte type, MessageEntity mNotificationEntity) {
        this.type = type;
        this.data = mNotificationEntity;
    }

    public UserInfoEntity(int type, String name, String pwd) {
        this.type = type;
        this.name = name;
        this.pwd = pwd;
    }

    public String toJson() {
        return new Gson().toJson(this);
    }

    public static UserInfoEntity fromJson(String json) {
        return new Gson().fromJson(json, UserInfoEntity.class);
    }
}
