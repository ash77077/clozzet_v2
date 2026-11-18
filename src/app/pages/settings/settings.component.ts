import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ClothTypesService, ClothType } from '../../services/cloth-types.service';
import { FabricTypesService, FabricType } from '../../services/fabric-types.service';
import { FabricColorsService, FabricColor } from '../../services/fabric-colors.service';
import { ConsumptionTemplatesService, ConsumptionTemplate } from '../../services/consumption-templates.service';
import { SuppliersService, Supplier } from '../../services/suppliers.service';
import { GlobalSettingsService, GlobalSettings } from '../../services/global-settings.service';
import { ProductionNormsService, ProductionNorm, PRODUCTION_NORM_UNITS } from '../../services/production-norms.service';

type ViewMode = 'cloth' | 'fabrics' | 'suppliers' | 'global' | 'sales';

const UNIT_OPTIONS = [
  { label: 'մ (Մետր)', value: 'm' },
  { label: 'կգ (Կիլոգրամ)', value: 'kg' },
];

const PROD_NORM_COMMON_NAMES = [
  'Կոճակ', 'Թել', 'Ռիբ', 'Թիսմա', 'Կայծակ', 'Պիտակ', 'Փաթեթ', 'Կոճկային օղակ',
  'Ձեռքի ժապավեն', 'Կարի թել', 'Սաչ', 'Ձևաչափ', 'Ուղղակի կոճ', 'Եզրի ժապավեն',
];

/** Inline-editable fabric norm row state. `template === null` indicates a brand-new unsaved row. */
export interface FabricNormRow {
  template: ConsumptionTemplate | null;
  fabricTypeId: string;
  adultNorm: number | null;
  childNorm: number | null;
  isDefault: boolean;
  isActive: boolean;
  editing: boolean;
  saving: boolean;
}

/** Inline-editable production component row state. `norm === null` indicates a brand-new unsaved row. */
export interface ProdNormRow {
  norm: ProductionNorm | null;
  name: string;
  quantity: number;
  unit: string;
  unitCostAmd: number;
  notes: string;
  isActive: boolean;
  editing: boolean;
  saving: boolean;
}

/** Inline new-cloth-type row model (sidebar). */
interface NewClothRow {
  nameArm: string;
  nameEng: string;
  saving: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, TextareaModule,
    TagModule, ToastModule, ConfirmDialogModule, TooltipModule,
    Select, ToggleSwitch,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ─── View state ────────────────────────────────────────────────────────────
  view: ViewMode = 'cloth';
  isLoading = true;

  // ─── Master data ───────────────────────────────────────────────────────────
  clothTypes: ClothType[] = [];
  fabricTypes: FabricType[] = [];
  suppliers: Supplier[] = [];
  globalSettings: GlobalSettings | null = null;

  // ─── Fabric colors (expandable rows in fabrics view) ───────────────────────
  colorsByFabric: Record<string, FabricColor[]> = {};
  expandedFabricId: string | null = null;
  loadedFabricIds = new Set<string>();
  loadingColorsForFabric: string | null = null;

  // ─── Selection (cloth master-detail) ───────────────────────────────────────
  selectedClothType: ClothType | null = null;
  clothInfoForm!: FormGroup;

  // ─── Inline add cloth type (sidebar) ───────────────────────────────────────
  addingCloth = false;
  newClothRow: NewClothRow = { nameArm: '', nameEng: '', saving: false };

  // ─── Fabric norm rows (inline-editable) ────────────────────────────────────
  fabricNormRows: FabricNormRow[] = [];
  addingFabricNorm = false;
  newFabricNormRow: FabricNormRow = this.makeEmptyFabricNormRow();
  isLoadingFabricNorms = false;

  // ─── Production norm rows (inline-editable) ────────────────────────────────
  prodNormRows: ProdNormRow[] = [];
  addingProdNorm = false;
  newProdNormRow: ProdNormRow = this.makeEmptyProdNormRow();
  isLoadingProdNorms = false;

