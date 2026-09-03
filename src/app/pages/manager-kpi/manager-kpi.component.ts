import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ManagerKpiService, ManagerUser, ManagerGoal, MonthlyKpi, KpiTier } from '../../services/manager-kpi.service';

@Component({
  selector: 'app-manager-kpi',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SelectModule, InputNumberModule, ButtonModule,
    ToastModule, TableModule, TagModule, TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './manager-kpi.component.html',
  styleUrl: './manager-kpi.component.scss',
})
export class ManagerKpiComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  managers: ManagerUser[] = [];
  goals: ManagerGoal[] = [];
  monthlyKpis: MonthlyKpi[] = [];
  tiers: KpiTier[] = [];

  isLoading = false;
  isSavingGoal = false;

  // Month selector
  selectedDate = new Date();
  get selectedYear()  { return this.selectedDate.getFullYear(); }
  get selectedMonth() { return this.selectedDate.getMonth(); }
  get monthLabel()    {
    return this.selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Goal editing
  editingGoal: { [userId: string]: Partial<ManagerGoal> } = {};
  editingManagerId: string | null = null;
  editingTiers: { [userId: string]: { name: string; min: number; max: number; rate: number }[] } = {};

  // General goal panel
  isGeneralPanelOpen = false;
  isSavingGeneral = false;
  generalGoal: Partial<ManagerGoal> = {
    targetInteractions: 0,
    targetMeetings: 0,
    targetRevenue: 0,
  };
  generalTiers: { name: string; min: number; max: number; rate: number }[] = [];

  // Matches TIER_PALETTE in the backend service (colour by tier index)
  readonly PALETTE = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#6366f1'];

  // Default tiers used when initializing tier editing for new managers
  readonly DEFAULT_TIERS = [
    { name: 'Legend',   min: 0,         max: 3_000_000, rate: 5 },
    { name: 'Master',   min: 2_000_001, max: 5_000_000, rate: 6 },
    { name: 'Champion', min: 5_000_001, max: 999_999_999, rate: 7 },
  ];

  constructor(
    private kpiService: ManagerKpiService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.isLoading = true;
    forkJoin({
      managers: this.kpiService.getManagers(),
      goals:    this.kpiService.getAllGoals(),
      kpis:     this.kpiService.getAllMonthlyKpi(this.selectedYear, this.selectedMonth),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ managers, goals, kpis }) => {
        this.managers  = managers;
        this.goals     = goals;
        this.monthlyKpis = kpis;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  loadKpis(): void {
    this.kpiService.getAllMonthlyKpi(this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe(kpis => this.monthlyKpis = kpis);
  }

  prevMonth(): void {
    const d = new Date(this.selectedDate);
    d.setMonth(d.getMonth() - 1);
    this.selectedDate = d;
    this.loadKpis();
  }

  nextMonth(): void {
    const d = new Date(this.selectedDate);
    d.setMonth(d.getMonth() + 1);
    this.selectedDate = d;
    this.loadKpis();
  }

  getGoalFor(userId: string): ManagerGoal | undefined {
    return this.goals.find(g => String(g.userId) === userId);
  }

  getKpiFor(userId: string): MonthlyKpi | undefined {
    return this.monthlyKpis.find(k => k.userId === userId);
  }

  startEditGoal(manager: ManagerUser): void {
    const existing = this.getGoalFor(manager._id);
    this.editingManagerId = manager._id;
    this.editingGoal[manager._id] = {
      userId:             manager._id,
      managerName:        `${manager.firstName} ${manager.lastName}`,
      targetInteractions: existing?.targetInteractions ?? 0,
      targetMeetings:     existing?.targetMeetings ?? 0,
      targetRevenue:      existing?.targetRevenue ?? 0,
    };
    // Populate tiers from existing custom tiers, or fall back to defaults
    const existingTiers = existing?.customTiers;
    this.editingTiers[manager._id] = existingTiers && existingTiers.length > 0
      ? existingTiers.map(t => ({ name: t.name, min: t.min, max: t.max, rate: Math.round(t.rate * 100) }))
      : this.DEFAULT_TIERS.map(t => ({ ...t }));
  }

  cancelEdit(): void {
    this.editingManagerId = null;
  }

  resetTiersToDefault(managerId: string): void {
    this.editingTiers[managerId] = this.DEFAULT_TIERS.map(t => ({ ...t }));
  }

  onTierMaxChange(managerId: string, index: number): void {
    const tiers = this.editingTiers[managerId];
    if (!tiers || index >= tiers.length - 1) return;
    // Keep next tier's min = this tier's max + 1
    tiers[index + 1].min = tiers[index].max + 1;
  }

  saveGoal(manager: ManagerUser): void {
    const draft = this.editingGoal[manager._id];
    if (!draft) return;
    this.isSavingGoal = true;

    const tiers = this.editingTiers[manager._id];
    const customTiers = tiers.map(t => ({
      name: t.name,
      min:  Number(t.min) || 0,
      max:  Number(t.max) || 999_999_999,
      rate: (Number(t.rate) || 0) / 100,
    }));

    this.kpiService.setGoal({
      userId:             manager._id,
      managerName:        `${manager.firstName} ${manager.lastName}`,
      targetInteractions: draft.targetInteractions ?? 0,
      targetMeetings:     draft.targetMeetings ?? 0,
      targetRevenue:      0,
      customTiers,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSavingGoal = false;
        this.editingManagerId = null;
        this.loadAll();
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: `Goals updated for ${manager.firstName}` });
      },
      error: () => {
        this.isSavingGoal = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save goals.' });
      },
    });
  }

  // ── Tier progression helpers (flat-rate commission model) ────────────────────

  /** Index of the active tier within kpi.tiers (used to highlight/mark reached nodes). */
  activeTierIndex(managerId: string): number {
    const kpi = this.getKpiFor(managerId);
    if (!kpi) return -1;
    return kpi.tiers.findIndex(t => t.name === kpi.tier.name);
  }

  /** True when the manager is already sitting in the highest tier. */
  isAtMaxTier(managerId: string): boolean {
    const kpi = this.getKpiFor(managerId);
    return !!kpi && !kpi.nextTier;
  }

  /**
   * Progress toward the next tier, 0–100.
   * (revenue - currentTier.min) / (nextTier.min - currentTier.min)
   */
  nextTierProgress(managerId: string): number {
    const kpi = this.getKpiFor(managerId);
    if (!kpi || !kpi.nextTier) return 100;
    const currentMin = kpi.tier.min;
    const nextMin    = kpi.nextTier.min;
    const span       = nextMin - currentMin;
    if (span <= 0) return 100;
    const pct = ((kpi.revenue - currentMin) / span) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  /** Currency amount still needed to reach the next tier (always positive). */
  amountToNextTier(managerId: string): number {
    const kpi = this.getKpiFor(managerId);
    if (!kpi || !kpi.nextTier) return 0;
    return Math.max(0, kpi.nextTier.min - kpi.revenue);
  }

  pct(actual: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  }

  // Use the color already on the tier object from the API response
  kpiTierColor(managerId: string): string {
    return this.getKpiFor(managerId)?.tier?.color ?? '#6b7280';
  }

  kpiTierBg(color?: string): string {
    return (color ?? '#6b7280') + '22';
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('de-DE').format(n) + ' ֏';
  }

  toggleGeneralPanel(): void {
    this.isGeneralPanelOpen = !this.isGeneralPanelOpen;
    if (this.isGeneralPanelOpen && this.generalTiers.length === 0) {
      this.generalTiers = this.DEFAULT_TIERS.map(t => ({ ...t }));
    }
  }

  onGeneralTierMaxChange(index: number): void {
    if (index >= this.generalTiers.length - 1) return;
    this.generalTiers[index + 1].min = this.generalTiers[index].max + 1;
  }

  resetGeneralTiersToDefault(): void {
    this.generalTiers = this.DEFAULT_TIERS.map(t => ({ ...t }));
  }

  applyToAllManagers(): void {
    this.isSavingGeneral = true;
    const customTiers = this.generalTiers.map(t => ({
      name: t.name,
      min: Number(t.min) || 0,
      max: Number(t.max) || 999_999_999,
      rate: (Number(t.rate) || 0) / 100,
    }));
    this.kpiService.setGoalForAll({
      targetInteractions: this.generalGoal.targetInteractions ?? 0,
      targetMeetings: this.generalGoal.targetMeetings ?? 0,
      targetRevenue: 0,
      customTiers,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSavingGeneral = false;
        this.isGeneralPanelOpen = false;
        this.loadAll();
        this.messageService.add({ severity: 'success', summary: 'Applied', detail: 'Goals applied to all managers' });
      },
      error: () => {
        this.isSavingGeneral = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to apply goals.' });
      },
    });
  }
}
