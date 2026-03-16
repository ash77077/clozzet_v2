import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinancialProductionService } from '../../services/financial-production.service';
import { AccessoryItem } from '../../models/financial-production.model';

@Component({
  selector: 'app-accessories-registry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './accessories-registry.component.html',
  styleUrl: './accessories-registry.component.scss',
})
export class AccessoriesRegistryComponent implements OnInit {
  accessoryForm!: FormGroup;
  accessories;
  editingId = signal<string | null>(null);
  searchTerm = signal<string>('');

  units = ['count', 'pcs', 'meter', 'yard', 'kg', 'g', 'lb', 'oz'];

  filteredAccessories = () => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.accessories();
    return this.accessories().filter(acc =>
      acc.name.toLowerCase().includes(term)
    );
  };

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialProductionService
  ) {
    this.accessories = this.financialService.accessoryItems$;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.accessoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      unit: ['count', [Validators.required]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      costPerUnit: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit(): void {
    if (this.accessoryForm.valid) {
      const formValue = this.accessoryForm.value;

      if (this.editingId()) {
        this.financialService.updateAccessoryItem(this.editingId()!, formValue);
        this.editingId.set(null);
      } else {
        this.financialService.addAccessoryItem(formValue);
      }

      this.accessoryForm.reset();
      this.initializeForm();
    }
  }

  editAccessory(accessory: AccessoryItem): void {
    this.editingId.set(accessory.id!);
    this.accessoryForm.patchValue({
      name: accessory.name,
      unit: accessory.unit,
      quantity: accessory.quantity,
      costPerUnit: accessory.costPerUnit
    });
  }

  async deleteAccessory(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this accessory item?')) {
      await this.financialService.deleteAccessoryItem(id);
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.accessoryForm.reset();
    this.initializeForm();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  getTotalInventoryValue(): number {
    return this.accessories().reduce((sum, acc) => sum + (acc.quantity * acc.costPerUnit), 0);
  }

  getFilteredInventoryValue(): number {
    return this.filteredAccessories().reduce((sum, acc) => sum + (acc.quantity * acc.costPerUnit), 0);
  }
}
