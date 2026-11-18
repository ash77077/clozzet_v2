import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePicker } from 'primeng/datepicker';
import { ChipModule } from 'primeng/chip';
import { MessageService, ConfirmationService } from 'primeng/api';

// CDK drag drop
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

// i18n
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// Services / models
import { DealsService, Deal, DealSource, DealNextStepType, CreateDealPayload } from '../../services/deals.service';
import { QuoteService, Quote } from '../../services/quote.service';
import { PipelineStagesService, PipelineStage } from '../../services/pipeline-stages.service';
import { LostReasonsService, LostReason } from '../../services/lost-reasons.service';
import { CustomersService } from '../../services/customers.service';
import { Customer, ContactPerson } from '../../models/customer.model';
import { UsersService, User as AppUser } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';

// Child
import { DealDetailComponent } from './deal-detail/deal-detail.component';

interface StageColumn {
  stage: PipelineStage;
  deals: Deal[];
  count: number;
  totalValue: number;
  weightedValue: number;
}

const SOURCE_OPTIONS: { label: string; value: DealSource }[] = [
  { label: 'pipeline.source.inbound_call', value: 'inbound_call' },
  { label: 'pipeline.source.website', value: 'website' },
  { label: 'pipeline.source.instagram', value: 'instagram' },
  { label: 'pipeline.source.facebook', value: 'facebook' },
  { label: 'pipeline.source.linkedin', value: 'linkedin' },
  { label: 'pipeline.source.referral', value: 'referral' },
  { label: 'pipeline.source.cold_call', value: 'cold_call' },
  { label: 'pipeline.source.expo', value: 'expo' },
  { label: 'pipeline.source.existing_customer', value: 'existing_customer' },
  { label: 'pipeline.source.other', value: 'other' },
];

const NEXT_STEP_TYPE_OPTIONS: { label: string; value: DealNextStepType }[] = [
  { label: 'pipeline.stepType.call', value: 'call' },
  { label: 'pipeline.stepType.email', value: 'email' },
  { label: 'pipeline.stepType.whatsapp', value: 'whatsapp' },
  { label: 'pipeline.stepType.meeting', value: 'meeting' },
  { label: 'pipeline.stepType.send_sample', value: 'send_sample' },
  { label: 'pipeline.stepType.send_quote', value: 'send_quote' },
  { label: 'pipeline.stepType.other', value: 'other' },
];

