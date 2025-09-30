import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService, User } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { ProductDetailsService } from '../../services/product-details.service';
import { OrderStatus, UserRole, ProductDetails } from '../../models/dashboard.models';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge.component';
import {Tooltip} from "primeng/tooltip";

@Component({
  selector: 'app-orders-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    AccordionModule,
    PriorityBadgeComponent,
    Tooltip
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './orders-management.component.html',
  styleUrl: './orders-management.component.scss'
})
export class OrdersManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  allOrders: ProductDetails[] = [];
  filteredOrders: ProductDetails[] = [];
  currentUser: User | null = null;
  selectedOrder: ProductDetails | null = null;

  // UI state
  isLoading = true;
  error = '';
  showOrderDetails = false;

  // Search and filter properties
  searchTerm = '';
  selectedStatus = '';
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // Constants
  OrderStatus = OrderStatus;
  UserRole = UserRole;
  availableStatuses = [
    { value: '', label: 'All Status' },
    { value: OrderStatus.PENDING, label: 'Pending' },
    { value: OrderStatus.CONFIRMED, label: 'Confirmed' },
    { value: OrderStatus.IN_PROGRESS, label: 'In Progress' },
    { value: OrderStatus.READY_FOR_DELIVERY, label: 'Ready for Delivery' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' },
    { value: OrderStatus.RETURNED, label: 'Returned' }
  ];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private productDetailsService: ProductDetailsService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadOrders();
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
      });
  }

  protected loadOrders(): void {
    this.isLoading = true;
    this.productDetailsService.getAllProductDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allOrders = response.data || [];
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.error = 'Failed to load orders';
          this.isLoading = false;
        }
      });
  }

  // Search and filter methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.allOrders];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(term) ||
        order.clientName.toLowerCase().includes(term) ||
        order.salesPerson.toLowerCase().includes(term) ||
        (order.user ? (order.user.firstName + ' ' + order.user.lastName).toLowerCase().includes(term) : false) ||
        (order.user?.email || '').toLowerCase().includes(term) ||
        (order.company?.name || '').toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(order => order.status === this.selectedStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison;

      switch (this.sortBy) {
        case 'orderNumber':
          comparison = a.orderNumber.localeCompare(b.orderNumber);
          break;
        case 'user':
          const aUser = a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}` : a.clientName || '';
          const bUser = b.user ? `${b.user.firstName || ''} ${b.user.lastName || ''}` : b.clientName || '';
          comparison = aUser.localeCompare(bUser);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'totalAmount':
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        case 'createdAt':
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aDate - bDate;
          break;
        default:
          comparison = 0;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredOrders = filtered;
    this.calculatePagination();
  }

  // Pagination methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
  }

  getPaginatedOrders(): ProductDetails[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredOrders.slice(startIndex, endIndex);
  }

  // Order action methods
  viewOrderDetails(order: ProductDetails): void {
    this.selectedOrder = order;
    this.showOrderDetails = true;
  }

  closeOrderDetails(): void {
    this.showOrderDetails = false;
    this.selectedOrder = null;
  }

  updateOrderStatus(order: ProductDetails, newStatus: OrderStatus): void {
    // TODO: Implement update order status functionality
    console.log('Update order status:', order, newStatus);
    this.messageService.add({severity:'info', summary:'Status Updated', detail:`Order ${order.orderNumber} status updated to ${newStatus}`});
  }

  cancelOrder(order: ProductDetails): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to cancel order ${order.orderNumber}?`,
      header: 'Cancel Order',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // TODO: Implement cancel order functionality
        console.log('Cancel order:', order);
        this.messageService.add({severity:'success', summary:'Order Cancelled', detail:`Order ${order.orderNumber} has been cancelled`});
      }
    });
  }

  // Utility methods
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getStatusSeverity(status: OrderStatus): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | null | undefined {
    switch (status) {
      case OrderStatus.DELIVERED:
        return 'success';
      case OrderStatus.CONFIRMED:
      case OrderStatus.IN_PROGRESS:
        return 'info';
      case OrderStatus.PENDING:
      case OrderStatus.READY_FOR_DELIVERY:
        return 'warning';
      case OrderStatus.CANCELLED:
      case OrderStatus.RETURNED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getStatusDisplayName(status: OrderStatus): string {
    const statusMap: { [key in OrderStatus]: string } = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.CONFIRMED]: 'Confirmed',
      [OrderStatus.IN_PROGRESS]: 'In Progress',
      [OrderStatus.READY_FOR_DELIVERY]: 'Ready for Delivery',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
      [OrderStatus.RETURNED]: 'Returned'
    };
    return statusMap[status] || status;
  }

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN || this.currentUser?.role === UserRole.MANAGER;
  }

  // Utility to expose Object.keys to the template
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
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

  isDeadlineUrgent(deadline: string): boolean {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return deadlineDate <= threeDaysFromNow;
  }


  editOrder(order: any): void {
    // Navigate to edit form or open edit modal
    this.messageService.add({
      severity: 'info',
      summary: 'Edit Order',
      detail: `Editing order ${order.orderNumber}`
    });
  }

  deleteOrder(order: any): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete order ${order.orderNumber}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-text',
      defaultFocus: 'reject',
      accept: () => {
        this.productDetailsService.deleteProductDetails(order._id || order.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: `Order ${order.orderNumber} has been deleted`
            });
            this.loadOrders();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete order'
            });
          }
        });
      }
    });
  }

  hasGarmentSpecs(): boolean {
    if (!this.selectedOrder) return false;
    
    const specs = [
      'neckStyle', 'sleeveType', 'fit', 'hoodieStyle', 'pocketType', 'zipperType',
      'collarStyle', 'buttonCount', 'placketStyle', 'bagStyle', 'handleType',
      'bagDimensions', 'reinforcement', 'capStyle', 'visorType', 'closure',
      'apronStyle', 'neckStrap', 'waistTie', 'pocketDetails'
    ] as (keyof ProductDetails)[];
    
    return specs.some(spec => this.selectedOrder?.[spec]);
  }

  hasFiles(): boolean {
    if (!this.selectedOrder) return false;
    
    const hasLogoFiles = !!(this.selectedOrder.logoFiles && this.selectedOrder.logoFiles.length > 0);
    const hasDesignFiles = !!(this.selectedOrder.designFiles && this.selectedOrder.designFiles.length > 0);
    const hasReferenceImages = !!(this.selectedOrder.referenceImages && this.selectedOrder.referenceImages.length > 0);
    
    return hasLogoFiles || hasDesignFiles || hasReferenceImages;
  }
}
