import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  OrderRequest,
  CreateOrderRequestDto,
  AdminReviewOrderRequestDto
} from '../models/order-request.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class OrderRequestsService {
  private apiUrl = `${environment.apiUrl}/order-requests`;

  constructor(private http: HttpClient) {}

  /**
   * Manager creates a new order request
   */
  create(dto: CreateOrderRequestDto): Observable<OrderRequest> {
    return this.http.post<ApiResponse<OrderRequest>>(this.apiUrl, dto).pipe(
      map(response => response.data)
    );
  }

  /**
   * Manager views their own order requests
   */
  getMyRequests(): Observable<OrderRequest[]> {
    return this.http.get<ApiResponse<OrderRequest[]>>(`${this.apiUrl}/my-requests`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Admin views all pending order requests
   */
  getPendingRequests(): Observable<OrderRequest[]> {
    return this.http.get<ApiResponse<OrderRequest[]>>(`${this.apiUrl}/pending`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Admin views all order requests
   */
  getAllRequests(): Observable<OrderRequest[]> {
    return this.http.get<ApiResponse<OrderRequest[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get a single order request by ID
   */
  getById(id: string): Observable<OrderRequest> {
    return this.http.get<ApiResponse<OrderRequest>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Admin reviews and approves/rejects an order request
   */
  reviewRequest(id: string, dto: AdminReviewOrderRequestDto): Observable<OrderRequest> {
    return this.http.patch<ApiResponse<OrderRequest>>(`${this.apiUrl}/${id}/review`, dto).pipe(
      map(response => response.data)
    );
  }

  /**
   * Admin deletes an order request
   */
  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
