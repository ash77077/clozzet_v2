import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CustomersService } from '../../services/customers.service';
import { InteractionsService } from '../../services/interactions.service';
import { Customer, CustomerStatus, CreateCustomerDto, UpdateCustomerDto } from '../../models/customer.model';
import { InteractionType, CreateInteractionDto } from '../../models/interaction.model';

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
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './crm-dashboard.component.html',
  styleUrl: './crm-dashboard.component.scss',
})
export class CrmDashboardComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
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
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeFollowUpForm();
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

  loadCustomers(): void {
    this.isLoading = true;
    forkJoin({
      customers: this.customersService.getAll(),
      followUps: this.customersService.getNeedingFollowUp(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Sort customers: Today's follow-ups first, then overdue, then future
          this.customers = this.sortCustomersByFollowUp(data.customers);
          this.calculateStats(data.customers, data.followUps);
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
      nextFollowUpAt: formValue.nextFollowUpDate instanceof Date ? formValue.nextFollowUpDate.toISOString() : undefined,
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
}
