import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinancialProductionService } from '../../services/financial-production.service';
import { ProductDefinition, AccessoryComponent } from '../../models/financial-production.model';

@Component({
  selector: 'app-product-recipe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-recipe.component.html',
  styleUrl: './product-recipe.component.scss',
})
export class ProductRecipeComponent implements OnInit {
  productForm!: FormGroup;
  products;
  accessories;
  fabrics;
  editingId = signal<string | null>(null);
  selectedProductId = signal<string | null>(null);

  selectedProduct = computed(() => {
    const id = this.selectedProductId();
    return id ? this.products().find(p => p.id === id) : null;
  });

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialProductionService
  ) {
    this.products = this.financialService.productDefinitions$;
    this.accessories = this.financialService.accessoryItems$;
    this.fabrics = this.financialService.inventoryFabrics$;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(2)]],
      productCode: [''],
      fabricId: ['', Validators.required],
      gramsUsed: [0, [Validators.required, Validators.min(1)]],
      pieceworkLabor: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.min(0)]],
      accessories: this.fb.array([])
    });
  }

  get accessoriesArray(): FormArray {
    return this.productForm.get('accessories') as FormArray;
  }

  addAccessory(): void {
    const accessoryGroup = this.fb.group({
      accessoryId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
    this.accessoriesArray.push(accessoryGroup);
  }

  removeAccessory(index: number): void {
    this.accessoriesArray.removeAt(index);
  }

  getAccessoryName(accessoryId: string): string {
    const accessory = this.accessories().find(a => a.id === accessoryId);
    return accessory?.name || 'Unknown';
  }

  getAccessoryCost(accessoryId: string): number {
    const accessory = this.accessories().find(a => a.id === accessoryId);
    return accessory?.costPerUnit || 0;
  }

  getFabricPrice(fabricId: string): number {
    const fabric = this.fabrics().find(f => f.id === fabricId);
    return fabric?.pricePerKg || 0;
  }

  calculateFabricCost(): number {
    const fabricId = this.productForm.get('fabricId')?.value;
    const gramsUsed = this.productForm.get('gramsUsed')?.value || 0;
    const pricePerKg = this.getFabricPrice(fabricId);
    return (pricePerKg / 1000) * gramsUsed;
  }

  calculateAccessoriesCost(): number {
    let total = 0;
    this.accessoriesArray.controls.forEach(control => {
      const accessoryId = control.get('accessoryId')?.value;
      const quantity = control.get('quantity')?.value || 0;
      const costPerUnit = this.getAccessoryCost(accessoryId);
      total += costPerUnit * quantity;
    });
    return total;
  }

  calculateTotalUnitCost(): number {
    const fabricCost = this.calculateFabricCost();
    const accessoriesCost = this.calculateAccessoriesCost();
    const pieceworkLabor = this.productForm.get('pieceworkLabor')?.value || 0;
    return fabricCost + accessoriesCost + pieceworkLabor;
  }

  calculateProfitMargin(): number {
    const sellingPrice = this.productForm.get('sellingPrice')?.value || 0;
    const totalCost = this.calculateTotalUnitCost();
    if (sellingPrice === 0) return 0;
    return ((sellingPrice - totalCost) / sellingPrice) * 100;
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const fabricId = formValue.fabricId;
      const fabric = this.fabrics().find(f => f.id === fabricId);

      const accessoryComponents: AccessoryComponent[] = formValue.accessories.map((acc: any) => {
        const accessoryItem = this.accessories().find(a => a.id === acc.accessoryId);
        return {
          accessoryId: acc.accessoryId,
          accessoryName: accessoryItem?.name || '',
          costPerUnit: accessoryItem?.costPerUnit || 0,
          quantity: acc.quantity
        };
      });

      const productDefinition: ProductDefinition = {
        productName: formValue.productName,
        productCode: formValue.productCode,
        fabricComponent: {
          fabricId: fabricId,
          fabricName: fabric?.name || '',
          pricePerKg: fabric?.pricePerKg || 0,
          gramsUsed: formValue.gramsUsed
        },
        accessories: accessoryComponents,
        pieceworkLabor: formValue.pieceworkLabor,
        sellingPrice: formValue.sellingPrice
      };

      if (this.editingId()) {
        await this.financialService.updateProductDefinition(this.editingId()!, productDefinition);
        this.editingId.set(null);
      } else {
        await this.financialService.addProductDefinition(productDefinition);
      }

      this.resetForm();
    }
  }

  editProduct(product: ProductDefinition): void {
    this.editingId.set(product.id!);

    this.accessoriesArray.clear();
    product.accessories.forEach(acc => {
      const group = this.fb.group({
        accessoryId: [acc.accessoryId, Validators.required],
        quantity: [acc.quantity, [Validators.required, Validators.min(1)]]
      });
      this.accessoriesArray.push(group);
    });

    this.productForm.patchValue({
      productName: product.productName,
      productCode: product.productCode,
      fabricId: product.fabricComponent.fabricId,
      gramsUsed: product.fabricComponent.gramsUsed,
      pieceworkLabor: product.pieceworkLabor,
      sellingPrice: product.sellingPrice
    });
  }

  async deleteProduct(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this product definition?')) {
      await this.financialService.deleteProductDefinition(id);
    }
  }

  viewProduct(product: ProductDefinition): void {
    this.selectedProductId.set(product.id!);
  }

  closeDetails(): void {
    this.selectedProductId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.productForm.reset();
    this.accessoriesArray.clear();
    this.initializeForm();
  }

  getSelectedProductAccessoriesTotal(): number {
    const product = this.selectedProduct();
    if (!product || !product.accessories) return 0;
    return product.accessories.reduce((sum, acc) => sum + (acc.accessoryCost || 0), 0);
  }
}
