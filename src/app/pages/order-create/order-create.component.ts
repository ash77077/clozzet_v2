import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { B2BOrdersService } from '../../services/b2b-orders.service';
import { Company } from '../../models/dashboard.models';
import {
  PRODUCT_SIZES,
  PRODUCT_TYPES,
} from '../../models/b2b-order.model';

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss',
})
export class OrderCreateComponent implements OnInit {
  form!: FormGroup;
  companies: Company[] = [];
  loadingCompanies = false;
  submitting = false;
  submitError: string | null = null;
  submitSuccess = false;

  readonly productTypes = PRODUCT_TYPES;
  readonly productSizes = PRODUCT_SIZES;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private ordersService: B2BOrdersService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForm();

    if (this.isManager()) {
      this.loadCompanies();
    } else {
      // Client: lock in their own company automatically
      const user = this.authService.getCurrentUser();
      const companyName =
        (user?.company as any)?.name ?? user?.company ?? '';
      this.form.patchValue({ companyName });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  isManager(): boolean {
    const role = this.authService.getCurrentUser()?.role ?? '';
    return role === 'admin' || role === 'manager';
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get itemControls(): FormGroup[] {
    return this.itemsArray.controls as FormGroup[];
  }

  isInvalid(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  isItemInvalid(index: number, field: string): boolean {
    const ctrl = this.itemsArray.at(index).get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // ─── Form setup ───────────────────────────────────────────────────────────

  private buildForm(): void {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      companyId:   [''],
      notes:       [''],
      items:       this.fb.array([this.createItemGroup()]),
    });
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({
      type:     ['', Validators.required],
      size:     ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.itemsArray.length > 1) {
      this.itemsArray.removeAt(index);
    }
  }

  // ─── Company loading (Manager only) ───────────────────────────────────────

  private loadCompanies(): void {
    this.loadingCompanies = true;
    this.ordersService.getCompanies().subscribe({
      next: companies => {
        this.companies = companies;
        this.loadingCompanies = false;
      },
      error: () => {
        this.loadingCompanies = false;
      },
    });
  }

  onCompanySelect(event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    const selectedCompany = this.companies.find(c => c.id === selectEl.value);
    if (selectedCompany) {
      this.form.patchValue({
        companyId:   selectedCompany.id,
        companyName: selectedCompany.name,
      });
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;

    const { companyName, companyId, notes, items } = this.form.value;

    this.ordersService.createOrder({ companyName, companyId, items, notes }).subscribe({
      next: () => {
        this.submitting = false;
        this.submitSuccess = true;
        setTimeout(() => this.router.navigate(['/orders']), 1500);
      },
      error: err => {
        this.submitting = false;
        this.submitError =
          err?.error?.message ?? 'Failed to create order. Please try again.';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/orders']);
  }
}
