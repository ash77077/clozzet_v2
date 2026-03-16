import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinancialProductionService } from '../../services/financial-production.service';
import { InventoryFabric, FabricInventoryHistory } from '../../models/financial-production.model';

type GroupBy = 'none' | 'type' | 'color' | 'gsm';
type SortBy = 'name' | 'type' | 'color' | 'gsm' | 'stock' | 'value';
type ViewMode = 'grid' | 'history' | 'logs';

interface FabricGroup {
  groupName: string;
  fabrics: InventoryFabric[];
  totalValue: number;
  totalKg: number;
}

@Component({
  selector: 'app-fabric-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fabric-inventory.component.html',
  styleUrl: './fabric-inventory.component.scss',
})
export class FabricInventoryComponent implements OnInit {
  fabricForm!: FormGroup;
  wasteForm!: FormGroup;
  restockForm!: FormGroup;
  fabrics;
  inventoryHistory;
  editingId = signal<string | null>(null);
  searchTerm = signal<string>('');
  groupBy = signal<GroupBy>('none');
  sortBy = signal<SortBy>('name');
  viewMode = signal<ViewMode>('grid');
  showWasteModal = signal<boolean>(false);
  showRestockModal = signal<boolean>(false);
  selectedFabricForWaste = signal<InventoryFabric | null>(null);
  selectedFabricForRestock = signal<InventoryFabric | null>(null);

  // Math object for template
  Math = Math;

