import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PopoverModule } from 'primeng/popover';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { ScrollerModule } from 'primeng/scroller';
import { NotificationService, Notification } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    PopoverModule,
    BadgeModule,
    ButtonModule,
    ScrollerModule
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  notifications: Notification[] = [];
  unreadCount = 0;
  showPanel = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });

    // Subscribe to unread count
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    // Connect to WebSocket for current user — disconnect first to avoid duplicate sockets on re-login
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.id) {
          this.notificationService.connectSocket(user.id);
        } else {
          this.notificationService.disconnectSocket();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.notificationService.disconnectSocket();
  }

  togglePanel(event: Event, op: any): void {
    op.toggle(event);
    this.showPanel = !this.showPanel;
  }

  markAsRead(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!notification.read && notification._id) {
      this.notificationService.markAsRead(notification._id).subscribe();
    }
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.id) {
      this.notificationService.markAllAsRead(currentUser.id).subscribe();
    }
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (notification._id) {
      this.notificationService.deleteNotification(notification._id).subscribe();
    }
  }

  navigateToNotification(notification: Notification, popover?: any): void {
    // Mark as read
    this.markAsRead(notification);

    // Close the popover
    if (popover) {
      popover.hide();
      this.showPanel = false;
    }

    // Navigate to link if provided
    if (notification.link) {
      const urlParts = notification.link.split('?');
      const route = urlParts[0].replace('/orders-management', '/orders');
      const queryString = urlParts[1];

      if (queryString) {
        const queryParams: any = {};
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            queryParams[key] = value;
          }
        });

        this.router.navigate([route], { queryParams }).catch(err => {
          console.error('❌ Navigation failed:', err);
        });
      } else {
        this.router.navigate([route]).catch(err => {
          console.error('❌ Navigation failed:', err);
        });
      }
    } else if (notification.orderId) {
      this.router.navigate(['/orders'], {
        queryParams: { order: notification.orderId }
      }).catch(err => {
        console.error('❌ Navigation failed:', err);
      });
    }
  }

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return notificationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'mention': return 'pi-at';
      case 'status_change': return 'pi-arrows-h';
      case 'order_created': return 'pi-plus-circle';
      case 'order_updated': return 'pi-pencil';
      case 'order_request': return 'pi-shopping-cart';
      case 'file_uploaded': return 'pi-paperclip';
      case 'comment': return 'pi-comment';
      case 'follow_up_reminder': return 'pi-calendar-clock';
      default: return 'pi-bell';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'mention': return 'mention';
      case 'status_change': return 'status';
      case 'order_created': return 'created';
      case 'order_updated': return 'updated';
      case 'order_request': return 'created';
      case 'file_uploaded': return 'file';
      case 'comment': return 'comment';
      case 'follow_up_reminder': return 'followup';
      default: return 'default';
    }
  }
}
