import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OrderRequestsService } from '../../services/order-requests.service';
import { CreateOrderRequestDto } from '../../models/order-request.model';

@Component({
  selector: 'app-manager-order-request',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    CardModule,
    MessageModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './manager-order-request.component.html',
  styleUrl: './manager-order-request.component.scss',
})
export class ManagerOrderRequestComponent implements OnInit, OnDestroy {
  orderRequestForm!: FormGroup;
  isSubmitting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private orderRequestsService: OrderRequestsService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupRealTimeCalculation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.orderRequestForm = this.fb.group({
      modelName: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitSellingPrice: [0, [Validators.required, Validators.min(0)]],
      totalAmount: [{ value: 0, disabled: true }], // Disabled for manual input
    });
  }

  private setupRealTimeCalculation(): void {
    // Listen to changes in quantity and unitSellingPrice
    this.orderRequestForm.get('quantity')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotalAmount());

    this.orderRequestForm.get('unitSellingPrice')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateTotalAmount());
  }

  private calculateTotalAmount(): void {
    const quantity = this.orderRequestForm.get('quantity')?.value || 0;
    const unitPrice = this.orderRequestForm.get('unitSellingPrice')?.value || 0;
    const totalAmount = quantity * unitPrice;

    this.orderRequestForm.get('totalAmount')?.setValue(totalAmount, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.orderRequestForm.invalid) {
      this.markFormGroupTouched(this.orderRequestForm);
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
      });
      return;
    }

    this.isSubmitting = true;

    // Get form values and include the disabled totalAmount field
    const formValue = this.orderRequestForm.getRawValue();
    const dto: CreateOrderRequestDto = {
      modelName: formValue.modelName,
      description: formValue.description,
      quantity: formValue.quantity,
      unitSellingPrice: formValue.unitSellingPrice,
      totalAmount: formValue.totalAmount,
    };

    this.orderRequestsService
      .create(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Order request submitted successfully! Admin will be notified.',
          });

          setTimeout(() => {
            this.router.navigate(['/manager-order-requests-list']);
          }, 2000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to submit order request',
          });
        },
      });
  }

  onReset(): void {
    this.orderRequestForm.reset({
      quantity: 1,
      unitSellingPrice: 0,
      totalAmount: 0,
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.orderRequestForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.orderRequestForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'This field is required';
    }
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    if (field?.hasError('min')) {
      const min = field.errors?.['min'].min;
      return `Minimum value is ${min}`;
    }
    return '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
