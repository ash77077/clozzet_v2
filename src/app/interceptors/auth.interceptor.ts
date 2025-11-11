import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const AuthInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

  // List of public endpoints that don't require authentication
  const publicEndpoints = [
    '/auth/',
    '/products', // Public product list
    '/quotes', // Public quote submission
  ];

  // Check if the request is to a public endpoint
  const isPublicEndpoint = publicEndpoints.some(endpoint =>
    request.url.includes(endpoint) && !request.url.includes('/admin/')
  );

  // Only add auth header if we have a token and it's not a public endpoint
  if (accessToken && !isPublicEndpoint) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  return next(request);
};