  // Predefined options for dropdowns
  fabricTypes = ['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Blend', 'Denim', 'Jersey'];
  fabricColors = ['White', 'Black', 'Navy Blue', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Brown', 'Pink', 'Purple', 'Orange'];
  commonGSM = [120, 150, 180, 200, 220, 250, 280, 300];

  // Computed: Filtered fabrics
  filteredFabrics = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let filtered = this.fabrics();

    if (term) {
      filtered = filtered.filter(fabric =>
        fabric.name.toLowerCase().includes(term) ||
        fabric.type.toLowerCase().includes(term) ||
        fabric.color.toLowerCase().includes(term) ||
        fabric.supplier?.toLowerCase().includes(term)
      );
    }

    // Sort
    const sortKey = this.sortBy();
    filtered = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'color':
          return a.color.localeCompare(b.color);
        case 'gsm':
          return a.gsm - b.gsm;
        case 'stock':
          return b.availableKg - a.availableKg;
        case 'value':
          return (b.availableKg * b.pricePerKg) - (a.availableKg * a.pricePerKg);
        default:
          return 0;
      }
    });

    return filtered;
  });

  // Computed: Grouped fabrics
  groupedFabrics = computed((): FabricGroup[] => {
    const group = this.groupBy();
    const filtered = this.filteredFabrics();

    if (group === 'none') {
      return [{
        groupName: 'All Fabrics',
        fabrics: filtered,
        totalValue: this.calculateTotalValue(filtered),
        totalKg: this.calculateTotalKg(filtered)
      }];
    }

    const groups = new Map<string, InventoryFabric[]>();

    filtered.forEach(fabric => {
      let key: string;
      switch (group) {
        case 'type':
          key = fabric.type;
          break;
        case 'color':
          key = fabric.color;
          break;
        case 'gsm':
          key = `${fabric.gsm} GSM`;
          break;
        default:
          key = 'Unknown';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(fabric);
    });

    return Array.from(groups.entries())
      .map(([groupName, fabrics]) => ({
        groupName,
        fabrics,
        totalValue: this.calculateTotalValue(fabrics),
        totalKg: this.calculateTotalKg(fabrics)
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  });

  // Computed: Statistics
  totalInventoryValue = computed(() => {
    return this.fabrics().reduce(
      (total, fabric) => total + (fabric.availableKg * fabric.pricePerKg),
      0
    );
  });

  totalFabricKg = computed(() => {
    return this.fabrics().reduce(
      (total, fabric) => total + fabric.availableKg,
      0
    );
  });

  lowStockCount = computed(() => {
    return this.fabrics().filter(
      f => f.minStockLevel && f.availableKg < f.minStockLevel
    ).length;
  });

  // Computed: Filtered history (waste entries with return buttons)
  filteredHistory = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let filtered = this.inventoryHistory();

    // Filter to show only waste entries (both returned and unreturned)
    filtered = filtered.filter(entry => entry.changeType === 'waste');

    if (term) {
      filtered = filtered.filter(entry =>
        entry.fabricName?.toLowerCase().includes(term) ||
        entry.reason?.toLowerCase().includes(term)
      );
    }

    return filtered;
  });

  // Computed: Filtered logs (all actions for logs view)
  filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let filtered = this.inventoryHistory();

    if (term) {
      filtered = filtered.filter(entry =>
        entry.fabricName?.toLowerCase().includes(term) ||
        entry.changeType.toLowerCase().includes(term) ||
        entry.reason?.toLowerCase().includes(term)
      );
    }

    return filtered;
  });

  // Computed: Unreturned waste only (for inventory grid view)
  unreturnedWaste = computed(() => {
    const allHistory = this.inventoryHistory();

    // Filter to show only waste entries that haven't been returned
    return allHistory.filter(entry => {
      if (entry.changeType === 'waste') {
        return !this.isWasteReturned(entry.id!);
      }
      return false;
    });
  });

  // Computed: Total waste
  totalWaste = computed(() => {
    return this.financialService.getTotalWasteAllFabrics();
  });

  // Computed: Log statistics
  wasteEntriesCount = computed(() => {
    return this.filteredLogs().filter(e => e.changeType === 'waste').length;
  });

  restocksCount = computed(() => {
    return this.filteredLogs().filter(e => e.changeType === 'restock').length;
  });

  productionUsesCount = computed(() => {
    return this.filteredLogs().filter(e => e.changeType === 'production_use').length;
  });

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialProductionService
  ) {
    this.fabrics = this.financialService.inventoryFabrics$;
    this.inventoryHistory = this.financialService.fabricInventoryHistory$;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeWasteForm();
    this.initializeRestockForm();
    this.loadExistingColors();
  }

  private loadExistingColors(): void {
    // Get all unique colors from existing fabrics and add to the suggestions
    const existingFabrics = this.fabrics();
    existingFabrics.forEach(fabric => {
      if (fabric.color && !this.fabricColors.includes(fabric.color)) {
        this.fabricColors.push(fabric.color);
      }
    });
    this.fabricColors.sort(); // Keep alphabetically sorted
  }

  private initializeForm(): void {
    this.fabricForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['', [Validators.required]],
      color: ['', [Validators.required]],
      gsm: [180, [Validators.required, Validators.min(50), Validators.max(500)]],
      pricePerKg: [0, [Validators.required, Validators.min(0)]],
      availableKg: [0, [Validators.required, Validators.min(0)]],
      minStockLevel: [0, [Validators.min(0)]],
      supplier: [''],
      notes: ['']
    });
  }

  private initializeWasteForm(): void {
    this.wasteForm = this.fb.group({
      wasteKg: [0, [Validators.required, Validators.min(0.01)]],
      reason: ['']
    });
  }

  private initializeRestockForm(): void {
    this.restockForm = this.fb.group({
      restockKg: [0, [Validators.required, Validators.min(0.01)]],
      reason: ['']
    });
  }

  async onSubmit(): Promise<void> {
    if (this.fabricForm.valid) {
      const formValue = this.fabricForm.value;

      // Add new color to the list if it doesn't exist
      if (formValue.color && !this.fabricColors.includes(formValue.color)) {
        this.fabricColors.push(formValue.color);
        this.fabricColors.sort(); // Keep the list alphabetically sorted
      }

      if (this.editingId()) {
        await this.financialService.updateInventoryFabric(this.editingId()!, formValue);
        this.editingId.set(null);
      } else {
        await this.financialService.addInventoryFabric(formValue);
      }

      this.fabricForm.reset();
      this.initializeForm();
    }
  }

  editFabric(fabric: InventoryFabric): void {
    this.editingId.set(fabric.id!);
    this.fabricForm.patchValue({
      name: fabric.name,
      type: fabric.type,
      color: fabric.color,
      gsm: fabric.gsm,
      pricePerKg: fabric.pricePerKg,
      availableKg: fabric.availableKg,
      minStockLevel: fabric.minStockLevel || 0,
      supplier: fabric.supplier || '',
      notes: fabric.notes || ''
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async deleteFabric(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this fabric? This action cannot be undone.')) {
      await this.financialService.deleteInventoryFabric(id);
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.fabricForm.reset();
    this.initializeForm();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  onGroupByChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.groupBy.set(target.value as GroupBy);
  }

  onSortByChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy.set(target.value as SortBy);
  }

  isLowStock(fabric: InventoryFabric): boolean {
    return !!(fabric.minStockLevel && fabric.availableKg < fabric.minStockLevel);
  }

  private calculateTotalValue(fabrics: InventoryFabric[]): number {
    return fabrics.reduce((total, fabric) => total + (fabric.availableKg * fabric.pricePerKg), 0);
  }

  private calculateTotalKg(fabrics: InventoryFabric[]): number {
    return fabrics.reduce((total, fabric) => total + fabric.availableKg, 0);
  }

  // Waste Management Methods
  openWasteModal(fabric: InventoryFabric): void {
    this.selectedFabricForWaste.set(fabric);
    this.showWasteModal.set(true);
    this.wasteForm.reset();
    this.wasteForm.patchValue({
      wasteKg: 0,
      reason: ''
    });
    // Update max validator for waste quantity
    this.wasteForm.get('wasteKg')?.setValidators([
      Validators.required,
      Validators.min(0.01),
      Validators.max(fabric.availableKg)
    ]);
    this.wasteForm.get('wasteKg')?.updateValueAndValidity();
  }

  closeWasteModal(): void {
    this.showWasteModal.set(false);
    this.selectedFabricForWaste.set(null);
    this.wasteForm.reset();
  }

  async submitWaste(): Promise<void> {
    if (this.wasteForm.valid && this.selectedFabricForWaste()) {
      const fabric = this.selectedFabricForWaste()!;
      const { wasteKg, reason } = this.wasteForm.value;

      try {
        await this.financialService.recordWaste(fabric.id!, wasteKg, reason);
        this.closeWasteModal();
      } catch (error: any) {
        alert(error.message || 'Error recording waste');
      }
    }
  }

  // View mode switching
  switchToGridView(): void {
    this.viewMode.set('grid');
    this.searchTerm.set('');
  }

  switchToHistoryView(): void {
    this.viewMode.set('history');
    this.searchTerm.set('');
  }

  switchToLogsView(): void {
    this.viewMode.set('logs');
    this.searchTerm.set('');
  }

  // Get change type display text
  getChangeTypeDisplay(changeType: string): string {
    const typeMap: Record<string, string> = {
      'initial_stock': 'Initial Stock',
      'restock': 'Restock',
      'waste': 'Waste (Թափոն)',
      'waste_return': 'Waste Return (Վերադարձ)',
      'production_use': 'Production Use',
      'adjustment': 'Adjustment',
      'update': 'Update',
      'delete': 'Delete'
    };
    return typeMap[changeType] || changeType;
  }

  // Get change type badge class
  getChangeTypeBadgeClass(changeType: string): string {
    const classMap: Record<string, string> = {
      'initial_stock': 'badge-primary',
      'restock': 'badge-success',
      'waste': 'badge-danger',
      'waste_return': 'badge-success',
      'production_use': 'badge-info',
      'adjustment': 'badge-warning',
      'update': 'badge-info',
      'delete': 'badge-danger'
    };
    return classMap[changeType] || 'badge-secondary';
  }

  // Get fabric total waste
  getFabricTotalWaste(fabricId: string): number {
    return this.financialService.getTotalWaste(fabricId);
  }

  // Waste return methods
  async returnWaste(entry: FabricInventoryHistory): Promise<void> {
    if (entry.changeType !== 'waste') {
      alert('Only waste entries can be returned');
      return;
    }

    const wasteAmount = Math.abs(entry.quantityChange);
    const confirmMessage = `Return waste of ${wasteAmount.toFixed(2)} kg for ${entry.fabricName}?\n\nThis will add the fabric back to inventory.`;

    if (confirm(confirmMessage)) {
      try {
        const reason = prompt('Enter reason for waste return (optional):');
        await this.financialService.returnWaste(entry.id!, reason || undefined);
      } catch (error: any) {
        alert(error.message || 'Error returning waste');
      }
    }
  }

  // Check if waste has been returned
  isWasteReturned(entryId: string): boolean {
    return this.financialService.isWasteReturned(entryId);
  }

  // Restock Management Methods
  openRestockModal(fabric: InventoryFabric): void {
    this.selectedFabricForRestock.set(fabric);
    this.showRestockModal.set(true);
    this.restockForm.reset();
    this.restockForm.patchValue({
      restockKg: 0,
      reason: ''
    });
  }

  closeRestockModal(): void {
    this.showRestockModal.set(false);
    this.selectedFabricForRestock.set(null);
    this.restockForm.reset();
  }

  async submitRestock(): Promise<void> {
    if (this.restockForm.valid && this.selectedFabricForRestock()) {
      const fabric = this.selectedFabricForRestock()!;
      const { restockKg, reason } = this.restockForm.value;

      try {
        await this.financialService.restockFabric(fabric.id!, restockKg, reason);
        this.closeRestockModal();
      } catch (error: any) {
        alert(error.message || 'Error restocking fabric');
      }
    }
  }
}
