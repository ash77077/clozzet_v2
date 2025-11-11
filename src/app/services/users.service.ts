import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
  role: 'admin' | 'manager' | 'user' | 'customer' | 'business_user';
  company?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role?: string;
  isActive?: boolean;
  company?: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
  role?: string;
  isActive?: boolean;
  company?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createUser(userData: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData, { headers: this.getHeaders() });
  }

  updateUser(id: string, userData: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData, { headers: this.getHeaders() });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  activateUser(id: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/activate`, {}, { headers: this.getHeaders() });
  }

  deactivateUser(id: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }
}