type ViewMode = 'board' | 'table';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    Select,
    MultiSelectModule,
    ToggleSwitch,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    TagModule,
    TooltipModule,
    DatePicker,
    ChipModule,
    DragDropModule,
    TranslateModule,
    DealDetailComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './pipeline.component.html',
  styleUrl: './pipeline.component.scss',
})
export class PipelineComponent implements OnInit, OnDestroy {
  private readonly dealsService = inject(DealsService);
  private readonly quoteService = inject(QuoteService);
  private readonly stagesService = inject(PipelineStagesService);
  private readonly lostReasonsService = inject(LostReasonsService);
  private readonly customersService = inject(CustomersService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  private destroy$ = new Subject<void>();

  // ─── Signals state ────────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly deals = signal<Deal[]>([]);
  readonly stages = signal<PipelineStage[]>([]);
  readonly lostReasons = signal<LostReason[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly users = signal<AppUser[]>([]);
  readonly viewMode = signal<ViewMode>('board');

  // ─── Filters (signals) ────────────────────────────────────────────────────
  readonly ownerFilter = signal<string | null>(null); // null=my, 'all'=all users, or userId
  readonly sourceFilter = signal<DealSource[]>([]);
  readonly overdueOnly = signal<boolean>(false);
  readonly searchText = signal<string>('');

  // Column connect list (populated from stages)
  connectedDropLists = computed(() => this.stages().map(s => `stage-${s.key}`));

  // ─── Options ──────────────────────────────────────────────────────────────
  readonly sourceOptions = SOURCE_OPTIONS;
  readonly nextStepTypeOptions = NEXT_STEP_TYPE_OPTIONS;

  // ─── Current user ─────────────────────────────────────────────────────────
  get currentUser() {
    return this.authService.getCurrentUser();
  }
  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // ─── Derived: filtered deals ──────────────────────────────────────────────
  readonly filteredDeals = computed(() => {
    const all = this.deals();
    const owner = this.ownerFilter();
    const sources = this.sourceFilter();
    const overdue = this.overdueOnly();
    const search = this.searchText().trim().toLowerCase();
    const now = Date.now();

    const me = this.currentUser?.id;

    return all.filter(d => {
      // Owner filter
      const ownerId = this.ownerId(d);
      if (owner === 'all') {
        // no filter
      } else if (owner && owner !== 'all') {
        if (ownerId !== owner) return false;
      } else {
        // null = my deals
        if (me && ownerId !== me) return false;
      }

      // Source filter
      if (sources.length > 0) {
        if (!d.source || !sources.includes(d.source)) return false;
      }

      // Overdue
      if (overdue) {
        if (!d.nextStepDate) return false;
        if (new Date(d.nextStepDate).getTime() >= now) return false;
      }

      // Search
      if (search) {
        const company = this.companyName(d).toLowerCase();
        const title = (d.title || '').toLowerCase();
        if (!company.includes(search) && !title.includes(search)) return false;
      }

      return true;
    });
  });

  // ─── Derived: columns for Kanban ──────────────────────────────────────────
  readonly columns = computed<StageColumn[]>(() => {
    const stages = [...this.stages()].sort((a, b) => a.order - b.order);
    const deals = this.filteredDeals();
    return stages.map(stage => {
      const stageDeals = deals.filter(d => d.stageKey === stage.key);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
      const weightedValue = stageDeals.reduce(
        (sum, d) => sum + ((d.estimatedValue || 0) * (d.probability || 0)) / 100,
        0,
      );
      return {
        stage,
        deals: stageDeals,
        count: stageDeals.length,
        totalValue,
        weightedValue,
      };
    });
  });

  readonly openColumns = computed(() => this.columns().filter(c => c.stage.type === 'open'));
  readonly wonColumn = computed(() => this.columns().find(c => c.stage.type === 'won') || null);
  readonly lostColumn = computed(() => this.columns().find(c => c.stage.type === 'lost') || null);

  // ─── Owner options dropdown ───────────────────────────────────────────────
  readonly ownerOptions = computed(() => {
    const opts: { label: string; value: string | null }[] = [
      { label: this.translate.instant('pipeline.filters.myDeals'), value: null },
    ];
    if (this.isAdmin) {
      opts.push({ label: this.translate.instant('pipeline.filters.allDeals'), value: 'all' });
      for (const u of this.users()) {
        opts.push({ label: `${u.firstName} ${u.lastName}`, value: u._id! });
      }
    }
    return opts;
  });

  // Stages that require a sent quote before entry
  private readonly QUOTE_REQUIRED_STAGES = new Set(['quote_sent', 'negotiation', 'won']);
  // Cache: dealId → quotes (populated lazily when needed for validation)
  private dealQuotesCache = new Map<string, Quote[]>();

  // ─── New Deal dialog ──────────────────────────────────────────────────────
  showNewDealDialog = false;
  newDealForm!: FormGroup;
  newDealStageId: string | null = null;
  isSavingDeal = false;
  contactPersonOptions: { label: string; value: string }[] = [];

  // ─── Lost dialog ──────────────────────────────────────────────────────────
  showLostDialog = false;
  lostForm!: FormGroup;
  lostTargetDealId: string | null = null;
  isSavingLost = false;
  lostReasonOptions: { label: string; value: string; requiresComment: boolean }[] = [];
  selectedLostRequiresComment = false;

  // ─── Detail drawer ────────────────────────────────────────────────────────
  showDetailDrawer = false;
  selectedDeal: Deal | null = null;

  ngOnInit(): void {
    this.initializeForms();
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.newDealForm = this.fb.group({
      title:              ['', [Validators.required, Validators.minLength(2)]],
      customerId:         [null, Validators.required],
      contactPersonId:    [null],
      estimatedValue:     [null],
      expectedCloseDate:  [null],
      source:             [null],
      nextStepType:       [null],
      nextStepDate:       [null, Validators.required],
      nextStepNote:       [''],
    });

    this.lostForm = this.fb.group({
      lostReasonId: [null, Validators.required],
      lostComment:  [''],
    });
  }

  private loadAll(): void {
    this.isLoading.set(true);
    forkJoin({
      deals:        this.dealsService.getAll({ isDeleted: false }),
      stages:       this.stagesService.getAll(),
      lostReasons:  this.lostReasonsService.getAll(),
      customers:    this.customersService.getAll(),
      users:        this.usersService.getAllUsers(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.deals.set(data.deals);
          this.stages.set(data.stages.filter(s => s.isActive));
          this.lostReasons.set(data.lostReasons.filter(r => r.isActive));
          this.customers.set(data.customers);
          this.users.set(data.users.filter(u => u.isActive && (u.role === 'admin' || u.role === 'manager')));
          this.lostReasonOptions = this.lostReasons().map(r => ({
            label: this.translate.currentLang === 'am' ? r.nameHy : r.nameEn,
            value: r._id,
            requiresComment: r.requiresComment,
          }));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: 'Failed to load pipeline data',
          });
        },
      });
  }

