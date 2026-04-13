import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { OrderRequestsService } from '../../services/order-requests.service';
import {
  OrderRequest,
  OrderRequestStatus,
  AdminReviewOrderRequestDto,
} from '../../models/order-request.model';
import {Tooltip} from "primeng/tooltip";

@Component({
  selector: 'app-admin-order-approvals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    Tooltip,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-order-approvals.component.html',
  styleUrl: './admin-order-approvals.component.scss',
})
export class AdminOrderApprovalsComponent implements OnInit, OnDestroy {
  orderRequests: OrderRequest[] = [];
  selectedRequest: OrderRequest | null = null;
  reviewForm!: FormGroup;
  showReviewDialog = false;
  isLoading = false;
  isSubmitting = false;
  OrderRequestStatus = OrderRequestStatus;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private orderRequestsService: OrderRequestsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initializeReviewForm();
    this.loadOrderRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeReviewForm(): void {
    this.reviewForm = this.fb.group({
      internalCost: [0, [Validators.required, Validators.min(0)]],
      adminNotes: [''],
    });
  }

  loadOrderRequests(): void {
    this.isLoading = true;
    this.orderRequestsService
      .getAllRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.orderRequests = data;
          this.isLoading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load order requests',
          });
          this.isLoading = false;
        },
      });
  }

  openReviewDialog(request: OrderRequest): void {
    this.selectedRequest = request;
    this.reviewForm.reset({
      internalCost: 0,
      adminNotes: '',
    });
    this.showReviewDialog = true;
  }

  onApprove(): void {
    if (this.reviewForm.invalid || !this.selectedRequest) {
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to approve this order request for "${this.selectedRequest.modelName}"?`,
      header: 'Confirm Approval',
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.submitReview(OrderRequestStatus.APPROVED);
      },
    });
  }

  onReject(): void {
    if (!this.selectedRequest) {
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to reject this order request for "${this.selectedRequest.modelName}"?`,
      header: 'Confirm Rejection',
      icon: 'pi pi-times-circle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.submitReview(OrderRequestStatus.REJECTED);
      },
    });
  }

  private submitReview(status: OrderRequestStatus): void {
    if (!this.selectedRequest) return;

    this.isSubmitting = true;
    const dto: AdminReviewOrderRequestDto = {
      internalCost: this.reviewForm.get('internalCost')?.value,
      adminNotes: this.reviewForm.get('adminNotes')?.value || undefined,
      status: status as OrderRequestStatus.APPROVED | OrderRequestStatus.REJECTED,
    };

    this.orderRequestsService
      .reviewRequest(this.selectedRequest._id!, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Order request ${status === OrderRequestStatus.APPROVED ? 'approved' : 'rejected'} successfully. Manager has been notified.`,
          });
          this.showReviewDialog = false;
          this.selectedRequest = null;
          this.isSubmitting = false;
          this.loadOrderRequests();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to review order request',
          });
          this.isSubmitting = false;
        },
      });
  }

  getStatusSeverity(status: OrderRequestStatus): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case OrderRequestStatus.APPROVED:
        return 'success';
      case OrderRequestStatus.REJECTED:
        return 'danger';
      case OrderRequestStatus.PENDING_ADMIN:
        return 'warning';
      default:
        return 'info';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  calculateProfitMargin(): number {
    if (!this.selectedRequest) return 0;
    const internalCost = this.reviewForm.get('internalCost')?.value || 0;
    return this.selectedRequest.totalAmount - internalCost;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  isPending(request: OrderRequest): boolean {
    return request.status === OrderRequestStatus.PENDING_ADMIN;
  }
}
