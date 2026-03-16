import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinancialProductionService } from '../../services/financial-production.service';
import { MonthlyAnalytics } from '../../models/financial-production.model';
import { MONTHS, getMonthName } from '../../constants/financial-production.constants';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  currentMonthAnalytics;
  dashboardSummary: any;
  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());
  customAnalytics = signal<MonthlyAnalytics | null>(null);

  months = MONTHS;
  years: number[] = [];

  constructor(
    private financialService: FinancialProductionService
  ) {
    this.currentMonthAnalytics = this.financialService.currentMonthAnalytics;
    this.initializeYears();
  }

  ngOnInit(): void {
    this.loadDashboardSummary();
    this.loadCustomAnalytics();
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  loadDashboardSummary(): void {
    this.dashboardSummary = this.financialService.getDashboardSummary();
  }

  loadCustomAnalytics(): void {
    const analytics = this.financialService.calculateMonthlyAnalytics(
      this.selectedMonth(),
      this.selectedYear()
    );
    this.customAnalytics.set(analytics);
  }

  onMonthChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedMonth.set(parseInt(value));
    this.loadCustomAnalytics();
  }

  onYearChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedYear.set(parseInt(value));
    this.loadCustomAnalytics();
  }

  getMonthName(month: number): string {
    return getMonthName(month);
  }

  getProfitClass(profit: number): string {
    return profit >= 0 ? 'positive' : 'negative';
  }
}
