import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  _id?: string;
  userId: string;
  type: 'mention' | 'status_change' | 'order_created' | 'order_updated' | 'file_uploaded' | 'comment' | 'order_request' | 'follow_up_reminder';
  title: string;
  message: string;
  link?: string;
  orderId?: string;
  orderNumber?: string;
  read: boolean;
  createdAt: Date | string;
  fromUser?: string;
  fromUserId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = 'http://localhost:3000/api';
  private socketUrl = 'http://localhost:3000';
  private socket: Socket | null = null;
  private connectedUserId: string | null = null;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private socketReady$ = new Subject<void>();

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  ngOnDestroy(): void {
    this.disconnectSocket();
    this.socketReady$.complete();
  }

  // Connect to WebSocket for real-time notifications
  connectSocket(userId: string): void {
    if (!userId) {
      console.warn('Cannot connect socket: userId is required');
      return;
    }

    // Already connected for this user — do nothing
    if (this.socket?.connected && this.connectedUserId === userId) {
      return;
    }

    // Disconnect existing socket if any
    this.disconnectSocket();

    // Create new socket connection
    this.socket = io(`${this.socketUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle connection
    this.socket.on('connect', () => {
      this.connectedUserId = userId;
      // Register user with socket
      if (this.socket) {
        this.socket.emit('register', { userId });
      }

      // Notify any pending observers that the socket is ready
      this.socketReady$.next();

      // Fetch initial notifications
      this.fetchNotifications(userId).subscribe({
        error: (err) => console.error('Error fetching initial notifications:', err)
      });
    });

    // Handle incoming notifications
    this.socket.on('notification', (notification: Notification) => {
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
      this.updateUnreadCount([notification, ...currentNotifications]);
    });

    // Handle unread count updates
    this.socket.on('unreadCountUpdate', (data: { count: number }) => {
      this.unreadCountSubject.next(data.count);
    });

    // Handle errors
    this.socket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error.message);
    });

    // Handle reconnection
    this.socket.on('reconnect', (attemptNumber: number) => {
      if (this.socket) {
        this.socket.emit('register', { userId });
      }
    });
  }

  // Disconnect WebSocket
  disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedUserId = null;
    }
  }

  // Fetch notifications from backend
  fetchNotifications(userId: string): Observable<any> {
    return new Observable(observer => {
      this.http.get<any>(`${this.apiUrl}/notifications/${userId}`)
        .subscribe({
          next: (response) => {
            const notifications = response.data || [];
            this.notificationsSubject.next(notifications);
            this.updateUnreadCount(notifications);
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('Error fetching notifications:', error);
            observer.error(error);
          }
        });
    });
  }

  // Create a notification
  createNotification(notification: Partial<Notification>): Observable<any> {
    return new Observable(observer => {
      this.http.post<any>(`${this.apiUrl}/notifications`, notification)
        .subscribe({
          next: (response) => {
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('❌ Notification API error:', error);
            observer.error(error);
          }
        });
    });
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<any> {
    return new Observable(observer => {
      this.http.patch<any>(`${this.apiUrl}/notifications/${notificationId}/read`, {})
        .subscribe({
          next: (response) => {
            // Update local state
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.map(n =>
              n._id === notificationId ? { ...n, read: true } : n
            );
            this.notificationsSubject.next(updatedNotifications);
            this.updateUnreadCount(updatedNotifications);
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('Error marking notification as read:', error);
            observer.error(error);
          }
        });
    });
  }

  // Mark all notifications as read
  markAllAsRead(userId: string): Observable<any> {
    return new Observable(observer => {
      this.http.patch<any>(`${this.apiUrl}/notifications/${userId}/read-all`, {})
        .subscribe({
          next: (response) => {
            // Update local state
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
            this.notificationsSubject.next(updatedNotifications);
            this.updateUnreadCount(updatedNotifications);
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('Error marking all notifications as read:', error);
            observer.error(error);
          }
        });
    });
  }

  // Delete a notification
  deleteNotification(notificationId: string): Observable<any> {
    return new Observable(observer => {
      this.http.delete<any>(`${this.apiUrl}/notifications/${notificationId}`)
        .subscribe({
          next: (response) => {
            // Update local state
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.filter(n => n._id !== notificationId);
            this.notificationsSubject.next(updatedNotifications);
            this.updateUnreadCount(updatedNotifications);
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            console.error('Error deleting notification:', error);
            observer.error(error);
          }
        });
    });
  }

  // Create mention notification
  createMentionNotification(
    mentionedUserId: string,
    fromUserName: string,
    fromUserId: string,
    orderNumber: string,
    orderId: string,
    commentText: string
  ): Observable<any> {
    const notification: Partial<Notification> = {
      userId: mentionedUserId,
      type: 'mention',
      title: `${fromUserName} mentioned you`,
      message: `${fromUserName} mentioned you in order ${orderNumber}: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
      link: `/orders?order=${orderId}`,
      orderId: orderId,
      orderNumber: orderNumber,
      fromUser: fromUserName,
      fromUserId: fromUserId,
      read: false
    };

    return this.createNotification(notification);
  }

  // Update unread count
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // Get current notifications
  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  // Get unread count
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Order Activity & Comments (Real-time)
  // ═══════════════════════════════════════════════════════════════════════════

  // Join order room to receive real-time updates
  joinOrderRoom(orderId: string): void {
    if (!this.socket) {
      console.warn('Cannot join order room: socket not connected');
      return;
    }

    this.socket.emit('joinOrder', { orderId });
  }

  // Leave order room
  leaveOrderRoom(orderId: string): void {
    if (!this.socket) {
      return;
    }

    this.socket.emit('leaveOrder', { orderId });
  }

  // Listen for order activity updates
  onOrderActivity(): Observable<{ orderId: string; activity: any }> {
    return new Observable(observer => {
      const subscribe = () => {
        if (!this.socket) return;
        const handler = (data: { orderId: string; activity: any }) => observer.next(data);
        this.socket.on('orderActivity', handler);
        return () => { if (this.socket) this.socket.off('orderActivity', handler); };
      };

      if (this.socket) {
        return subscribe();
      }

      // Wait for socket to be ready then attach
      const readySub = this.socketReady$.subscribe(() => {
        readySub.unsubscribe();
        subscribe();
      });
      return () => readySub.unsubscribe();
    });
  }

  // Listen for order updates
  onOrderUpdate(): Observable<{ orderId: string; update: any }> {
    return new Observable(observer => {
      const subscribe = () => {
        if (!this.socket) return;
        const handler = (data: { orderId: string; update: any }) => observer.next(data);
        this.socket.on('orderUpdate', handler);
        return () => { if (this.socket) this.socket.off('orderUpdate', handler); };
      };

      if (this.socket) {
        return subscribe();
      }

      const readySub = this.socketReady$.subscribe(() => {
        readySub.unsubscribe();
        subscribe();
      });
      return () => readySub.unsubscribe();
    });
  }
}
