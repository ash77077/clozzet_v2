import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  B2BOrder,
  CreateB2BOrderDto,
  UpdateB2BOrderStatusDto,
  OrderStatusNotification,
} from '../models/b2b-order.model';
import { Company } from '../models/dashboard.models';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class B2BOrdersService {
  private readonly apiUrl = `${environment.apiUrl}/b2b-orders`;
  private readonly dashboardUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  /** Admin/Manager: all orders. Client: automatically scoped to own company on backend. */
  getOrders(): Observable<B2BOrder[]> {
    return this.http
      .get<ApiResponse<B2BOrder[]>>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(map(r => r.data));
  }

  /** Convenience alias for clients fetching only their own orders. */
  getMyOrders(): Observable<B2BOrder[]> {
    return this.http
      .get<ApiResponse<B2BOrder[]>>(`${this.apiUrl}/my-orders`, { headers: this.getHeaders() })
      .pipe(map(r => r.data));
  }

  getOrderById(id: string): Observable<B2BOrder> {
    return this.http
      .get<ApiResponse<B2BOrder>>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(map(r => r.data));
  }

  createOrder(dto: CreateB2BOrderDto): Observable<B2BOrder> {
    return this.http
      .post<ApiResponse<B2BOrder>>(this.apiUrl, dto, { headers: this.getHeaders() })
      .pipe(map(r => r.data));
  }

  /**
   * Update the status of an order.
   * After a successful update the method automatically fires a notification
   * to the client who owns the order (see triggerStatusNotification below).
   */
  updateStatus(orderId: string, dto: UpdateB2BOrderStatusDto): Observable<B2BOrder> {
    return this.http
      .patch<ApiResponse<B2BOrder>>(
        `${this.apiUrl}/${orderId}/status`,
        dto,
        { headers: this.getHeaders() },
      )
      .pipe(
        map(r => r.data),
        tap(updatedOrder => this.triggerStatusNotification(updatedOrder, dto)),
      );
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // ─── Companies (for Manager dropdown) ────────────────────────────────────

  getCompanies(): Observable<Company[]> {
    return this.http
      .get<ApiResponse<Company[]>>(`${this.dashboardUrl}/companies`, { headers: this.getHeaders() })
      .pipe(map(r => r.data));
  }

  // ─── Notification Trigger ─────────────────────────────────────────────────

  /**
   * Pushes a notification record to the backend after every status change.
   * The message follows the spec:
   *   "Your order for [Company] is now [New Status]"
   *
   * Errors are silently swallowed so they never break the status-update flow.
   */
  private triggerStatusNotification(order: B2BOrder, dto: UpdateB2BOrderStatusDto): void {
    const notification: Omit<OrderStatusNotification, 'id' | 'createdAt'> = {
      orderId: order.id!,
      userId: order.orderedBy,
      companyName: order.companyName,
      message: `Your order for ${order.companyName} is now ${dto.status}`,
      newStatus: dto.status,
      isRead: false,
    };

    this.http
      .post(`${this.apiUrl}/notifications`, notification, { headers: this.getHeaders() })
      .subscribe({ error: err => console.warn('Notification delivery failed:', err) });
  }
}
