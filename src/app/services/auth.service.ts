import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
  company?: any;
  createdAt?: Date;
  lastLogin?: Date;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  department: string;
  employeeId?: string;
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    industry: string;
    size: string;
    website?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  currentUser: 'currentUser',
  rememberMe: 'rememberMe',
} as const;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private authReadySubject = new ReplaySubject<boolean>(1);
  public authReady$ = this.authReadySubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  register(registerData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, registerData)
      .pipe(tap(response => this.handleAuthSuccess(response, true)));
  }

  login(loginData: LoginRequest, rememberMe = false): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, loginData)
      .pipe(tap(response => this.handleAuthSuccess(response, rememberMe)));
  }

  logout(): void {
    localStorage.removeItem(KEYS.accessToken);
    localStorage.removeItem(KEYS.refreshToken);
    localStorage.removeItem(KEYS.currentUser);
    localStorage.removeItem(KEYS.rememberMe);
    sessionStorage.removeItem(KEYS.accessToken);
    sessionStorage.removeItem(KEYS.refreshToken);
    sessionStorage.removeItem(KEYS.currentUser);
    this.currentUserSubject.next(null);
  }

  changePassword(newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/change-password`, { newPassword }).pipe(
      tap(() => {
        const user = this.currentUserSubject.value;
        if (user) {
          const updated = { ...user, mustChangePassword: false };
          this.storage.setItem(KEYS.currentUser, JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.storage.getItem(KEYS.refreshToken);
    return this.http.post<{ accessToken: string; refreshToken: string }>(
      `${this.API_URL}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        this.storage.setItem(KEYS.accessToken, response.accessToken);
        this.storage.setItem(KEYS.refreshToken, response.refreshToken);
      })
    );
  }

  getAccessToken(): string | null {
    return this.storage.getItem(KEYS.accessToken);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Returns the storage being used for the current session
  get storage(): Storage {
    return localStorage.getItem(KEYS.rememberMe) === '1' ? localStorage : sessionStorage;
  }

  private handleAuthSuccess(response: AuthResponse, rememberMe: boolean): void {
    // Always write rememberMe flag to localStorage so we can find it on next load
    if (rememberMe) {
      localStorage.setItem(KEYS.rememberMe, '1');
    } else {
      localStorage.removeItem(KEYS.rememberMe);
    }

    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(KEYS.accessToken, response.accessToken);
    store.setItem(KEYS.refreshToken, response.refreshToken);
    store.setItem(KEYS.currentUser, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  private loadStoredUser(): void {
    // Determine which storage to use based on rememberMe flag
    const store = this.storage;
    const storedUser = store.getItem(KEYS.currentUser);
    const accessToken = store.getItem(KEYS.accessToken);

    if (storedUser && accessToken) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch {
        this.logout();
      }
    }
    this.authReadySubject.next(true);
  }
}
