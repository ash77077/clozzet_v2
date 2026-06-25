import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  monthlySalary: number;
  status: 'active' | 'inactive' | 'on_leave';
  paymentMethod: 'cash' | 'card' | 'mixed';
  cashPortion: number;
  cardPortion: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SalaryPayment {
  _id: string;
  employee: Employee | string;
  month: number;
  year: number;
  period: 'first_half' | 'second_half' | 'full_month' | 'bonus';
  amount: number;
  cashAmount: number;
  cardAmount: number;
  status: 'paid' | 'pending' | 'partial';
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalPayroll: number;
  totalPaid: number;
  totalPending: number;
  totalCash: number;
  totalCard: number;
  paymentsCount: number;
  pendingEmployees: string[];
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private base = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  // Employees
  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.base);
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.base}/${id}`);
  }

  create(dto: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.base, dto);
  }

  update(id: string, dto: Partial<Employee>): Observable<Employee> {
    return this.http.patch<Employee>(`${this.base}/${id}`, dto);
  }

  deactivate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Payments
  createPayment(dto: Partial<SalaryPayment> & { employeeId: string }): Observable<SalaryPayment> {
    return this.http.post<SalaryPayment>(`${this.base}/payments`, dto);
  }

  getPaymentsByEmployee(employeeId: string): Observable<SalaryPayment[]> {
    return this.http.get<SalaryPayment[]>(`${this.base}/${employeeId}/payments`);
  }

  getPaymentsByMonth(month: number, year: number): Observable<SalaryPayment[]> {
    return this.http.get<SalaryPayment[]>(`${this.base}/payments/month/${month}/${year}`);
  }

  updatePayment(id: string, dto: Partial<SalaryPayment>): Observable<SalaryPayment> {
    return this.http.patch<SalaryPayment>(`${this.base}/payments/${id}`, dto);
  }

  deletePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/payments/${id}`);
  }

  // Summary
  getSummary(month?: number, year?: number): Observable<PayrollSummary> {
    if (month && year) {
      return this.http.get<PayrollSummary>(`${this.base}/summary/${month}/${year}`);
    }
    return this.http.get<PayrollSummary>(`${this.base}/summary`);
  }
}
