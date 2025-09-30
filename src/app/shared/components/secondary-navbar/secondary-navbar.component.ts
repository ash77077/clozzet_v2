import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService, User } from '../../../services/auth.service';
import { UserRole } from '../../../models/dashboard.models';

interface OrderStats {
  pending: number;
  inProgress: number;
  total: number;
}

interface UserOrderStats {
  total: number;
  pending: number;
}

@Component({
  selector: 'app-secondary-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TooltipModule
  ],
  templateUrl: './secondary-navbar.component.html',
  styleUrl: './secondary-navbar.component.scss'
})
export class SecondaryNavbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  isAuthenticated = false;
  orderStats: OrderStats | null = null;
  userOrderStats: UserOrderStats | null = null;

  UserRole = UserRole;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadOrderStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
      });
  }

  private loadOrderStats(): void {
    // TODO: Implement order statistics loading
    // This would typically come from a service
    this.orderStats = {
      pending: 5,
      inProgress: 3,
      total: 15
    };

    this.userOrderStats = {
      total: 8,
      pending: 2
    };
  }

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN || 
           this.currentUser?.role === UserRole.MANAGER;
  }

  isCustomerOrUser(): boolean {
    return this.currentUser?.role === UserRole.CUSTOMER || 
           this.currentUser?.role === UserRole.USER;
  }

  exportData(): void {
    // TODO: Implement data export functionality
    console.log('Exporting data...');
  }

  refreshData(): void {
    // TODO: Implement data refresh functionality
    console.log('Refreshing data...');
    this.loadOrderStats();
  }
}
