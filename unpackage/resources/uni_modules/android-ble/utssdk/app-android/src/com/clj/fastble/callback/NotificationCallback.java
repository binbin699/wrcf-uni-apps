package com.clj.fastble.callback;

import android.service.notification.StatusBarNotification;

import com.clj.fastble.exception.BleException;

public abstract class NotificationCallback extends BleBaseCallback{

    public abstract void onNotificationPosted(StatusBarNotification sbn);

    public abstract void onNotificationRemoved(StatusBarNotification sbn);

}