  // ─── Helpers to resolve populated fields ──────────────────────────────────
  ownerId(deal: Deal): string {
    return typeof deal.ownerId === 'string' ? deal.ownerId : deal.ownerId?._id;
  }
  ownerName(deal: Deal): string {
    if (typeof deal.ownerId !== 'string' && deal.ownerId) {
      return `${deal.ownerId.firstName || ''} ${deal.ownerId.lastName || ''}`.trim();
    }
    return '';
  }
  ownerInitials(deal: Deal): string {
    const name = this.ownerName(deal);
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase() || '?';
  }
  companyName(deal: Deal): string {
    if (typeof deal.customerId === 'string') return '';
    return deal.customerId?.companyName || '';
  }
  customerIdOf(deal: Deal): string {
    return typeof deal.customerId === 'string' ? deal.customerId : deal.customerId?._id || '';
  }
  stageName(stage: PipelineStage | string | undefined, deal?: Deal): string {
    if (!stage && deal) {
      stage = typeof deal.stageId === 'string' ? undefined : deal.stageId as PipelineStage;
    }
    if (!stage || typeof stage === 'string') return '';
    return this.translate.currentLang === 'am' ? stage.nameHy : stage.nameEn;
  }
  stageLabel(stage: PipelineStage): string {
    return this.translate.currentLang === 'am' ? stage.nameHy : stage.nameEn;
  }

