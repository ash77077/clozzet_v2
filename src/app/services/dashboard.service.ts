import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AdminDashboardData,
  Company,
  DashboardStats,
  Order,
  User,
  UserDashboardData,
} from '../models/dashboard.models';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(
      `${this.API_URL}/dashboard/stats`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(
      `${this.API_URL}/dashboard/users`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getAllCompanies(): Observable<Company[]> {
    return this.http.get<ApiResponse<Company[]>>(
      `${this.API_URL}/dashboard/companies`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getAllOrders(): Observable<Order[]> {
    // For now, return product details as orders
    return this.http.get<ApiResponse<Order[]>>(
      `${this.API_URL}/product-details`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getOrdersByCompany(): Observable<{ company: Company; orderCount: number; totalValue: number }[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/top-companies`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data.map(item => ({
        company: item,
        orderCount: item.orderCount || 0,
        totalValue: item.totalOrderValue || 0
      })))
    );
  }

  getOrdersByUser(): Observable<{ user: User; orderCount: number; totalValue: number }[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/user-activity`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data.map(item => ({
        user: item.user || item,
        orderCount: item.orderCount || 0,
        totalValue: item.totalValue || 0
      })))
    );
  }

  getUserDashboardData(userId: string): Observable<UserDashboardData> {
    return this.http.get<ApiResponse<UserDashboardData>>(
      `${this.API_URL}/dashboard/user/${userId}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getAdminDashboardData(): Observable<AdminDashboardData> {
    return this.http.get<ApiResponse<AdminDashboardData>>(
      `${this.API_URL}/dashboard/admin`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getUserActivity(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/user-activity`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getMonthlyOrderData(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/monthly-orders`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getRecentUsers(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/recent-users`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getRecentCompanies(limit: number = 5): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/recent-companies`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }

  getTopCompanies(limit: number = 5): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/dashboard/top-companies`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => response.data)
    );
  }
}
