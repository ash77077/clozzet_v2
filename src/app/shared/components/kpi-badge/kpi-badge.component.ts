import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../../../services/auth.service';
import { ManagerKpiService, MonthlyKpi } from '../../../services/manager-kpi.service';

const LS_KEY = 'kpi_badge_hidden';

@Component({
  selector: 'app-kpi-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-badge.component.html',
  styleUrl: './kpi-badge.component.scss',
})
export class KpiBadgeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  kpi: MonthlyKpi | null = null;
  isExpanded = false;
  isLoading = false;
  isHidden = localStorage.getItem(LS_KEY) === 'true';

  readonly TIER_COLORS: Record<string, { color: string; bg: string; gradient: string }> = {
    Legend:   { color: '#d97706', bg: '#fef3c7', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    Master:   { color: '#2563eb', bg: '#dbeafe', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    Champion: { color: '#7c3aed', bg: '#ede9fe', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  };

  get tierStyle() {
    return this.TIER_COLORS[this.kpi?.tier?.name ?? 'Legend'] ?? this.TIER_COLORS['Legend'];
  }

  get now() { return new Date(); }

  constructor(
    private authService: AuthService,
    private kpiService: ManagerKpiService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      if (user?.role === 'manager') {
        this.loadKpi();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadKpi(): void {
    if (!this.currentUser?.id) return;
    const now = new Date();
    this.isLoading = true;
    this.kpiService.getMyMonthlyKpi(this.currentUser.id, now.getFullYear(), now.getMonth())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: kpi  => { this.kpi = kpi; this.isLoading = false; },
        error: ()  => { this.isLoading = false; },
      });
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) this.loadKpi();
  }

  hide(): void {
    this.isHidden = true;
    this.isExpanded = false;
    localStorage.setItem(LS_KEY, 'true');
  }

  show(): void {
    this.isHidden = false;
    localStorage.removeItem(LS_KEY);
  }

  pct(actual: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('de-DE').format(n) + ' ֏';
  }

  get monthLabel(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // ── Tier progression helpers ─────────────────────────────────────────────────

  /** Index of the active tier in kpi.tiers (used for reached/current styling). */
  get activeTierIndex(): number {
    if (!this.kpi) return -1;
    return this.kpi.tiers.findIndex(t => t.name === this.kpi!.tier.name);
  }

  /** True when the manager is already sitting in the top tier. */
  get isAtMaxTier(): boolean {
    return !!this.kpi && !this.kpi.nextTier;
  }

  /** Progress toward next tier, 0–100 (clamped). */
  get nextTierProgress(): number {
    if (!this.kpi || !this.kpi.nextTier) return 100;
    const currentMin = this.kpi.tier.min;
    const nextMin    = this.kpi.nextTier.min;
    const span       = nextMin - currentMin;
    if (span <= 0) return 100;
    const pct = ((this.kpi.revenue - currentMin) / span) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  /** Currency amount still needed to reach the next tier (always positive). */
  get amountToNextTier(): number {
    if (!this.kpi || !this.kpi.nextTier) return 0;
    return Math.max(0, this.kpi.nextTier.min - this.kpi.revenue);
  }
}