  // ─── Date helpers ─────────────────────────────────────────────────────────
  daysInStage(deal: Deal): number {
    if (!deal.stageEnteredAt) return 0;
    const diff = Date.now() - new Date(deal.stageEnteredAt).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }
  nextStepStatus(deal: Deal): 'overdue' | 'today' | 'future' | null {
    if (!deal.nextStepDate) return null;
    const d = new Date(deal.nextStepDate);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) return 'overdue';
    if (d.getTime() === today.getTime()) return 'today';
    return 'future';
  }

  formatAmount(value: number | undefined | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('hy-AM', { maximumFractionDigits: 0 }).format(value);
  }

  formatDateShort(value: string | Date | undefined | null): string {
    if (!value) return '';
    const dt = new Date(value);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
  }

  // ─── Drag & drop ──────────────────────────────────────────────────────────
  onDealDrop(event: CdkDragDrop<Deal[]>, targetStage: PipelineStage): void {
    if (event.previousContainer === event.container) return;
    const deal: Deal = event.item.data;
    if (!deal) return;
    if (deal.stageKey === targetStage.key) return;

    if (targetStage.type === 'lost') { this.openLostDialog(deal._id); return; }
    if (targetStage.type === 'won')  { this.messageService.add({ severity: 'warn', summary: 'Won', detail: 'Use the Won button in the deal drawer.' }); return; }

    if (this.QUOTE_REQUIRED_STAGES.has(targetStage.key)) {
      this.checkQuoteThenMove(deal, targetStage);
      return;
    }
    this.executeStageMove(deal, targetStage);
  }

  private checkQuoteThenMove(deal: Deal, targetStage: PipelineStage): void {
    const cached = this.dealQuotesCache.get(deal._id);
    if (cached !== undefined) {
      if (!cached.some(q => q.status === 'sent' || q.status === 'accepted')) {
        this.messageService.add({ severity: 'warn', summary: 'Quote required', detail: `Stage "${targetStage.nameEn}" requires at least one sent quote.`, life: 4000 });
        return;
      }
      this.executeStageMove(deal, targetStage);
      return;
    }
    this.quoteService.findAll({ dealId: deal._id }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (quotes) => {
        this.dealQuotesCache.set(deal._id, quotes);
        if (!quotes.some(q => q.status === 'sent' || q.status === 'accepted')) {
          this.messageService.add({ severity: 'warn', summary: 'Quote required', detail: `Stage "${targetStage.nameEn}" requires at least one sent quote.`, life: 4000 });
          return;
        }
        this.executeStageMove(deal, targetStage);
      },
    });
  }

  private executeStageMove(deal: Deal, targetStage: PipelineStage): void {
    const previous = { stageId: deal.stageId, stageKey: deal.stageKey, stageEnteredAt: deal.stageEnteredAt };
    this.deals.update(list => list.map(d => d._id === deal._id
      ? { ...d, stageId: targetStage._id, stageKey: targetStage.key, stageEnteredAt: new Date().toISOString(), probability: targetStage.probability ?? d.probability }
      : d));
    this.dealsService.changeStage(deal._id, { stageId: targetStage._id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          this.deals.update(list => list.map(d => d._id === deal._id ? this.mergeServerDeal(d, saved) : d));
          this.dealQuotesCache.delete(deal._id);
        },
        error: (err) => {
          this.deals.update(list => list.map(d => d._id === deal._id ? { ...d, ...previous } : d));
          this.messageService.add({ severity: 'error', summary: this.translate.instant('common.error'), detail: err?.error?.message || 'Failed to move deal' });
        },
      });
  }

  // When server returns a deal with populated refs, preserve previously populated fields
  private mergeServerDeal(local: Deal, server: Deal): Deal {
    return {
      ...local,
      ...server,
      customerId: (typeof server.customerId === 'string' && typeof local.customerId !== 'string')
        ? local.customerId
        : server.customerId,
      ownerId: (typeof server.ownerId === 'string' && typeof local.ownerId !== 'string')
        ? local.ownerId
        : server.ownerId,
    };
  }

  // ─── Filters UI handlers ─────────────────────────────────────────────────
  clearFilters(): void {
    this.ownerFilter.set(null);
    this.sourceFilter.set([]);
    this.overdueOnly.set(false);
    this.searchText.set('');
  }

  onSearchInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value || '';
    this.searchText.set(value);
  }

  // ─── New deal dialog ──────────────────────────────────────────────────────
  openNewDealDialog(stage: PipelineStage): void {
    if (stage.type !== 'open') {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'New deals must start in an open stage',
      });
      return;
    }
    this.newDealStageId = stage._id;
    this.newDealForm.reset({
      title: '',
      customerId: null,
      contactPersonId: null,
      estimatedValue: null,
      expectedCloseDate: null,
      source: null,
      nextStepType: null,
      nextStepDate: null,
      nextStepNote: '',
    });
    this.contactPersonOptions = [];
    this.showNewDealDialog = true;
  }

  onCustomerChange(customerId: string | null): void {
    this.newDealForm.patchValue({ contactPersonId: null });
    if (!customerId) {
      this.contactPersonOptions = [];
      return;
    }
    const customer = this.customers().find(c => c._id === customerId);
    const contacts: ContactPerson[] = customer?.contacts || [];
    this.contactPersonOptions = contacts.map(c => ({ label: c.contactPerson, value: c.contactPerson }));
    if (this.contactPersonOptions.length === 0 && customer?.contactPerson) {
      this.contactPersonOptions = [{ label: customer.contactPerson, value: customer.contactPerson }];
    }
  }

  saveNewDeal(): void {
    if (this.newDealForm.invalid) {
      this.newDealForm.markAllAsTouched();
      return;
    }
    const me = this.currentUser;
    if (!me || !this.newDealStageId) return;

    const v = this.newDealForm.value;
    const dto: CreateDealPayload = {
      title: v.title.trim(),
      customerId: v.customerId,
      contactPersonId: v.contactPersonId || undefined,
      ownerId: me.id,
      stageId: this.newDealStageId,
      estimatedValue: v.estimatedValue ?? undefined,
      expectedCloseDate: v.expectedCloseDate instanceof Date ? v.expectedCloseDate.toISOString() : undefined,
      source: v.source || undefined,
      nextStepType: v.nextStepType || undefined,
      nextStepDate: v.nextStepDate instanceof Date ? v.nextStepDate.toISOString() : undefined,
      nextStepNote: v.nextStepNote || undefined,
    };
    this.isSavingDeal = true;
    this.dealsService.create(dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (created) => {
        this.deals.update(list => [created, ...list]);
        this.isSavingDeal = false;
        this.showNewDealDialog = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('pipeline.newDeal'),
        });
      },
      error: (err) => {
        this.isSavingDeal = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: err?.error?.message || 'Failed to create deal',
        });
      },
    });
  }

  // ─── Lost dialog ──────────────────────────────────────────────────────────
  openLostDialog(dealId: string): void {
    this.lostTargetDealId = dealId;
    this.lostForm.reset({ lostReasonId: null, lostComment: '' });
    this.selectedLostRequiresComment = false;
    this.showLostDialog = true;
  }

  onLostReasonChange(reasonId: string | null): void {
    const r = this.lostReasonOptions.find(x => x.value === reasonId);
    this.selectedLostRequiresComment = !!r?.requiresComment;
    const commentCtrl = this.lostForm.get('lostComment');
    if (this.selectedLostRequiresComment) {
      commentCtrl?.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      commentCtrl?.clearValidators();
    }
    commentCtrl?.updateValueAndValidity();
  }

  confirmLost(): void {
    if (this.lostForm.invalid || !this.lostTargetDealId) {
      this.lostForm.markAllAsTouched();
      return;
    }
    const v = this.lostForm.value;
    this.isSavingLost = true;
    this.dealsService.markLost(this.lostTargetDealId, {
      lostReasonId: v.lostReasonId,
      lostComment: v.lostComment || undefined,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          this.deals.update(list => list.map(d => (d._id === saved._id ? this.mergeServerDeal(d, saved) : d)));
          this.isSavingLost = false;
          this.showLostDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('pipeline.lost.title'),
          });
        },
        error: () => {
          this.isSavingLost = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: 'Failed to mark as lost',
          });
        },
      });
  }

  // ─── Drawer open/close ────────────────────────────────────────────────────
  openDealDetail(deal: Deal): void {
    this.selectedDeal = deal;
    this.showDetailDrawer = true;
  }

  closeDealDetail(): void {
    this.showDetailDrawer = false;
    this.selectedDeal = null;
  }

  onDealUpdated(updated: Deal): void {
    this.deals.update(list => list.map(d => (d._id === updated._id ? this.mergeServerDeal(d, updated) : d)));
    this.selectedDeal = this.deals().find(d => d._id === updated._id) || updated;
    this.dealQuotesCache.delete(updated._id);
  }

  onDealStageChangeRequest(ev: { deal: Deal; stage: PipelineStage }): void {
    const { deal, stage } = ev;
    if (stage.type === 'lost') { this.openLostDialog(deal._id); return; }
    if (stage.type === 'won')  { this.openWonGuard(deal); return; }

    if (this.QUOTE_REQUIRED_STAGES.has(stage.key)) {
      this.checkQuoteThenMove(deal, stage);
      return;
    }
    this.executeStageMove(deal, stage);
  }

  // ─── Won guard ────────────────────────────────────────────────────────────
  showWonGuardDialog = false;
  wonGuardDeal: Deal | null = null;
  wonGuardQuotes: Quote[] = [];
  wonGuardLoading = false;
  wonWithoutOrderComment = '';
  wonMarkingWithoutOrder = false;

  openWonGuard(deal: Deal): void {
    if (deal.orderIds && deal.orderIds.length > 0) {
      // Already has an order — just move
      const wonStage = this.stages().find(s => s.type === 'won');
      if (wonStage) this.executeStageMove(deal, wonStage);
      return;
    }
    this.wonGuardDeal = deal;
    this.wonGuardQuotes = [];
    this.wonWithoutOrderComment = '';
    this.wonGuardLoading = true;
    this.showWonGuardDialog = true;
    const cached = this.dealQuotesCache.get(deal._id);
    if (cached !== undefined) {
      this.wonGuardQuotes = cached;
      this.wonGuardLoading = false;
    } else {
      this.quoteService.findAll({ dealId: deal._id }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (quotes) => {
          this.dealQuotesCache.set(deal._id, quotes);
          this.wonGuardQuotes = quotes;
          this.wonGuardLoading = false;
        },
        error: () => { this.wonGuardLoading = false; },
      });
    }
  }

  closeWonGuard(): void {
    this.showWonGuardDialog = false;
    this.wonGuardDeal = null;
  }

  wonGuardOpenQuotes(): void {
    if (!this.wonGuardDeal) return;
    this.showWonGuardDialog = false;
    this.openDealDetail(this.wonGuardDeal);
    // Switch to quotes tab is handled by detail component input
  }

  wonGuardCreateQuote(): void {
    if (!this.wonGuardDeal) return;
    this.showWonGuardDialog = false;
    this.openDealDetail(this.wonGuardDeal);
  }

  wonGuardMarkWithoutOrder(): void {
    if (!this.wonGuardDeal || !this.wonWithoutOrderComment.trim()) return;
    const deal = this.wonGuardDeal;
    const wonStage = this.stages().find(s => s.type === 'won');
    if (!wonStage) return;
    this.wonMarkingWithoutOrder = true;
    this.dealsService.changeStage(deal._id, {
      stageId: wonStage._id,
      allowEmptyOrderIds: true,
      note: this.wonWithoutOrderComment.trim(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.deals.update(list => list.map(d => d._id === saved._id ? this.mergeServerDeal(d, saved) : d));
        this.wonMarkingWithoutOrder = false;
        this.showWonGuardDialog = false;
        this.messageService.add({ severity: 'success', summary: this.translate.instant('common.success'), detail: this.translate.instant('pipeline.won.markedWon') });
      },
      error: (err) => {
        this.wonMarkingWithoutOrder = false;
        this.messageService.add({ severity: 'error', summary: this.translate.instant('common.error'), detail: err?.error?.message || this.translate.instant('pipeline.won.error') });
      },
    });
  }

  // ─── Table helpers ────────────────────────────────────────────────────────
  getStageTagSeverity(deal: Deal): 'success' | 'danger' | 'info' {
    const stage = this.stages().find(s => s.key === deal.stageKey);
    if (!stage) return 'info';
    if (stage.type === 'won') return 'success';
    if (stage.type === 'lost') return 'danger';
    return 'info';
  }

  // Track by functions
  trackColumn = (_: number, col: StageColumn) => col.stage._id;
  trackDeal   = (_: number, deal: Deal) => deal._id;
  trackStage  = (_: number, s: PipelineStage) => s._id;
}
