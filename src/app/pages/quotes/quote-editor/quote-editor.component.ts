import {
  Component, OnInit, OnDestroy,
  inject, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormsModule, ReactiveFormsModule, FormBuilder,
  FormGroup, FormArray, Validators, AbstractControl,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { ToggleButtonModule } from 'primeng/togglebutton';

import { QuoteService, Quote, UpdateQuoteDto } from '../../../services/quote.service';
import { AuthService } from '../../../services/auth.service';
import { DealsService, Deal } from '../../../services/deals.service';
import { CustomersService } from '../../../services/customers.service';
import { ClothTypesService, ClothType } from '../../../services/cloth-types.service';
import { FabricTypesService, FabricType } from '../../../services/fabric-types.service';
import { FabricColorsService, FabricColor } from '../../../services/fabric-colors.service';
import { GlobalSettingsService, GlobalSettings } from '../../../services/global-settings.service';
import { Customer, ContactPerson } from '../../../models/customer.model';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const LOGO_POSITIONS = [
  'Left chest', 'Right chest', 'Center chest',
  'Back (top)', 'Back (center)', 'Sleeve', 'Neck label', 'Other',
];
const LOGO_SIZES = [
  '5×5 cm', '8×8 cm', '10×10 cm', '12×5 cm', '15×5 cm',
  '20×10 cm', '30×10 cm', 'Other',
];

@Component({
  selector: 'app-quote-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    Select,
    DatePicker,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    SkeletonModule,
    DialogModule,
    ToggleButtonModule,
  ],
  templateUrl: './quote-editor.component.html',
  styleUrl: './quote-editor.component.scss',
})
export class QuoteEditorComponent implements OnInit, OnDestroy {
  private readonly route              = inject(ActivatedRoute);
  private readonly router             = inject(Router);
  private readonly quoteService       = inject(QuoteService);
  private readonly authService        = inject(AuthService);
  private readonly dealsService       = inject(DealsService);
  private readonly customersService   = inject(CustomersService);
  private readonly clothTypesService  = inject(ClothTypesService);
  private readonly fabricTypesService = inject(FabricTypesService);
  private readonly fabricColorsService= inject(FabricColorsService);
  private readonly settingsService    = inject(GlobalSettingsService);
  private readonly fb                 = inject(FormBuilder);
  private readonly cdr                = inject(ChangeDetectorRef);
  private readonly confirm            = inject(ConfirmationService);
  private readonly toast              = inject(MessageService);
  readonly translate                  = inject(TranslateService);

  private readonly destroy$ = new Subject<void>();

  loading  = signal(true);
  saving   = signal(false);
  saved    = signal(false);
  quote    = signal<Quote | null>(null);
  isNew    = signal(false);

  deal     = signal<Deal | null>(null);
  customer = signal<Customer | null>(null);
  settings = signal<GlobalSettings | null>(null);

  clothTypes        = signal<ClothType[]>([]);
  fabricTypes       = signal<FabricType[]>([]);
  fabricColorCache  = new Map<string, FabricColor[]>();
  itemColors        = signal<{ label: string; value: string }[][]>([]);

  readonly isAdmin  = computed(() => this.authService.getCurrentUser()?.role === 'admin');
  readonly editable = computed(() => {
    const s = this.quote()?.status;
    return s === 'draft' || s == null;
  });

  form!: FormGroup;

  readonly SIZES = SIZES;
  readonly logoPositions = LOGO_POSITIONS;
  readonly logoSizes = LOGO_SIZES;

  // Per-item "other" text overrides
  logoPositionOther: string[] = [];
  logoSizeOther:     string[] = [];

  get languageOptions() {
    return [
      { label: this.t('quotes.editor.field.armenian'), value: 'hy' },
      { label: this.t('quotes.editor.field.english'),  value: 'en' },
    ];
  }

