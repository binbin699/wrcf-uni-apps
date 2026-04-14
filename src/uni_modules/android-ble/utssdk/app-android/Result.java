package com.libble.ble;

public class Result {
    private int type;
    private String message;
    private Object data;
    public Result(int type, String message, Object data) {
        this.type = type;
        this.message = message;
        this.data = data;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }
}
