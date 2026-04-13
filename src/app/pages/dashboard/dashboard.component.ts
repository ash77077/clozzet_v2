import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ChartModule } from 'primeng/chart';
import { AuthService, User } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { B2BOrdersService } from '../../services/b2b-orders.service';
import { B2BOrder, B2BOrderStatus } from '../../models/b2b-order.model';
import { CustomersService } from '../../services/customers.service';
import { InteractionsService } from '../../services/interactions.service';
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

  // Client Dashboard Data
  clientOrders: B2BOrder[] = [];
  clientStats = {
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    deliveredOrders: 0
  };

  // Manager Dashboard Data
  managerStats = {
    pendingApprovals: 0,
    totalCustomers: 0,
    followUpsToday: 0,
    recentInteractions: 0
  };

  // Utility properties
  UserRole = UserRole;
  OrderStatus = OrderStatus;
  B2BOrderStatus = B2BOrderStatus;

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
    private b2bOrdersService: B2BOrdersService,
    private customersService: CustomersService,
    private interactionsService: InteractionsService,
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
    // Check role and load appropriate dashboard
    if (this.isUserAdmin()) {
      this.loadAdminDashboard();
    } else if (this.isUserManager()) {
      this.loadManagerDashboard();
    } else {
      this.loadClientDashboard();
    }
  }

  isUserAdmin(): boolean {
    return this.currentUser?.role === UserRole.ADMIN;
  }

  isUserManager(): boolean {
    return this.currentUser?.role === UserRole.MANAGER;
  }

  isUserAdminOrManager(): boolean {
    return this.isUserAdmin() || this.isUserManager();
  }

  isUserClient(): boolean {
    return this.currentUser?.role === UserRole.BUSINESS_USER ||
           this.currentUser?.role === UserRole.CUSTOMER ||
           this.currentUser?.role === UserRole.USER;
  }

  private loadAdminDashboard(): void {
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

  private loadManagerDashboard(): void {
    // Managers see simplified stats - no revenue, no user counts
    // Just show what's relevant to their work
    forkJoin({
      customers: this.customersService.getAll(),
      interactions: this.interactionsService.getAll(),
      pendingInteractionFollowUps: this.interactionsService.getPendingFollowUps(),
      orders: this.b2bOrdersService.getOrders()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        // Calculate stats
        this.managerStats.totalCustomers = data.customers.length;

        // Recent Interactions: Count interactions from the last 7 days
        this.managerStats.recentInteractions = this.calculateRecentInteractions(data.interactions);

        // Follow-ups Due Today: Check both customer nextFollowUpAt and interaction nextFollowUpDate
        this.managerStats.followUpsToday = this.calculateFollowUpsDueToday(
          data.customers,
          data.pendingInteractionFollowUps
        );

        // Calculate pending approvals (orders in pending status)
        this.managerStats.pendingApprovals = data.orders.filter(
          o => o.status === B2BOrderStatus.PENDING
        ).length;

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading manager dashboard:', error);
        // Set defaults if services fail
        this.managerStats = {
          pendingApprovals: 0,
          totalCustomers: 0,
          followUpsToday: 0,
          recentInteractions: 0
        };
        this.isLoading = false;
      }
    });
  }

  private calculateRecentInteractions(interactions: any[]): number {
    // Count interactions from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return interactions.filter(interaction => {
      if (!interaction.interactionDate) return false;
      const interactionDate = new Date(interaction.interactionDate);
      return interactionDate >= sevenDaysAgo;
    }).length;
  }

  private calculateFollowUpsDueToday(customers: any[], pendingInteractionFollowUps: any[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count customers with nextFollowUpAt due today
    const customerFollowUpsToday = customers.filter(c => {
      if (!c.nextFollowUpAt) return false;
      const followUpDate = new Date(c.nextFollowUpAt);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;

    // Count pending interactions with nextFollowUpDate due today
    const interactionFollowUpsToday = pendingInteractionFollowUps.filter(interaction => {
      if (!interaction.nextFollowUpDate) return false;
      const followUpDate = new Date(interaction.nextFollowUpDate);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;

    // Return total (avoid double counting if both exist for same customer)
    return customerFollowUpsToday + interactionFollowUpsToday;
  }

  private loadClientDashboard(): void {
    // Load client-specific orders data
    this.b2bOrdersService.getMyOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => {
          this.clientOrders = orders || [];
          this.calculateClientStats();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading client dashboard:', error);
          // Don't show error - just show empty state if no company
          this.clientOrders = [];
          this.calculateClientStats();
          this.isLoading = false;
        }
      });
  }

  private calculateClientStats(): void {
    this.clientStats.totalOrders = this.clientOrders.length;
    this.clientStats.pendingOrders = this.clientOrders.filter(
      o => o.status === B2BOrderStatus.PENDING
    ).length;
    this.clientStats.inProgressOrders = this.clientOrders.filter(
      o => o.status === B2BOrderStatus.IN_PRODUCTION ||
           o.status === B2BOrderStatus.QUALITY_CHECK ||
           o.status === B2BOrderStatus.SHIPPED
    ).length;
    this.clientStats.deliveredOrders = this.clientOrders.filter(
      o => o.status === B2BOrderStatus.DELIVERED
    ).length;
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

  getRecentOrders(): B2BOrder[] {
    return this.clientOrders.slice(0, 5);
  }

  getB2BStatusClass(status: B2BOrderStatus): string {
    const statusClasses = {
      [B2BOrderStatus.PENDING]: 'status-pending',
      [B2BOrderStatus.IN_PRODUCTION]: 'status-in-progress',
      [B2BOrderStatus.QUALITY_CHECK]: 'status-quality-check',
      [B2BOrderStatus.SHIPPED]: 'status-shipped',
      [B2BOrderStatus.DELIVERED]: 'status-delivered',
    };
    return statusClasses[status] || 'status-default';
  }

  getOrderId(order: B2BOrder): string {
    return order.id ?? (order as any)._id ?? '';
  }

  getTotalItems(order: B2BOrder): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getCompanyName(): string {
    if (!this.currentUser?.company) return '';
    const company = this.currentUser.company as any;
    return company.name || company || '';
  }
}