  get paymentOptions() {
    return [
      { label: this.t('quotes.editor.field.cash'),    value: 'cash' },
      { label: this.t('quotes.editor.field.invoice'), value: 'invoice' },
    ];
  }

  discountTypeOptions = [
    { label: '%', value: 'percent' },
    { label: '֏', value: 'amount' },
  ];

  get decorationOptions() {
    const lang = this.form?.get('language')?.value ?? 'hy';
    return [
      { label: lang === 'hy' ? 'Silkscreen'       : 'Screen print',  value: 'silkscreen' },
      { label: lang === 'hy' ? 'Embroidery'        : 'Embroidery',    value: 'embroidery' },
      { label: lang === 'hy' ? 'DTG print'         : 'DTG print',     value: 'dtg' },
      { label: lang === 'hy' ? 'Heat transfer'     : 'Heat transfer', value: 'heat_transfer' },
      { label: lang === 'hy' ? 'None'              : 'None',          value: 'none' },
    ];
  }

  subtotal    = signal(0);
  discountAmt = signal(0);
  total       = signal(0);

  showMarkSentDialog = false;
  converting = signal(false);

  get contacts(): ContactPerson[] {
    return this.customer()?.contacts ?? [];
  }

  get contactOptions() {
    return [
      ...this.contacts.map(c => ({
        label: c.contactPerson + (c.position ? ` (${c.position})` : ''),
        value: c.contactPerson,
      })),
    ];
  }

  get settingsHaveNoSalesDefaults(): boolean {
    const s = this.settings();
    if (!s) return false;
    return !s.quoteDefaultLeadTimeDays &&
           !s.quoteDefaultDeliveryTerms &&
           !s.quoteDefaultTermsText &&
           !s.quoteDefaultPrepaymentPercent &&
           !s.quoteDefaultValidityDays;
  }

    ngOnInit() {
    this.loadDropdownData();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') {
      this.isNew.set(true);
      this.settingsService.get().subscribe({
        next: s => {
          this.settings.set(s);
          this.buildForm(null);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.buildForm(null);
          this.loading.set(false);
        },
      });
      return;
    }

    this.quoteService.findOne(id).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.buildForm(q);
        this.loading.set(false);
        this.recalc();
        this.loadRelatedEntities(q);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/quotes']);
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDropdownData() {
    this.clothTypesService.getActive().subscribe(t => { this.clothTypes.set(t); this.cdr.markForCheck(); });
    this.fabricTypesService.getActive().subscribe(t => { this.fabricTypes.set(t); this.cdr.markForCheck(); });
  }

  private loadRelatedEntities(q: Quote) {
    if (q.dealId) {
      this.dealsService.getById(q.dealId).subscribe(d => { this.deal.set(d); this.cdr.markForCheck(); });
    }
    if (q.customerId) {
      this.customersService.getById(q.customerId).subscribe(c => {
        this.customer.set(c);
        this.cdr.markForCheck();
      });
    }
  }

