import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { FinancialProductionService } from '../../services/financial-production.service';
import { CostScenario, CostCalculation } from '../../models/financial-production.model';

@Component({
  selector: 'app-cost-configurator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    CardModule,
    DividerModule,
    TooltipModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './cost-configurator.component.html',
  styleUrl: './cost-configurator.component.scss',
})
export class CostConfiguratorComponent implements OnInit {
  scenarios;
  saving = false;
  activeScenarioId = signal<string | null>(null);

  form: CostScenario = this.blankForm();

  get calc(): CostCalculation {
    return this.financialService.calculateCost(this.form);
  }

  constructor(
    private financialService: FinancialProductionService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {
    this.scenarios = this.financialService.costScenarios$;
  }

  ngOnInit(): void {}

  private blankForm(): CostScenario {
    return {
      name: '',
      productType: '',
      dailyOutput: 20,
      workingDaysPerMonth: 26,
      fabricPricePerKg: 0,
      fabricGramsUsed: 0,
      accessoriesCostPerUnit: 0,
      pieceworkLabor: 0,
      monthlyRent: 0,
      monthlyUtilities: 0,
      monthlyFixedSalaries: 0,
      monthlyOther: 0,
      sellingPrice: 0,
    };
  }

  loadScenario(s: CostScenario): void {
    this.form = { ...s };
    this.activeScenarioId.set(s.id ?? null);
  }

  newScenario(): void {
    this.form = this.blankForm();
    this.activeScenarioId.set(null);
  }

  async saveScenario(): Promise<void> {
    if (!this.form.name.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Name required', detail: 'Please enter a scenario name.' });
      return;
    }
    this.saving = true;
    try {
      await this.financialService.saveCostScenario({ ...this.form });
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: `"${this.form.name}" saved.` });
      if (!this.form.id) {
        // After create, find the new scenario and set as active
        const match = this.scenarios().find(s => s.name === this.form.name);
        if (match) this.activeScenarioId.set(match.id ?? null);
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not save scenario.' });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(s: CostScenario): void {
    this.confirmationService.confirm({
      message: `Delete scenario "${s.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      accept: () => this.deleteScenario(s),
    });
  }

  private async deleteScenario(s: CostScenario): Promise<void> {
    try {
      await this.financialService.deleteCostScenario(s.id!);
      if (this.activeScenarioId() === s.id) {
        this.newScenario();
      }
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${s.name}" deleted.` });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not delete scenario.' });
    }
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('hy-AM', { maximumFractionDigits: 0 }).format(n);
  }

  fmtAMD(n: number): string {
    return `${this.fmt(n)} ֏`;
  }

  fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
  }

  profitSeverity(): 'success' | 'danger' | 'warn' {
    const m = this.calc.profitMarginPct;
    if (m >= 20) return 'success';
    if (m >= 5) return 'warn';
    return 'danger';
  }
}