  // ─── Dropdown option sources ───────────────────────────────────────────────
  unitOptions = UNIT_OPTIONS;
  prodNormUnitOptions = PRODUCTION_NORM_UNITS;
  prodNormCommonNames = PROD_NORM_COMMON_NAMES;

  // ─── Fabric Type dialog ────────────────────────────────────────────────────
  showFabricDialog = false;
  editingFabricType: FabricType | null = null;
  fabricForm!: FormGroup;
  isSavingFabric = false;

  // ─── Color dialog ──────────────────────────────────────────────────────────
  showColorDialog = false;
  editingColor: FabricColor | null = null;
  colorDialogFabricId = '';
  colorForm!: FormGroup;
  isSavingColor = false;

  // ─── Supplier dialog ───────────────────────────────────────────────────────
  showSupplierDialog = false;
  editingSupplier: Supplier | null = null;
  supplierForm!: FormGroup;
  isSavingSupplier = false;

  // ─── Global settings form ──────────────────────────────────────────────────
  settingsForm!: FormGroup;
  isSettingsSaving = false;

  constructor(
    private fb: FormBuilder,
    private clothTypesService: ClothTypesService,
    private fabricTypesService: FabricTypesService,
    private fabricColorsService: FabricColorsService,
    private templatesService: ConsumptionTemplatesService,
    private suppliersService: SuppliersService,
    private globalSettingsService: GlobalSettingsService,
    private productionNormsService: ProductionNormsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form builders ─────────────────────────────────────────────────────────

  private buildForms(): void {
    this.clothInfoForm = this.fb.group({
      nameArm: ['', Validators.required],
      nameEng: ['', Validators.required],
      defaultWastePercent: [null, [Validators.min(0), Validators.max(100)]],
      isActive: [true],
    });

    this.fabricForm = this.fb.group({
      nameArm: ['', Validators.required],
      nameEng: ['', Validators.required],
      unit: ['m', Validators.required],
      composition: [''],
      densityGsm: [null],
      widthCm: [null],
      pricePerUnitAmd: [null, [Validators.min(0)]],
      notes: [''],
      isActive: [true],
    });

    this.colorForm = this.fb.group({
      nameArm: ['', Validators.required],
      nameEng: [''],
      hex: ['', Validators.pattern(/^$|^#[0-9A-Fa-f]{6}$/)],
      isActive: [true],
    });

    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''],
      email: [''],
      notes: [''],
      isActive: [true],
    });

    this.settingsForm = this.fb.group({
      fabricWastePercent: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
      turnoverTaxPercent: [7, [Validators.required, Validators.min(0), Validators.max(100)]],
      lowStockThreshold: [null],
      quoteDefaultPrepaymentPercent: [null],
      quoteDefaultValidityDays: [null],
      quoteDefaultLeadTimeDays: [null],
      quoteDefaultDeliveryTerms: [''],
      quoteDefaultTermsText: [''],
    });
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      clothTypes: this.clothTypesService.getAll(),
      fabricTypes: this.fabricTypesService.getAll(),
      suppliers: this.suppliersService.getAll(),
      settings: this.globalSettingsService.get(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ clothTypes, fabricTypes, suppliers, settings }) => {
        this.clothTypes = clothTypes;
        this.fabricTypes = fabricTypes;
        this.suppliers = suppliers;
        this.globalSettings = settings;

        if (settings) {
          this.settingsForm.patchValue({
            fabricWastePercent: settings.fabricWastePercent,
            turnoverTaxPercent: settings.turnoverTaxPercent,
            lowStockThreshold: settings.lowStockThreshold ?? null,
            quoteDefaultPrepaymentPercent: settings.quoteDefaultPrepaymentPercent ?? null,
            quoteDefaultValidityDays: settings.quoteDefaultValidityDays ?? null,
            quoteDefaultLeadTimeDays: settings.quoteDefaultLeadTimeDays ?? null,
            quoteDefaultDeliveryTerms: settings.quoteDefaultDeliveryTerms ?? '',
            quoteDefaultTermsText: settings.quoteDefaultTermsText ?? '',
          }, { emitEvent: false });
        }

        // Preserve/refresh current selection or auto-select first
        if (this.selectedClothType) {
          const refreshed = this.clothTypes.find(c => c._id === this.selectedClothType!._id) ?? null;
          if (refreshed) {
            this.selectClothType(refreshed);
          } else {
            this.selectedClothType = null;
            if (this.clothTypes[0]) this.selectClothType(this.clothTypes[0]);
          }
        } else if (this.clothTypes[0]) {
          this.selectClothType(this.clothTypes[0]);
        }

        this.isLoading = false;
      },
      error: () => {
        this.toast('error', 'Սխալ', 'Տվյալները բեռնելու սխալ');
        this.isLoading = false;
      },
    });
  }

  // ─── Cloth type selection ──────────────────────────────────────────────────

  selectClothType(ct: ClothType): void {
    // Auto-save basic info if dirty before switching
    if (
      this.selectedClothType &&
      this.selectedClothType._id !== ct._id &&
      this.clothInfoForm.dirty &&
      this.clothInfoForm.valid
    ) {
      this.saveClothInfo(/*silent*/ true);
    }

    this.selectedClothType = ct;
    this.clothInfoForm.patchValue({
      nameArm: ct.nameArm,
      nameEng: ct.nameEng,
      defaultWastePercent: ct.defaultWastePercent ?? null,
      isActive: ct.isActive,
    }, { emitEvent: false });
    this.clothInfoForm.markAsPristine();

    this.loadFabricNormsForSelected();
    this.loadProdNormsForSelected();
    this.cancelAddFabricNorm();
    this.cancelAddProdNorm();
  }

  saveClothInfo(silent = false): void {
    if (!this.selectedClothType || this.clothInfoForm.invalid) return;
    const id = this.selectedClothType._id;
    const val = this.clothInfoForm.value;

    this.clothTypesService.update(id, val)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          // Update local caches without reloading everything
          const idx = this.clothTypes.findIndex(c => c._id === id);
          if (idx >= 0) this.clothTypes[idx] = { ...this.clothTypes[idx], ...updated };
          if (this.selectedClothType?._id === id) {
            this.selectedClothType = { ...this.selectedClothType, ...updated };
          }
          this.clothInfoForm.markAsPristine();
          if (!silent) this.toast('success', 'Պահված', 'Հագուստի տեսակը թարմացվեց');
        },
        error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց պահել'),
      });
  }

  // ─── Inline add cloth type ─────────────────────────────────────────────────

  startAddCloth(): void {
    this.addingCloth = true;
    this.newClothRow = { nameArm: '', nameEng: '', saving: false };
  }

  cancelAddCloth(): void {
    this.addingCloth = false;
    this.newClothRow = { nameArm: '', nameEng: '', saving: false };
  }

  saveNewCloth(): void {
    const nameArm = this.newClothRow.nameArm.trim();
    const nameEng = this.newClothRow.nameEng.trim();
    if (!nameArm || !nameEng) {
      this.toast('warn', 'Լրացրեք դաշտերը', 'Հայ. և անգ. անունները պարտադիր են');
      return;
    }
    this.newClothRow.saving = true;
    this.clothTypesService.create({
      nameArm, nameEng,
      sortOrder: this.clothTypes.length,
      isActive: true,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (created) => {
        this.clothTypes = [...this.clothTypes, created];
        this.addingCloth = false;
        this.newClothRow = { nameArm: '', nameEng: '', saving: false };
        this.selectClothType(created);
        this.toast('success', 'Ավելացված', 'Հագուստի տեսակն ավելացվեց');
      },
      error: () => {
        this.newClothRow.saving = false;
        this.toast('error', 'Սխալ', 'Չհաջողվեց ավելացնել');
      },
    });
  }

  deleteCloth(ct: ClothType, event?: Event): void {
    event?.stopPropagation();
    this.confirmationService.confirm({
      message: `Ջնջե՞լ «${ct.nameArm}»: Կջնջվեն նաև կցված նորմերն ու բաղադրիչները:`,
      header: 'Հաստատել ջնջումը',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.clothTypesService.delete(ct._id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            if (this.selectedClothType?._id === ct._id) {
              this.selectedClothType = null;
              this.fabricNormRows = [];
              this.prodNormRows = [];
            }
            this.toast('success', 'Ջնջված', '');
            this.loadAll();
          },
          error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց ջնջել'),
        });
      },
    });
  }

  // ─── Fabric Norm rows (inline-editable) ────────────────────────────────────

  private loadFabricNormsForSelected(): void {
    if (!this.selectedClothType) {
      this.fabricNormRows = [];
      return;
    }
    const clothId = this.selectedClothType._id;
    this.isLoadingFabricNorms = true;
    this.templatesService.getByClothType(clothId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.fabricNormRows = templates.map(t => this.templateToRow(t));
          this.isLoadingFabricNorms = false;
        },
        error: () => {
          this.fabricNormRows = [];
          this.isLoadingFabricNorms = false;
        },
      });
  }

  private templateToRow(t: ConsumptionTemplate): FabricNormRow {
    const unit = this.fabricTypes.find(f => f._id === t.fabricTypeId)?.unit ?? t.fabricTypeUnit ?? 'm';
    return {
      template: t,
      fabricTypeId: t.fabricTypeId,
      adultNorm: this.toDisplayNorm(t.adultNorm ?? null, unit),
      childNorm: this.toDisplayNorm(t.childNorm ?? null, unit),
      isDefault: t.isDefault,
      isActive: t.isActive,
      editing: false,
      saving: false,
    };
  }

  private makeEmptyFabricNormRow(): FabricNormRow {
    return {
      template: null,
      fabricTypeId: '',
      adultNorm: null,
      childNorm: null,
      isDefault: false,
      isActive: true,
      editing: true,
      saving: false,
    };
  }

  addFabricNormRow(): void {
    if (!this.selectedClothType) return;
    this.addingFabricNorm = true;
    this.newFabricNormRow = this.makeEmptyFabricNormRow();
  }

  cancelAddFabricNorm(): void {
    this.addingFabricNorm = false;
    this.newFabricNormRow = this.makeEmptyFabricNormRow();
  }

  editFabricNormRow(row: FabricNormRow): void {
    row.editing = true;
  }

  cancelFabricNormRow(row: FabricNormRow): void {
    if (!row.template) {
      // Shouldn't happen for existing rows, but defensive
      this.cancelAddFabricNorm();
      return;
    }
    // Revert to original values
    const original = this.templateToRow(row.template);
    Object.assign(row, original);
  }

  saveFabricNormRow(row: FabricNormRow): void {
    if (!this.selectedClothType) return;
    if (!row.fabricTypeId) {
      this.toast('warn', 'Ընտրեք գործվածք', '');
      return;
    }
    if (row.adultNorm == null && row.childNorm == null) {
      this.toast('warn', 'Լրացրեք նորմը', 'Առնվազն մեկ նորմ (մեծահասակ կամ երեխա) անհրաժեշտ է');
      return;
    }

    const fabricType = this.fabricTypes.find(f => f._id === row.fabricTypeId);
    if (!fabricType) {
      this.toast('error', 'Սխալ', 'Գործվածքը չի գտնվել');
      return;
    }

    row.saving = true;
    const unit = fabricType.unit;
    const dto: Partial<ConsumptionTemplate> = {
      clothTypeId: this.selectedClothType._id,
      fabricTypeId: row.fabricTypeId,
      fabricTypeName: fabricType.nameArm,
      fabricTypeUnit: unit,
      adultNorm: this.toStorageNorm(row.adultNorm, unit) ?? undefined,
      childNorm: this.toStorageNorm(row.childNorm, unit) ?? undefined,
      isDefault: row.isDefault,
      isActive: row.isActive,
    };

    const obs = row.template
      ? this.templatesService.update(row.template._id, dto)
      : this.templatesService.create(dto);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        row.saving = false;
        row.editing = false;
        row.template = saved;
        // Refresh display values from storage round-trip
        const refreshed = this.templateToRow(saved);
        Object.assign(row, refreshed);

        if (!this.fabricNormRows.includes(row)) {
          this.fabricNormRows = [...this.fabricNormRows, row];
        }
        this.cancelAddFabricNorm();
        this.toast('success', 'Պահված', 'Նորման պահված է');
      },
      error: (e) => {
        row.saving = false;
        this.toast('error', 'Սխալ', e?.error?.message ?? 'Չհաջողվեց պահել');
      },
    });
  }

  deleteFabricNorm(row: FabricNormRow): void {
    if (!row.template) {
      this.cancelAddFabricNorm();
      return;
    }
    const tpl = row.template;
    this.confirmationService.confirm({
      message: `Ջնջե՞լ «${tpl.fabricTypeName}» նորման:`,
      header: 'Հաստատել',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.templatesService.delete(tpl._id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.fabricNormRows = this.fabricNormRows.filter(r => r !== row);
            this.toast('success', 'Ջնջված', '');
          },
          error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց ջնջել'),
        });
      },
    });
  }

  /** Unit label for a fabric norm row (based on the fabric's unit; grams for kg fabrics). */
  getFabricNormUnitLabel(row: FabricNormRow): string {
    const unit = this.fabricTypes.find(f => f._id === row.fabricTypeId)?.unit ?? 'm';
    return unit === 'kg' ? 'գ' : 'մ';
  }

  // ─── Production Norm rows (inline-editable) ────────────────────────────────

  private loadProdNormsForSelected(): void {
    if (!this.selectedClothType) {
      this.prodNormRows = [];
      return;
    }
    const clothId = this.selectedClothType._id;
    this.isLoadingProdNorms = true;
    this.productionNormsService.getByClothTypeAdmin(clothId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (norms) => {
          this.prodNormRows = norms.map(n => this.normToRow(n));
          this.isLoadingProdNorms = false;
        },
        error: () => {
          this.prodNormRows = [];
          this.isLoadingProdNorms = false;
        },
      });
  }

  private normToRow(n: ProductionNorm): ProdNormRow {
    return {
      norm: n,
      name: n.name,
      quantity: n.quantity,
      unit: n.unit,
      unitCostAmd: n.unitCostAmd,
      notes: n.notes ?? '',
      isActive: n.isActive,
      editing: false,
      saving: false,
    };
  }

  private makeEmptyProdNormRow(): ProdNormRow {
    return {
      norm: null,
      name: '',
      quantity: 1,
      unit: 'հտ',
      unitCostAmd: 0,
      notes: '',
      isActive: true,
      editing: true,
      saving: false,
    };
  }

  addProdNormRow(): void {
    if (!this.selectedClothType) return;
    this.addingProdNorm = true;
    this.newProdNormRow = this.makeEmptyProdNormRow();
  }

  cancelAddProdNorm(): void {
    this.addingProdNorm = false;
    this.newProdNormRow = this.makeEmptyProdNormRow();
  }

  editProdNormRow(row: ProdNormRow): void {
    row.editing = true;
  }

  cancelProdNormRow(row: ProdNormRow): void {
    if (!row.norm) {
      this.cancelAddProdNorm();
      return;
    }
    Object.assign(row, this.normToRow(row.norm));
  }

  saveProdNormRow(row: ProdNormRow): void {
    if (!this.selectedClothType) return;
    const name = row.name.trim();
    if (!name) {
      this.toast('warn', 'Նշեք անունը', '');
      return;
    }
    if (row.quantity == null || row.quantity < 0) {
      this.toast('warn', 'Սխալ քանակ', '');
      return;
    }
    if (row.unitCostAmd == null || row.unitCostAmd < 0) {
      this.toast('warn', 'Սխալ արժեք', '');
      return;
    }

    row.saving = true;
    const dto: Partial<ProductionNorm> = {
      clothTypeId: this.selectedClothType._id,
      name,
      quantity: row.quantity,
      unit: row.unit,
      unitCostAmd: row.unitCostAmd,
      notes: row.notes?.trim() || undefined,
      isActive: row.isActive,
      sortOrder: row.norm?.sortOrder ?? this.prodNormRows.length,
    };

    const obs = row.norm
      ? this.productionNormsService.update(row.norm._id, dto)
      : this.productionNormsService.create(dto);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        row.saving = false;
        row.editing = false;
        row.norm = saved;
        Object.assign(row, this.normToRow(saved));

        if (!this.prodNormRows.includes(row)) {
          this.prodNormRows = [...this.prodNormRows, row];
        }
        this.cancelAddProdNorm();
        this.toast('success', 'Պահված', 'Բաղադրիչը պահված է');
      },
      error: (e) => {
        row.saving = false;
        this.toast('error', 'Սխալ', e?.error?.message ?? 'Չհաջողվեց պահել');
      },
    });
  }

  deleteProdNorm(row: ProdNormRow): void {
    if (!row.norm) {
      this.cancelAddProdNorm();
      return;
    }
    const n = row.norm;
    this.confirmationService.confirm({
      message: `Ջնջե՞լ «${n.name}» բաղադրիչը:`,
      header: 'Հաստատել',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productionNormsService.delete(n._id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.prodNormRows = this.prodNormRows.filter(r => r !== row);
            this.toast('success', 'Ջնջված', '');
          },
          error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց ջնջել'),
        });
      },
    });
  }

  // ─── Cost summary ──────────────────────────────────────────────────────────

  /** Sum of qty × unitCost for active production components (only persisted rows). */
  getTotalComponentCost(): number {
    return this.prodNormRows
      .filter(r => r.isActive && r.norm !== null)
      .reduce((sum, r) => sum + (r.quantity ?? 0) * (r.unitCostAmd ?? 0), 0);
  }

  private fabricCostFor(norm: number | null, fabricTypeId: string): number | null {
    if (norm == null) return null;
    const fabric = this.fabricTypes.find(f => f._id === fabricTypeId);
    if (!fabric?.pricePerUnitAmd) return null;
    const normInBaseUnit = fabric.unit === 'kg' ? norm / 1000 : norm;
    return normInBaseUnit * fabric.pricePerUnitAmd;
  }

  getFabricCostAdult(): number | null {
    const row = this.fabricNormRows.find(r => r.isDefault && r.isActive && r.template);
    if (!row) return null;
    return this.fabricCostFor(row.adultNorm, row.fabricTypeId);
  }

  getFabricCostChild(): number | null {
    const row = this.fabricNormRows.find(r => r.isDefault && r.isActive && r.template);
    if (!row) return null;
    return this.fabricCostFor(row.childNorm, row.fabricTypeId);
  }

  getTotalPerPiece(size: 'adult' | 'child'): number {
    const comp = this.getTotalComponentCost();
    const fab = size === 'adult' ? this.getFabricCostAdult() : this.getFabricCostChild();
    return comp + (fab ?? 0);
  }

  // ─── Fabric unit / norm conversion helpers ─────────────────────────────────

  /** Convert display value (grams for kg fabrics) to storage value (kg or m). */
  private toStorageNorm(displayVal: number | null, unit: string): number | null {
    if (displayVal == null) return null;
    return unit === 'kg' ? displayVal / 1000 : displayVal;
  }

  /** Convert storage value (kg or m) to display value (grams for kg, m for m). */
  toDisplayNorm(storageVal: number | null | undefined, unit: string): number | null {
    if (storageVal == null) return null;
    return unit === 'kg' ? Math.round(storageVal * 1000) : storageVal;
  }

  getUnitLabel(unit: string): string {
    return unit === 'kg' ? 'կգ' : 'մ';
  }

  // ─── Fabric Type CRUD (dialogs — global master data) ───────────────────────

  openAddFabric(): void {
    this.editingFabricType = null;
    this.fabricForm.reset({ unit: 'm', isActive: true });
    this.showFabricDialog = true;
  }

  openEditFabric(ft: FabricType): void {
    this.editingFabricType = ft;
    this.fabricForm.patchValue(ft);
    this.showFabricDialog = true;
  }

  saveFabric(): void {
    if (this.fabricForm.invalid) return;
    this.isSavingFabric = true;
    const val = this.fabricForm.value;
    const isNew = !this.editingFabricType;
    const obs = isNew
      ? this.fabricTypesService.create(val)
      : this.fabricTypesService.update(this.editingFabricType!._id, val);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        if (isNew) {
          // Seed 15 default colors; show fabric colors panel after
          this.fabricColorsService.seedDefaults(saved._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: ({ created }) => {
                this.toast('success', 'Պահված', `Ավելացվեց ${created} կանխ. գույն`);
                this.showFabricDialog = false;
                this.isSavingFabric = false;
                this.loadAll();
                // Auto-expand colors panel for newly created fabric
                setTimeout(() => {
                  this.expandedFabricId = saved._id;
                  this.reloadColors(saved._id);
                }, 400);
              },
              error: () => {
                this.toast('warn', 'Պահված', 'Գործվածքը ստեղծվեց, բայց գույները չհաջողվեց ավելացնել');
                this.showFabricDialog = false;
                this.isSavingFabric = false;
                this.loadAll();
              },
            });
        } else {
          this.toast('success', 'Պահված', '');
          this.showFabricDialog = false;
          this.isSavingFabric = false;
          this.loadAll();
        }
      },
      error: () => { this.toast('error', 'Սխալ', 'Չհաջողվեց պահել'); this.isSavingFabric = false; },
    });
  }

  deleteFabric(ft: FabricType): void {
    this.confirmationService.confirm({
      message: `Ջնջե՞լ «${ft.nameArm}»: Կջնջվեն նաև գույները:`,
      header: 'Հաստատել ջնջումը',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fabricTypesService.delete(ft._id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => { this.toast('success', 'Ջնջված', ''); this.loadAll(); },
          error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց ջնջել'),
        });
      },
    });
  }

  toggleFabricActive(ft: FabricType): void {
    this.fabricTypesService.update(ft._id, { isActive: !ft.isActive })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.loadAll(),
        error: () => { this.toast('error', 'Սխալ', 'Չհաջողվեց թարմացնել'); this.loadAll(); },
      });
  }

  onFabricDialogHide(): void { this.isSavingFabric = false; }

  // ─── Colors ────────────────────────────────────────────────────────────────

  toggleFabricColors(ft: FabricType): void {
    if (this.expandedFabricId === ft._id) {
      this.expandedFabricId = null;
      return;
    }
    this.expandedFabricId = ft._id;
    if (!this.colorsByFabric[ft._id]) {
      this.reloadColors(ft._id);
    }
  }

  private reloadColors(fabricId: string): void {
    this.loadingColorsForFabric = fabricId;
    this.fabricColorsService.getByFabricAdmin(fabricId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (colors) => {
          this.colorsByFabric[fabricId] = colors;
          this.loadedFabricIds.add(fabricId);
          if (this.loadingColorsForFabric === fabricId) this.loadingColorsForFabric = null;
        },
        error: () => {
          this.colorsByFabric[fabricId] = [];
          this.loadedFabricIds.add(fabricId);
          if (this.loadingColorsForFabric === fabricId) this.loadingColorsForFabric = null;
        },
      });
  }

  getColors(fabricId: string): FabricColor[] {
    return this.colorsByFabric[fabricId] ?? [];
  }

  isColorsLoaded(fabricId: string): boolean {
    return this.loadedFabricIds.has(fabricId);
  }

  openAddColor(fabricTypeId: string): void {
    this.editingColor = null;
    this.colorDialogFabricId = fabricTypeId;
    this.colorForm.reset({ isActive: true });
    this.showColorDialog = true;
  }

  openEditColor(c: FabricColor): void {
    this.editingColor = c;
    this.colorDialogFabricId = c.fabricTypeId;
    this.colorForm.patchValue(c);
    this.showColorDialog = true;
  }

  saveColor(): void {
    if (this.colorForm.invalid) return;
    this.isSavingColor = true;
    const val = { ...this.colorForm.value, fabricTypeId: this.colorDialogFabricId };
    const obs = this.editingColor
      ? this.fabricColorsService.update(this.editingColor._id, val)
      : this.fabricColorsService.create(val);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast('success', 'Պահված', '');
        this.showColorDialog = false;
        this.isSavingColor = false;
        delete this.colorsByFabric[this.colorDialogFabricId];
        this.loadedFabricIds.delete(this.colorDialogFabricId);
        this.reloadColors(this.colorDialogFabricId);
      },
      error: (e) => {
        this.toast('error', 'Սխալ', e?.error?.message ?? 'Չհաջողվեց պահել');
        this.isSavingColor = false;
      },
    });
  }

  toggleColorActive(c: FabricColor): void {
    this.fabricColorsService.update(c._id, { isActive: !c.isActive })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          c.isActive = updated.isActive;
          // Update local cache in place
          const list = this.colorsByFabric[c.fabricTypeId];
          if (list) {
            const idx = list.findIndex(x => x._id === c._id);
            if (idx >= 0) list[idx] = { ...list[idx], isActive: updated.isActive };
          }
        },
        error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց թարմացնել'),
      });
  }

  deleteColor(c: FabricColor): void {
    this.confirmationService.confirm({
      message: `Ջնջե՞լ «${c.nameArm}» գույնը:`,
      header: 'Հաստատել',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.fabricColorsService.delete(c._id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.toast('success', 'Ջնջված', '');
            delete this.colorsByFabric[c.fabricTypeId];
            this.loadedFabricIds.delete(c.fabricTypeId);
            this.reloadColors(c.fabricTypeId);
          },
          error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց ջնջել'),
        });
      },
    });
  }

  onColorDialogHide(): void { this.isSavingColor = false; }

  // ─── Supplier CRUD (dialogs — global master data) ──────────────────────────

  openAddSupplier(): void {
    this.editingSupplier = null;
    this.supplierForm.reset({ isActive: true });
    this.showSupplierDialog = true;
  }

  openEditSupplier(s: Supplier): void {
    this.editingSupplier = s;
    this.supplierForm.patchValue(s);
    this.showSupplierDialog = true;
  }

  saveSupplier(): void {
    if (this.supplierForm.invalid) return;
    this.isSavingSupplier = true;
    const val = this.supplierForm.value;
    const obs = this.editingSupplier
      ? this.suppliersService.update(this.editingSupplier._id, val)
      : this.suppliersService.create(val);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast('success', 'Պահված', '');
        this.showSupplierDialog = false;
        this.isSavingSupplier = false;
        this.loadAll();
      },
      error: () => { this.toast('error', 'Սխալ', 'Չհաջողվեց պահել'); this.isSavingSupplier = false; },
    });
  }

  toggleSupplierActive(s: Supplier): void {
    this.suppliersService.update(s._id, { isActive: !s.isActive })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.loadAll(),
        error: () => { this.toast('error', 'Սխալ', 'Չհաջողվեց թարմացնել'); this.loadAll(); },
      });
  }

  deleteSupplier(s: Supplier): void {
    this.confirmationService.confirm({
      message: `Ջնջե՞լ «${s.name}» մատակարարը:`,
      header: 'Հաստատել',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.suppliersService.delete(s._id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => { this.toast('success', 'Ջնջված', ''); this.loadAll(); },
          error: () => this.toast('error', 'Սխալ', 'Չհաջողվեց ջնջել'),
        });
      },
    });
  }

  onSupplierDialogHide(): void { this.isSavingSupplier = false; }

  // ─── Global Settings ───────────────────────────────────────────────────────

  saveSettings(): void {
    if (this.settingsForm.invalid) return;
    this.isSettingsSaving = true;
    this.globalSettingsService.update(this.settingsForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (s) => {
          this.globalSettings = s;
          this.toast('success', 'Պահված', 'Կարգավորումները պահված են');
          this.isSettingsSaving = false;
        },
        error: () => { this.toast('error', 'Սխալ', 'Չհաջողվեց պահել'); this.isSettingsSaving = false; },
      });
  }

  // ─── Misc ──────────────────────────────────────────────────────────────────

  getFabricUsageLabel(ft: FabricType): string {
    return ft.isActive ? 'Ակտիվ' : 'Ոչ ակտիվ';
  }

  trackById = (_: number, item: { _id: string }) => item._id;
  trackByRowRef = (_: number, row: object) => row;

  private toast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
