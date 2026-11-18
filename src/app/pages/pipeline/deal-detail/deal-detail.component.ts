import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of, takeUntil, Observable, debounceTime, distinctUntilChanged } from 'rxjs';

import { DrawerModule } from 'primeng/drawer';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService, ConfirmationService } from 'primeng/api';

import {
  DealsService,
  Deal,
  DealStageHistory,
  UpdateDealPayload,
  DealSource,
  DealNextStepType,
} from '../../../services/deals.service';
import { PipelineStage } from '../../../services/pipeline-stages.service';
import { User as AppUser } from '../../../services/users.service';
import { InteractionsService } from '../../../services/interactions.service';
import { Interaction } from '../../../models/interaction.model';
import { AuthService } from '../../../services/auth.service';
import { QuoteService, Quote, CreateQuoteDto } from '../../../services/quote.service';
import { CustomersService } from '../../../services/customers.service';
import { ContactPerson } from '../../../models/customer.model';

interface ActivityEntry {
  kind: 'interaction' | 'stage';
  date: Date;
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  actor?: string;
}

// Stages that require at least one sent quote before the deal can enter them
const STAGES_REQUIRING_QUOTE = new Set(['quote_sent', 'negotiation', 'won']);

@Component({
  selector: 'app-deal-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService, ConfirmationService],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DrawerModule,
    TabsModule,
    ButtonModule,
    Select,
    DatePicker,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TranslateModule,
  ],
  templateUrl: './deal-detail.component.html',
  styleUrl: './deal-detail.component.scss',
})
export class DealDetailComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() deal: Deal | null = null;
  @Input() stages: PipelineStage[] = [];
  @Input() users: AppUser[] = [];
  @Input() sourceOptions: { label: string; value: DealSource }[] = [];
  @Input() nextStepTypeOptions: { label: string; value: DealNextStepType }[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() dealUpdated = new EventEmitter<Deal>();
  @Output() stageChangeRequest = new EventEmitter<{ deal: Deal; stage: PipelineStage }>();
  @Output() lostRequest = new EventEmitter<string>();

  private readonly dealsService    = inject(DealsService);
  private readonly interactionsService = inject(InteractionsService);
  private readonly quoteService    = inject(QuoteService);
  private readonly customersService = inject(CustomersService);
  private readonly authService     = inject(AuthService);
  private readonly router          = inject(Router);
  private readonly fb              = inject(FormBuilder);
  private readonly translate       = inject(TranslateService);
  private readonly messageService  = inject(MessageService);
  private readonly cdr             = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  // Inline edit title
  isEditingTitle = false;
  editedTitle = '';

  // Overview form
  overviewForm!: FormGroup;
  // Next step form
  nextStepForm!: FormGroup;

  // Autosave state
  readonly savedIndicator = signal(false);
  private savedTimer: any = null;

  // Tabs state
  activeTabIndex = 0;

  // Activity
  interactions: Interaction[] = [];
  stageHistory: DealStageHistory[] = [];
  isLoadingActivity = false;

  // Notes
  notesText = '';
  isSavingNotes = false;

  // Quotes tab
  dealQuotes: Quote[] = [];
  isLoadingQuotes = false;
  isCreatingQuote = false;

  // Contact person options (from this customer's contacts)
  contactPersonOptions: { label: string; value: string }[] = [];

  // Won dialog (unused — routing through parent pipeline guard now)
  showWonDialog = false;

  constructor() {
    this.overviewForm = this.fb.group({
      ownerId:           [null],
      expectedCloseDate: [null],
      estimatedValue:    [null],
      probability:       [null, [Validators.min(0), Validators.max(100)]],
      source:            [null],
      contactPersonId:   [null],
    });

    this.nextStepForm = this.fb.group({
      nextStepType: [null],
      nextStepDate: [null],
      nextStepNote: [''],
    });

    // Autosave overview on any change, debounced
    this.overviewForm.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      if (this.overviewForm.dirty && this.deal) this.autoSaveOverview();
    });

    // Autosave next step
    this.nextStepForm.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      if (this.nextStepForm.dirty && this.deal) this.autoSaveNextStep();
    });
  }

  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.role === 'admin';
  }

  get hasSentQuote(): boolean {
    return this.dealQuotes.some(q => q.status === 'sent' || q.status === 'accepted');
  }

  get orderedOpenStages(): PipelineStage[] {
    return [...this.stages].filter(s => s.type === 'open').sort((a, b) => a.order - b.order);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['deal'] && this.deal) {
      this.syncFormsFromDeal();
      this.loadActivity();
      this.loadDealQuotes();
      this.loadContactPersons();
    }
    if (changes['visible'] && this.visible && this.deal) {
      this.syncFormsFromDeal();
      this.loadActivity();
      this.loadDealQuotes();
      this.loadContactPersons();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.savedTimer) clearTimeout(this.savedTimer);
  }

  private syncFormsFromDeal(): void {
    if (!this.deal) return;
    const ownerId = typeof this.deal.ownerId === 'string' ? this.deal.ownerId : this.deal.ownerId?._id;
    this.overviewForm.patchValue({
      ownerId: ownerId || null,
      expectedCloseDate: this.deal.expectedCloseDate ? new Date(this.deal.expectedCloseDate) : null,
      estimatedValue: this.deal.estimatedValue ?? null,
      probability: this.deal.probability ?? null,
      source: this.deal.source ?? null,
      contactPersonId: this.deal.contactPersonId ?? null,
    }, { emitEvent: false });
    this.nextStepForm.patchValue({
      nextStepType: this.deal.nextStepType ?? null,
      nextStepDate: this.deal.nextStepDate ? new Date(this.deal.nextStepDate) : null,
      nextStepNote: this.deal.nextStepNote ?? '',
    }, { emitEvent: false });
    this.notesText = this.deal.nextStepNote || '';
    this.editedTitle = this.deal.title;
    this.overviewForm.markAsPristine();
    this.nextStepForm.markAsPristine();
  }

  private loadContactPersons(): void {
    const cid = this.customerId();
    if (!cid) return;
    this.customersService.getById(cid).pipe(takeUntil(this.destroy$)).subscribe({
      next: (customer) => {
        const contacts: ContactPerson[] = customer.contacts || [];
        this.contactPersonOptions = contacts.map(c => ({ label: c.contactPerson, value: c.contactPerson }));
        if (this.contactPersonOptions.length === 0 && customer.contactPerson) {
          this.contactPersonOptions = [{ label: customer.contactPerson, value: customer.contactPerson }];
        }
        this.cdr.markForCheck();
      },
    });
  }

  loadDealQuotes(): void {
    if (!this.deal?._id) return;
    this.isLoadingQuotes = true;
    this.quoteService.findAll({ dealId: this.deal._id }).subscribe({
      next: (list) => {
        this.dealQuotes = list;
        this.isLoadingQuotes = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingQuotes = false; this.cdr.markForCheck(); },
    });
  }

  createNewQuote(): void {
    if (!this.deal) return;

    // If there's already an open draft for this deal, navigate to it instead of creating another
    const existingDraft = this.dealQuotes.find(q => q.status === 'draft');
    if (existingDraft) {
      this.router.navigate(['/quotes', existingDraft._id]);
      return;
    }

    const dto: CreateQuoteDto = {
      dealId:          this.deal._id,
      customerId:      this.customerId(),
      contactPersonId: this.overviewForm.value.contactPersonId || undefined,
    };

    this.isCreatingQuote = true;
    this.quoteService.create(dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (q) => {
        this.isCreatingQuote = false;
        this.loadDealQuotes();
        this.router.navigate(['/quotes', q._id]);
      },
      error: () => {
        this.isCreatingQuote = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create quote', life: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  openQuote(id: string): void {
    this.router.navigate(['/quotes', id]);
  }

  downloadQuotePdf(id: string, lang: 'hy' | 'en', event: Event): void {
    event.stopPropagation();
    this.quoteService.downloadPdf(id, lang).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      const q   = this.dealQuotes.find(x => x._id === id);
      a.download = q ? `${q.number}-v${q.version}-${lang}.pdf` : `quote-${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  formatAmt(n: number): string {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ֏';
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    return [
      String(dt.getDate()).padStart(2, '0'),
      String(dt.getMonth() + 1).padStart(2, '0'),
      dt.getFullYear(),
    ].join('.');
  }

  quoteStatusSeverity(status: Quote['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, any> = {
      draft: 'secondary', sent: 'info', accepted: 'success',
      rejected: 'danger', expired: 'warn', superseded: 'contrast',
    };
    return map[status] ?? 'secondary';
  }

  private autoSaveOverview(): void {
    if (!this.deal || this.overviewForm.invalid) return;
    const v = this.overviewForm.value;
    const dto: UpdateDealPayload = {
      ownerId:           v.ownerId || undefined,
      expectedCloseDate: v.expectedCloseDate instanceof Date ? v.expectedCloseDate.toISOString() : undefined,
      estimatedValue:    v.estimatedValue ?? undefined,
      probability:       v.probability ?? undefined,
      source:            v.source || undefined,
      contactPersonId:   v.contactPersonId || undefined,
    };
    this.dealsService.update(this.deal._id, dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.overviewForm.markAsPristine();
        this.dealUpdated.emit(saved);
        this.showSaved();
      },
    });
  }

  private autoSaveNextStep(): void {
    if (!this.deal) return;
    const v = this.nextStepForm.value;
    const dto: UpdateDealPayload = {
      nextStepType: v.nextStepType || undefined,
      nextStepDate: v.nextStepDate instanceof Date ? v.nextStepDate.toISOString() : undefined,
      nextStepNote: v.nextStepNote || undefined,
    };
    this.dealsService.update(this.deal._id, dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.nextStepForm.markAsPristine();
        this.dealUpdated.emit(saved);
        this.showSaved();
      },
    });
  }

  private showSaved(): void {
    this.savedIndicator.set(true);
    this.cdr.markForCheck();
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => {
      this.savedIndicator.set(false);
      this.cdr.markForCheck();
    }, 2000);
  }

  private loadActivity(): void {
    if (!this.deal?._id) return;
    this.isLoadingActivity = true;
    const customerId = typeof this.deal.customerId === 'string' ? this.deal.customerId : this.deal.customerId?._id;

    const interactionsObs: Observable<Interaction[]> = customerId
      ? this.interactionsService.getByCustomer(customerId)
      : of<Interaction[]>([]);

    forkJoin({
      history:      this.dealsService.getStageHistory(this.deal._id),
      interactions: interactionsObs,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stageHistory    = data.history;
          this.interactions    = data.interactions;
          this.isLoadingActivity = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isLoadingActivity = false; this.cdr.markForCheck(); },
      });
  }

  get activityEntries(): ActivityEntry[] {
    const entries: ActivityEntry[] = [];
    for (const i of this.interactions) {
      entries.push({
        kind: 'interaction',
        date: new Date(i.interactionDate),
        icon: this.getInteractionIcon(i.type),
        iconColor: this.getInteractionColor(i.type),
        title: `${i.type}${i.subject ? ' · ' + i.subject : ''}`,
        subtitle: i.summary,
        actor: i.createdByName || '',
      });
    }
    for (const h of this.stageHistory) {
      entries.push({
        kind: 'stage',
        date: new Date(h.changedAt),
        icon: 'pi pi-arrow-right',
        iconColor: '#2563eb',
        title: `${h.fromStageKey || '—'} → ${h.toStageKey}`,
        subtitle: h.note,
        actor: h.changedByName || '',
      });
    }
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private getInteractionIcon(type: string): string {
    const map: Record<string, string> = {
      Call: 'pi pi-phone', Email: 'pi pi-envelope', WhatsApp: 'pi pi-whatsapp',
      Telegram: 'pi pi-send', LinkedIn: 'pi pi-linkedin', 'In-person': 'pi pi-users',
    };
    return map[type] || 'pi pi-comment';
  }

  private getInteractionColor(type: string): string {
    const map: Record<string, string> = {
      Call: '#3b82f6', Email: '#8b5cf6', WhatsApp: '#10b981',
      Telegram: '#06b6d4', LinkedIn: '#0077b5', 'In-person': '#f59e0b',
    };
    return map[type] || '#6b7280';
  }

  // ─── Visibility/close ────────────────────────────────────────────────
  onVisibleChange(v: boolean): void {
    if (!v) this.close.emit();
  }

  // ─── Title edit ─────────────────────────────────────────────────────
  startEditTitle(): void {
    if (!this.deal) return;
    this.editedTitle = this.deal.title;
    this.isEditingTitle = true;
  }
  cancelEditTitle(): void {
    this.isEditingTitle = false;
    if (this.deal) this.editedTitle = this.deal.title;
  }
  saveTitle(): void {
    if (!this.deal || !this.editedTitle?.trim()) return;
    const title = this.editedTitle.trim();
    if (title === this.deal.title) { this.isEditingTitle = false; return; }
    this.dealsService.update(this.deal._id, { title })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          this.isEditingTitle = false;
          this.dealUpdated.emit(saved);
          this.showSaved();
        },
      });
  }

  // ─── Stage stepper click ────────────────────────────────────────────
  clickStage(stage: PipelineStage): void {
    if (!this.deal) return;
    if (this.deal.stageKey === stage.key) return;

    if (stage.type === 'lost') {
      this.lostRequest.emit(this.deal._id);
      return;
    }
    if (stage.type === 'won') {
      this.clickWon();
      return;
    }

    // Validate quote requirement for stages that need a sent quote
    if (STAGES_REQUIRING_QUOTE.has(stage.key) && !this.hasSentQuote) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Quote required',
        detail: `Stage "${stage.nameEn}" requires at least one sent quote.`,
        life: 4000,
      });
      return;
    }

    this.stageChangeRequest.emit({ deal: this.deal, stage });
  }

  // ─── Won / Lost buttons ─────────────────────────────────────────────
  clickWon(): void {
    if (!this.deal) return;
    // Delegate to parent — the pipeline component owns the Won guard dialog
    const wonStage = this.stages.find(s => s.type === 'won');
    if (wonStage) this.stageChangeRequest.emit({ deal: this.deal, stage: wonStage });
  }

  clickLost(): void {
    if (!this.deal) return;
    this.lostRequest.emit(this.deal._id);
  }

  // ─── Notes save (blur) ─────────────────────────────────────────────
  saveNotes(): void {
    if (!this.deal) return;
    this.isSavingNotes = true;
    this.dealsService.update(this.deal._id, { nextStepNote: this.notesText })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          this.isSavingNotes = false;
          this.dealUpdated.emit(saved);
          this.showSaved();
        },
        error: () => { this.isSavingNotes = false; },
      });
  }

  // ─── Helpers ────────────────────────────────────────────────────────
  companyName(): string {
    if (!this.deal) return '';
    return typeof this.deal.customerId === 'string' ? '' : this.deal.customerId?.companyName || '';
  }
  customerId(): string {
    if (!this.deal) return '';
    return typeof this.deal.customerId === 'string' ? this.deal.customerId : this.deal.customerId?._id || '';
  }
  stageLabel(stage: PipelineStage): string {
    return this.translate.currentLang === 'am' ? stage.nameHy : stage.nameEn;
  }
  nextStepStatus(): 'overdue' | 'today' | 'future' | null {
    if (!this.deal?.nextStepDate) return null;
    const d = new Date(this.deal.nextStepDate);
    const today = new Date();
    d.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) return 'overdue';
    if (d.getTime() === today.getTime()) return 'today';
    return 'future';
  }
  userOptions() {
    return this.users.map(u => ({ label: `${u.firstName} ${u.lastName}`, value: u._id! }));
  }
  ownerDisplayName(): string {
    const ownerId = this.overviewForm.value.ownerId;
    if (!ownerId) return '—';
    const u = this.users.find(x => x._id === ownerId);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }
  formatDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  goToCustomer(): void {
    const id = this.customerId();
    if (id) this.router.navigate(['/customer-profile', id]);
  }

  trackStage = (_: number, s: PipelineStage) => s._id;
  trackEntry = (_: number, e: ActivityEntry) => `${e.kind}-${e.date.getTime()}-${e.title}`;
  trackOrder = (_: number, id: string) => id;
}
