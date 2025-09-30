import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { AuthService, User } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import {
  UserRole,
  UserDashboardData,
  AdminDashboardData,
  Order,
  Company,
  OrderStatus
} from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ChartModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  isLoading = true;
  error = '';

  // User Dashboard Data
  userDashboardData: UserDashboardData | null = null;

  // Admin Dashboard Data
  adminDashboardData: AdminDashboardData | null = null;
  allUsers: User[] = [];
  allCompanies: Company[] = [];
  allOrders: Order[] = [];

  // Utility properties
  UserRole = UserRole;
  OrderStatus = OrderStatus;

  // Statistics and Charts Data
  statisticsData: any = {
    totalOrders: 0,
    totalUsers: 0,
    totalCompanies: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeUsers: 0
  };

  // Chart Data
  ordersChartData: any;
  usersChartData: any;
  revenueChartData: any;
  ordersStatusChartData: any;
  companiesChartData: any;

  // Chart Options
  chartOptions: any;

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          if (user) {
            this.loadDashboardDataFromBackend();
          } else {
            this.isLoading = false;
            this.error = 'User not authenticated';
          }
        },
        error: (error) => {
          console.error('Error loading user:', error);
          this.error = 'Failed to load user data';
          this.isLoading = false;
        }
      });
  }

  private loadDashboardDataFromBackend(): void {
    // Load statistics and chart data from backend
    forkJoin({
      stats: this.dashboardService.getDashboardStats(),
      userActivity: this.dashboardService.getUserActivity(),
      monthlyOrderData: this.dashboardService.getMonthlyOrderData(),
      topCompanies: this.dashboardService.getTopCompanies()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.statisticsData = data.stats;
        this.initializeChartsWithBackendData(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.error = 'Failed to load dashboard data';
        this.isLoading = false;
      }
    });
  }

  private initializeChartsWithBackendData(data: any): void {
    this.initializeChartOptions();
    this.initializeOrdersChartWithData(data.monthlyOrderData);
    this.initializeUsersChartWithData(data.userActivity);
    this.initializeRevenueChartWithData(data.monthlyOrderData);
    this.initializeOrdersStatusChart();
    this.initializeCompaniesChartWithData(data.topCompanies);
  }

  private initializeChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12,
              family: 'Inter, sans-serif'
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        },
        y: {
          grid: {
            color: '#e9ecef'
          },
          ticks: {
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        }
      }
    };
  }

  private initializeOrdersChartWithData(monthlyData: any[]): void {
    const labels = monthlyData?.map(item => item.month) || ['Nov', 'Dec', 'Jan'];
    const orderData = monthlyData?.map(item => item.orders) || [32, 45, 38];

    this.ordersChartData = {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: orderData,
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderColor: '#3498db',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  private initializeUsersChartWithData(userActivity: any[]): void {
    // Use last 6 data points or default data
    const recentActivity = userActivity?.slice(-6) || [];
    const labels = recentActivity.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const userData = recentActivity.map(item => item.registrations) || [8, 12, 15, 18, 22, 19];

    this.usersChartData = {
      labels,
      datasets: [
        {
          label: 'New Users',
          data: userData,
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderColor: '#2ecc71',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  private initializeRevenueChartWithData(monthlyData: any[]): void {
    const labels = monthlyData?.map(item => item.month) || ['Q1', 'Q2', 'Q3'];
    const revenueData = monthlyData?.map(item => item.revenue) || [28500, 32800, 38200];

    this.revenueChartData = {
      labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenueData,
          backgroundColor: [
            'rgba(52, 152, 219, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(155, 89, 182, 0.8)'
          ],
          borderColor: [
            '#3498db',
            '#2ecc71',
            '#f1c40f',
            '#9b59b6'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  private initializeOrdersStatusChart(): void {
    // Use statistics data for order status
    const completedOrders = this.statisticsData.completedOrders || 0;
    const pendingOrders = this.statisticsData.pendingOrders || 0;
    const inProgressOrders = Math.max(0, this.statisticsData.totalOrders - completedOrders - pendingOrders - 5);

    this.ordersStatusChartData = {
      labels: ['Completed', 'In Progress', 'Pending', 'Cancelled'],
      datasets: [
        {
          data: [completedOrders, inProgressOrders, pendingOrders, 5],
          backgroundColor: [
            '#2ecc71',
            '#3498db',
            '#f39c12',
            '#e74c3c'
          ],
          borderColor: [
            '#27ae60',
            '#2980b9',
            '#e67e22',
            '#c0392b'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  private initializeCompaniesChartWithData(topCompanies: any[]): void {
    const labels = topCompanies?.slice(0, 4).map(company => company.name) || ['Small', 'Medium', 'Large', 'Enterprise'];
    const companyData = topCompanies?.slice(0, 4).map(company => company.orderCount || Math.floor(Math.random() * 10) + 1) || [8, 9, 4, 2];

    this.companiesChartData = {
      labels,
      datasets: [
        {
          label: 'Order Count',
          data: companyData,
          backgroundColor: [
            'rgba(52, 152, 219, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(231, 76, 60, 0.8)'
          ],
          borderColor: [
            '#3498db',
            '#2ecc71',
            '#f1c40f',
            '#e74c3c'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  isAdminOrManager(role: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.MANAGER;
  }

  isCustomerOrUser(role: string): boolean {
    return role === UserRole.CUSTOMER || role === UserRole.USER;
  }

  getStatusClass(status: OrderStatus): string {
    const statusClasses = {
      [OrderStatus.PENDING]: 'status-pending',
      [OrderStatus.CONFIRMED]: 'status-confirmed', 
      [OrderStatus.IN_PROGRESS]: 'status-in-progress',
      [OrderStatus.READY_FOR_DELIVERY]: 'status-ready',
      [OrderStatus.DELIVERED]: 'status-delivered',
      [OrderStatus.CANCELLED]: 'status-cancelled',
      [OrderStatus.RETURNED]: 'status-returned'
    };
    return statusClasses[status] || 'status-default';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getGrowthClass(growth: number): string {
    return growth >= 0 ? 'growth-positive' : 'growth-negative';
  }

  logout(): void {
    this.authService.logout();
  }

  // Navigation methods
  navigateToUsers(): void {
    this.router.navigate(['/users']);
  }

  navigateToCompanies(): void {
    this.router.navigate(['/companies']);
  }

  navigateToOrders(): void {
    this.router.navigate(['/orders']);
  }

  navigateToCategories(): void {
    this.router.navigate(['/products']);
  }

  // New navigation methods for simplified dashboard
  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToReports(): void {
    this.router.navigate(['/reports']);
  }

  navigateToSupport(): void {
    this.router.navigate(['/support']);
  }

  createNew(): void {
    // This could navigate to a creation page or open a modal
    this.router.navigate(['/create']);
  }

  // Data limiting methods for dashboard preview
  getLimitedUsers(): User[] {
    return this.allUsers.slice(0, 5); // Show only first 5 users
  }

  getLimitedCompanies(): Company[] {
    return this.allCompanies.slice(0, 5); // Show only first 5 companies
  }

  getLimitedTopCompanies(): any[] {
    return this.adminDashboardData?.topCompanies?.slice(0, 6) || []; // Show only first 6 top companies
  }

  getPriorityClass(priority: string): string {
    const priorityClasses: { [key: string]: string } = {
      'low': 'priority-low',
      'normal': 'priority-normal',
      'high': 'priority-high',
      'urgent': 'priority-urgent'
    };
    return priorityClasses[priority.toLowerCase()] || 'priority-normal';
  }
}
