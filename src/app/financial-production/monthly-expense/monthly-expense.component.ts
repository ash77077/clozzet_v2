import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FinancialProductionService } from '../../services/financial-production.service';
import { MonthlyExpenseReport } from '../../models/financial-production.model';
import { MONTHS } from '../../constants/financial-production.constants';

@Component({
  selector: 'app-monthly-expense',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './monthly-expense.component.html',
  styleUrl: './monthly-expense.component.scss',
})
export class MonthlyExpenseComponent implements OnInit {
  expenseForm!: FormGroup;
  monthlyReports ;
  editingId = signal<string | null>(null);

  months = MONTHS;
  years: number[] = [];

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialProductionService
  ) {
    this.monthlyReports = this.financialService.monthlyExpenseReports$;
    this.initializeYears();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const currentDate = new Date();
    this.expenseForm = this.fb.group({
      month: [currentDate.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      year: [currentDate.getFullYear(), [Validators.required]],
      rent: [0, [Validators.required, Validators.min(0)]],
      utilities: [0, [Validators.required, Validators.min(0)]],
      fixedSalaries: [0, [Validators.required, Validators.min(0)]],
      variableDailyLabor: [0, [Validators.required, Validators.min(0)]]
    });
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      this.years.push(i);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.expenseForm.valid) {
      const formValue = this.expenseForm.value;

      if (this.editingId()) {
        await this.financialService.updateMonthlyExpenseReport(this.editingId()!, formValue);
        this.editingId.set(null);
      } else {
        await this.financialService.addMonthlyExpenseReport(formValue);
      }

      this.expenseForm.reset();
      this.initializeForm();
    }
  }

  editReport(report: MonthlyExpenseReport): void {
    this.editingId.set(report.id!);
    this.expenseForm.patchValue({
      month: report.month,
      year: report.year,
      rent: report.rent,
      utilities: report.utilities,
      fixedSalaries: report.fixedSalaries,
      variableDailyLabor: report.variableDailyLabor
    });
  }

  async deleteReport(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this expense report?')) {
      await this.financialService.deleteMonthlyExpenseReport(id);
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.expenseForm.reset();
    this.initializeForm();
  }

  get totalOverhead(): number {
    const values = this.expenseForm.value;
    return (values.rent || 0) + (values.utilities || 0) +
           (values.fixedSalaries || 0) + (values.variableDailyLabor || 0);
  }
}
