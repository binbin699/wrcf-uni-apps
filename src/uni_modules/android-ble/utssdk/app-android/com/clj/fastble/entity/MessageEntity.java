package com.clj.fastble.entity;

import com.google.gson.Gson;

public class MessageEntity {
    private String pkg = "com.dialer";
    private String title = "";
    private String text = "";
    private boolean post = true;
    private int type = 2;

    public MessageEntity(String pkg, String title, String text, boolean post, int messageType) {
        this.pkg = pkg;
        this.title = title;
        this.text = text;
        this.post = post;
        this.type = messageType;
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public MessageEntity(){}

    public boolean isPost() {
        return post;
    }

    public void setPost(boolean post) {
        this.post = post;
    }

    public MessageEntity(String pkg, String title, String text) {
        this.pkg = pkg;
        this.title = title;
        this.text = text;
    }

    public String getPkg() {
        return pkg;
    }

    public void setPkg(String pkg) {
        this.pkg = pkg;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    @Override
    public String toString() {
        return "通知包名 = " + pkg + '\n' +
                "通知标题 = " + title + '\n' +
                "通知内容 = " + text;
    }

    public String toJson() {
        return new Gson().toJson(this);
    }
}
