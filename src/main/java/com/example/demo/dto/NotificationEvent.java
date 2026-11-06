package com.example.demo.dto;

import com.example.demo.model.Notification;

/**
 * Message poussé en temps réel à un utilisateur quand une notification lui est destinée :
 * la notification elle-même, et son nombre de notifications non lues après réception.
 */
public class NotificationEvent {
    private Notification notification;
    private long unreadCount;

    public NotificationEvent(Notification notification, long unreadCount) {
        this.notification = notification;
        this.unreadCount = unreadCount;
    }

    public Notification getNotification() {
        return notification;
    }

    public void setNotification(Notification notification) {
        this.notification = notification;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
