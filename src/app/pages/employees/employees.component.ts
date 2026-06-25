import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, forkJoin, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { Tabs, TabList, Tab, TabPanel, TabPanels } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';
import { MessageService, ConfirmationService } from 'primeng/api';

import {
  EmployeesService,
  Employee,
  SalaryPayment,
  PayrollSummary,
} from '../../services/employees.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TooltipModule,
    Select,
    InputNumberModule,
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabPanels,
    BadgeModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
})
export class EmployeesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  employees: Employee[] = [];
  payments: SalaryPayment[] = [];
  employeePayments: SalaryPayment[] = [];
  summary: PayrollSummary = {
    totalEmployees: 0,
    totalPayroll: 0,
    totalPaid: 0,
    totalPending: 0,
    totalCash: 0,
    totalCard: 0,
    paymentsCount: 0,
    pendingEmployees: [],
  };

  // UI state
  loading = false;
  paymentsLoading = false;
  savingEmployee = false;
  savingPayment = false;
  showInactive = false;
  selectedEmployee: Employee | null = null;

  // Dialogs
  addEmployeeDialog = false;
  editEmployeeDialog = false;
  addPaymentDialog = false;
  viewPaymentsDialog = false;

  // Month/Year selectors
  selectedMonth: number;
  selectedYear: number;

  months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];

  years: { label: string; value: number }[] = [];

  // Dropdown options
  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'On Leave', value: 'on_leave' },
  ];

  paymentMethodOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'Card', value: 'card' },
    { label: 'Mixed', value: 'mixed' },
  ];

  periodOptions = [
    { label: 'First Half (1–15)', value: 'first_half' },
    { label: 'Second Half (16–end)', value: 'second_half' },
    { label: 'Full Month', value: 'full_month' },
    { label: 'Bonus', value: 'bonus' },
  ];

  paymentStatusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Partial', value: 'partial' },
  ];

  employeeOptions: { label: string; value: string }[] = [];

  // Forms
  employeeForm!: FormGroup;
  paymentForm!: FormGroup;

  constructor(
    private employeesService: EmployeesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
  ) {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();

    // Build years array: current year and 2 years back
    for (let i = 0; i < 3; i++) {
      const y = now.getFullYear() - i;
      this.years.push({ label: String(y), value: y });
    }
  }

  ngOnInit(): void {
    this.buildForms();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForms(): void {
    this.employeeForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      position: [''],
      department: [''],
      phone: [''],
      email: ['', Validators.email],
      monthlySalary: [0, [Validators.required, Validators.min(0)]],
      status: ['active'],
      paymentMethod: ['mixed'],
      cashPortion: [0, Validators.min(0)],
      cardPortion: [0, Validators.min(0)],
      notes: [''],
    });

    this.paymentForm = this.fb.group({
      employeeId: ['', Validators.required],
      period: ['', Validators.required],
      amount: [{ value: 0, disabled: true }],
      cashAmount: [0, Validators.min(0)],
      cardAmount: [0, Validators.min(0)],
      status: ['pending'],
      notes: [''],
    });

    combineLatest([
      this.paymentForm.get('cashAmount')!.valueChanges,
      this.paymentForm.get('cardAmount')!.valueChanges,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([cash, card]) => {
        const total = (cash ?? 0) + (card ?? 0);
        this.paymentForm.get('amount')!.setValue(total, { emitEvent: false });
      });
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      employees: this.employeesService.getAll(),
      summary: this.employeesService.getSummary(this.selectedMonth, this.selectedYear),
      payments: this.employeesService.getPaymentsByMonth(this.selectedMonth, this.selectedYear),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ employees, summary, payments }) => {
          this.employees = employees;
          this.summary = summary;
          this.payments = payments;
          this.employeeOptions = employees.map(e => ({
            label: this.getFullName(e),
            value: e._id,
          }));
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load employee data',
          });
          this.loading = false;
        },
      });
  }

  loadPayments(month: number, year: number): void {
    this.paymentsLoading = true;
    forkJoin({
      payments: this.employeesService.getPaymentsByMonth(month, year),
      summary: this.employeesService.getSummary(month, year),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ payments, summary }) => {
          this.payments = payments;
          this.summary = summary;
          this.paymentsLoading = false;
          // also refresh top cards when month/year changes
          this.selectedMonth = month;
          this.selectedYear = year;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load payments',
          });
          this.paymentsLoading = false;
        },
      });
  }

  onMonthYearChange(): void {
    this.loadPayments(this.selectedMonth, this.selectedYear);
  }

  // --- Employee CRUD ---

  openAddEmployee(): void {
    this.employeeForm.reset({
      firstName: '',
      lastName: '',
      position: '',
      department: '',
      phone: '',
      email: '',
      monthlySalary: 0,
      status: 'active',
      paymentMethod: 'mixed',
      cashPortion: 0,
      cardPortion: 0,
      notes: '',
    });
    this.addEmployeeDialog = true;
  }

  openEditEmployee(employee: Employee): void {
    this.selectedEmployee = employee;
    this.employeeForm.patchValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position ?? '',
      department: employee.department ?? '',
      phone: employee.phone ?? '',
      email: employee.email ?? '',
      monthlySalary: employee.monthlySalary,
      status: employee.status,
      paymentMethod: employee.paymentMethod,
      cashPortion: employee.cashPortion,
      cardPortion: employee.cardPortion,
      notes: employee.notes ?? '',
    });
    this.editEmployeeDialog = true;
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.savingEmployee = true;
    const value = this.employeeForm.value;

    if (this.editEmployeeDialog && this.selectedEmployee) {
      this.employeesService
        .update(this.selectedEmployee._id, value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Updated',
              detail: 'Employee updated successfully',
            });
            this.editEmployeeDialog = false;
            this.savingEmployee = false;
            this.loadData();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update employee',
            });
            this.savingEmployee = false;
          },
        });
    } else {
      this.employeesService
        .create(value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Created',
              detail: 'Employee added successfully',
            });
            this.addEmployeeDialog = false;
            this.savingEmployee = false;
            this.loadData();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create employee',
            });
            this.savingEmployee = false;
          },
        });
    }
  }

  deactivateEmployee(employee: Employee): void {
    this.confirmationService.confirm({
      message: `Deactivate <strong>${this.getFullName(employee)}</strong>? They will no longer appear in the active list.`,
      header: 'Deactivate Employee',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.employeesService
          .deactivate(employee._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Deactivated',
                detail: `${this.getFullName(employee)} has been deactivated`,
              });
              this.loadData();
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to deactivate employee',
              });
            },
          });
      },
    });
  }

  // --- Payment CRUD ---

  openAddPayment(employee?: Employee): void {
    this.paymentForm.reset({
      employeeId: employee?._id ?? '',
      period: '',
      amount: 0,
      cashAmount: 0,
      cardAmount: 0,
      status: 'pending',
      notes: '',
    });
    this.addPaymentDialog = true;
  }

  savePayment(): void {
    const { employeeId, period } = this.paymentForm.controls;
    if (employeeId.invalid || period.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.savingPayment = true;
    const value = this.paymentForm.getRawValue();
    const dto = {
      ...value,
      month: this.selectedMonth,
      year: this.selectedYear,
    };

    this.employeesService
      .createPayment(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Payment Recorded',
            detail: 'Salary payment has been saved',
          });
          this.addPaymentDialog = false;
          this.savingPayment = false;
          this.loadData();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to record payment',
          });
          this.savingPayment = false;
        },
      });
  }

  markAsPaid(payment: SalaryPayment): void {
    this.confirmationService.confirm({
      message: 'Mark this payment as <strong>Paid</strong>?',
      header: 'Confirm Payment',
      icon: 'pi pi-check-circle',
      accept: () => {
        this.employeesService
          .updatePayment(payment._id, { status: 'paid' } as any)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Marked as Paid',
                detail: 'Payment status updated',
              });
              this.loadData();
              if (this.viewPaymentsDialog && this.selectedEmployee) {
                this.loadEmployeePayments(this.selectedEmployee._id);
              }
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update payment',
              });
            },
          });
      },
    });
  }

  deletePayment(payment: SalaryPayment): void {
    this.confirmationService.confirm({
      message: 'Delete this payment record?',
      header: 'Delete Payment',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.employeesService
          .deletePayment(payment._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Payment record removed',
              });
              this.loadData();
              if (this.viewPaymentsDialog && this.selectedEmployee) {
                this.loadEmployeePayments(this.selectedEmployee._id);
              }
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete payment',
              });
            },
          });
      },
    });
  }

  openViewPayments(employee: Employee): void {
    this.selectedEmployee = employee;
    this.loadEmployeePayments(employee._id);
    this.viewPaymentsDialog = true;
  }

  loadEmployeePayments(employeeId: string): void {
    this.employeesService
      .getPaymentsByEmployee(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: payments => {
          this.employeePayments = payments;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load payment history',
          });
        },
      });
  }

  // --- Payroll tab helpers ---

  getEmployeePaymentsForMonth(employeeId: string): SalaryPayment[] {
    return this.payments.filter(p => {
      const empId =
        typeof p.employee === 'string'
          ? p.employee
          : String((p.employee as Employee)?._id ?? '');
      return empId === String(employeeId);
    });
  }

  getEmployeePaidAmount(employeeId: string): number {
    return this.getEmployeePaymentsForMonth(employeeId)
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  getEmployeePendingAmount(employee: Employee): number {
    return Math.max(0, employee.monthlySalary - this.getEmployeePaidAmount(employee._id));
  }

  getEmployeePaymentStatus(employee: Employee): 'fully_paid' | 'partial' | 'not_paid' {
    const paid = this.getEmployeePaidAmount(employee._id);
    if (paid >= employee.monthlySalary) return 'fully_paid';
    if (paid > 0) return 'partial';
    return 'not_paid';
  }

  // --- Utility / display helpers ---

  getFullName(e: Employee): string {
    return `${e.firstName} ${e.lastName}`;
  }

  getStatusSeverity(s: string): 'success' | 'danger' | 'warn' | 'info' {
    if (s === 'active') return 'success';
    if (s === 'inactive') return 'danger';
    return 'warn';
  }

  getStatusLabel(s: string): string {
    if (s === 'active') return 'Active';
    if (s === 'inactive') return 'Inactive';
    if (s === 'on_leave') return 'On Leave';
    return s;
  }

  getPeriodLabel(p: string): string {
    const map: Record<string, string> = {
      first_half: '1st Half',
      second_half: '2nd Half',
      full_month: 'Full Month',
      bonus: 'Bonus',
    };
    return map[p] ?? p;
  }

  getPaymentStatusSeverity(s: string): 'success' | 'warn' | 'info' | 'danger' {
    if (s === 'paid') return 'success';
    if (s === 'partial') return 'info';
    return 'warn';
  }

  getPayrollStatusSeverity(s: string): 'success' | 'warn' | 'danger' {
    if (s === 'fully_paid') return 'success';
    if (s === 'partial') return 'warn';
    return 'danger';
  }

  getPayrollStatusLabel(s: string): string {
    if (s === 'fully_paid') return 'Fully Paid';
    if (s === 'partial') return 'Partial';
    return 'Not Paid';
  }

  getPaymentMethodLabel(m: string): string {
    if (m === 'cash') return 'Cash';
    if (m === 'card') return 'Card';
    return 'Mixed';
  }

  formatCurrency(n: number): string {
    return `${n.toLocaleString()} ֏`;
  }

  getMonthLabel(month: number): string {
    return this.months.find(m => m.value === month)?.label ?? String(month);
  }

  get filteredEmployees(): Employee[] {
    return this.showInactive ? this.employees : this.employees.filter(e => e.isActive);
  }

  getEmployeePaymentsTotal(payments: SalaryPayment[], status?: string): number {
    const filtered = status ? payments.filter(p => p.status === status) : payments;
    return filtered.reduce((sum, p) => sum + p.amount, 0);
  }
}
