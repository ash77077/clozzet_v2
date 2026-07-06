import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

// Public endpoints that never need an auth header or refresh logic
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/products',
  '/quotes',
];

function isPublic(url: string): boolean {
  return PUBLIC_ENDPOINTS.some(e => url.includes(e) && !url.includes('/admin/'));
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const AuthInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isPublic(request.url)) {
    return next(request);
  }

  const token = authService.getAccessToken();
  const authedRequest = token ? addToken(request, token) : request;

  return next(authedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only attempt refresh on 401 from non-refresh endpoints
      if (error.status !== 401 || isPublic(request.url)) {
        return throwError(() => error);
      }

      // Try to refresh the access token
      return authService.refreshToken().pipe(
        switchMap(tokens => {
          // Retry the original request with the new access token
          return next(addToken(request, tokens.accessToken));
        }),
        catchError(refreshError => {
          // Refresh failed — token is truly expired or invalid; log out
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
