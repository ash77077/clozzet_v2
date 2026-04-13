import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CustomersService } from '../../services/customers.service';
import { InteractionsService } from '../../services/interactions.service';
import { Customer, CustomerStatus } from '../../models/customer.model';
import { Interaction, InteractionType, CallOutcome, CreateInteractionDto } from '../../models/interaction.model';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TimelineModule,
    CardModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    Select,
    DatePicker,
    InputNumberModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.scss',
})
export class CustomerProfileComponent implements OnInit, OnDestroy {
  customer: Customer | null = null;
  interactions: Interaction[] = [];
  isLoading = false;
  showInteractionDialog = false;
  interactionForm!: FormGroup;
  isSubmitting = false;
  customerId: string = '';
  InteractionType = InteractionType;
  CallOutcome = CallOutcome;
  minFollowUpDate = new Date();
  isEditingNotes = false;
  editedNotes = '';
  private destroy$ = new Subject<void>();

  interactionTypeOptions = [
    { label: 'Phone Call', value: InteractionType.CALL, icon: 'pi pi-phone' },
    { label: 'Email', value: InteractionType.EMAIL, icon: 'pi pi-envelope' },
    { label: 'WhatsApp', value: InteractionType.WHATSAPP, icon: 'pi pi-whatsapp' },
    { label: 'Telegram', value: InteractionType.TELEGRAM, icon: 'pi pi-send' },
    { label: 'LinkedIn', value: InteractionType.LINKEDIN, icon: 'pi pi-linkedin' },
    { label: 'In Person', value: InteractionType.IN_PERSON, icon: 'pi pi-users' },
  ];

  callOutcomeOptions = [
    { label: 'Answered', value: CallOutcome.ANSWERED },
    { label: 'Busy', value: CallOutcome.BUSY },
    { label: 'No Answer', value: CallOutcome.NO_ANSWER },
    { label: 'Voicemail', value: CallOutcome.VOICEMAIL },
    { label: 'Follow-up Needed', value: CallOutcome.FOLLOW_UP_NEEDED },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private customersService: CustomersService,
    private interactionsService: InteractionsService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.customerId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Customer ID not found',
      });
      this.router.navigate(['/crm-dashboard']);
      return;
    }

    this.initializeForm();
    this.loadCustomerData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.interactionForm = this.fb.group({
      type: [InteractionType.CALL, [Validators.required]],
      subject: [''],
      summary: ['', [Validators.required, Validators.minLength(5)]],
      outcome: [null],
      duration: [null],
      interactionDate: [new Date(), [Validators.required]],
      nextFollowUpDate: [null],
    });

    // Show/hide call-specific fields
    this.interactionForm.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        if (type === InteractionType.CALL) {
          this.interactionForm.get('outcome')?.setValidators([Validators.required]);
          this.interactionForm.get('duration')?.setValidators([Validators.required, Validators.min(1)]);
        } else {
          this.interactionForm.get('outcome')?.clearValidators();
          this.interactionForm.get('duration')?.clearValidators();
        }
        this.interactionForm.get('outcome')?.updateValueAndValidity();
        this.interactionForm.get('duration')?.updateValueAndValidity();
      });
  }

  loadCustomerData(): void {
    this.isLoading = true;
    forkJoin({
      customer: this.customersService.getById(this.customerId),
      interactions: this.interactionsService.getByCustomer(this.customerId),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.customer = data.customer;
          this.interactions = data.interactions.sort((a, b) =>
            new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime()
          );
          this.isLoading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load customer data',
          });
          this.isLoading = false;
          this.router.navigate(['/crm-dashboard']);
        },
      });
  }

  openInteractionDialog(type?: InteractionType): void {
    if (type) {
      this.interactionForm.patchValue({ type });
    }
    this.showInteractionDialog = true;
  }

  onSubmitInteraction(): void {
    if (this.interactionForm.invalid) {
      this.markFormGroupTouched(this.interactionForm);
      return;
    }

    this.isSubmitting = true;
    const formValue = { ...this.interactionForm.value };

    // Convert Date objects to ISO strings
    if (formValue.interactionDate instanceof Date) {
      formValue.interactionDate = formValue.interactionDate.toISOString();
    }

    if (formValue.nextFollowUpDate instanceof Date) {
      formValue.nextFollowUpDate = formValue.nextFollowUpDate.toISOString();
    } else {
      // Remove the field entirely if it's not a valid date
      delete formValue.nextFollowUpDate;
    }

    const dto: CreateInteractionDto = {
      ...formValue,
      customerId: this.customerId,
    };

    this.interactionsService
      .create(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Interaction logged successfully',
          });
          this.showInteractionDialog = false;
          this.interactionForm.reset({
            type: InteractionType.CALL,
            interactionDate: new Date(),
          });
          this.isSubmitting = false;
          this.loadCustomerData();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to log interaction',
          });
          this.isSubmitting = false;
        },
      });
  }

  getStatusSeverity(status: CustomerStatus): 'success' | 'warning' | 'info' {
    switch (status) {
      case CustomerStatus.ACTIVE:
        return 'success';
      case CustomerStatus.LEAD:
        return 'warning';
      case CustomerStatus.INACTIVE:
        return 'info';
      default:
        return 'info';
    }
  }

  getInteractionIcon(type: InteractionType): string {
    const option = this.interactionTypeOptions.find(opt => opt.value === type);
    return option?.icon || 'pi pi-comment';
  }

  getInteractionColor(type: InteractionType): string {
    switch (type) {
      case InteractionType.CALL:
        return '#3b82f6'; // blue
      case InteractionType.EMAIL:
        return '#8b5cf6'; // purple
      case InteractionType.WHATSAPP:
        return '#10b981'; // green
      case InteractionType.TELEGRAM:
        return '#06b6d4'; // cyan
      case InteractionType.LINKEDIN:
        return '#0077b5'; // linkedin blue
      case InteractionType.IN_PERSON:
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(minutes: number | undefined): string {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  }

  goBack(): void {
    this.router.navigate(['/crm-dashboard']);
  }

  startEditNotes(): void {
    this.editedNotes = this.customer?.notes || '';
    this.isEditingNotes = true;
  }

  saveNotes(): void {
    if (!this.customer) return;

    const updateDto = {
      notes: this.editedNotes,
    };

    this.customersService
      .update(this.customerId, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (customer) => {
          this.customer = customer;
          this.isEditingNotes = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Notes updated successfully',
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to update notes',
          });
        },
      });
  }

  cancelEditNotes(): void {
    this.isEditingNotes = false;
    this.editedNotes = '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
