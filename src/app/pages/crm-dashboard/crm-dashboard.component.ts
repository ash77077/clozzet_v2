import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, firstValueFrom } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { CustomersService } from '../../services/customers.service';
import { InteractionsService } from '../../services/interactions.service';
import { UsersService, User } from '../../services/users.service';
import { AiService } from '../../services/ai.service';
import { Customer, CustomerStatus, CreateCustomerDto, UpdateCustomerDto } from '../../models/customer.model';
import { Interaction, InteractionType, CreateInteractionDto } from '../../models/interaction.model';
import { CustomerAiPayload } from '../../models/ai.models';
import { AiStatusCellComponent } from '../../shared/components/ai-status-cell/ai-status-cell.component';

@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    Select,
    DatePicker,
    AutoCompleteModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TooltipModule,
    TranslateModule,
    AiStatusCellComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './crm-dashboard.component.html',
  styleUrl: './crm-dashboard.component.scss',
})
export class CrmDashboardComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  selectedCustomer: Customer | null = null;
  customerForm!: FormGroup;
  followUpForm!: FormGroup;
  showCustomerDialog = false;
  showImportDialog = false;
  showFollowUpDialog = false;
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  isImporting = false;
  isProcessingFollowUp = false;
  selectedFile: File | null = null;
  importResults: any = null;
  CustomerStatus = CustomerStatus;
  private destroy$ = new Subject<void>();

  // User filtering
  managerUsers: User[] = [];
  selectedUserIds: Set<string> = new Set();
  showUnassigned = false;
  isLoadingUsers = false;
  unassignedCustomersCount = 0;
  maxVisibleUsers = 5;
  private followUpsCache: Customer[] = [];

  // Follow-up quick filter
  activeQuickFilter: 'today' | 'overdue' | null = null;

  get aiEnabled$() { return this.aiService.aiEnabled$; }
  isAnalyzingAll = false;
  analyzeAllProgress: string | null = null;
  companySuggestions: string[] = [];
  showQuickViewDialog = false;
  quickViewCustomer: Customer | null = null;
  quickViewInteractions: Interaction[] = [];
  isLoadingQuickView = false;

  statusOptions = [
    { label: 'Lead', value: CustomerStatus.LEAD },
    { label: 'Active', value: CustomerStatus.ACTIVE },
    { label: 'Inactive', value: CustomerStatus.INACTIVE },
  ];

  // Statistics
  stats = {
    totalCustomers: 0,
    leads: 0,
    activeCustomers: 0,
    needingFollowUp: 0,
    followUpToday: 0,
    followUpOverdue: 0,
  };

  constructor(
    private fb: FormBuilder,
    private customersService: CustomersService,
    private interactionsService: InteractionsService,
    private usersService: UsersService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private aiService: AiService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeFollowUpForm();
    this.loadManagerUsers();
    this.loadCustomers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.customerForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      industry: [''],
      contacts: this.fb.array([this.createContactGroup()]),
      status: [CustomerStatus.LEAD, [Validators.required]],
      address: [''],
      website: [''],
      notes: [''],
      nextFollowUpAt: [null],
    });
  }

  private createContactGroup(): FormGroup {
    return this.fb.group({
      contactPerson: [''],
      position: [''],
      phone: [''],
      email: ['', [Validators.email]],
      linkedinPage: [''],
    });
  }

  get contacts(): FormArray {
    return this.customerForm.get('contacts') as FormArray;
  }

  addContact(): void {
    this.contacts.push(this.createContactGroup());
  }

  removeContact(index: number): void {
    if (this.contacts.length > 1) {
      this.contacts.removeAt(index);
    }
  }

  private initializeFollowUpForm(): void {
    this.followUpForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(5)]],
      status: [null],
      nextFollowUpDate: [null],
    });
  }

  loadManagerUsers(): void {
    this.isLoadingUsers = true;
    this.usersService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          // Filter for manager and admin roles
          this.managerUsers = users.filter(u =>
            (u.role === 'manager' || u.role === 'admin') && u.isActive
          );
          this.isLoadingUsers = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load users',
          });
          this.isLoadingUsers = false;
        },
      });
  }

  loadCustomers(): void {
    this.isLoading = true;
    forkJoin({
      customers: this.customersService.getAll(),
      followUps: this.customersService.getNeedingFollowUp(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Sort newest first by default
          this.customers = data.customers.slice().sort((a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          );
          this.followUpsCache = data.followUps;

          // Count unassigned customers
          this.unassignedCustomersCount = this.customers.filter(c => !c.createdBy).length;

          this.applyUserFilter();
          this.isLoading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load customers',
          });
          this.isLoading = false;
        },
      });
  }

  private sortCustomersByFollowUp(customers: Customer[]): Customer[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return customers.sort((a, b) => {
      const dateA = a.nextFollowUpAt ? new Date(a.nextFollowUpAt) : null;
      const dateB = b.nextFollowUpAt ? new Date(b.nextFollowUpAt) : null;

      if (dateA) dateA.setHours(0, 0, 0, 0);
      if (dateB) dateB.setHours(0, 0, 0, 0);

      // Priority 1: Today's follow-ups
      const isAToday = dateA && dateA.getTime() === today.getTime();
      const isBToday = dateB && dateB.getTime() === today.getTime();

      if (isAToday && !isBToday) return -1;
      if (!isAToday && isBToday) return 1;

      // Priority 2: Overdue follow-ups
      const isAOverdue = dateA && dateA < today;
      const isBOverdue = dateB && dateB < today;

      if (isAOverdue && !isBOverdue) return -1;
      if (!isAOverdue && isBOverdue) return 1;

      // Priority 3: Future follow-ups (earliest first)
      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }

      // No follow-up date goes to the end
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      return 0;
    });
  }

  private calculateStats(customers: Customer[], followUps: Customer[]): void {
    this.stats.totalCustomers = customers.length;
    this.stats.leads = customers.filter(c => c.status === CustomerStatus.LEAD).length;
    this.stats.activeCustomers = customers.filter(c => c.status === CustomerStatus.ACTIVE).length;
    this.stats.needingFollowUp = followUps.length;

    // Calculate customers with follow-up due today and overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.stats.followUpToday = customers.filter(c => {
      if (!c.nextFollowUpAt) return false;
      const followUpDate = new Date(c.nextFollowUpAt);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;

    this.stats.followUpOverdue = customers.filter(c => {
      if (!c.nextFollowUpAt) return false;
      const followUpDate = new Date(c.nextFollowUpAt);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate < today;
    }).length;
  }

  openNewCustomerDialog(): void {
    this.isEditMode = false;
    this.customerForm.reset({
      status: CustomerStatus.LEAD,
    });
    // Reset contacts array to single empty contact
    this.contacts.clear();
    this.contacts.push(this.createContactGroup());
    this.showCustomerDialog = true;
  }

  openEditCustomerDialog(customer: Customer): void {
    this.isEditMode = true;
    this.selectedCustomer = customer;

    // Clear existing contacts
    this.contacts.clear();

    // If customer has contacts array, load all contacts
    if (customer.contacts && customer.contacts.length > 0) {
      customer.contacts.forEach((contact, index) => {
        // For the first contact, use company linkedinPage if contact doesn't have one
        const linkedinPage = index === 0
          ? (contact.linkedinPage || customer.linkedinPage || '')
          : (contact.linkedinPage || '');

        this.contacts.push(this.fb.group({
          contactPerson: [contact.contactPerson || ''],
          position: [contact.position || ''],
          phone: [contact.phone || ''],
          email: [contact.email || ''],
          linkedinPage: [linkedinPage],
        }));
      });
    } else {
      // Fallback: use primary contact fields
      this.contacts.push(this.fb.group({
        contactPerson: [customer.contactPerson || ''],
        position: [''],
        phone: [customer.phone || ''],
        email: [customer.email || ''],
        linkedinPage: [customer.linkedinPage || ''],
      }));
    }

    this.customerForm.patchValue({
      companyName: customer.companyName,
      industry: customer.industry,
      status: customer.status,
      address: customer.address,
      website: customer.website,
      notes: customer.notes,
      nextFollowUpAt: customer.nextFollowUpAt ? new Date(customer.nextFollowUpAt) : null,
    });
    this.showCustomerDialog = true;
  }

  onSubmitCustomer(): void {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched(this.customerForm);
      return;
    }

    this.isSubmitting = true;
    const formValue = { ...this.customerForm.value };

    // Filter out empty contacts (where contactPerson is empty)
    const validContacts = (formValue.contacts || []).filter(
      (contact: any) => contact.contactPerson && contact.contactPerson.trim() !== ''
    );

    // Check if at least one contact exists
    if (validContacts.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'At least one contact person is required',
      });
      this.isSubmitting = false;
      return;
    }

    // Use first contact as primary contact (backward compatibility)
    const primaryContact = validContacts[0];
    formValue.contactPerson = primaryContact.contactPerson;
    formValue.phone = primaryContact.phone;
    formValue.email = primaryContact.email;

    // Save contacts array to backend
    formValue.contacts = validContacts;

    // Convert Date object to ISO string for nextFollowUpAt
    if (formValue.nextFollowUpAt instanceof Date && !isNaN(formValue.nextFollowUpAt.getTime())) {
      formValue.nextFollowUpAt = formValue.nextFollowUpAt.toISOString();
    } else {
      // Remove the field entirely if it's not a valid date
      delete formValue.nextFollowUpAt;
    }

    // Block creating a new customer with an existing company name
    if (!this.isEditMode) {
      const duplicate = this.customers.find(
        c => c.companyName.toLowerCase().trim() === formValue.companyName.toLowerCase().trim()
      );
      if (duplicate) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Company Already Exists',
          detail: `A customer with company name "${duplicate.companyName}" already exists. Use the search to edit it.`,
        });
        this.isSubmitting = false;
        return;
      }
    }

    if (this.isEditMode && this.selectedCustomer) {
      const dto: UpdateCustomerDto = formValue;
      this.customersService
        .update(this.selectedCustomer._id!, dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Customer updated successfully',
            });
            this.showCustomerDialog = false;
            this.isSubmitting = false;
            this.loadCustomers();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error?.message || 'Failed to update customer',
            });
            this.isSubmitting = false;
          },
        });
    } else {
      const dto: CreateCustomerDto = formValue;
      this.customersService
        .create(dto)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Customer created successfully',
            });
            this.showCustomerDialog = false;
            this.isSubmitting = false;
            this.loadCustomers();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error?.message || 'Failed to create customer',
            });
            this.isSubmitting = false;
          },
        });
    }
  }

  viewCustomerProfile(customer: Customer): void {
    this.router.navigate(['/customer-profile', customer._id]);
  }

  deleteCustomer(customer: Customer): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${customer.companyName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        if (!customer._id) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Customer ID is missing',
          });
          return;
        }

        this.customersService
          .delete(customer._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `${customer.companyName} has been deleted successfully`,
              });
              this.loadCustomers();
            },
            error: (error) => {
              console.error('Delete error:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Delete Failed',
                detail: error.error?.message || 'Failed to delete customer',
              });
            },
          });
      },
      reject: () => {
        // User cancelled, do nothing
      }
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

  formatDate(date: Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  isFollowUpOverdue(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(date);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate < today;
  }

  isFollowUpToday(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(date);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate.getTime() === today.getTime();
  }

  getFollowUpSeverity(date: Date | undefined): 'success' | 'warning' | 'danger' | 'info' | null {
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpDate = new Date(date);
    followUpDate.setHours(0, 0, 0, 0);

    if (followUpDate.getTime() === today.getTime()) {
      return 'warning'; // Today - urgent
    } else if (followUpDate < today) {
      return 'danger'; // Overdue
    } else {
      return 'success'; // Future
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Follow-up action methods
  openFollowUpDialog(customer: Customer): void {
    this.selectedCustomer = customer;
    this.followUpForm.patchValue({
      message: '',
      status: customer.status,
      nextFollowUpDate: null,
    });
    this.showFollowUpDialog = true;
  }

  closeFollowUpDialog(): void {
    this.showFollowUpDialog = false;
    this.selectedCustomer = null;
    this.followUpForm.reset();
  }

  completeFollowUp(): void {
    if (this.followUpForm.invalid || !this.selectedCustomer) {
      this.markFormGroupTouched(this.followUpForm);
      return;
    }

    this.isProcessingFollowUp = true;
    const formValue = this.followUpForm.value;

    // Create interaction
    const interactionDto: CreateInteractionDto = {
      customerId: this.selectedCustomer._id!,
      type: InteractionType.CALL,
      subject: 'Follow-up completed',
      summary: formValue.message,
      interactionDate: new Date().toISOString(),
      nextFollowUpDate: formValue.nextFollowUpDate instanceof Date ? formValue.nextFollowUpDate.toISOString() : undefined,
    };

    // Update customer
    const updateDto: UpdateCustomerDto = {
      status: formValue.status || this.selectedCustomer.status,
      nextFollowUpAt: formValue.nextFollowUpDate instanceof Date ? formValue.nextFollowUpDate.toISOString() : null,
    };

    // Process both operations
    forkJoin({
      interaction: this.interactionsService.create(interactionDto),
      customer: this.customersService.update(this.selectedCustomer._id!, updateDto),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Follow-up completed successfully',
          });
          this.closeFollowUpDialog();
          this.loadCustomers();
          this.isProcessingFollowUp = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to complete follow-up',
          });
          this.isProcessingFollowUp = false;
        },
      });
  }

  // Import Excel functionality
  openImportDialog(): void {
    this.showImportDialog = true;
    this.selectedFile = null;
    this.importResults = null;
  }

  closeImportDialog(): void {
    this.showImportDialog = false;
    this.selectedFile = null;
    this.importResults = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid File',
          detail: 'Please select a valid Excel file (.xlsx or .xls)',
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.messageService.add({
          severity: 'error',
          summary: 'File Too Large',
          detail: 'File size must be less than 5MB',
        });
        return;
      }

      this.selectedFile = file;
      this.importResults = null;
    }
  }

  validateFile(): void {
    if (!this.selectedFile) return;

    this.isImporting = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.customersService.validateExcelImport(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.importResults = response.data;
          this.isImporting = false;

          // Show validation summary
          if (this.importResults.success > 0 && this.importResults.failed === 0) {
            this.messageService.add({
              severity: 'success',
              summary: 'Validation Successful',
              detail: `All ${this.importResults.success} rows are valid and ready to import`,
            });
          } else if (this.importResults.failed > 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Validation Completed',
              detail: `${this.importResults.success} rows valid, ${this.importResults.failed} rows have errors`,
            });
          }
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Validation Failed',
            detail: error.error?.message || 'Failed to validate file',
          });
          this.isImporting = false;
        },
      });
  }

  confirmImport(): void {
    if (!this.selectedFile) return;

    this.isImporting = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.customersService.importFromExcel(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.importResults = response.data;
          this.isImporting = false;

          if (response.data.success > 0) {
            this.messageService.add({
              severity: 'success',
              summary: 'Import Successful',
              detail: `Successfully imported ${response.data.success} customers`,
            });
            this.loadCustomers();
          }

          if (response.data.failed > 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Partial Import',
              detail: `${response.data.failed} rows failed to import`,
            });
          }
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Import Failed',
            detail: error.error?.message || 'Failed to import customers',
          });
          this.isImporting = false;
        },
      });
  }

  downloadTemplate(): void {
    // Use dynamic import for xlsx
    import('xlsx').then(XLSX => {
      // Create template data
      const templateData = [
        {
          'Company Name': 'Example Corp',
          'Contact Person': 'John Doe',
          'Phone': '+1234567890',
          'Email': 'john@example.com',
          'Status': 'Lead',
          'Address': '123 Main St, City, Country',
          'Website': 'https://example.com',
          'LinkedIn Page': 'https://linkedin.com/company/example',
          'Industry': 'Technology',
          'Notes': 'Sample notes',
          'First Contact Date': '2026-01-15',
          'Scheduled Meeting': '2026-04-20',
          'Next Follow Up': '2026-04-15'
        }
      ];

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // Company Name
        { wch: 20 }, // Contact Person
        { wch: 15 }, // Phone
        { wch: 25 }, // Email
        { wch: 12 }, // Status
        { wch: 30 }, // Address
        { wch: 25 }, // Website
        { wch: 35 }, // LinkedIn Page
        { wch: 15 }, // Industry
        { wch: 30 }, // Notes
        { wch: 18 }, // First Contact Date
        { wch: 18 }, // Scheduled Meeting
        { wch: 15 }, // Next Follow Up
      ];

      // Generate and download file
      XLSX.writeFile(workbook, 'customers_import_template.xlsx');

      this.messageService.add({
        severity: 'success',
        summary: 'Template Downloaded',
        detail: 'Excel template has been downloaded',
      });
    });
  }

  hideEmail(email?: string): string {
    if (!email) {
      return 'N/A';
    }
    return email;
  }

  getLinkedInUrl(customer: Customer): string | null {
    // First check if customer has contacts array with LinkedIn
    if (customer.contacts && customer.contacts.length > 0) {
      const firstContactWithLinkedIn = customer.contacts.find(c => c.linkedinPage);
      if (firstContactWithLinkedIn?.linkedinPage) {
        return this.ensureHttps(firstContactWithLinkedIn.linkedinPage);
      }
    }

    // Fallback to customer's primary LinkedIn field
    if (customer.linkedinPage) {
      return this.ensureHttps(customer.linkedinPage);
    }

    return null;
  }

  private ensureHttps(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  }

  // User filtering methods
  toggleUserFilter(userId: string): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
    this.applyUserFilter();
  }

  toggleUnassignedFilter(): void {
    this.showUnassigned = !this.showUnassigned;
    this.applyUserFilter();
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.has(userId);
  }

  clearAllFilters(): void {
    this.selectedUserIds.clear();
    this.showUnassigned = false;
    this.activeQuickFilter = null;
    this.applyUserFilter();
  }

  toggleQuickFilter(filter: 'today' | 'overdue'): void {
    this.activeQuickFilter = this.activeQuickFilter === filter ? null : filter;
    this.applyUserFilter();
  }

  applyUserFilter(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let base = this.customers;

    // Apply quick filter first
    if (this.activeQuickFilter === 'today') {
      base = base.filter(c => {
        if (!c.nextFollowUpAt) return false;
        const d = new Date(c.nextFollowUpAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    } else if (this.activeQuickFilter === 'overdue') {
      base = base.filter(c => {
        if (!c.nextFollowUpAt) return false;
        const d = new Date(c.nextFollowUpAt);
        d.setHours(0, 0, 0, 0);
        return d < today;
      });
    }

    // Then apply user filter on top
    if (this.selectedUserIds.size === 0 && !this.showUnassigned) {
      this.filteredCustomers = base;
    } else {
      this.filteredCustomers = base.filter(customer => {
        if (this.showUnassigned && !customer.createdBy) {
          return true;
        }
        if (this.selectedUserIds.size === 0) return false;
        if (!customer.createdBy) return false;
        const createdById = typeof customer.createdBy === 'string'
          ? customer.createdBy
          : (customer.createdBy as any)?._id;
        return createdById && this.selectedUserIds.has(createdById);
      });
    }

    // Recalculate stats for the currently visible (filtered) customers
    const filteredIds = new Set(this.filteredCustomers.map(c => c._id));
    const filteredFollowUps = this.followUpsCache.filter(c => filteredIds.has(c._id));
    this.calculateStats(this.filteredCustomers, filteredFollowUps);
  }

  openQuickView(companyName: string, event: Event): void {
    event.stopPropagation();
    const customer = this.customers.find(c => c.companyName === companyName);
    if (!customer) return;
    this.quickViewCustomer = customer;
    this.quickViewInteractions = [];
    this.showQuickViewDialog = true;
    this.isLoadingQuickView = true;
    this.interactionsService.getByCustomer(customer._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interactions) => {
          this.quickViewInteractions = interactions
            .sort((a, b) => new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime())
            .slice(0, 5);
          this.isLoadingQuickView = false;
        },
        error: () => { this.isLoadingQuickView = false; }
      });
  }

  filterCompanies(event: { query: string }): void {
    const query = event.query.toLowerCase();
    const uniqueNames = [...new Set(this.customers.map(c => c.companyName))];
    this.companySuggestions = uniqueNames.filter(name =>
      name.toLowerCase().includes(query)
    );
  }

  onCompanySelected(event: AutoCompleteSelectEvent): void {
    const companyName = event.value as string;
    const match = this.customers.find(c => c.companyName === companyName);
    if (!match) return;

    // Switch to edit mode and fill all fields
    this.isEditMode = true;
    this.selectedCustomer = match;

    this.contacts.clear();

    if (match.contacts && match.contacts.length > 0) {
      match.contacts.forEach((contact, index) => {
        const linkedinPage = index === 0
          ? (contact.linkedinPage || match.linkedinPage || '')
          : (contact.linkedinPage || '');
        this.contacts.push(this.fb.group({
          contactPerson: [contact.contactPerson || ''],
          position: [contact.position || ''],
          phone: [contact.phone || ''],
          email: [contact.email || ''],
          linkedinPage: [linkedinPage],
        }));
      });
    } else {
      this.contacts.push(this.fb.group({
        contactPerson: [match.contactPerson || ''],
        position: [''],
        phone: [match.phone || ''],
        email: [match.email || ''],
        linkedinPage: [match.linkedinPage || ''],
      }));
    }

    this.customerForm.patchValue({
      companyName: match.companyName,
      industry: match.industry,
      status: match.status,
      address: match.address,
      website: match.website,
      notes: match.notes,
      nextFollowUpAt: match.nextFollowUpAt ? new Date(match.nextFollowUpAt) : null,
    });

    this.messageService.add({
      severity: 'info',
      summary: 'Existing Company',
      detail: `"${match.companyName}" already exists. You can edit it here.`,
    });
  }

  analyzeOne(customer: Customer): void {
    if (!customer._id) return;
    const payload = this.buildPayload(customer);
    this.aiService.analyzeCustomer(payload).subscribe({
      next: (result) => {
        this.aiService.setCachedAnalysis(customer._id!, result);
        (customer as any).ai_status = result.status;
        this.messageService.add({ severity: 'success', summary: 'AI Analysis', detail: `${customer.companyName}: ${result.status}` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'AI Error', detail: 'Analysis failed' });
      }
    });
  }

  async analyzeAll(): Promise<void> {
    this.isAnalyzingAll = true;
    const customers = this.filteredCustomers;
    for (let i = 0; i < customers.length; i++) {
      this.analyzeAllProgress = `${i + 1} / ${customers.length}`;
      await firstValueFrom(this.aiService.analyzeCustomer(this.buildPayload(customers[i]))).then(result => {
        this.aiService.setCachedAnalysis(customers[i]._id!, result);
        (customers[i] as any).ai_status = result.status;
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 300));
    }
    this.isAnalyzingAll = false;
    this.analyzeAllProgress = null;
  }

  private buildPayload(customer: Customer): CustomerAiPayload {
    return {
      id: customer._id || '',
      name: customer.companyName,
      notes: customer.notes || '',
      last_contact_date: customer.lastContactedAt ? new Date(customer.lastContactedAt).toISOString() : null,
      order_history: [],
      tags: [],
      reply_language: 'English',
    };
  }

  getCreatedByName(createdBy: any): string | null {
    if (!createdBy) return null;
    if (typeof createdBy === 'string') return null;
    if (createdBy.firstName) return `${createdBy.firstName} ${createdBy.lastName || ''}`.trim();
    return null;
  }

  getUserInitials(user: User): string {
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }

  getUserFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  get visibleManagerUsers(): User[] {
    return this.managerUsers.slice(0, this.maxVisibleUsers);
  }

  get dropdownManagerUsers(): User[] {
    return this.managerUsers.slice(this.maxVisibleUsers);
  }

  get hasDropdownUsers(): boolean {
    return this.managerUsers.length > this.maxVisibleUsers;
  }
}
