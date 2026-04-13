import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ManagerGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        // Check if user is authenticated and has admin or manager role
        if (user && this.authService.isAuthenticated() && (user.role === 'admin' || user.role === 'manager')) {
          return true;
        } else if (user && this.authService.isAuthenticated()) {
          // User is logged in but not admin or manager
          this.router.navigate(['/dashboard'], {
            queryParams: { error: 'unauthorized' }
          });
          return false;
        } else {
          // User is not logged in
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
      })
    );
  }
}