  private buildForm(q: Quote | null) {
    const s = this.settings();
    this.form = this.fb.group({
      language:              [q?.language     ?? 'hy'],
      issueDate:             [q?.issueDate    ? new Date(q.issueDate)  : new Date()],
      validUntil:            [q?.validUntil   ? new Date(q.validUntil) : this.defaultValidUntil(s)],
      paymentType:           [q?.paymentType  ?? 'cash'],
      prepaymentPercent:     [q?.prepaymentPercent     ?? (s?.quoteDefaultPrepaymentPercent ?? 50)],
      productionLeadTimeDays:[q?.productionLeadTimeDays ?? (s?.quoteDefaultLeadTimeDays ?? null)],
      deliveryTerms:         [q?.deliveryTerms ?? (s?.quoteDefaultDeliveryTerms ?? '')],
      contactPersonId:       [q?.contactPersonId ?? null],
      discountType:          [q?.discountType  ?? 'percent'],
      discountValue:         [q?.discountValue ?? 0, [Validators.min(0)]],
      notes:                 [q?.notes        ?? ''],
      termsText:             [q?.termsText    ?? (s?.quoteDefaultTermsText ?? '')],
      items: this.fb.array(
        (q?.items ?? []).map((it, idx) => this.buildItemGroup(it, idx))
      ),
    });

    // Autosave debounced
    this.form.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(900),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ).subscribe(() => {
      this.recalc();
      if (this.quote()?._id && this.editable()) this.autoSave();
    });
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recalc());

    const initLen = q?.items?.length ?? 0;
    this.itemColors.set(Array.from({ length: initLen }, () => []));
    this.logoPositionOther = Array.from({ length: initLen }, (_, i) => {
      const v = q?.items[i]?.logoPosition ?? '';
      return LOGO_POSITIONS.includes(v) ? '' : v;
    });
    this.logoSizeOther = Array.from({ length: initLen }, (_, i) => {
      const v = q?.items[i]?.logoSize ?? '';
      return LOGO_SIZES.includes(v) ? '' : v;
    });

    if (q?.items) {
      q.items.forEach((it, idx) => {
        if (it.fabricId) this.loadColorsForItem(it.fabricId, idx);
      });
    }
  }

  private defaultValidUntil(s: GlobalSettings | null): Date {
    const days = s?.quoteDefaultValidityDays ?? 14;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  private buildItemGroup(it?: Partial<Quote['items'][0]>, idx = 0) {
    const logoPos = it?.logoPosition ?? '';
    const logoSz  = it?.logoSize ?? '';
    return this.fb.group({
      itemId:              [it?.itemId ?? crypto.randomUUID()],
      garmentTypeId:       [it?.garmentTypeId   ?? null],
      garmentTypeName:     [it?.garmentTypeName  ?? ''],
      fabricId:            [it?.fabricId         ?? null],
      fabricName:          [it?.fabricName        ?? ''],
      colorId:             [it?.colorId           ?? null],
      colorName:           [it?.colorName          ?? ''],
      description:         [it?.description       ?? '', Validators.required],
      decorationMethod:    [it?.decorationMethod  ?? null],
      logoPosition:        [LOGO_POSITIONS.includes(logoPos) ? logoPos : (logoPos ? 'Other' : '')],
      logoSize:            [LOGO_SIZES.includes(logoSz) ? logoSz : (logoSz ? 'Other' : '')],
      quantity:            [it?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      unitPrice:           [it?.unitPrice ?? 0,  [Validators.required, Validators.min(0)]],
      lineDiscountPercent: [it?.lineDiscountPercent ?? 0],
      estimatedUnitCost:   [it?.estimatedUnitCost   ?? null],
      sortOrder:           [it?.sortOrder           ?? idx],
      sizeBreakdownEnabled:[!!(it?.sizeBreakdown && Object.keys(it.sizeBreakdown).length > 0)],
      sizeBreakdown:       this.fb.group(this.buildSizeBreakdownGroup(it?.sizeBreakdown)),
    });
  }

  private buildSizeBreakdownGroup(sb?: Record<string, any>) {
    const group: Record<string, any> = {};
    for (const size of SIZES) {
      group[`m_${size}`] = [sb?.[`m_${size}`] ?? null];
      group[`f_${size}`] = [sb?.[`f_${size}`] ?? null];
    }
    return group;
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  addItem() {
    const idx = this.items.length;
    this.items.push(this.buildItemGroup(undefined, idx));
    this.itemColors.update(arr => [...arr, []]);
    this.logoPositionOther.push('');
    this.logoSizeOther.push('');
    this.recalc();
  }

  removeItem(i: number) {
    this.items.removeAt(i);
    this.itemColors.update(arr => arr.filter((_, j) => j !== i));
    this.logoPositionOther.splice(i, 1);
    this.logoSizeOther.splice(i, 1);
    this.recalc();
  }

  onGarmentTypeChange(typeId: string | null, idx: number) {
    if (!typeId) {
      this.items.at(idx).patchValue({ garmentTypeName: '', fabricId: null, fabricName: '', colorId: null, colorName: '' }, { emitEvent: false });
      this.updateDescription(idx);
      return;
    }
    const type = this.clothTypes().find(t => t._id === typeId);
    this.items.at(idx).patchValue({
      garmentTypeName: type ? (type.nameArm || type.nameEng) : '',
      fabricId: null, fabricName: '', colorId: null, colorName: '',
    }, { emitEvent: false });
    this.itemColors.update(arr => { const c = [...arr]; c[idx] = []; return c; });
    this.updateDescription(idx);
    this.cdr.markForCheck();
  }

  onFabricChange(fabricId: string | null, idx: number) {
    if (!fabricId) {
      this.items.at(idx).patchValue({ fabricName: '', colorId: null, colorName: '' }, { emitEvent: false });
      this.updateDescription(idx);
      return;
    }
    const fabric = this.fabricTypes().find(f => f._id === fabricId);
    this.items.at(idx).patchValue({
      fabricName: fabric ? (fabric.nameArm || fabric.nameEng) : '',
      colorId: null, colorName: '',
    }, { emitEvent: false });
    this.loadColorsForItem(fabricId, idx);
    this.updateDescription(idx);
  }

  private loadColorsForItem(fabricId: string, idx: number) {
    if (this.fabricColorCache.has(fabricId)) {
      this.setItemColors(idx, this.fabricColorCache.get(fabricId)!);
    } else {
      this.fabricColorsService.getByFabric(fabricId).subscribe(colors => {
        this.fabricColorCache.set(fabricId, colors);
        this.setItemColors(idx, colors);
        this.cdr.markForCheck();
      });
    }
  }

  onColorChange(colorId: string | null, idx: number) {
    if (!colorId) {
      this.items.at(idx).patchValue({ colorName: '' }, { emitEvent: false });
      this.updateDescription(idx);
      return;
    }
    const fabricId = this.items.at(idx).get('fabricId')?.value;
    const colors = fabricId ? (this.fabricColorCache.get(fabricId) ?? []) : [];
    const color = colors.find(c => c._id === colorId);
    this.items.at(idx).patchValue({
      colorName: color ? (color.nameArm || color.nameEng || '') : '',
    }, { emitEvent: false });
    this.updateDescription(idx);
  }

  onDecorationChange(idx: number) {
    this.updateDescription(idx);
  }

  private setItemColors(idx: number, colors: FabricColor[]) {
    const opts = colors.map(c => ({ label: c.nameArm || c.nameEng || c._id, value: c._id }));
    this.itemColors.update(arr => { const c = [...arr]; c[idx] = opts; return c; });
  }

  private updateDescription(idx: number) {
    const ctrl = this.items.at(idx);
    const lang = this.form.get('language')?.value ?? 'hy';

    const garment  = ctrl.get('garmentTypeName')?.value || '';
    const fabric   = ctrl.get('fabricName')?.value || '';
    const color    = ctrl.get('colorName')?.value || '';
    const decoVal  = ctrl.get('decorationMethod')?.value || '';
    const decoLabel = decoVal ? this.getDecoLabel(decoVal, lang) : '';

    const parts = [garment, fabric, color, decoLabel].filter(Boolean);
    if (parts.length) {
      const desc = parts.join(', ').replace(/  +/g, ' ').trim();
      ctrl.patchValue({ description: desc }, { emitEvent: false });
    }
  }

  private getDecoLabel(val: string, lang: string): string {
    const opt = this.decorationOptions.find(o => o.value === val);
    return opt?.label ?? val;
  }

  clothTypeOptions() {
    return this.clothTypes().map(t => ({ label: t.nameArm || t.nameEng, value: t._id }));
  }

  fabricTypeOptions() {
    return this.fabricTypes().map(f => ({ label: f.nameArm || f.nameEng, value: f._id }));
  }

  logoPositionOptions() {
    return LOGO_POSITIONS.map(p => ({ label: p, value: p }));
  }

  logoSizeOptions() {
    return LOGO_SIZES.map(s => ({ label: s, value: s }));
  }

  isLogoPositionOther(idx: number): boolean {
    return this.items.at(idx).get('logoPosition')?.value === 'Other';
  }
  isLogoSizeOther(idx: number): boolean {
    return this.items.at(idx).get('logoSize')?.value === 'Other';
  }

  // Size breakdown helpers
  sizeBreakdownEnabled(idx: number): boolean {
    return !!this.items.at(idx).get('sizeBreakdownEnabled')?.value;
  }

  toggleSizeBreakdown(idx: number, enabled: boolean | undefined) {
    const val = !!enabled;
    this.items.at(idx).patchValue({ sizeBreakdownEnabled: val }, { emitEvent: false });
    if (!val) {
      this.items.at(idx).patchValue({ quantity: 1 }, { emitEvent: false });
    }
    this.recalc();
    this.cdr.markForCheck();
  }

  getSizeBreakdownQty(idx: number): number {
    const sb = this.items.at(idx).get('sizeBreakdown')?.value ?? {};
    return Object.values(sb).reduce((s: number, v) => s + (Number(v) || 0), 0);
  }

  getMaleQty(idx: number): number {
    const sb = this.items.at(idx).get('sizeBreakdown')?.value ?? {};
    return SIZES.reduce((s, sz) => s + (Number(sb[`m_${sz}`]) || 0), 0);
  }

  getFemaleQty(idx: number): number {
    const sb = this.items.at(idx).get('sizeBreakdown')?.value ?? {};
    return SIZES.reduce((s, sz) => s + (Number(sb[`f_${sz}`]) || 0), 0);
  }

  getSizeControl(idx: number, key: string): AbstractControl {
    return (this.items.at(idx).get('sizeBreakdown') as FormGroup).get(key)!;
  }

  recalc() {
    if (!this.form) return;
    const vals = this.form.getRawValue();
    let sub = 0;
    for (const it of vals.items) {
      const qty = it.sizeBreakdownEnabled
        ? Object.values(it.sizeBreakdown ?? {}).reduce((s: number, v) => s + (Number(v) || 0), 0)
        : (Number(it.quantity) || 0);
      const base = qty * (Number(it.unitPrice) || 0);
      const disc = it.lineDiscountPercent ? base * it.lineDiscountPercent / 100 : 0;
      sub += base - disc;
    }
    let discAmt = 0;
    if (vals.discountType === 'percent') discAmt = sub * (vals.discountValue ?? 0) / 100;
    else discAmt = vals.discountValue ?? 0;
    this.subtotal.set(sub);
    this.discountAmt.set(discAmt);
    this.total.set(sub - discAmt);
  }

  calcItemTotalByIndex(idx: number): number {
    if (!this.form) return 0;
    const v = (this.items.at(idx) as FormGroup).getRawValue();
    const qty = v.sizeBreakdownEnabled
      ? Object.values(v.sizeBreakdown ?? {}).reduce((s: number, x) => s + (Number(x) || 0), 0)
      : (Number(v.quantity) || 0);
    const base = (Number(v.unitPrice) || 0) * qty;
    const disc = v.lineDiscountPercent ? base * v.lineDiscountPercent / 100 : 0;
    return base - disc;
  }

  getItemEstimatedCost(idx: number): string {
    const v = (this.items.at(idx) as FormGroup).getRawValue();
    const costPerUnit = Number(v.estimatedUnitCost);
    if (!costPerUnit) return '';
    const qty = v.sizeBreakdownEnabled
      ? Object.values(v.sizeBreakdown ?? {}).reduce((s: number, x) => s + (Number(x) || 0), 0)
      : (Number(v.quantity) || 0);
    return this.formatAmt(costPerUnit * qty);
  }

  get estimatedTotalCost(): number {
    if (!this.form) return 0;
    return this.form.getRawValue().items.reduce((sum: number, it: any) => {
      const qty = it.sizeBreakdownEnabled
        ? Object.values(it.sizeBreakdown ?? {}).reduce((s: number, v) => s + (Number(v) || 0), 0)
        : (it.quantity ?? 0);
      return sum + (it.estimatedUnitCost ?? 0) * qty;
    }, 0);
  }

  get estimatedMargin(): number { return this.total() - this.estimatedTotalCost; }
  get estimatedMarginPercent(): number {
    return this.total() > 0 ? (this.estimatedMargin / this.total()) * 100 : 0;
  }

  private autoSave() {
    const id = this.quote()?._id;
    if (!id) return;
    this.saving.set(true);
    this.quoteService.update(id, this.buildDto()).subscribe({
      next: (updated) => {
        this.quote.set(updated);
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => { this.saved.set(false); this.cdr.markForCheck(); }, 2000);
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); this.cdr.markForCheck(); },
    });
  }

  save() {
    if (this.form.invalid) return;
    const id = this.quote()?._id;
    if (!id) return;
    this.saving.set(true);
    this.quoteService.update(id, this.buildDto()).subscribe({
      next: (updated) => {
        this.quote.set(updated);
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', life: 2000 });
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Save failed', life: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  private buildDto(): UpdateQuoteDto {
    const vals = this.form.getRawValue();
    const items = vals.items.map((it: any, idx: number) => {
      const qty = it.sizeBreakdownEnabled
        ? Object.values(it.sizeBreakdown ?? {}).reduce((s: number, v) => s + (Number(v) || 0), 0)
        : (it.quantity ?? 0);

      // Resolve "Other" logo fields back to free-text
      const logoPosition = it.logoPosition === 'Other'
        ? (this.logoPositionOther[idx] || '') : (it.logoPosition || '');
      const logoSize = it.logoSize === 'Other'
        ? (this.logoSizeOther[idx] || '') : (it.logoSize || '');

      const base: any = {
        itemId:              it.itemId,
        garmentTypeId:       it.garmentTypeId || undefined,
        garmentTypeName:     it.garmentTypeName || undefined,
        fabricId:            it.fabricId || undefined,
        fabricName:          it.fabricName || undefined,
        colorId:             it.colorId || undefined,
        colorName:           it.colorName || undefined,
        description:         it.description,
        decorationMethod:    it.decorationMethod || undefined,
        logoPosition:        logoPosition || undefined,
        logoSize:            logoSize || undefined,
        quantity:            qty,
        unitPrice:           it.unitPrice ?? 0,
        lineDiscountPercent: it.lineDiscountPercent || undefined,
        sortOrder:           idx,
        lineTotal:           this.calcLineTotal(qty, it.unitPrice ?? 0, it.lineDiscountPercent ?? 0),
        sizeBreakdown:       it.sizeBreakdownEnabled ? this.compactSizeBreakdown(it.sizeBreakdown) : undefined,
      };
      if (this.isAdmin()) {
        base.estimatedUnitCost = it.estimatedUnitCost ?? undefined;
      }
      return base;
    });

    return {
      language:               vals.language,
      contactPersonId:        vals.contactPersonId || undefined,
      issueDate:              vals.issueDate ? (vals.issueDate as Date).toISOString() : undefined,
      validUntil:             vals.validUntil ? (vals.validUntil as Date).toISOString() : undefined,
      paymentType:            vals.paymentType,
      prepaymentPercent:      vals.prepaymentPercent,
      productionLeadTimeDays: vals.productionLeadTimeDays ?? undefined,
      deliveryTerms:          vals.deliveryTerms || undefined,
      discountType:           vals.discountType,
      discountValue:          vals.discountValue ?? 0,
      notes:                  vals.notes || undefined,
      termsText:              vals.termsText || undefined,
      items,
    } as any;
  }

  private calcLineTotal(qty: number, unitPrice: number, discPct: number): number {
    const base = qty * unitPrice;
    return base - (discPct ? base * discPct / 100 : 0);
  }

  private compactSizeBreakdown(sb: Record<string, any>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(sb)) {
      if (Number(v) > 0) out[k] = Number(v);
    }
    return out;
  }

  markAsSent() {
    const id = this.quote()?._id;
    if (!id) return;
    this.showMarkSentDialog = false;
    this.quoteService.send(id).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.toast.add({ severity: 'success', summary: 'Marked as sent', life: 2000 });
        this.cdr.markForCheck();
      },
      error: () => { this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }); this.cdr.markForCheck(); },
    });
  }

  newVersion() {
    const id = this.quote()?._id;
    if (!id) return;
    this.quoteService.createNewVersion(id).subscribe({
      next: (q) => {
        this.toast.add({ severity: 'success', summary: 'New version created', life: 2000 });
        this.router.navigate(['/quotes', q._id]);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed';
        this.toast.add({ severity: 'error', summary: msg, life: 4000 });
      },
    });
  }

  previewPdf() {
    const id = this.quote()?._id;
    if (!id) return;
    const lang = this.form.get('language')?.value ?? 'hy';
    this.quoteService.downloadPdf(id, lang).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
  }

  downloadPdf(lang: 'hy' | 'en') {
    const id = this.quote()?._id;
    if (!id) return;
    this.quoteService.downloadPdf(id, lang).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${this.quote()!.number}-v${this.quote()!.version}-${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  statusSeverity(status: Quote['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, any> = {
      draft: 'secondary', sent: 'info', accepted: 'success',
      rejected: 'danger', expired: 'warn', superseded: 'contrast',
    };
    return map[status] ?? 'secondary';
  }

  formatAmt(n: number): string {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ֏';
  }

  t(key: string): string { return this.translate.instant(key); }

  get dealTitle(): string { return this.deal()?.title ?? ''; }
  get customerName(): string {
    const c = this.customer();
    return c ? c.companyName : (this.quote()?.customerName ?? '');
  }
  get customerId(): string {
    return this.customer()?._id ?? this.quote()?.customerId ?? '';
  }
  get dealLink(): string[] {
    const d = this.deal();
    return d ? ['/pipeline', d._id] : [];
  }
  get customerLink(): string[] {
    const id = this.customerId;
    return id ? ['/crm', id] : [];
  }

  goBack() { this.router.navigate(['/quotes']); }

  get canConvert(): boolean {
    const q = this.quote();
    if (!q) return false;
    if (q.convertedOrderId) return false;
    return q.status === 'sent' || q.status === 'accepted';
  }

  get convertLabel(): string {
    return this.quote()?.status === 'sent'
      ? this.t('quotes.editor.acceptAndCreateOrder')
      : this.t('quotes.editor.createOrder');
  }

  convertToOrder() {
    const id = this.quote()?._id;
    if (!id || this.converting()) return;
    this.converting.set(true);
    this.quoteService.convertToOrder(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.converting.set(false);
        this.quote.set(res.quote);
        this.toast.add({ severity: 'success', summary: this.t('quotes.editor.orderCreated'), life: 3000 });
        this.cdr.markForCheck();
        // Navigate to the order in orders management
        const orderId = res.order?._id ?? res.order?.id;
        if (orderId) {
          this.router.navigate(['/orders-management'], { queryParams: { orderId } });
        }
      },
      error: (err) => {
        this.converting.set(false);
        const msg = err?.error?.message ?? this.t('quotes.editor.orderCreateFailed');
        this.toast.add({ severity: 'error', summary: msg, life: 5000 });
        this.cdr.markForCheck();
      },
    });
  }
}
