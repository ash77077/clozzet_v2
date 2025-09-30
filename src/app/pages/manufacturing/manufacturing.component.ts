import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
// Note: InputTextarea is part of InputTextModule in newer PrimeNG versions
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService, User } from '../../services/auth.service';
import { ProductDetailsService } from '../../services/product-details.service';
import { ProductDetails, UserRole, ManufacturingStatus } from '../../models/dashboard.models';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge.component';
import {Textarea} from "primeng/textarea";

interface OrderStats {
  urgent: number;
  inProgress: number;
  pending: number;
  total: number;
}

@Component({
  selector: 'app-manufacturing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    PriorityBadgeComponent,
    Textarea
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './manufacturing.component.html',
  styleUrl: './manufacturing.component.scss'
})
export class ManufacturingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  allOrders: ProductDetails[] = [];
  filteredOrders: ProductDetails[] = [];
  currentUser: User | null = null;
  selectedOrder: ProductDetails | null = null;
  orderStats: OrderStats | null = null;

  // UI state
  isLoading = true;
  error = '';
  showOrderDetails = false;
  showNotesDialog = false;
  manufacturingNotes = '';

  // Search and filter properties
  searchTerm = '';
  selectedStatus = '';
  selectedPriority = '';
  selectedDeadline = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // Constants
  UserRole = UserRole;
  ManufacturingStatus = ManufacturingStatus;
  Math = Math; // Expose Math to template

  manufacturingStatuses = [
    { value: '', label: 'All Status' },
    { value: ManufacturingStatus.PENDING, label: 'Pending' },
    { value: ManufacturingStatus.WAITING_FOR_INFO, label: 'Waiting for Info' },
    { value: ManufacturingStatus.IN_PROGRESS, label: 'In Progress' },
    { value: ManufacturingStatus.PRINTING, label: 'Printing' },
    { value: ManufacturingStatus.QUALITY_CHECK, label: 'Quality Check' },
    { value: ManufacturingStatus.PACKAGING, label: 'Packaging' },
    { value: ManufacturingStatus.DONE, label: 'Done' },
    { value: ManufacturingStatus.ON_HOLD, label: 'On Hold' }
  ];

  priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  deadlineOptions = [
    { value: '', label: 'All Deadlines' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Due Today' },
    { value: 'tomorrow', label: 'Due Tomorrow' },
    { value: 'this_week', label: 'This Week' },
    { value: 'next_week', label: 'Next Week' }
  ];

  constructor(
    private authService: AuthService,
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
          this.calculateOrderStats();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading orders:', error);
          this.error = 'Failed to load manufacturing orders';
          this.isLoading = false;
        }
      });
  }

  private calculateOrderStats(): void {
    const urgent = this.allOrders.filter(order => 
      order.priority === 'urgent' || this.isDeadlineUrgent(order.deadline)
    ).length;

    const inProgress = this.allOrders.filter(order => 
      order.manufacturingStatus === ManufacturingStatus.IN_PROGRESS ||
      order.manufacturingStatus === ManufacturingStatus.PRINTING
    ).length;

    const pending = this.allOrders.filter(order => 
      order.manufacturingStatus === ManufacturingStatus.PENDING
    ).length;

    this.orderStats = {
      urgent,
      inProgress,
      pending,
      total: this.allOrders.length
    };
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

  onPriorityChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onDeadlineChange(): void {
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
        order.clientName.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(order => order.manufacturingStatus === this.selectedStatus);
    }

    // Apply priority filter
    if (this.selectedPriority) {
      filtered = filtered.filter(order => order.priority === this.selectedPriority);
    }

    // Apply deadline filter
    if (this.selectedDeadline) {
      filtered = this.filterByDeadline(filtered, this.selectedDeadline);
    }

    this.filteredOrders = filtered;
    this.calculatePagination();
  }

  private filterByDeadline(orders: ProductDetails[], deadline: string): ProductDetails[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    
    const nextWeekEnd = new Date(endOfWeek);
    nextWeekEnd.setDate(endOfWeek.getDate() + 7);

    return orders.filter(order => {
      const orderDeadline = new Date(order.deadline);
      orderDeadline.setHours(0, 0, 0, 0);

      switch (deadline) {
        case 'overdue':
          return orderDeadline < today;
        case 'today':
          return orderDeadline.getTime() === today.getTime();
        case 'tomorrow':
          return orderDeadline.getTime() === tomorrow.getTime();
        case 'this_week':
          return orderDeadline >= today && orderDeadline <= endOfWeek;
        case 'next_week':
          return orderDeadline > endOfWeek && orderDeadline <= nextWeekEnd;
        default:
          return true;
      }
    });
  }

  // Pagination methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
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

  updateManufacturingStatus(order: ProductDetails, event: any): void {
    const newStatus = event.value;
    const orderId = order._id || order.id;
    
    if (!orderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Order ID not found'
      });
      return;
    }

    const updatedBy = this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Unknown User';
    
    this.productDetailsService.updateManufacturingStatus(orderId, newStatus, updatedBy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the order in local array
          const index = this.allOrders.findIndex(o => (o._id || o.id) === orderId);
          if (index !== -1) {
            this.allOrders[index].manufacturingStatus = newStatus;
            this.calculateOrderStats();
            this.applyFilters();
          }
          
          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: `Manufacturing status updated to ${this.getStatusLabel(newStatus)}`
          });
        },
        error: (error) => {
          console.error('Error updating manufacturing status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update manufacturing status'
          });
        }
      });
  }

  addManufacturingNotes(order: ProductDetails): void {
    this.selectedOrder = order;
    this.manufacturingNotes = '';
    this.showNotesDialog = true;
  }

  closeNotesDialog(): void {
    this.showNotesDialog = false;
    this.selectedOrder = null;
    this.manufacturingNotes = '';
  }

  saveManufacturingNotes(): void {
    if (!this.selectedOrder || !this.manufacturingNotes.trim()) return;

    const orderId = this.selectedOrder._id || this.selectedOrder.id;
    if (!orderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Order ID not found'
      });
      return;
    }

    const author = this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Unknown User';

    this.productDetailsService.addManufacturingNotes(orderId, this.manufacturingNotes, author)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Update the order in local array
          const index = this.allOrders.findIndex(o => (o._id || o.id) === orderId);
          if (index !== -1) {
            this.allOrders[index].manufacturingNotes = response.data.manufacturingNotes;
            // Update selected order if it's the same
            if (this.selectedOrder && ((this.selectedOrder._id || this.selectedOrder.id) === orderId)) {
              this.selectedOrder.manufacturingNotes = response.data.manufacturingNotes;
            }
          }
          
          this.messageService.add({
            severity: 'success',
            summary: 'Notes Saved',
            detail: 'Manufacturing notes have been saved'
          });

          this.closeNotesDialog();
        },
        error: (error) => {
          console.error('Error saving manufacturing notes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save manufacturing notes'
          });
        }
      });
  }

  viewTimeline(order: ProductDetails): void {
    // TODO: Implement timeline view
    console.log('View timeline for:', order.orderNumber);
    this.messageService.add({
      severity: 'info',
      summary: 'Timeline',
      detail: `Timeline for order ${order.orderNumber}`
    });
  }

  printWorkOrder(order: ProductDetails): void {
    // TODO: Implement work order printing
    console.log('Print work order for:', order.orderNumber);
    this.messageService.add({
      severity: 'info',
      summary: 'Work Order',
      detail: `Printing work order for ${order.orderNumber}`
    });
  }

  // Utility methods
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isDeadlineUrgent(deadline: string): boolean {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return deadlineDate <= threeDaysFromNow;
  }

  getDaysRemaining(deadline: string): number | null {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const timeDiff = deadlineDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN || this.currentUser?.role === UserRole.MANAGER;
  }

  // Color and styling methods
  getRowClass(order: ProductDetails): string {
    const classes: string[] = [];
    
    // Priority-based classes
    if (order.priority === 'urgent') {
      classes.push('priority-urgent');
    } else if (order.priority === 'high') {
      classes.push('priority-high');
    }
    
    // Deadline-based classes
    if (this.isOverdue(order.deadline)) {
      classes.push('deadline-overdue');
    } else if (this.isDeadlineUrgent(order.deadline)) {
      classes.push('deadline-urgent');
    }
    
    return classes.join(' ');
  }

  getManufacturingStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'waiting_for_info': 'status-waiting-for-info',
      'in_progress': 'status-in-progress',
      'printing': 'status-printing',
      'quality_check': 'status-quality-check',
      'packaging': 'status-packaging',
      'done': 'status-done',
      'on_hold': 'status-on-hold'
    };
    return `manufacturing-status ${statusMap[status] || 'status-pending'}`;
  }

  getDaysRemainingClass(deadline: string): string {
    const daysRemaining = this.getDaysRemaining(deadline);
    
    if (daysRemaining === null) return 'normal';
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 2) return 'urgent';
    return 'normal';
  }

  isOverdue(deadline: string): boolean {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'pending': 'pi pi-clock',
      'waiting_for_info': 'pi pi-info-circle',
      'in_progress': 'pi pi-cog',
      'printing': 'pi pi-print',
      'quality_check': 'pi pi-check-circle',
      'packaging': 'pi pi-box',
      'done': 'pi pi-check',
      'on_hold': 'pi pi-pause'
    };
    return iconMap[status] || 'pi pi-circle';
  }

  getStatusLabel(status: string): string {
    const statusItem = this.manufacturingStatuses.find(s => s.value === (status || 'pending'));
    return statusItem?.label || 'Pending';
  }
}
