import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinancialProductionService } from '../../services/financial-production.service';
import { ProductionRun, ProductionStatus } from '../../models/financial-production.model';
import { getShortMonthName } from '../../constants/financial-production.constants';

@Component({
  selector: 'app-production-run',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './production-run.component.html',
  styleUrl: './production-run.component.scss',
})
export class ProductionRunComponent implements OnInit {
  productionForm!: FormGroup;
  statusForm!: FormGroup;
  productionRuns;
  products;
  errorMessage: string = '';
  showStatusModal = signal<boolean>(false);
  selectedRunForStatusUpdate = signal<ProductionRun | null>(null);

  // Status options for dropdown
  statusOptions: { value: ProductionStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: '#9e9e9e' },
    { value: 'in_progress', label: 'In Progress', color: '#ff9800' },
    { value: 'quality_check', label: 'Quality Check', color: '#2196f3' },
    { value: 'packaged', label: 'Packaged', color: '#9c27b0' },
    { value: 'ready_for_delivery', label: 'Ready for Delivery', color: '#00bcd4' },
    { value: 'delivered', label: 'Delivered', color: '#4caf50' },
    { value: 'completed', label: 'Completed / Done', color: '#4caf50' },
    { value: 'reproduction', label: 'Reproduction', color: '#ff5722' },
    { value: 'cancelled', label: 'Cancelled', color: '#f44336' }
  ];

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialProductionService
  ) {
    this.productionRuns = this.financialService.productionRuns$;
    this.products = this.financialService.productDefinitions$;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeStatusForm();
  }

  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.productionForm = this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      sellingPricePerUnit: [0, [Validators.required, Validators.min(0)]],
      startDate: [today, Validators.required],
      productionDate: [today, Validators.required]
    });

    // Watch for product selection changes and auto-fill selling price
    this.productionForm.get('productId')?.valueChanges.subscribe(productId => {
      if (productId) {
        const product = this.getProductDetails(productId);
        if (product && product.sellingPrice) {
          this.productionForm.patchValue({
            sellingPricePerUnit: product.sellingPrice
          }, { emitEvent: false });
        }
      }
    });
  }

  private initializeStatusForm(): void {
    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      quantityFinished: [0, [Validators.required, Validators.min(0)]],
      statusNotes: ['']
    });
  }

  getProductDetails(productId: string) {
    return this.products().find(p => p.id === productId);
  }

  get selectedProduct() {
    const productId = this.productionForm.get('productId')?.value;
    return this.getProductDetails(productId);
  }

  calculateTotalCost(): number {
    const quantity = this.productionForm.get('quantity')?.value || 0;
    const unitCost = this.selectedProduct?.totalUnitCost || 0;
    return quantity * unitCost;
  }

  calculateTotalRevenue(): number {
    const quantity = this.productionForm.get('quantity')?.value || 0;
    const sellingPrice = this.productionForm.get('sellingPricePerUnit')?.value || 0;
    return quantity * sellingPrice;
  }

  calculateGrossProfit(): number {
    return this.calculateTotalRevenue() - this.calculateTotalCost();
  }

  async onSubmit(): Promise<void> {
    if (this.productionForm.valid) {
      try {
        const formValue = this.productionForm.value;
        const startDate = new Date(formValue.startDate);
        const productionDate = new Date(formValue.productionDate);

        const productionRun: ProductionRun = {
          productId: formValue.productId,
          quantity: formValue.quantity,
          quantityFinished: 0,
          sellingPricePerUnit: formValue.sellingPricePerUnit,
          startDate: startDate,
          productionDate: productionDate,
          status: 'pending'
        };

        await this.financialService.addProductionRun(productionRun);
        this.errorMessage = '';
        this.productionForm.reset();
        this.initializeForm();
      } catch (error: any) {
        this.errorMessage = error.message || 'An error occurred while logging production.';
      }
    }
  }

  async deleteProduction(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this production run?')) {
      await this.financialService.deleteProductionRun(id);
    }
  }

  getMonthName(month: number): string {
    return getShortMonthName(month);
  }

  getProgressPercentage(run: ProductionRun): number {
    if (!run.quantity) return 0;
    const finished = run.quantityFinished || 0;
    return Math.round((finished / run.quantity) * 100);
  }

  openStatusModal(run: ProductionRun): void {
    this.selectedRunForStatusUpdate.set(run);
    this.showStatusModal.set(true);
    this.statusForm.patchValue({
      status: run.status || 'pending',
      quantityFinished: run.quantityFinished || 0,
      statusNotes: run.statusNotes || ''
    });
    // Update max validator for quantity
    this.statusForm.get('quantityFinished')?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(run.quantity)
    ]);
    this.statusForm.get('quantityFinished')?.updateValueAndValidity();
  }

  closeStatusModal(): void {
    this.showStatusModal.set(false);
    this.selectedRunForStatusUpdate.set(null);
    this.statusForm.reset();
  }

  async submitStatusUpdate(): Promise<void> {
    if (this.statusForm.valid && this.selectedRunForStatusUpdate()) {
      const run = this.selectedRunForStatusUpdate()!;
      const { status, quantityFinished, statusNotes } = this.statusForm.value;

      const finishedDate = status === 'completed' ? new Date() : undefined;

      await this.financialService.updateProductionStatus(
        run.id!,
        status,
        quantityFinished,
        statusNotes,
        finishedDate
      );

      this.closeStatusModal();
    }
  }

  getStatusLabel(status: ProductionStatus): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  }

  getStatusColor(status: ProductionStatus): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.color : '#757575';
  }

  getAccessoriesTotal(): number {
    if (!this.selectedProduct || !this.selectedProduct.accessories) return 0;
    return this.selectedProduct.accessories.reduce((sum, acc) => sum + (acc.accessoryCost || 0), 0);
  }
}
